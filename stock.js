const {query}=require('../db');
async function count(){return Number((await query('SELECT COUNT(*)::int c FROM stock WHERE assigned=false')).rows[0].c)}
async function restock(n){const r=await query(`SELECT oa.user_id FROM oauth_authorizations oa WHERE oa.revoked_at IS NULL AND NOT EXISTS(SELECT 1 FROM stock s WHERE s.user_id=oa.user_id) ORDER BY RANDOM() LIMIT $1`,[n]);if(r.rowCount<n)throw new Error(`Only ${r.rowCount} eligible authorized accounts are available.`);for(const x of r.rows)await query('INSERT INTO stock(user_id) VALUES($1) ON CONFLICT DO NOTHING',[x.user_id]);return r.rowCount}
async function remove(n){const r=await query(`DELETE FROM stock WHERE user_id IN(SELECT user_id FROM stock WHERE assigned=false ORDER BY added_at LIMIT $1) RETURNING user_id`,[n]);return r.rowCount}
async function assign(n){const r=await query(`WITH picked AS(SELECT user_id FROM stock WHERE assigned=false ORDER BY added_at LIMIT $1 FOR UPDATE SKIP LOCKED) UPDATE stock s SET assigned=true FROM picked p WHERE s.user_id=p.user_id RETURNING s.user_id`,[n]);return r.rows.map(x=>x.user_id)}
async function release(ids){if(!ids.length)return;await query('UPDATE stock SET assigned=false WHERE user_id=ANY($1)',[ids])}
module.exports={count,restock,remove,assign,release};
