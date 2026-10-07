const crypto=require('crypto');const config=require('../config');
const key=crypto.createHash('sha256').update(config.sessionSecret).digest();
function encrypt(text){const iv=crypto.randomBytes(12);const c=crypto.createCipheriv('aes-256-gcm',key,iv);const enc=Buffer.concat([c.update(text,'utf8'),c.final()]);return [iv,c.getAuthTag(),enc].map(x=>x.toString('base64')).join('.')}
function decrypt(blob){const [a,b,c]=blob.split('.');const d=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(a,'base64'));d.setAuthTag(Buffer.from(b,'base64'));return Buffer.concat([d.update(Buffer.from(c,'base64')),d.final()]).toString('utf8')}
module.exports={encrypt,decrypt};
