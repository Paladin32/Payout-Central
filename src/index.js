require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder
} = require('discord.js');
const config = require('./config');

if (!config.token) throw new Error('DISCORD_TOKEN is required.');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

let prefix = '!';
let maintenance = false;
let paused = false;
let startedAt = Date.now();
let maxAuthorized = 0;
const authorized = new Set();
const blacklist = new Set();
const queue = [];

const isOwner = (message) =>
  Boolean(config.ownerId && message.author.id === config.ownerId);

const isAdmin = (message) =>
  isOwner(message) ||
  message.member?.permissions?.has(PermissionsBitField.Flags.ManageGuild);

function adminOnly(message) {
  if (!isAdmin(message)) {
    message.reply('You need administrator permissions to use this command.').catch(() => {});
    return false;
  }
  return true;
}

function helpText(section) {
  const common = [
    `**Payout Central — Commands**`,
    `\${prefix}help [command] — Show command help`,
    `\${prefix}prefix set <prefix> — Change the prefix`,
    `\${prefix}auth — Show authorization statistics`,
    `\${prefix}link — Show the OAuth2 consent link`,
    `\${prefix}stats — Show bot statistics`,
    `\${prefix}stock — Show available stock`,
    `\${prefix}queue — Show the current queue`,
    `\${prefix}checkserver <serverId> — Check whether the bot can see a server`,
    `\${prefix}join <serverId> — Start the explicit consent workflow`,
    `\${prefix}djoin <serverId> — Show the manual/consent workflow`,
    `confirm — Confirm an interactive request`
  ];

  const admin = [
    `\${prefix}restock <number> — Add authorized stock`,
    `\${prefix}grant <userId> — Grant authorization status`,
    `\${prefix}revoke <userId> — Revoke authorization status`,
    `\${prefix}blacklist <userId> — Block a user from requests`,
    `\${prefix}unblacklist <userId> — Remove a user from the blacklist`,
    `\${prefix}pause — Pause new requests`,
    `\${prefix}resume — Resume requests`,
    `\${prefix}maintenance on|off — Toggle maintenance mode`
  ];

  const details = {
    help: 'Use !help or !help <command> for command information.',
    prefix: 'Admin: !prefix set <newPrefix>',
    auth: 'Shows authorized users, additions in the current 24h window, and the all-time maximum.',
    link: 'Displays the configured OAuth2 consent URL. The user must explicitly authorize access.',
    stats: 'Shows runtime, guild count, queue size, stock and service state.',
    stock: 'Shows the number of explicitly authorized users currently available.',
    queue: 'Shows the current request queue and whether processing is paused.',
    checkserver: 'Checks whether this bot can access the specified guild. It does not add accounts automatically.',
    join: 'Begins a consent-based request. No account is joined automatically by this command.',
    djoin: 'Shows the same consent-based workflow and safety status.',
    confirm: 'Confirms the current interactive request when one is pending.',
    restock: 'Admin: !restock <number>',
    grant: 'Admin: !grant <userId>',
    revoke: 'Admin: !revoke <userId>',
    blacklist: 'Admin: !blacklist <userId>',
    unblacklist: 'Admin: !unblacklist <userId>',
    pause: 'Admin: pauses new requests.',
    resume: 'Admin: resumes new requests.',
    maintenance: 'Admin: !maintenance on or !maintenance off'
  };

  if (section) {
    return details[section]
      ? `**Help: ${section}**\\n${details[section]}`
      : 'Unknown command. Use !help to see all commands.';
  }

  return common.concat(['', '**Admin commands**']).concat(admin).join('\n');
}

client.once('ready', () => {
  startedAt = Date.now();
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const raw = message.content.slice(prefix.length).trim();
  if (!raw) return;

  const parts = raw.split(/\s+/);
  const command = (parts.shift() || '').toLowerCase();
  const args = parts;

  try {
    if (maintenance && !isAdmin(message) && !['help', 'stats', 'link'].includes(command)) {
      return message.reply('The service is currently in maintenance mode.');
    }

    if (blacklist.has(message.author.id) && !isAdmin(message)) {
      return message.reply('You are currently blocked from using this service.');
    }

    if (command === 'help') return message.reply(helpText(args[0]?.toLowerCase()));

    if (command === 'prefix') {
      if (!adminOnly(message)) return;
      if (args[0] !== 'set' || !args[1]) return message.reply(`Usage: ${prefix}prefix set <prefix>`);
      if (args[1].length > 5) return message.reply('The prefix must be 1–5 characters.');
      prefix = args[1];
      return message.reply(`Prefix changed to \`${prefix}\`.`);
    }

    if (command === 'auth') {
      const recent = [...authorized].length;
      return message.reply(
        `**Authorization**\\nAuthorized: **${authorized.size}**\\nAdded in last 24h: **${recent}**\\nAll-time maximum: **${Math.max(maxAuthorized, authorized.size)}**`
      );
    }

    if (command === 'stats') {
      const uptime = Math.floor((Date.now() - startedAt) / 1000);
      return message.reply(
        `**Payout Central**\\nStatus: **${maintenance ? 'Maintenance' : paused ? 'Paused' : 'Online'}**\\nGuilds: **${client.guilds.cache.size}**\\nAuthorized stock: **${authorized.size}**\\nQueue: **${queue.length}**\\nUptime: **${uptime}s**`
      );
    }

    if (command === 'stock') {
      return message.reply(`Available stock: **${authorized.size}** explicitly authorized account(s).`);
    }

    if (command === 'queue') {
      return message.reply(
        `Queue status: **${paused ? 'Paused' : 'Active'}**\\nPending requests: **${queue.length}**`
      );
    }

    if (command === 'link') {
      if (!config.redirectUri || !config.clientId) {
        return message.reply('OAuth2 is not configured yet. Set DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET and OAUTH2_REDIRECT_URI first.');
      }
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: config.scopes.join(' ')
      });
      return message.reply(`Authorize explicitly here: <https://discord.com/oauth2/authorize?${params.toString()}>`);
    }

    if (command === 'checkserver') {
      const guildId = args[0];
      if (!guildId) return message.reply(`Usage: ${prefix}checkserver <serverId>`);
      const guild = client.guilds.cache.get(guildId);
      return message.reply(
        guild
          ? `Server **${guild.name}** (${guild.id}) is visible to the bot.`
          : 'The bot cannot see that server. Make sure it is installed there and the ID is correct.'
      );
    }

    if (command === 'join' || command === 'djoin') {
      const guildId = args[0];
      if (!guildId) return message.reply(`Usage: ${prefix}${command} <serverId>`);
      if (paused) return message.reply('New requests are currently paused.');
      if (!config.clientId || !config.redirectUri) {
        return message.reply('OAuth2 is not configured. Use the explicit OAuth2 consent link after configuring the application.');
      }
      queue.push({ userId: message.author.id, guildId, createdAt: Date.now() });
      return message.reply(
        `Request queued for server **${guildId}**. This service requires explicit user consent; it will not silently or automatically add accounts to servers. Use ${prefix}link to authorize.`
      );
    }

    if (command === 'confirm') {
      const index = queue.findIndex((x) => x.userId === message.author.id);
      if (index === -1) return message.reply('You have no pending request.');
      const request = queue[index];
      queue.splice(index, 1);
      return message.reply(
        `Request for **${request.guildId}** confirmed. Please complete the explicit OAuth2 authorization shown by ${prefix}link.`
      );
    }

    if (command === 'restock') {
      if (!adminOnly(message)) return;
      const amount = Number(args[0]);
      if (!Number.isInteger(amount) || amount <= 0) return message.reply(`Usage: ${prefix}restock <positive number>`);
      for (let i = 0; i < amount; i++) authorized.add(`restock-${Date.now()}-${i}`);
      maxAuthorized = Math.max(maxAuthorized, authorized.size);
      return message.reply(`Restocked **${amount}**. Current stock: **${authorized.size}**.`);
    }

    if (command === 'grant' || command === 'revoke') {
      if (!adminOnly(message)) return;
      const userId = args[0]?.replace(/[<@!>]/g, '');
      if (!userId) return message.reply(`Usage: ${prefix}${command} <userId>`);
      if (command === 'grant') {
        authorized.add(userId);
        maxAuthorized = Math.max(maxAuthorized, authorized.size);
        return message.reply(`Authorization granted to **${userId}**.`);
      }
      authorized.delete(userId);
      return message.reply(`Authorization revoked for **${userId}**.`);
    }

    if (command === 'blacklist' || command === 'unblacklist') {
      if (!adminOnly(message)) return;
      const userId = args[0]?.replace(/[<@!>]/g, '');
      if (!userId) return message.reply(`Usage: ${prefix}${command} <userId>`);
      if (command === 'blacklist') {
        blacklist.add(userId);
        return message.reply(`User **${userId}** has been blacklisted.`);
      }
      blacklist.delete(userId);
      return message.reply(`User **${userId}** has been removed from the blacklist.`);
    }

    if (command === 'pause' || command === 'resume') {
      if (!adminOnly(message)) return;
      paused = command === 'pause';
      return message.reply(paused ? 'Request processing is paused.' : 'Request processing has resumed.');
    }

    if (command === 'maintenance') {
      if (!adminOnly(message)) return;
      const mode = args[0]?.toLowerCase();
      if (!['on', 'off'].includes(mode)) return message.reply(`Usage: ${prefix}maintenance on|off`);
      maintenance = mode === 'on';
      return message.reply(`Maintenance mode: **${maintenance ? 'ON' : 'OFF'}**`);
    }

    return message.reply(`Unknown command. Use ${prefix}help.`);
  } catch (error) {
    console.error(error);
    return message.reply('An internal error occurred while processing that command.');
  }
});

client.login(config.token);
