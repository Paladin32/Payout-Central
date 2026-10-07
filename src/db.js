const {Pool}=require('pg');
const config=require('./config');
const pool=new Pool({connectionString:config.db,max:10});
const query=(text,params=[])=>pool.query(text,params);
module.exports={pool,query};