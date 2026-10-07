# Payout Central Bot v2

A full Node.js/discord.js/PostgreSQL foundation for a consent-based Discord member network.

## Important

The bot only works with users who explicitly authorize the OAuth2 application. It must not be used with stolen, fake, scraped, or otherwise unauthorized accounts, and it must not be used to evade Discord limits or platform rules.

The bot token previously shared during setup must be regenerated before deployment. Put the new token only in `.env`.

## Stack

- Node.js 20+
- discord.js 14
- Express 5
- PostgreSQL
- Helmet + rate limiting

## Setup

```bash
cp .env.example .env
npm install
npm run db:init
npm start
```

Configure the Discord Developer Portal OAuth2 redirect URL to exactly match `OAUTH2_REDIRECT_URI`.

## Owner

Set `BOT_OWNER_ID` to your Discord user ID. The owner bypasses normal command grants and remains usable during maintenance.

## Command families

The project includes the requested prefix command families for help, auth, stock, restock/remove, base send, role rewards, join, server checks, verification, link configuration, blacklist, verified role, grants/revokes, permissions, queue administration, cooldown, logging, global stats, profiles, server leave, announcements, maintenance and prefix configuration.

## OAuth2 data

Only the minimum OAuth data needed by the configured scopes is stored. Access/refresh tokens are never printed in Discord logs. For production, add encrypted token-at-rest storage and a secret manager rather than relying on plaintext database fields.

## Queue

Queue entries are persistent. A worker claims requests, selects eligible authorized accounts from stock, checks destination membership where possible, and processes consented OAuth2 guild joins. Failed/partial jobs are retained in the request history and logged.

## Discord API / policy

Before production, review Discord's current Developer Terms, Developer Policy, API Terms, rate limits, OAuth2 rules and any server-specific requirements. This implementation intentionally does not attempt to bypass them.
