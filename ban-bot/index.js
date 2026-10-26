require('dotenv').config();
const { Client, GatewayIntentBits, PermissionFlagsBits, ActivityType } = require('discord.js');
const store = require('./store');
const { eph } = require('./util');
const panels = [require('./panels/piege'), require('./panels/statut'), require('./panels/logs'), require('./panels/bienvenue')];
const byName = Object.fromEntries(panels.map((p) => [p.name, p]));
const logs = require('./panels/logs');

const { DISCORD_TOKEN, GUILD_ID } = process.env;
if (!DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN est obligatoire (voir .env.example).');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
});

// ---------- Rôle selon le statut ----------
const statusText = (presence) =>
  (presence?.activities?.find((a) => a.type === ActivityType.Custom)?.state ?? '').toLowerCase();

async function syncMember(member, presence) {
  if (!member || member.user.bot) return;
  const rules = store.get(member.guild.id).statusRules;
  if (!rules.length) return;
  const text = statusText(presence);
  const wanted = new Set(rules.filter((r) => text.includes(r.keyword.toLowerCase())).map((r) => r.roleId));
  for (const roleId of new Set(rules.map((r) => r.roleId))) {
    const has = member.roles.cache.has(roleId);
    try {
      if (wanted.has(roleId) && !has) {
        await member.roles.add(roleId, 'Mot-clé dans le statut');
        await logs.record(member.guild, { type: 'role_add', userId: member.id, tag: member.user.tag, detail: `<@&${roleId}>` });
      } else if (!wanted.has(roleId) && has) {
        await member.roles.remove(roleId, 'Mot-clé retiré du statut');
        await logs.record(member.guild, { type: 'role_remove', userId: member.id, tag: member.user.tag, detail: `<@&${roleId}>` });
      }
    } catch (err) {
      console.error(`Rôle impossible pour ${member.user.tag} (mon rôle doit être au-dessus) :`, err.message);
    }
  }
}

async function syncGuild(guild) {
  if (!store.get(guild.id).statusRules.length) return;
  const members = await guild.members.fetch({ withPresences: true }).catch(() => null);
  if (!members) return;
  for (const m of members.values()) await syncMember(m, m.presence);
}

client.once('clientReady', async () => {
  console.log(`Connecté en tant que ${client.user.tag}`);
  const defs = panels.map((p) => p.command.toJSON());
  if (GUILD_ID) await client.application.commands.set(defs, GUILD_ID); // instantané, pour un seul serveur
  else await client.application.commands.set(defs);
  for (const guild of client.guilds.cache.values()) await syncGuild(guild);
});

client.on('presenceUpdate', (_old, presence) => syncMember(presence.member, presence));
client.on('guildMemberAdd', (member) => byName.bienvenue.onJoin(member));

// ---------- Salon piège ----------
client.on('messageCreate', async (message) => {
  if (!message.guild || message.author.bot) return;
  const t = store.get(message.guild.id).trap;
  if (!t.enabled || message.channelId !== t.channelId) return;

  const member = message.member ?? (await message.guild.members.fetch(message.author.id).catch(() => null));
  if (!member) return;
  if (member.permissions.has(PermissionFlagsBits.ManageMessages) || member.permissions.has(PermissionFlagsBits.BanMembers)) return;
  if (t.exemptRoles.some((r) => member.roles.cache.has(r))) return;

  const reason = 'A écrit dans le salon piège';
  const content = (message.content || 'message vide').slice(0, 300);
  try {
    if (t.action === 'ban') {
      if (!member.bannable) return console.warn(`Ban impossible pour ${message.author.tag} (rôle trop haut).`);
      await member.ban({ deleteMessageSeconds: t.deleteSeconds, reason });
    } else if (t.action === 'kick') {
      if (!member.kickable) return console.warn(`Expulsion impossible pour ${message.author.tag}.`);
      await message.delete().catch(() => {});
      await member.kick(reason);
    } else {
      if (!member.moderatable) return console.warn(`Sourdine impossible pour ${message.author.tag}.`);
      await message.delete().catch(() => {});
      await member.timeout(t.timeoutMinutes * 60_000, reason);
    }
    await logs.record(message.guild, { type: t.action, userId: member.id, tag: member.user.tag, detail: content });
    t.count = (t.count ?? 0) + 1;
    store.save();
    byName.piege.syncNotice(message.guild).catch(() => {});
  } catch (err) {
    console.error('Action du piège échouée :', err);
  }
});

// ---------- Commandes et composants ----------
client.on('interactionCreate', async (i) => {
  try {
    if (!i.inGuild()) return;
    if (i.isChatInputCommand()) {
      const panel = byName[i.commandName];
      if (panel) await i.reply({ ...panel.render(i.guildId), ...eph });
      return;
    }
    if (!i.customId) return;
    const panel = byName[i.customId.split(':')[0]];
    if (!panel) return;
    if (!i.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return void i.reply({ content: 'Réservé aux administrateurs.', ...eph });
    }
    await panel.handle(i, { syncGuild });
  } catch (err) {
    console.error('Erreur d’interaction :', err);
    const msg = { content: 'Une erreur est survenue.', ...eph };
    if (i.replied || i.deferred) i.followUp(msg).catch(() => {});
    else if (i.isRepliable()) i.reply(msg).catch(() => {});
  }
});

client.login(DISCORD_TOKEN);
