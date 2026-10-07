const {query}=require('../db');
async function count(){return Number((await query("SELECT COUNT(*)::int c FROM queue WHERE status='pending'")).rows[0].c)}
async function list(){return (await query(`SELECT * FROM queue WHERE status='pending' ORDER BY priority DESC,position ASC`)).rows}
async function add(server,requester,amount){const existing=await query("SELECT 1 FROM queue WHERE server_id=$1 AND status IN('pending','processing')",[server]);if(existing.rowCount)return null;const n=Number((await query("SELECT COALESCE(MAX(position),0)+1 n FROM queue WHERE status='pending'")).rows[0].n);await query(`INSERT INTO queue(server_id,requester_id,amount,position) VALUES($1,$2,$3,$4)`,[server,requester,amount,n]);return n}
async function remove(server){return (await query('DELETE FROM queue WHERE server_id=$1 RETURNING *',[server])).rows[0]||null}
async function clear(){return (await query('DELETE FROM queue RETURNING *')).rows}
async function priority(server,on=true){return (await query('UPDATE queue SET priority=$2 WHERE server_id=$1 RETURNING *',[server,on])).rows[0]||null}
async function move(server,pos){return (await query('UPDATE queue SET position=$2 WHERE server_id=$1 RETURNING *',[server,pos])).rows[0]||null}
async function claim(){const r=await query(`WITH c AS(SELECT server_id FROM queue WHERE status='pending' ORDER BY priority DESC,position ASC LIMIT 1 FOR UPDATE SKIP LOCKED) UPDATE queue q SET status='processing',claimed_at=NOW() FROM c WHERE q.server_id=c.server_id RETURNING q.*`);return r.rows[0]||null}
async function finish(server,status='done'){await query('UPDATE queue SET status=$2 WHERE server_id=$1',[server,status])}
async function paused(){return (await query("SELECT value FROM config WHERE key='queue_paused'")).rows[0]?.value==='true'}
async function setPaused(v){await query(`INSERT INTO config(key,value) VALUES('queue_paused',$1) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()`,[String(v)])}
module.exports={count,list,add,remove,clear,priority,move,claim,finish,paused,setPaused};
