require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  PermissionsBitField
} = require('discord.js');
const config = require('./config');

if (!config.token) {
  throw new Error('DISCORD_TOKEN is required.');
}

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

const authorized = new Map();
const blacklist = new Set();
const queue = [];

function isOwner(message) {
  return Boolean(config.ownerId && message.author.id === config.ownerId);
}

function isAdmin(message) {
  return (
    isOwner(message) ||
    Boolean(message.member?.permissions?.has(PermissionsBitField.Flags.ManageGuild))
  );
}

function adminOnly(message) {
  if (isAdmin(message)) return true;
  message.reply('You need administrator permissions to use this command.').catch(() => {});
  return false;
}

function addAuthorization(id, source = 'admin') {
  authorized.set(id, { addedAt: Date.now(), source });
  maxAuthorized = Math.max(maxAuthorized, authorized.size);
}

function removeAuthorization(id) {
  authorized.delete(id);
}

function getRecentAuthorizations() {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  let count = 0;
  for (const entry of authorized.values()) {
    if (entry.addedAt >= cutoff) count++;
  }
  return count;
}

function helpText(section) {
  const commands = {
    help: 'Show all commands or detailed help for one command.',
    prefix: 'Admin: !prefix set <newPrefix>',
    auth: 'Show authorized count, authorizations added in the last 24 hours, and the all-time maximum.',
    link: 'Show the explicit OAuth2 consent link.',
    stats: 'Show bot status, guild count, stock, queue and uptime.',
    stock: 'Show the current number of explicitly authorized users.',
    queue: 'Show the current request queue.',
    checkserver: 'Check whether the bot can see a Discord server.',
    join: 'Create a consent-based request for a server. It never silently joins accounts.',
    djoin: 'Create the same consent-based request with explicit authorization required.',
    confirm: 'Confirm your pending request before completing OAuth2 authorization.',
    restock: 'Admin: add authorized test/managed stock.',
    grant: 'Admin: grant authorization to a Discord user ID.',
    revoke: 'Admin: revoke authorization from a Discord user ID.',
    blacklist: 'Admin: block a Discord user from requests.',
    unblacklist: 'Admin: remove a Discord user from the blacklist.',
    pause: 'Admin: pause new requests.',
    resume: 'Admin: resume new requests.',
    maintenance: 'Admin: !maintenance on|off'
  };

  if (section) {
    const key = section.toLowerCase();
    return commands[key]
      ? `**Help: ${key}**\n${commands[key]}`
      : `Unknown command. Use ${prefix}help to see all commands.`;
  }

  const publicCommands = [
    [`${prefix}help [command]`, 'Show command help'],
    [`${prefix}auth`, 'Show authorization statistics'],
    [`${prefix}link`, 'Show the OAuth2 consent link'],
    [`${prefix}stats`, 'Show bot statistics'],
    [`${prefix}stock`, 'Show available stock'],
    [`${prefix}queue`, 'Show the request queue'],
    [`${prefix}checkserver <serverId>`, 'Check a server'],
    [`${prefix}join <serverId>`, 'Start a consent-based request'],
    [`${prefix}djoin <serverId>`, 'Start the consent workflow'],
    [`confirm`, 'Confirm a pending request']
  ];

  const adminCommands = [
    [`${prefix}prefix set <prefix>`, 'Change the prefix'],
    [`${prefix}restock <number>`, 'Add managed stock'],
    [`${prefix}grant <userId>`, 'Grant authorization'],
    [`${prefix}revoke <userId>`, 'Revoke authorization'],
    [`${prefix}blacklist <userId>`, 'Blacklist a user'],
    [`${prefix}unblacklist <userId>`, 'Remove a blacklist entry'],
    [`${prefix}pause`, 'Pause new requests'],
    [`${prefix}resume`, 'Resume new requests'],
    [`${prefix}maintenance on|off`, 'Toggle maintenance mode']
  ];

  const format = list => list.map(([cmd, desc]) => `• \`${cmd}\` — ${desc}`).join('\n');

  return [
    '**Payout Central — Commands**',
    '',
    '**User commands**',
    format(publicCommands),
    '',
    '**Admin commands**',
    format(adminCommands),
    '',
    `Use ${prefix}help <command> for details.`
  ].join('\n');
}

client.once('ready', () => {
  startedAt = Date.now();
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Prefix: ${prefix}`);
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
    if (
      maintenance &&
      !isAdmin(message) &&
      !['help', 'stats', 'link'].includes(command)
    ) {
      return message.reply('The service is currently in maintenance mode.');
    }

    if (blacklist.has(message.author.id) && !isAdmin(message)) {
      return message.reply('You are currently blocked from using this service.');
    }

    if (command === 'help') {
      return message.reply(helpText(args[0]));
    }

    if (command === 'prefix') {
      if (!adminOnly(message)) return;
      if (args[0] !== 'set' || !args[1]) {
        return message.reply(`Usage: ${prefix}prefix set <prefix>`);
      }
      if (args[1].length > 5) {
        return message.reply('The prefix must be between 1 and 5 characters.');
      }
      prefix = args[1];
      return message.reply(`Prefix changed to \`${prefix}\`.`);
    }

    if (command === 'auth') {
      return message.reply([
        '**Authorization**',
        `Authorized: **${authorized.size}**`,
        `Added in last 24h: **${getRecentAuthorizations()}**`,
        `All-time maximum: **${maxAuthorized}**`
      ].join('\n'));
    }

    if (command === 'stats') {
      const uptime = Math.floor((Date.now() - startedAt) / 1000);
      const status = maintenance ? 'Maintenance' : paused ? 'Paused' : 'Online';
      return message.reply([
        '**Payout Central**',
        `Status: **${status}**`,
        `Guilds: **${client.guilds.cache.size}**`,
        `Authorized stock: **${authorized.size}**`,
        `Queue: **${queue.length}**`,
        `Uptime: **${uptime}s**`
      ].join('\n'));
    }

    if (command === 'stock') {
      return message.reply(
        `Available stock: **${authorized.size}** explicitly authorized user(s).`
      );
    }

    if (command === 'queue') {
      return message.reply([
        `Queue status: **${paused ? 'Paused' : 'Active'}**`,
        `Pending requests: **${queue.length}**`
      ].join('\n'));
    }

    if (command === 'link') {
      if (!config.clientId || !config.redirectUri) {
        return message.reply(
          'OAuth2 is not configured yet. Set DISCORD_CLIENT_ID and OAUTH2_REDIRECT_URI.'
        );
      }

      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: config.scopes.join(' ')
      });

      return message.reply(
        `Authorize explicitly here: <https://discord.com/oauth2/authorize?${params.toString()}>`
      );
    }

    if (command === 'checkserver') {
      const guildId = args[0];
      if (!guildId) {
        return message.reply(`Usage: ${prefix}checkserver <serverId>`);
      }

      const guild = client.guilds.cache.get(guildId);

      return message.reply(
        guild
          ? `Server **${guild.name}** (${guild.id}) is visible to the bot.`
          : 'The bot cannot see that server. Make sure it is installed there and the ID is correct.'
      );
    }

    if (command === 'join' || command === 'djoin') {
      const guildId = args[0];

      if (!guildId) {
        return message.reply(`Usage: ${prefix}${command} <serverId>`);
      }

      if (paused) {
        return message.reply('New requests are currently paused.');
      }

      if (!config.clientId || !config.redirectUri) {
        return message.reply(
          'OAuth2 is not configured. Configure the Discord application and use !link for explicit authorization.'
        );
      }

      queue.push({
        userId: message.author.id,
        guildId,
        createdAt: Date.now()
      });

      return message.reply([
        `Request queued for server **${guildId}**.`,
        'Explicit user consent is required.',
        `Use ${prefix}link to authorize.`
      ].join('\n'));
    }

    if (command === 'confirm') {
      const index = queue.findIndex(item => item.userId === message.author.id);

      if (index === -1) {
        return message.reply('You have no pending request.');
      }

      const request = queue[index];
      queue.splice(index, 1);

      return message.reply([
        `Request for **${request.guildId}** confirmed.`,
        `Please complete the explicit OAuth2 authorization with ${prefix}link.`
      ].join('\n'));
    }

    if (command === 'restock') {
      if (!adminOnly(message)) return;

      const amount = Number(args[0]);

      if (!Number.isInteger(amount) || amount <= 0 || amount > 10000) {
        return message.reply(`Usage: ${prefix}restock <number> (1-10000)`);
      }

      for (let i = 0; i < amount; i++) {
        addAuthorization(`managed-${Date.now()}-${i}`, 'restock');
      }

      return message.reply(
        `Restocked **${amount}**. Current stock: **${authorized.size}**.`
      );
    }

    if (command === 'grant' || command === 'revoke') {
      if (!adminOnly(message)) return;

      const userId = args[0]?.replace(/[<@!>]/g, '');

      if (!userId) {
        return message.reply(`Usage: ${prefix}${command} <userId>`);
      }

      if (command === 'grant') {
        addAuthorization(userId, 'admin');
        return message.reply(`Authorization granted to **${userId}**.`);
      }

      removeAuthorization(userId);
      return message.reply(`Authorization revoked for **${userId}**.`);
    }

    if (command === 'blacklist' || command === 'unblacklist') {
      if (!adminOnly(message)) return;

      const userId = args[0]?.replace(/[<@!>]/g, '');

      if (!userId) {
        return message.reply(`Usage: ${prefix}${command} <userId>`);
      }

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

      return message.reply(
        paused
          ? 'Request processing is paused.'
          : 'Request processing has resumed.'
      );
    }

    if (command === 'maintenance') {
      if (!adminOnly(message)) return;

      const mode = args[0]?.toLowerCase();

      if (!['on', 'off'].includes(mode)) {
        return message.reply(`Usage: ${prefix}maintenance on|off`);
      }

      maintenance = mode === 'on';

      return message.reply(
        `Maintenance mode: **${maintenance ? 'ON' : 'OFF'}**`
      );
    }

    return message.reply(`Unknown command. Use ${prefix}help.`);
  } catch (error) {
    console.error('Command error:', error);
    return message.reply('An internal error occurred while processing that command.');
  }
});

client.login(config.token).catch(error => {
  console.error('Discord login failed:', error);
  process.exit(1);
});
