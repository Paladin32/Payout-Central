require('dotenv').config();
const {Client,GatewayIntentBits}=require('discord.js');
const config=require('./config');

if(!config.token) throw new Error('DISCORD_TOKEN is required.');

const client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent]});
let prefix='!';

client.once('ready',()=>console.log(`Logged in as ${client.user.tag}`));
client.on('messageCreate',async message=>{
 if(message.author.bot||!message.content.startsWith(prefix)) return;
 const args=message.content.slice(prefix.length).trim().split(/\s+/);
 const command=(args.shift()||'').toLowerCase();

 if(command==='help'){
   return message.reply([
     '**Payout Central**',
     `${prefix}help — Show commands`,
     `${prefix}prefix set <prefix> — Change the prefix`,
     `${prefix}auth — Show authorization configuration`,
     `${prefix}stats — Show runtime statistics`
   ].join('\n'));
 }
 if(command==='prefix'&&args[0]==='set'&&args[1]){
   if(args[1].length>5) return message.reply('The prefix must be 1–5 characters.');
   prefix=args[1];
   return message.reply(`Prefix changed to \`${prefix}\`.`);
 }
 if(command==='auth'){
   return message.reply(`OAuth2 redirect: ${config.redirectUri||'not configured'}\nScopes: ${config.scopes.join(', ')}`);
 }
 if(command==='stats'){
   return message.reply(`Connected as **${client.user.tag}**\nGuilds: **${client.guilds.cache.size}**`);
 }
});

client.login(config.token);