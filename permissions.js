const {query}=require('../db');const config=require('../config');const cfg=require('./config');
const norm=s=>String(s).toLowerCase().replace(/^!/,'');const owner=id=>id===config.ownerId;
async function ensure(u){await query(`INSERT INTO users(user_id,username) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET username=EXCLUDED.username`,[u.id,u.tag||u.username])}
async function has(id,c){if(owner(id))return true;const r=await query(`SELECT 1 FROM permissions WHERE user_id=$1 AND command IN($2,'all')`,[id,norm(c)]);return r.rowCount>0}
async function grant(id,c,by){await query(`INSERT INTO permissions(user_id,command,granted_by) VALUES($1,$2,$3) ON CONFLICT DO NOTHING`,[id,norm(c),by])}
async function revoke(id,c){if(norm(c)==='all')await query('DELETE FROM permissions WHERE user_id=$1',[id]);else await query('DELETE FROM permissions WHERE user_id=$1 AND command=$2',[id,norm(c)])}
async function list(id){return (await query('SELECT command FROM permissions WHERE user_id=$1 ORDER BY command',[id])).rows.map(x=>x.command)}
async function maint(id){if(owner(id))return true;return (await query('SELECT 1 FROM maintenance_allowed WHERE user_id=$1',[id])).rowCount>0}
module.exports={ensure,owner,has,grant,revoke,list,maint};
