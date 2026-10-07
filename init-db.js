require('dotenv').config();
const fs=require('fs'); const path=require('path'); const {Pool}=require('pg');
const pool=new Pool({connectionString:process.env.DATABASE_URL});
(async()=>{await pool.query(fs.readFileSync(path.join(__dirname,'../sql/schema.sql'),'utf8')); console.log('Database initialized.'); await pool.end();})().catch(e=>{console.error(e);process.exit(1)});
