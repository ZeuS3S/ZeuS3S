const fs = require('node:fs');
const {
  Client, GatewayIntentBits, SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags, ChannelType, InteractionContextType,
} = require('discord.js');
const {
  joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior,
  VoiceConnectionStatus, entersState, getVoiceConnection,
} = require('@discordjs/voice');
const STATIONS = require('./stations');
const { canControl, stationKey, isStreamUrl } = require('./access');

const DATA_FILE = process.env.DATA_FILE || `${__dirname}/data.json`;
const COLOR = 0xff3b3b;

// --- Config par serveur, sauvegardée dans data.json ---
const data = fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : {};
const cfgOf = (guildId) => (data[guildId] ??= { djRole: null, stay247: false, channelId: null, station: null, volume: 50, custom: {} });
const save = () => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
const stationsOf = (guildId) => ({ ...STATIONS, ...cfgOf(guildId).custom });

// --- Lecture ---
const sessions = new Map(); // guildId -> { player, resource, stopped }

function playStation(guild, channelId, key) {
  const cfg = cfgOf(guild.id);
  const station = stationsOf(guild.id)[key];
  let s = sessions.get(guild.id);
  if (!s) {
    const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
    s = { player, resource: null, stopped: false };
    sessions.set(guild.id, s);
    player.on('error', (e) => console.error(`[${guild.name}] flux en erreur:`, e.message));
    // Un flux live qui coupe passe en Idle : on relance la même station (auto-reconnexion).
    player.on(AudioPlayerStatus.Idle, () => {
      if (!s.stopped) setTimeout(() => !s.stopped && startResource(s, guild.id), 3000);
    });
  }
  s.stopped = false;

  const isNew = !getVoiceConnection(guild.id);
  const connection = joinVoiceChannel({
    channelId, guildId: guild.id, adapterCreator: guild.voiceAdapterCreator, selfDeaf: true,
  });
  connection.subscribe(s.player);
  if (isNew) connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try { // Déplacé de salon : Discord reconnecte seul.
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5000),
      ]);
    } catch { stop(guild.id, false); } // Expulsé : on arrête sans effacer le 24/7.
  });

  Object.assign(cfg, { channelId, station: key });
  save();
  startResource(s, guild.id);
  return station;
}

function startResource(s, guildId) {
  const cfg = cfgOf(guildId);
  const station = stationsOf(guildId)[cfg.station];
  if (!station) return;
  s.resource = createAudioResource(station.url, { inlineVolume: true });
  s.resource.volume.setVolume(cfg.volume / 100);
  s.player.play(s.resource);
}

function stop(guildId, forget = true) {
  const s = sessions.get(guildId);
  if (s) { s.stopped = true; s.player.stop(); sessions.delete(guildId); }
  getVoiceConnection(guildId)?.destroy();
  if (forget) { Object.assign(cfgOf(guildId), { channelId: null, station: null }); save(); }
}

// --- Commandes ---
const stationOption = (o) => o.setName('station').setDescription('La radio').setRequired(true).setAutocomplete(true);
const commands = [
  new SlashCommandBuilder().setName('play').setDescription('Lance une radio dans ton salon vocal').addStringOption(stationOption),
  new SlashCommandBuilder().setName('stop').setDescription('Arrête la radio et quitte le salon'),
  new SlashCommandBuilder().setName('stations').setDescription('Liste des radios disponibles'),
  new SlashCommandBuilder().setName('nowplaying').setDescription('Radio en cours'),
  new SlashCommandBuilder().setName('volume').setDescription('Règle le volume')
    .addIntegerOption((o) => o.setName('valeur').setDescription('1 à 100').setRequired(true).setMinValue(1).setMaxValue(100)),
  new SlashCommandBuilder().setName('admin').setDescription('Configuration de la radio')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild).setContexts(InteractionContextType.Guild)
    .addSubcommand((c) => c.setName('dj-role').setDescription('Rôle requis pour contrôler la radio (vide = tout le monde)')
      .addRoleOption((o) => o.setName('role').setDescription('Rôle DJ')))
    .addSubcommand((c) => c.setName('247').setDescription('Mode 24/7 : la radio reste dans le salon, même vide ou après un redémarrage')
      .addBooleanOption((o) => o.setName('actif').setDescription('Activer ?').setRequired(true)))
    .addSubcommand((c) => c.setName('add-station').setDescription('Ajoute une radio perso à ce serveur')
      .addStringOption((o) => o.setName('nom').setDescription('Nom affiché').setRequired(true).setMaxLength(50))
      .addStringOption((o) => o.setName('url').setDescription('URL du flux (mp3/aac/m3u8)').setRequired(true)))
    .addSubcommand((c) => c.setName('remove-station').setDescription('Supprime une radio perso').addStringOption(stationOption))
    .addSubcommand((c) => c.setName('config').setDescription('Affiche la configuration')),
];

const embed = (description) => new EmbedBuilder().setColor(COLOR).setDescription(description);
const reply = (i, description, ephemeral = false) =>
  i.reply({ embeds: [embed(description)], flags: ephemeral ? MessageFlags.Ephemeral : undefined });

const handlers = {
  async play(i, cfg) {
    const channel = i.member.voice.channel;
    if (!channel) return reply(i, '❌ Rejoins un salon vocal d\'abord.', true);
    if (!channel.joinable || !channel.speakable) return reply(i, '❌ Je n\'ai pas la permission de rejoindre ou parler dans ce salon.', true);
    const key = i.options.getString('station');
    if (!stationsOf(i.guildId)[key]) return reply(i, '❌ Station inconnue. Regarde `/stations`.', true);
    const station = playStation(i.guild, channel.id, key);
    return reply(i, `▶️ **${station.name}** dans <#${channel.id}>${cfg.stay247 ? ' · 24/7' : ''}`);
  },
  async stop(i) {
    if (!getVoiceConnection(i.guildId)) return reply(i, '❌ Aucune radio en cours.', true);
    stop(i.guildId);
    return reply(i, '⏹️ Radio arrêtée.');
  },
  async stations(i) {
    const list = Object.entries(stationsOf(i.guildId)).map(([k, s]) => `${s.name} — \`${k}\``).join('\n');
    return i.reply({ embeds: [embed(list).setTitle('📻 Radios').setFooter({ text: '/play station:<nom>' })] });
  },
  async nowplaying(i, cfg) {
    const station = getVoiceConnection(i.guildId) && stationsOf(i.guildId)[cfg.station];
    if (!station) return reply(i, 'Rien en cours. Lance `/play`.', true);
    return reply(i, `🎶 **${station.name}** dans <#${cfg.channelId}>\n🔊 Volume ${cfg.volume}% · 24/7 ${cfg.stay247 ? 'activé' : 'désactivé'}`);
  },
  async volume(i, cfg) {
    cfg.volume = i.options.getInteger('valeur');
    save();
    sessions.get(i.guildId)?.resource?.volume.setVolume(cfg.volume / 100);
    return reply(i, `🔊 Volume réglé à **${cfg.volume}%**.`);
  },
  async admin(i, cfg) {
    const sub = i.options.getSubcommand();
    if (sub === 'dj-role') {
      cfg.djRole = i.options.getRole('role')?.id ?? null;
      save();
      return reply(i, cfg.djRole ? `🎚️ Seuls les membres <@&${cfg.djRole}> (et les admins) contrôlent la radio.` : '🎚️ Tout le monde peut contrôler la radio.', true);
    }
    if (sub === '247') {
      cfg.stay247 = i.options.getBoolean('actif');
      save();
      return reply(i, cfg.stay247 ? '🔁 Mode 24/7 activé.' : '🔁 Mode 24/7 désactivé : je quitte quand le salon est vide.', true);
    }
    if (sub === 'add-station') {
      const name = i.options.getString('nom');
      const url = i.options.getString('url');
      const key = stationKey(name);
      if (!key) return reply(i, '❌ Nom invalide.', true);
      if (!isStreamUrl(url)) return reply(i, '❌ L\'URL doit commencer par http:// ou https://.', true);
      if (Object.keys(cfg.custom).length >= 25) return reply(i, '❌ Maximum 25 radios perso.', true);
      cfg.custom[key] = { name: `⭐ ${name}`, url };
      save();
      return reply(i, `✅ Radio **${name}** ajoutée (\`${key}\`).`, true);
    }
    if (sub === 'remove-station') {
      const key = i.options.getString('station');
      if (!cfg.custom[key]) return reply(i, '❌ Seules les radios perso peuvent être supprimées.', true);
      delete cfg.custom[key];
      if (cfg.station === key) stop(i.guildId);
      save();
      return reply(i, '🗑️ Radio supprimée.', true);
    }
    return reply(i, [
      `🎚️ Rôle DJ : ${cfg.djRole ? `<@&${cfg.djRole}>` : 'aucun'}`,
      `🔁 24/7 : ${cfg.stay247 ? 'activé' : 'désactivé'}`,
      `🔊 Volume : ${cfg.volume}%`,
      `⭐ Radios perso : ${Object.keys(cfg.custom).length}`,
    ].join('\n'), true);
  },
};
const CONTROL = new Set(['play', 'stop', 'volume']);

// --- Client ---
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

client.once('clientReady', async () => {
  await client.application.commands.set(commands);
  console.log(`Connecté en tant que ${client.user.tag}`);
  // Reprend les radios 24/7 après un redémarrage.
  for (const [guildId, cfg] of Object.entries(data)) {
    const channel = cfg.stay247 && cfg.channelId && client.channels.cache.get(cfg.channelId);
    if (channel?.type === ChannelType.GuildVoice || channel?.type === ChannelType.GuildStageVoice) {
      if (stationsOf(guildId)[cfg.station]) playStation(channel.guild, channel.id, cfg.station);
    }
  }
});

client.on('interactionCreate', async (i) => {
  if (!i.inGuild()) return;
  if (i.isAutocomplete()) {
    const q = i.options.getFocused().toLowerCase();
    const custom = i.commandName === 'admin';
    const list = Object.entries(custom ? cfgOf(i.guildId).custom : stationsOf(i.guildId));
    return i.respond(list.filter(([k, s]) => k.includes(q) || s.name.toLowerCase().includes(q))
      .slice(0, 25).map(([k, s]) => ({ name: s.name, value: k })));
  }
  if (!i.isChatInputCommand()) return;
  const cfg = cfgOf(i.guildId);
  if (CONTROL.has(i.commandName) && !canControl(i.member, cfg)) {
    return reply(i, `❌ Il faut le rôle <@&${cfg.djRole}> pour contrôler la radio.`, true);
  }
  try {
    await handlers[i.commandName]?.(i, cfg);
  } catch (e) {
    console.error(e);
    if (!i.replied) reply(i, '❌ Une erreur est survenue.', true).catch(() => {});
  }
});

// Quitte quand le salon est vide, sauf en 24/7.
client.on('voiceStateUpdate', (oldState) => {
  const connection = getVoiceConnection(oldState.guild.id);
  if (!connection || cfgOf(oldState.guild.id).stay247) return;
  const channel = oldState.guild.channels.cache.get(connection.joinConfig.channelId);
  if (channel && !channel.members.some((m) => !m.user.bot)) stop(oldState.guild.id);
});

client.login(process.env.DISCORD_TOKEN);
