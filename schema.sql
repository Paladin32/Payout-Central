CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS users (user_id TEXT PRIMARY KEY, username TEXT, verified BOOLEAN NOT NULL DEFAULT FALSE, first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_command_at TIMESTAMPTZ, commands_executed BIGINT NOT NULL DEFAULT 0, members_received BIGINT NOT NULL DEFAULT 0, join_requests BIGINT NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS oauth_authorizations (user_id TEXT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE, scope TEXT NOT NULL, authorized_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), revoked_at TIMESTAMPTZ, access_token TEXT, refresh_token TEXT, expires_at TIMESTAMPTZ);
CREATE TABLE IF NOT EXISTS servers (server_id TEXT PRIMARY KEY, name TEXT, member_count BIGINT NOT NULL DEFAULT 0, blacklisted BOOLEAN NOT NULL DEFAULT FALSE, blacklist_reason TEXT, joined_at TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS permissions (user_id TEXT NOT NULL, command TEXT NOT NULL, granted_by TEXT, granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(user_id,command));
CREATE TABLE IF NOT EXISTS stock (user_id TEXT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE, added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), assigned BOOLEAN NOT NULL DEFAULT FALSE, last_used_at TIMESTAMPTZ);
CREATE TABLE IF NOT EXISTS queue (server_id TEXT PRIMARY KEY, requester_id TEXT NOT NULL, amount INTEGER NOT NULL, position INTEGER NOT NULL, priority BOOLEAN NOT NULL DEFAULT FALSE, status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), claimed_at TIMESTAMPTZ);
CREATE TABLE IF NOT EXISTS requests (id BIGSERIAL PRIMARY KEY, requester_id TEXT NOT NULL, server_id TEXT NOT NULL, amount INTEGER NOT NULL, status TEXT NOT NULL, requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, delivered INTEGER NOT NULL DEFAULT 0, failed INTEGER NOT NULL DEFAULT 0, error TEXT);
CREATE TABLE IF NOT EXISTS request_accounts (request_id BIGINT REFERENCES requests(id) ON DELETE CASCADE, user_id TEXT REFERENCES users(user_id), status TEXT NOT NULL DEFAULT 'assigned', error TEXT, processed_at TIMESTAMPTZ, PRIMARY KEY(request_id,user_id));
CREATE TABLE IF NOT EXISTS blacklist (server_id TEXT PRIMARY KEY, reason TEXT NOT NULL, created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS logs_config (type TEXT PRIMARY KEY, enabled BOOLEAN NOT NULL DEFAULT FALSE, channel_id TEXT);
CREATE TABLE IF NOT EXISTS maintenance_allowed (user_id TEXT PRIMARY KEY, granted_by TEXT, granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS role_rewards (role_id TEXT PRIMARY KEY, amount INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS cooldowns (user_id TEXT PRIMARY KEY, last_join_at TIMESTAMPTZ NOT NULL);
CREATE TABLE IF NOT EXISTS oauth_stats (id INTEGER PRIMARY KEY CHECK(id=1), all_time_peak INTEGER NOT NULL DEFAULT 0, total_authorizations BIGINT NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS audit_log (id BIGSERIAL PRIMARY KEY, actor_id TEXT, action TEXT NOT NULL, target TEXT, details TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS oauth_states (state TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
INSERT INTO oauth_stats(id) VALUES(1) ON CONFLICT DO NOTHING;
INSERT INTO config(key,value) VALUES
('prefix','!'),('base_send','2'),('queue_capacity','10'),('cooldown_seconds','0'),('maintenance','false'),('custom_link',''),('queue_paused','false'),('verified_role_id','')
ON CONFLICT(key) DO NOTHING;
INSERT INTO logs_config(type) VALUES('farm'),('server'),('errors'),('admin') ON CONFLICT DO NOTHING;
