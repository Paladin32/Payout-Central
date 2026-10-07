const {query}=require('../db');
async function get(k,d=null){const r=await query('SELECT value FROM config WHERE key=$1',[k]);return r.rows[0]?.value??d}
async function set(k,v){await query(`INSERT INTO config(key,value,updated_at) VALUES($1,$2,NOW()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()`,[k,String(v)])}
const num=async(k,d)=>{const n=Number(await get(k,d));return Number.isFinite(n)?n:d};const bool=async(k,d=false)=>(await get(k,String(d)))==='true';
module.exports={get,set,num,bool};
