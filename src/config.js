require('dotenv').config();
module.exports={
 token:process.env.DISCORD_TOKEN||'',
 clientId:process.env.DISCORD_CLIENT_ID||'',
 clientSecret:process.env.DISCORD_CLIENT_SECRET||'',
 db:process.env.DATABASE_URL||'',
 ownerId:process.env.BOT_OWNER_ID||'',
 sessionSecret:process.env.SESSION_SECRET||'change-me',
 redirectUri:process.env.OAUTH2_REDIRECT_URI||'',
 scopes:(process.env.OAUTH2_SCOPES||'identify guilds.join').split(/\s+/).filter(Boolean),
 port:Number(process.env.PORT||3000),
 verifiedRoleId:process.env.VERIFIED_ROLE_ID||'',
 stateTtl:Number(process.env.OAUTH_STATE_TTL||600)
};