const fs = require('node:fs');
const {
  Client, GatewayIntentBits, SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags, ChannelType, InteractionContextType,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ActivityType,
} = require('discord.js');
const {
  joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior,
  VoiceConnectionStatus, entersState, getVoiceConnection,
} = require('@discordjs/voice');
const STATIONS = require('./stations');
const { canControl, stationKey, isStreamUrl, volumeBar } = require('./access');
const { fetchTitle } = require('./icy');

const DATA_FILE = process.env.DATA_FILE || `${__dirname}/data.json`;
const COLOR = 0xff3b3b;
const PAUSE_COLOR = 0x5865f2;
const REFRESH_MS = 15000;

// --- Config par serveur, sauvegardée dans data.json ---
const data = fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : {};
const cfgOf = (guildId) => (data[guildId] ??= { djRole: null, stay247: false, channelId: null, station: null, volume: 50, custom: {} });
const save = () => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
const stationsOf = (guildId) => ({ ...STATIONS, ...cfgOf(guildId).custom });

// --- Lecture ---
const sessions = new Map(); // guildId -> { player, resource, stopped, paused, title, history, startedAt, requester, panel, timer }

function playStation(guild, channelId, key, requester) {
  const cfg = cfgOf(guild.id);
  const station = stationsOf(guild.id)[key];
  let s = sessions.get(guild.id);
  if (!s) {
    const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
    s = { player, resource: null, stopped: false, paused: false, history: [], panel: null, lastRender: null };
    s.timer = setInterval(() => refresh(guild).catch(() => {}), REFRESH_MS);
    sessions.set(guild.id, s);
    player.on('error', (e) => console.error(`[${guild.name}] flux en erreur:`, e.message));
    // Un flux live qui coupe passe en Idle : on relance la même station (auto-reconnexion).
    player.on(AudioPlayerStatus.Idle, () => {
      if (!s.stopped) setTimeout(() => !s.stopped && startResource(s, guild.id), 3000);
    });
  }
  Object.assign(s, { stopped: false, paused: false, requester });

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

  cfg.channelId = channelId;
  switchStation(guild, key);
  return station;
}

function switchStation(guild, key) {
  const s = sessions.get(guild.id);
  const cfg = cfgOf(guild.id);
  cfg.station = key;
  save();
  Object.assign(s, { stopped: false, paused: false, title: null, history: [], startedAt: Math.floor(Date.now() / 1000) });
  startResource(s, guild.id);
  refresh(guild).catch(() => {});
}

function togglePause(guild) {
  const s = sessions.get(guild.id);
  // Un direct ne se met pas vraiment en pause : on coupe le flux et on reprend le direct au retour.
  s.paused = !s.paused;
  s.stopped = s.paused;
  if (s.paused) s.player.stop(); else startResource(s, guild.id);
  updatePresence();
}

function setVolume(guildId, volume) {
  const cfg = cfgOf(guildId);
  cfg.volume = Math.min(100, Math.max(0, volume));
  save();
  sessions.get(guildId)?.resource?.volume.setVolume(cfg.volume / 100);
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
  const channelId = cfgOf(guildId).channelId;
  if (s) {
    s.stopped = true;
    s.player.stop();
    clearInterval(s.timer);
    s.panel?.edit({ embeds: [embed('⏹️ Radio arrêtée.')], components: [] }).catch(() => {});
    sessions.delete(guildId);
  }
  getVoiceConnection(guildId)?.destroy();
  if (channelId) setVoiceStatus(channelId, '');
  updatePresence();
  if (forget) { Object.assign(cfgOf(guildId), { channelId: null, station: null }); save(); }
}

// --- Panneau « en cours » ---
function panelPayload(guild) {
  const cfg = cfgOf(guild.id);
  const s = sessions.get(guild.id);
  const stations = stationsOf(guild.id);
  const station = stations[cfg.station];
  const listeners = guild.channels.cache.get(cfg.channelId)?.members.filter((m) => !m.user.bot).size ?? 0;

  const e = new EmbedBuilder()
    .setColor(s.paused ? PAUSE_COLOR : COLOR)
    .setAuthor({ name: s.paused ? '⏸️ EN PAUSE' : '🔴 EN DIRECT' })
    .setTitle(station.name)
    .setDescription(`🎵 **${s.title ?? 'Titre non communiqué par la radio'}**`)
    .addFields(
      { name: '🔊 Salon', value: `<#${cfg.channelId}>`, inline: true },
      { name: '👥 Auditeurs', value: `${listeners}`, inline: true },
      { name: '⏱️ En direct', value: `<t:${s.startedAt}:R>`, inline: true },
      { name: `🔉 Volume · ${cfg.volume}%`, value: volumeBar(cfg.volume) },
    )
    .setFooter({ text: `${cfg.stay247 ? '🔁 24/7 · ' : ''}Lancé par ${s.requester}` });
  if (s.history.length) e.addFields({ name: '📜 Juste avant', value: s.history.map((t) => `• ${t}`).join('\n') });

  const button = (id, emoji, style = ButtonStyle.Secondary) =>
    new ButtonBuilder().setCustomId(`radio:${id}`).setEmoji(emoji).setStyle(style);
  return {
    embeds: [e],
    components: [
      new ActionRowBuilder().addComponents(
        button('prev', '⏮️'),
        button('toggle', s.paused ? '▶️' : '⏸️', ButtonStyle.Primary),
        button('next', '⏭️'),
        button('random', '🎲'),
        button('stop', '⏹️', ButtonStyle.Danger),
      ),
      new ActionRowBuilder().addComponents(
        button('voldown', '🔉'),
        button('volup', '🔊'),
        button('mute', cfg.volume ? '🔇' : '🔈'),
        button('refresh', '🔄'),
      ),
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('radio:select').setPlaceholder('📻 Changer de radio')
          .addOptions(Object.entries(stations).slice(0, 25).map(([k, st]) => ({ label: st.name, value: k, default: k === cfg.station }))),
      ),
    ],
  };
}

// Met à jour titre, panneau, statut du salon et présence. Appelé toutes les 15 s et à chaque action.
async function refresh(guild) {
  const s = sessions.get(guild.id);
  if (!s) return;
  const cfg = cfgOf(guild.id);
  if (!s.paused) {
    const title = await fetchTitle(stationsOf(guild.id)[cfg.station].url);
    if (title && title !== s.title) {
      if (s.title) s.history = [s.title, ...s.history].slice(0, 3);
      s.title = title;
    }
  }
  if (!sessions.has(guild.id)) return; // Arrêté pendant la lecture du titre.
  const station = stationsOf(guild.id)[cfg.station];
  const status = s.paused ? '⏸️ En pause' : `📻 ${station.name}${s.title ? ` · ${s.title}` : ''}`;
  if (status !== s.lastStatus) setVoiceStatus(cfg.channelId, (s.lastStatus = status));
  updatePresence();
  const payload = panelPayload(guild);
  const render = JSON.stringify(payload);
  if (s.panel && render !== s.lastRender) {
    s.lastRender = render;
    await s.panel.edit(payload).catch(() => { s.panel = null; }); // Panneau supprimé : on l'oublie.
  }
}

// Statut affiché sous le nom du salon vocal (permission « Définir le statut du salon vocal » requise, sinon ignoré).
function setVoiceStatus(channelId, status) {
  client.rest.put(`/channels/${channelId}/voice-status`, { body: { status: status.slice(0, 500) } }).catch(() => {});
}

function updatePresence() {
  const playing = [...sessions.values()].filter((s) => !s.paused).length;
  client.user?.setActivity(playing ? `📻 ${playing} radio${playing > 1 ? 's' : ''} en direct` : '/play pour lancer une radio', { type: ActivityType.Custom });
}

// Affiche le panneau en réponse et désactive l'ancien.
async function sendPanel(i) {
  const s = sessions.get(i.guildId);
  const res = await i.reply({ ...panelPayload(i.guild), withResponse: true });
  if (s.panel) s.panel.edit({ components: [] }).catch(() => {});
  s.panel = res.resource.message;
  s.lastRender = null;
}

async function onPanelAction(i) {
  const cfg = cfgOf(i.guildId);
  const s = sessions.get(i.guildId);
  if (!s) return i.update({ embeds: [embed('⏹️ Aucune radio en cours.')], components: [] });
  if (!canControl(i.member, cfg)) return reply(i, `❌ Il faut le rôle <@&${cfg.djRole}> pour contrôler la radio.`, true);
  if (i.member.voice.channelId !== cfg.channelId) return reply(i, `❌ Rejoins <#${cfg.channelId}> pour me contrôler.`, true);

  const keys = Object.keys(stationsOf(i.guildId));
  const idx = keys.indexOf(cfg.station);
  const action = i.customId.slice('radio:'.length);
  if (action === 'stop') {
    s.panel = null; // Le message est mis à jour juste en dessous.
    stop(i.guildId);
    return i.update({ embeds: [embed(`⏹️ Radio arrêtée par ${i.user}.`)], components: [] });
  }
  if (action === 'prev') switchStation(i.guild, keys.at(idx - 1));
  if (action === 'next') switchStation(i.guild, keys[(idx + 1) % keys.length]);
  if (action === 'random') switchStation(i.guild, keys.filter((k) => k !== cfg.station)[Math.floor(Math.random() * (keys.length - 1))] ?? cfg.station);
  if (action === 'select') switchStation(i.guild, i.values[0]);
  if (action === 'toggle') togglePause(i.guild);
  if (action === 'voldown') setVolume(i.guildId, cfg.volume - 10);
  if (action === 'volup') setVolume(i.guildId, cfg.volume + 10);
  if (action === 'mute') setVolume(i.guildId, cfg.volume ? 0 : 50);
  if (action === 'refresh') await refresh(i.guild);

  s.panel = i.message;
  const payload = panelPayload(i.guild);
  s.lastRender = JSON.stringify(payload);
  return i.update(payload);
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
    playStation(i.guild, channel.id, key, i.member.displayName);
    return sendPanel(i);
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
  async nowplaying(i) {
    if (!sessions.has(i.guildId)) return reply(i, 'Rien en cours. Lance `/play`.', true);
    return sendPanel(i);
  },
  async volume(i, cfg) {
    setVolume(i.guildId, i.options.getInteger('valeur'));
    refresh(i.guild).catch(() => {});
    return reply(i, `🔊 Volume réglé à **${cfg.volume}%**\n${volumeBar(cfg.volume)}`);
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
      if (stationsOf(guildId)[cfg.station]) playStation(channel.guild, channel.id, cfg.station, 'le mode 24/7');
    }
  }
  updatePresence();
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
  if ((i.isButton() || i.isStringSelectMenu()) && i.customId.startsWith('radio:')) {
    return onPanelAction(i).catch((e) => console.error(e));
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
