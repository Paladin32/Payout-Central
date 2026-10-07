const {query}=require('../db');
async function set(type,enabled,channel){await query(`INSERT INTO logs_config(type,enabled,channel_id) VALUES($1,$2,$3) ON CONFLICT(type) DO UPDATE SET enabled=EXCLUDED.enabled,channel_id=COALESCE(EXCLUDED.channel_id,logs_config.channel_id)`,[type,enabled,channel||null])}
async function status(){return (await query('SELECT type,enabled,channel_id FROM logs_config ORDER BY type')).rows}
async function send(client,type,msg){const r=(await query('SELECT enabled,channel_id FROM logs_config WHERE type=$1',[type])).rows[0];if(!r?.enabled||!r.channel_id)return;const ch=await client.channels.fetch(r.channel_id).catch(()=>null);if(ch?.isTextBased())await ch.send({content:String(msg).slice(0,1900)}).catch(()=>{})}
module.exports={set,status,send};
