const {query}=require('../db');const stock=require('./stock');const queue=require('./queue');const oauth=require('./oauth');const logging=require('./logging');const cfg=require('./config');
async function joinWithOAuth(serverId,userId,encryptedAccess,client){
  const access=oauth.decrypt(encryptedAccess);
  const exists=await fetch(`https://discord.com/api/v10/guilds/${serverId}/members/${userId}`,{headers:{Authorization:`Bot ${client.token}`}});
  if(exists.ok)return {status:'already_member'};
  const r=await fetch(`https://discord.com/api/v10/guilds/${serverId}/members/${userId}`,{method:'PUT',headers:{Authorization:`Bot ${client.token}`,'Content-Type':'application/json'},body:JSON.stringify({access_token:access})});
  if(r.ok||r.status===204)return {status:'joined'};
  return {status:'failed',error:`Discord API ${r.status}: ${(await r.text()).slice(0,300)}`};
}
async function processOne(client){
  if(await queue.paused())return false;
  const item=await queue.claim();if(!item)return false;
  const req=(await query(`INSERT INTO requests(requester_id,server_id,amount,status,started_at) VALUES($1,$2,$3,'processing',NOW()) RETURNING id`,[item.requester_id,item.server_id,item.amount])).rows[0].id;
  const ids=await stock.assign(item.amount);let delivered=0,failed=0;
  try{
    for(const id of ids){
      const a=(await query(`SELECT access_token FROM oauth_authorizations WHERE user_id=$1 AND revoked_at IS NULL`,[id])).rows[0];
      if(!a){failed++;await stock.release([id]);continue}
      await query(`INSERT INTO request_accounts(request_id,user_id,status) VALUES($1,$2,'assigned') ON CONFLICT DO NOTHING`,[req,id]);
      try{const result=await joinWithOAuth(item.server_id,id,a.access_token,client);if(result.status==='joined'||result.status==='already_member'){delivered++;await query(`UPDATE request_accounts SET status=$3,processed_at=NOW() WHERE request_id=$1 AND user_id=$2`,[req,id,result.status]);await query('UPDATE stock SET last_used_at=NOW(),assigned=false WHERE user_id=$1',[id]);await query('UPDATE users SET members_received=members_received+1 WHERE user_id=$1',[item.requester_id])}else{failed++;await query(`UPDATE request_accounts SET status='failed',error=$3,processed_at=NOW() WHERE request_id=$1 AND user_id=$2`,[req,id,result.error]);await stock.release([id])}}catch(e){failed++;await query(`UPDATE request_accounts SET status='failed',error=$3,processed_at=NOW() WHERE request_id=$1 AND user_id=$2`,[req,id,e.message]);await stock.release([id])}
    }
    const status=delivered>0?'completed':'failed';await query(`UPDATE requests SET status=$2,delivered=$3,failed=$4,completed_at=NOW() WHERE id=$1`,[req,status,delivered,failed]);await queue.finish(item.server_id,status);await logging.send(client,'farm',`Queue job for ${item.server_id} finished: ${delivered} delivered, ${failed} failed.`);
  }catch(e){await query(`UPDATE requests SET status='failed',error=$2,completed_at=NOW() WHERE id=$1`,[req,e.message]);await queue.finish(item.server_id,'failed');await stock.release(ids.filter(x=>x));await logging.send(client,'errors',`Queue worker error: ${e.message}`)}
  return true;
}
function start(client){setInterval(()=>processOne(client).catch(e=>logging.send(client,'errors',`Worker loop: ${e.message}`)),3000)}
module.exports={start};
