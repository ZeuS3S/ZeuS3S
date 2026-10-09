const {
  Client, GatewayIntentBits, SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags, ChannelType,
  InteractionContextType, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ActivityType,
  AttachmentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const {
  joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior,
  VoiceConnectionStatus, entersState, getVoiceConnection, StreamType,
} = require('@discordjs/voice');
const STATIONS = require('./stations');
const { canControl, stationKey, isStreamUrl, volumeBar, flag, formatMinutes } = require('./access');
const { fetchTitle } = require('./icy');
const { fetchCover, fetchLyrics, searchWorld, worldStation } = require('./web');
const { EFFECTS, createStream } = require('./audio');
const db = require('./db');
const { t } = require('./i18n');
const { equalizer, badgeFiles, BADGE_DIR } = require('./card');
const premium = require('./premium');

const COLOR = 0xf5a623;
const PAUSE_COLOR = 0x5865f2;
const OFF_COLOR = 0x2b2d31;
const REFRESH_MS = 15000;
const TICK_MS = 60000;
const SLEEP_STEPS = [0, 15, 30, 60, 120];
const now = () => Math.floor(Date.now() / 1000);

// --- Données ---
const cfgOf = (guildId) => db.guild(guildId);
const save = (guildId) => db.saveGuild(guildId);
const stationsOf = (guildId) => {
  const cfg = cfgOf(guildId);
  return { ...STATIONS, ...(db.get('global', 'stations') ?? {}), ...cfg.custom, ...cfg.recent };
};
// Langue : forcée par /admin language, sinon celle du membre (réponses) ou du serveur (panneau, statut).
const langOf = (guild, locale = guild.preferredLocale) => {
  const forced = cfgOf(guild.id).lang;
  if (forced !== 'auto') return forced;
  return locale?.startsWith('fr') ? 'fr' : 'en';
};
const langFor = (i) => langOf(i.guild, i.locale);

// Radios lancées hors liste (monde, favoris d'un autre serveur) : les 10 dernières restent jouables, même en 24/7.
function addRecent(guildId, key, station) {
  const recent = cfgOf(guildId).recent;
  delete recent[key];
  recent[key] = station;
  for (const old of Object.keys(recent).slice(0, -10)) delete recent[old];
  save(guildId);
}

const listenersOf = (guild) =>
  guild.channels.cache.get(cfgOf(guild.id).channelId)?.members.filter((m) => !m.user.bot).size ?? 0;

const topOf = (cfg) => Object.values(cfg.stats).sort((a, b) => b.minutes - a.minutes || b.plays - a.plays);

// --- Lecture ---
const sessions = new Map(); // guildId -> session en cours

function playStation(guild, channelId, key, requester) {
  let s = sessions.get(guild.id);
  if (!s) {
    const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
    s = { player, history: [], panel: null, lastRender: null, sleepAt: null, sleepMinutes: 0 };
    s.timer = setInterval(() => {
      countListening(guild);
      refresh(guild).catch(console.error);
    }, REFRESH_MS);
    sessions.set(guild.id, s);
    player.on('error', (e) => console.error(`[${guild.name}] flux en erreur:`, e.message));
    // Un flux live qui coupe passe en Idle : on relance la même station (auto-reconnexion).
    player.on(AudioPlayerStatus.Idle, () => {
      if (!s.stopped) setTimeout(() => !s.stopped && sessions.get(guild.id) === s && startResource(s, guild.id), 3000);
    });
  }
  s.requester = requester;

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
    } catch { stop(guild, null, false); } // Expulsé : on arrête sans effacer le 24/7.
  });

  cfgOf(guild.id).channelId = channelId;
  switchStation(guild, key);
}

function switchStation(guild, key) {
  const s = sessions.get(guild.id);
  const cfg = cfgOf(guild.id);
  const station = stationsOf(guild.id)[key];
  cfg.station = key;
  const stats = (cfg.stats[key] ??= { name: station.name, plays: 0, minutes: 0 });
  stats.plays++;
  stats.name = station.name;
  save(guild.id);
  Object.assign(s, { stopped: false, paused: false, title: null, cover: null, history: [], startedAt: now() });
  startResource(s, guild.id);
  refresh(guild).catch(console.error);
}

function startResource(s, guildId) {
  const cfg = cfgOf(guildId);
  const station = stationsOf(guildId)[cfg.station];
  if (!station) return;
  const effect = premium.isPremium(guildId) ? cfg.effect : 'normal'; // Effets réservés au premium.
  s.resource = createAudioResource(createStream(station.url, effect), { inputType: StreamType.Raw, inlineVolume: true });
  s.resource.volume.setVolume(cfg.volume / 100);
  s.player.play(s.resource);
}

// Temps d'écoute cumulé (minutes × auditeurs) pour /top.
function countListening(guild) {
  const s = sessions.get(guild.id);
  const cfg = cfgOf(guild.id);
  const listeners = listenersOf(guild);
  if (!s || s.paused || !listeners || !cfg.stats[cfg.station]) return;
  cfg.stats[cfg.station].minutes += (listeners * REFRESH_MS) / 60000;
  save(guild.id);
}

function togglePause(guild) {
  const s = sessions.get(guild.id);
  // Un direct ne se met pas vraiment en pause : on coupe le flux et on reprend le direct au retour.
  s.paused = !s.paused;
  s.stopped = s.paused;
  if (s.paused) s.player.stop(); else startResource(s, guild.id);
}

function setVolume(guildId, volume) {
  const cfg = cfgOf(guildId);
  cfg.volume = Math.min(premium.maxVolume(guildId), Math.max(0, volume)); // 200 % en premium.
  save(guildId);
  sessions.get(guildId)?.resource?.volume.setVolume(cfg.volume / 100);
}

function setEffect(guild, effect) {
  cfgOf(guild.id).effect = effect;
  save(guild.id);
  const s = sessions.get(guild.id);
  if (s && !s.paused) startResource(s, guild.id);
}

function setSleep(guild, minutes) {
  const s = sessions.get(guild.id);
  clearTimeout(s.sleepTimer);
  s.sleepMinutes = minutes;
  s.sleepAt = minutes ? now() + minutes * 60 : null;
  if (minutes) s.sleepTimer = setTimeout(() => stop(guild, t(langOf(guild), 'goodNight')), minutes * 60000);
}

function stop(guild, reason, forget = true) {
  const s = sessions.get(guild.id);
  const cfg = cfgOf(guild.id);
  if (s) {
    s.stopped = true;
    s.player.stop();
    clearInterval(s.timer);
    clearTimeout(s.sleepTimer);
    s.panel?.edit({ embeds: [embed(reason ?? t(langOf(guild), 'stopped'))], components: [], attachments: [] }).catch(() => {});
    sessions.delete(guild.id);
  }
  getVoiceConnection(guild.id)?.destroy();
  if (cfg.channelId) setVoiceStatus(cfg.channelId, '');
  if (forget) {
    cfg.channelId = null;
    cfg.station = null;
    save(guild.id);
  }
  updateStatusMessage(guild).catch(console.error);
}

// --- Panneau « en cours » ---
// Badges « EN DIRECT » : émojis d'application créés au démarrage (voir ensureBadges), sinon texte.
const badges = {};
const badgeOf = (lang, paused) => badges[`${paused ? 'pause' : 'live'}_${lang}`] ?? `\`${t(lang, paused ? 'paused' : 'live')}\``;
const renderOf = (payload) => JSON.stringify([payload.embeds, payload.components]);

function panelPayload(guild) {
  const lang = langOf(guild);
  const cfg = cfgOf(guild.id);
  const s = sessions.get(guild.id);
  const stations = stationsOf(guild.id);
  const station = stations[cfg.station];
  const channel = guild.channels.cache.get(cfg.channelId);
  const blank = { name: '\u200b', value: '\u200b', inline: true }; // Force 2 colonnes.

  const e = new EmbedBuilder()
    .setColor(s.paused ? PAUSE_COLOR : (premium.isPremium(guild.id) && cfg.color) || COLOR)
    .setAuthor({ name: `${client.user.username} · ${channel?.name ?? '…'}` })
    .setDescription(`## ${badgeOf(lang, s.paused)} ${station.name}\n🎵 ${s.title ?? t(lang, 'noTitle')}`)
    .setThumbnail(s.cover ?? station.logo ?? null)
    .addFields(
      { name: t(lang, 'cardChannel'), value: channel?.name ?? '—', inline: true },
      { name: t(lang, 'requestedBy'), value: s.requester, inline: true },
      blank,
      { name: t(lang, 'broadcast'), value: cfg.stay247 ? t(lang, 'h24') : `<t:${s.startedAt}:R>`, inline: true },
      { name: t(lang, 'cardVolume'), value: `${cfg.volume} %`, inline: true },
      blank,
    )
    .setImage('attachment://equalizer.png');
  const showEffect = cfg.effect !== 'normal' && premium.isPremium(guild.id);
  if (showEffect || s.sleepAt) {
    e.addFields(
      { name: t(lang, 'cardEffect'), value: showEffect ? EFFECTS[cfg.effect].label : '—', inline: true },
      { name: t(lang, 'cardSleep'), value: s.sleepAt ? `<t:${s.sleepAt}:R>` : '—', inline: true },
      blank,
    );
  }
  if (premium.isPremium(guild.id)) e.setFooter({ text: t(lang, 'premiumLabel') });

  const button = (id, emoji, style = ButtonStyle.Secondary, label) => {
    const b = new ButtonBuilder().setCustomId(`radio:${id}`).setEmoji(emoji).setStyle(style);
    return label ? b.setLabel(label) : b;
  };
  return {
    embeds: [e],
    files: [new AttachmentBuilder(equalizer(s.paused), { name: 'equalizer.png' })],
    components: [
      new ActionRowBuilder().addComponents(
        s.paused ? button('toggle', '▶️', ButtonStyle.Secondary, t(lang, 'btnResume')) : button('toggle', '⏸️', ButtonStyle.Secondary, t(lang, 'btnPause')),
        button('next', '⏭️', ButtonStyle.Primary, t(lang, 'btnNext')),
        button('volume', '🔊', ButtonStyle.Secondary, t(lang, 'btnVolume')),
        button('stop', '⏹️', ButtonStyle.Danger, t(lang, 'btnStop')),
      ),
      new ActionRowBuilder().addComponents(
        button('prev', '⏮️'),
        button('random', '🎲'),
        button('sleep', '💤', s.sleepAt ? ButtonStyle.Success : ButtonStyle.Secondary, s.sleepMinutes ? `${s.sleepMinutes} min` : undefined),
        button('fav', '⭐'),
        button('lyrics', '📝'),
      ),
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('radio:select').setPlaceholder(t(lang, 'changeRadio'))
          .addOptions(Object.entries(stations).slice(0, 25).map(([k, st]) => ({ label: st.name.slice(0, 100), value: k, default: k === cfg.station }))),
      ),
    ],
  };
}

// Crée une fois les émojis d'application des badges (assets/badges) et les assemble par badge.
async function ensureBadges() {
  const existing = await client.application.emojis.fetch();
  const parts = {};
  for (const file of badgeFiles()) {
    const name = `rb_${file.replace('.png', '')}`;
    const emoji = existing.find((em) => em.name === name)
      ?? await client.application.emojis.create({ attachment: `${BADGE_DIR}/${file}`, name });
    const badge = file.replace(/_\d+\.png$/, '');
    (parts[badge] ??= []).push(emoji.toString());
  }
  for (const [badge, list] of Object.entries(parts)) badges[badge] = list.join('');
}

// Met à jour titre, pochette, panneau, statut du salon et message de statut.
async function refresh(guild) {
  const s = sessions.get(guild.id);
  if (!s) return;
  const cfg = cfgOf(guild.id);
  const station = stationsOf(guild.id)[cfg.station];
  if (!s.paused) {
    const title = await fetchTitle(station.url);
    if (title && title !== s.title) {
      if (s.title) s.history = [s.title, ...s.history].slice(0, 3);
      s.title = title;
      s.cover = await fetchCover(title);
    }
  }
  if (sessions.get(guild.id) !== s) return; // Arrêtée pendant la lecture du titre.
  const status = s.paused ? '⏸️' : `📻 ${station.name}${s.title ? ` · ${s.title}` : ''}`;
  if (status !== s.lastStatus) setVoiceStatus(cfg.channelId, (s.lastStatus = status));
  const payload = panelPayload(guild);
  const render = renderOf(payload);
  if (s.panel && render !== s.lastRender) {
    s.lastRender = render;
    await s.panel.edit({ ...payload, attachments: [] }).catch(() => { s.panel = null; }); // Panneau supprimé : on l'oublie.
  }
  await updateStatusMessage(guild);
}

// Statut affiché sous le nom du salon vocal (permission « Définir le statut du salon vocal », sinon ignoré).
function setVoiceStatus(channelId, status) {
  client.rest.put(`/channels/${channelId}/voice-status`, { body: { status: status.slice(0, 500) } }).catch(() => {});
}

// Affiche le panneau en réponse et retire les boutons de l'ancien.
async function sendPanel(i) {
  const s = sessions.get(i.guildId);
  const payload = panelPayload(i.guild);
  const message = i.deferred
    ? await i.editReply({ ...payload, attachments: [] })
    : (await i.reply({ ...payload, withResponse: true })).resource.message;
  if (s.panel && s.panel.id !== message.id) s.panel.edit({ components: [] }).catch(() => {});
  s.panel = message;
  s.lastRender = renderOf(payload);
}

// Lance une station pour le membre de l'interaction, avec toutes les vérifications.
async function playFor(i, key, station) {
  const lang = langFor(i);
  const cfg = cfgOf(i.guildId);
  const respond = (text) => (i.deferred ? i.editReply({ embeds: [embed(text)] }) : reply(i, text, true));
  if (!canControl(i.member, cfg)) return respond(t(lang, 'needDj', cfg.djRole));
  const channel = i.member.voice.channel;
  if (!channel) return respond(t(lang, 'joinVoice'));
  if (!channel.joinable || !channel.speakable) return respond(t(lang, 'noVoicePerm'));
  if (!stationsOf(i.guildId)[key]) addRecent(i.guildId, key, station);
  playStation(i.guild, channel.id, key, i.member.displayName);
  return sendPanel(i);
}

function toggleFavorite(i, key, station) {
  const lang = langFor(i);
  const user = db.user(i.user.id);
  if (user.favs[key]) {
    delete user.favs[key];
    db.saveUser(i.user.id, user);
    return reply(i, t(lang, 'favRemoved', station.name), true);
  }
  if (Object.keys(user.favs).length >= 25) return reply(i, t(lang, 'favMax'), true);
  user.favs[key] = { name: station.name, url: station.url, logo: station.logo };
  db.saveUser(i.user.id, user);
  return reply(i, t(lang, 'favAdded', station.name), true);
}

async function sendLyrics(i) {
  const lang = langFor(i);
  const title = sessions.get(i.guildId)?.title;
  if (!title) return reply(i, t(lang, 'lyricsNoTitle'), true);
  await i.deferReply({ flags: MessageFlags.Ephemeral });
  const lyrics = await fetchLyrics(title);
  if (!lyrics) return i.editReply({ embeds: [embed(t(lang, 'lyricsNone', title))] });
  const text = lyrics.plainLyrics.length > 4000 ? `${lyrics.plainLyrics.slice(0, 4000)}…` : lyrics.plainLyrics;
  return i.editReply({ embeds: [embed(text).setTitle(`📝 ${lyrics.artistName} — ${lyrics.trackName}`.slice(0, 256))] });
}

async function onPanelAction(i) {
  const lang = langFor(i);
  const cfg = cfgOf(i.guildId);
  const s = sessions.get(i.guildId);
  if (!s) return i.update({ embeds: [embed(t(lang, 'nothing'))], components: [], attachments: [] });
  const action = i.customId.slice('radio:'.length);
  // Accessibles à tous les auditeurs.
  if (action === 'fav') return toggleFavorite(i, cfg.station, stationsOf(i.guildId)[cfg.station]);
  if (action === 'lyrics') return sendLyrics(i);

  if (!canControl(i.member, cfg)) return reply(i, t(lang, 'needDj', cfg.djRole), true);
  if (i.member.voice.channelId !== cfg.channelId) return reply(i, t(lang, 'joinMine', cfg.channelId), true);

  const keys = Object.keys(stationsOf(i.guildId));
  const idx = keys.indexOf(cfg.station);
  if (action === 'stop') {
    s.panel = null; // Ce message est mis à jour juste en dessous.
    stop(i.guild);
    return i.update({ embeds: [embed(t(langOf(i.guild), 'stoppedBy', i.user))], components: [], attachments: [] });
  }
  if (action === 'prev') switchStation(i.guild, keys.at(idx - 1));
  if (action === 'next') switchStation(i.guild, keys[(idx + 1) % keys.length]);
  if (action === 'random') {
    const others = keys.filter((k) => k !== cfg.station);
    switchStation(i.guild, others[Math.floor(Math.random() * others.length)] ?? cfg.station);
  }
  if (action === 'select') switchStation(i.guild, i.values[0]);
  if (action === 'effect') {
    if (i.values[0] !== 'normal' && !premium.isPremium(i.guildId)) return reply(i, t(lang, 'premiumOnly'), true);
    setEffect(i.guild, i.values[0]);
  }
  if (action === 'toggle') togglePause(i.guild);
  if (action === 'voldown') setVolume(i.guildId, cfg.volume - 10);
  if (action === 'volup') setVolume(i.guildId, cfg.volume + 10);
  if (action === 'sleep') setSleep(i.guild, SLEEP_STEPS[(SLEEP_STEPS.indexOf(s.sleepMinutes) + 1) % SLEEP_STEPS.length]);
  if (action === 'volume') {
    return i.showModal(new ModalBuilder().setCustomId('radio:volmodal').setTitle(t(lang, 'btnVolume')).addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('value').setLabel(t(lang, 'volumeModalLabel', premium.maxVolume(i.guildId)))
        .setStyle(TextInputStyle.Short).setValue(String(cfg.volume)).setMinLength(1).setMaxLength(3).setRequired(true)),
    ));
  }
  if (action === 'volmodal') {
    const value = Number(i.fields.getTextInputValue('value'));
    const max = premium.maxVolume(i.guildId);
    if (Number.isInteger(value) && value > max && value <= 200) return reply(i, t(lang, 'premiumOnly'), true);
    if (!Number.isInteger(value) || value < 0 || value > max) return reply(i, t(lang, 'badVolume', max), true);
    setVolume(i.guildId, value);
  }

  s.panel = i.message;
  const payload = panelPayload(i.guild);
  s.lastRender = renderOf(payload);
  return i.update({ ...payload, attachments: [] });
}

// --- Message de statut ---
let totals = { servers: 0, live: 0 };
const statusMessages = new Map(); // guildId -> { message, render }

function statusPayload(guild) {
  const lang = langOf(guild);
  const cfg = cfgOf(guild.id);
  const s = sessions.get(guild.id);
  const e = new EmbedBuilder().setTitle(t(lang, 'statusTitle', guild.name)).setThumbnail(guild.iconURL());
  if (s) {
    const station = stationsOf(guild.id)[cfg.station];
    e.setColor(s.paused ? PAUSE_COLOR : COLOR)
      .setDescription(`${t(lang, s.paused ? 'paused' : 'live')} · **${station.name}**\n🎵 ${s.title ?? t(lang, 'noTitle')}`)
      .addFields(
        { name: t(lang, 'channel'), value: `<#${cfg.channelId}>`, inline: true },
        { name: t(lang, 'listeners'), value: `${listenersOf(guild)}`, inline: true },
        { name: t(lang, 'since'), value: `<t:${s.startedAt}:R>`, inline: true },
      );
    if (s.cover ?? station.logo) e.setThumbnail(s.cover ?? station.logo);
  } else {
    e.setColor(OFF_COLOR).setDescription(t(lang, 'offline'));
  }
  const top = topOf(cfg).slice(0, 3);
  if (top.length) {
    e.addFields({ name: t(lang, 'topTitle', guild.name), value: top.map((st, n) => t(lang, 'topLine', n + 1, st.name, formatMinutes(st.minutes), st.plays)).join('\n') });
  }
  return e.setFooter({ text: t(lang, 'botStats', totals.servers, totals.live) });
}

async function updateStatusMessage(guild) {
  const cfg = cfgOf(guild.id);
  if (!cfg.status) return;
  const e = statusPayload(guild);
  const render = JSON.stringify(e);
  const known = statusMessages.get(guild.id);
  if (known?.render === render) return;
  e.setTimestamp();
  try {
    let message = known?.message;
    if (!message) {
      const channel = await guild.channels.fetch(cfg.status.channelId);
      message = cfg.status.messageId && await channel.messages.fetch(cfg.status.messageId).catch(() => null);
      if (!message) {
        message = await channel.send({ embeds: [e] });
        cfg.status.messageId = message.id;
        save(guild.id);
      }
    }
    await message.edit({ embeds: [e] });
    statusMessages.set(guild.id, { message, render });
  } catch {
    statusMessages.delete(guild.id); // Message supprimé ou salon inaccessible : réessai au prochain passage.
  }
}

// Journal premium des owners (PREMIUM_LOG_CHANNEL_ID), via l'API : marche depuis n'importe quel shard.
function logPremium(text) {
  const channelId = process.env.PREMIUM_LOG_CHANNEL_ID;
  if (channelId) client.rest.post(`/channels/${channelId}/messages`, { body: { embeds: [embed(text).setTimestamp().toJSON()] } }).catch(() => {});
}

// Prévient le serveur 3 jours avant la fin du premium, puis à la fin (et retire les avantages).
async function premiumNotice(guild, notice) {
  const lang = langOf(guild);
  const cfg = cfgOf(guild.id);
  premium.markRecord(guild.id, notice === 'warn' ? { warned: true } : { expired: true });
  if (notice === 'expired') {
    if (cfg.effect !== 'normal') setEffect(guild, 'normal');
    setVolume(guild.id, cfg.volume); // Ramène à 100 % max.
    refresh(guild).catch(console.error);
    logPremium(`⌛ Premium terminé sur **${guild.name}** (\`${guild.id}\`)`);
  }
  const text = notice === 'warn' ? t(lang, 'premiumWarn', `<t:${Math.floor(premium.premiumUntil(guild.id) / 1000)}:R>`) : t(lang, 'premiumExpired');
  const channel = guild.channels.cache.get(cfg.status?.channelId ?? guild.systemChannelId);
  await channel?.send({ embeds: [embed(text).setColor(notice === 'warn' ? COLOR : OFF_COLOR)] }).catch(() => {});
}

// Toutes les minutes : totaux multi-shards, présence du bot, messages de statut.
async function tick() {
  client.liveRadios = [...sessions.values()].filter((s) => !s.paused).length;
  if (client.shard) {
    const sum = (values) => values.reduce((a, b) => a + b, 0);
    const [servers, live] = await Promise.all([
      client.shard.fetchClientValues('guilds.cache.size'),
      client.shard.fetchClientValues('liveRadios'),
    ]).catch(() => [[totals.servers], [totals.live]]); // Shards encore en démarrage.
    totals = { servers: sum(servers), live: sum(live) };
  } else {
    totals = { servers: client.guilds.cache.size, live: client.liveRadios };
  }
  client.user.setActivity(`📻 ${totals.live} radios · ${totals.servers} serveurs`, { type: ActivityType.Custom });
  for (const guild of client.guilds.cache.values()) {
    const cfg = cfgOf(guild.id);
    const notice = premium.pendingNotice(guild.id);
    if (notice) await premiumNotice(guild, notice);
    if (cfg.stay247 && !cfg.forced247 && !premium.isPremium(guild.id)) { // Premium expiré : fin du 24/7.
      cfg.stay247 = false;
      save(guild.id);
    }
    if (cfg.status) await updateStatusMessage(guild);
  }
}

// --- Commandes (anglais par défaut, traduites en français) ---
const loc = (builder, name, en, fr, frName) => {
  builder.setName(name).setDescription(en).setDescriptionLocalizations({ fr });
  return frName ? builder.setNameLocalizations({ fr: frName }) : builder;
};
const stationOption = (o) => loc(o, 'station', 'The station', 'La radio').setRequired(true).setAutocomplete(true);

const commands = [
  loc(new SlashCommandBuilder(), 'play', 'Play a station in your voice channel', 'Lance une radio dans ton salon vocal').addStringOption(stationOption),
  loc(new SlashCommandBuilder(), 'world', 'Search 40,000 stations worldwide', 'Cherche parmi 40 000 radios du monde entier', 'monde')
    .addStringOption((o) => loc(o, 'search', 'Station name', 'Nom de la radio', 'recherche').setRequired(true).setAutocomplete(true)),
  loc(new SlashCommandBuilder(), 'stop', 'Stop the radio and leave', 'Arrête la radio et quitte le salon'),
  loc(new SlashCommandBuilder(), 'stations', 'List stations', 'Liste des radios'),
  loc(new SlashCommandBuilder(), 'nowplaying', 'Show the live panel', 'Affiche le panneau en cours'),
  loc(new SlashCommandBuilder(), 'volume', 'Set the volume', 'Règle le volume')
    .addIntegerOption((o) => loc(o, 'value', '0 to 100 (200 with Premium)', '0 à 100 (200 en Premium)', 'valeur').setRequired(true).setMinValue(0).setMaxValue(200)),
  loc(new SlashCommandBuilder(), 'effect', 'Apply an audio effect', 'Applique un effet audio', 'effet')
    .addStringOption((o) => loc(o, 'name', 'Effect', 'Effet', 'nom').setRequired(true)
      .addChoices(...Object.entries(EFFECTS).map(([value, fx]) => ({ name: value === 'normal' ? fx.label : `${fx.label} 💎`, value })))),
  loc(new SlashCommandBuilder(), 'sleep', 'Stop the radio after a while', 'Arrête la radio après un moment', 'minuteur')
    .addIntegerOption((o) => loc(o, 'minutes', 'Minutes (0 = cancel)', 'Minutes (0 = annuler)').setRequired(true).setMinValue(0).setMaxValue(720)),
  loc(new SlashCommandBuilder(), 'lyrics', 'Lyrics of the current song', 'Paroles du titre en cours', 'paroles'),
  loc(new SlashCommandBuilder(), 'top', 'Most listened stations on this server', 'Radios les plus écoutées du serveur'),
  loc(new SlashCommandBuilder(), 'favorites', 'Your favorite stations', 'Tes radios favorites', 'favoris')
    .addSubcommand((c) => loc(c, 'list', 'Show your favorites', 'Affiche tes favoris', 'liste'))
    .addSubcommand((c) => loc(c, 'add', 'Add the current station', 'Ajoute la radio en cours', 'ajouter'))
    .addSubcommand((c) => loc(c, 'play', 'Play a favorite', 'Lance un favori', 'lancer').addStringOption(stationOption))
    .addSubcommand((c) => loc(c, 'remove', 'Remove a favorite', 'Retire un favori', 'retirer').addStringOption(stationOption)),
  loc(new SlashCommandBuilder(), 'admin', 'Radio settings', 'Configuration de la radio')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild).setContexts(InteractionContextType.Guild)
    .addSubcommand((c) => loc(c, 'dj-role', 'Role required to control the radio (empty = everyone)', 'Rôle requis pour contrôler la radio (vide = tout le monde)')
      .addRoleOption((o) => loc(o, 'role', 'DJ role', 'Rôle DJ')))
    .addSubcommand((c) => loc(c, '247', '💎 24/7 mode: stays in the channel, even empty or after a restart', '💎 Mode 24/7 : reste dans le salon, même vide ou après un redémarrage')
      .addBooleanOption((o) => loc(o, 'enabled', 'Enable?', 'Activer ?', 'actif').setRequired(true)))
    .addSubcommand((c) => loc(c, 'status', 'Live status message in a channel (empty = disable)', 'Message de statut en direct dans un salon (vide = désactiver)', 'statut')
      .addChannelOption((o) => loc(o, 'channel', 'Text channel', 'Salon textuel', 'salon').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)))
    .addSubcommand((c) => loc(c, 'language', 'Bot language on this server', 'Langue du bot sur ce serveur', 'langue')
      .addStringOption((o) => loc(o, 'value', 'Language', 'Langue', 'valeur').setRequired(true)
        .addChoices({ name: 'Auto', value: 'auto' }, { name: 'Français', value: 'fr' }, { name: 'English', value: 'en' })))
    .addSubcommand((c) => loc(c, 'config', 'Show the settings', 'Affiche la configuration')),
  loc(new SlashCommandBuilder(), 'premium', 'Server premium', 'Premium du serveur').setContexts(InteractionContextType.Guild)
    .addSubcommand((c) => loc(c, 'status', 'Premium status of this server', 'Statut premium du serveur', 'statut'))
    .addSubcommand((c) => loc(c, 'redeem', 'Activate a premium key', 'Active une clé premium', 'activer')
      .addStringOption((o) => loc(o, 'key', 'RADIO-XXXX-XXXX-XXXX', 'RADIO-XXXX-XXXX-XXXX', 'clé').setRequired(true).setMaxLength(40)))
    .addSubcommand((c) => loc(c, 'trial', 'Free 3-day Premium trial (once per server)', 'Essai Premium gratuit de 3 jours (une fois par serveur)', 'essai'))
    .addSubcommand((c) => loc(c, 'color', '💎 Panel color', '💎 Couleur du panneau', 'couleur')
      .addStringOption((o) => loc(o, 'hex', 'Hex color like #ff3b3b, or reset', 'Couleur hexadécimale comme #ff3b3b, ou reset', 'hex').setRequired(true).setMaxLength(7))),
];

// Commandes des owners du bot : enregistrées seulement sur OWNER_GUILD_ID si défini, et vérifiées à chaque appel.
const ownerCommand = loc(new SlashCommandBuilder(), 'owner', 'Bot owner tools', 'Outils des owners du bot')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator).setContexts(InteractionContextType.Guild)
  .addSubcommand((c) => loc(c, 'key-create', 'Create a premium key', 'Crée une clé premium')
    .addIntegerOption((o) => loc(o, 'days', 'Duration in days (0 = forever)', 'Durée en jours (0 = à vie)', 'jours').setRequired(true).setMinValue(0).setMaxValue(3650))
    .addIntegerOption((o) => loc(o, 'uses', 'Number of servers (default 1)', 'Nombre de serveurs (1 par défaut)', 'utilisations').setMinValue(1).setMaxValue(1000)))
  .addSubcommand((c) => loc(c, 'keys', 'List premium keys', 'Liste les clés premium', 'cles'))
  .addSubcommand((c) => loc(c, 'premium-list', 'List premium servers', 'Liste les serveurs premium'))
  .addSubcommand((c) => loc(c, 'key-delete', 'Delete a key', 'Supprime une clé')
    .addStringOption((o) => loc(o, 'key', 'The key', 'La clé', 'cle').setRequired(true)))
  .addSubcommand((c) => loc(c, 'premium-add', 'Give premium to a server', 'Donne le premium à un serveur')
    .addIntegerOption((o) => loc(o, 'days', 'Duration in days (0 = forever)', 'Durée en jours (0 = à vie)', 'jours').setRequired(true).setMinValue(0).setMaxValue(3650))
    .addStringOption((o) => loc(o, 'guild', 'Server ID (default: this one)', 'ID du serveur (par défaut : celui-ci)', 'serveur')))
  .addSubcommand((c) => loc(c, 'premium-remove', 'Remove premium from a server', 'Retire le premium d\'un serveur')
    .addStringOption((o) => loc(o, 'guild', 'Server ID (default: this one)', 'ID du serveur (par défaut : celui-ci)', 'serveur')))
  .addSubcommand((c) => loc(c, '247', '24/7 on this server without premium', '24/7 sur ce serveur sans premium')
    .addBooleanOption((o) => loc(o, 'enabled', 'Enable?', 'Activer ?', 'actif').setRequired(true)))
  .addSubcommand((c) => loc(c, 'station-add', 'Add a station for all servers', 'Ajoute une radio pour tous les serveurs')
    .addStringOption((o) => loc(o, 'name', 'Display name', 'Nom affiché', 'nom').setRequired(true).setMaxLength(50))
    .addStringOption((o) => loc(o, 'url', 'Stream URL (mp3/aac/m3u8)', 'URL du flux (mp3/aac/m3u8)').setRequired(true))
    .addStringOption((o) => loc(o, 'logo', 'Logo image URL', 'URL du logo')))
  .addSubcommand((c) => loc(c, 'station-remove', 'Remove a station added by an owner', 'Supprime une radio ajoutée par un owner').addStringOption(stationOption));

// Owners : OWNER_IDS (séparés par des virgules) + propriétaire de l'application / membres de l'équipe.
const owners = new Set((process.env.OWNER_IDS ?? '').split(',').map((id) => id.trim()).filter(Boolean));

const embed = (description) => new EmbedBuilder().setColor(COLOR).setDescription(description);
const reply = (i, description, ephemeral = false) =>
  i.reply({ embeds: [embed(description)], flags: ephemeral ? MessageFlags.Ephemeral : undefined });

const handlers = {
  async play(i) {
    const key = i.options.getString('station');
    const station = stationsOf(i.guildId)[key];
    if (!station) return reply(i, t(langFor(i), 'unknownStation'), true);
    return playFor(i, key, station);
  },
  async world(i) {
    await i.deferReply();
    const found = await worldStation(i.options.getString('search'));
    if (!found?.url_resolved) return i.editReply({ embeds: [embed(t(langFor(i), 'worldNotFound'))] });
    return playFor(i, `rb-${found.stationuuid.slice(0, 8)}`, {
      name: `${flag(found.countrycode)} ${found.name.trim()}`.slice(0, 80),
      url: found.url_resolved,
      logo: isStreamUrl(found.favicon) ? found.favicon : undefined,
    });
  },
  async stop(i) {
    if (!sessions.has(i.guildId)) return reply(i, t(langFor(i), 'nothing'), true);
    stop(i.guild);
    return reply(i, t(langFor(i), 'stoppedBy', i.user));
  },
  async stations(i) {
    const lang = langFor(i);
    const list = Object.entries(stationsOf(i.guildId)).map(([k, s]) => `${s.name} — \`${k}\``).join('\n');
    return i.reply({ embeds: [embed(list.slice(0, 4096)).setTitle(t(lang, 'stationsTitle')).setFooter({ text: t(lang, 'stationsFooter') })] });
  },
  async nowplaying(i) {
    if (!sessions.has(i.guildId)) return reply(i, t(langFor(i), 'nothing'), true);
    return sendPanel(i);
  },
  async volume(i, cfg) {
    const value = i.options.getInteger('value');
    if (value > premium.maxVolume(i.guildId)) return reply(i, t(langFor(i), 'premiumOnly'), true);
    setVolume(i.guildId, value);
    refresh(i.guild).catch(console.error);
    return reply(i, t(langFor(i), 'volumeSet', cfg.volume, volumeBar(cfg.volume)));
  },
  async effect(i) {
    const effect = i.options.getString('name');
    if (effect !== 'normal' && !premium.isPremium(i.guildId)) return reply(i, t(langFor(i), 'premiumOnly'), true);
    setEffect(i.guild, effect);
    refresh(i.guild).catch(console.error);
    return reply(i, t(langFor(i), 'effectSet', EFFECTS[effect].label));
  },
  async sleep(i) {
    if (!sessions.has(i.guildId)) return reply(i, t(langFor(i), 'nothing'), true);
    const minutes = i.options.getInteger('minutes');
    setSleep(i.guild, minutes);
    refresh(i.guild).catch(console.error);
    return reply(i, minutes ? t(langFor(i), 'sleepSet', sessions.get(i.guildId).sleepAt) : t(langFor(i), 'sleepOff'));
  },
  lyrics: sendLyrics,
  async top(i, cfg) {
    const lang = langFor(i);
    const top = topOf(cfg).slice(0, 10);
    const text = top.length
      ? top.map((st, n) => t(lang, 'topLine', n + 1, st.name, formatMinutes(st.minutes), st.plays)).join('\n')
      : t(lang, 'topEmpty');
    return i.reply({ embeds: [embed(text).setTitle(t(lang, 'topTitle', i.guild.name)).setThumbnail(i.guild.iconURL())] });
  },
  async favorites(i, cfg) {
    const lang = langFor(i);
    const sub = i.options.getSubcommand();
    const favs = db.user(i.user.id).favs;
    if (sub === 'list') {
      const list = Object.values(favs).map((s) => `• ${s.name}`).join('\n');
      return i.reply({ embeds: [embed(list || t(lang, 'favEmpty')).setTitle(t(lang, 'favTitle')).setFooter({ text: t(lang, 'favFooter') })], flags: MessageFlags.Ephemeral });
    }
    if (sub === 'add') {
      if (!sessions.has(i.guildId)) return reply(i, t(lang, 'nothing'), true);
      if (favs[cfg.station]) return reply(i, t(lang, 'favAdded', favs[cfg.station].name), true);
      return toggleFavorite(i, cfg.station, stationsOf(i.guildId)[cfg.station]);
    }
    const key = i.options.getString('station');
    if (!favs[key]) return reply(i, t(lang, 'favUnknown'), true);
    if (sub === 'remove') return toggleFavorite(i, key, favs[key]);
    return playFor(i, key, favs[key]);
  },
  async admin(i, cfg) {
    const lang = langFor(i);
    const sub = i.options.getSubcommand();
    if (sub === 'dj-role') {
      cfg.djRole = i.options.getRole('role')?.id ?? null;
      save(i.guildId);
      return reply(i, cfg.djRole ? t(lang, 'djSet', cfg.djRole) : t(lang, 'djAll'), true);
    }
    if (sub === '247') {
      const enabled = i.options.getBoolean('enabled');
      if (enabled && !premium.isPremium(i.guildId) && !owners.has(i.user.id)) return reply(i, t(lang, 'premiumNeeded'), true);
      cfg.stay247 = enabled;
      if (!enabled) cfg.forced247 = false;
      save(i.guildId);
      return reply(i, t(lang, cfg.stay247 ? 'on247' : 'off247'), true);
    }
    if (sub === 'status') {
      const channel = i.options.getChannel('channel');
      statusMessages.delete(i.guildId);
      if (!channel) {
        cfg.status = null;
        save(i.guildId);
        return reply(i, t(lang, 'statusOff'), true);
      }
      const perms = channel.permissionsFor(i.guild.members.me);
      if (!perms?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
        return reply(i, t(lang, 'statusNoPerm'), true);
      }
      cfg.status = { channelId: channel.id, messageId: null };
      save(i.guildId);
      await updateStatusMessage(i.guild);
      return reply(i, t(lang, 'statusSet', channel.id), true);
    }
    if (sub === 'language') {
      cfg.lang = i.options.getString('value');
      save(i.guildId);
      return reply(i, t(langFor(i), 'langSet', cfg.lang), true);
    }
    return reply(i, t(lang, 'config', cfg, premium.isPremium(i.guildId) ? t(lang, 'until', premium.premiumUntil(i.guildId)) : '—'), true);
  },
  async premium(i, cfg) {
    const lang = langFor(i);
    const sub = i.options.getSubcommand();
    const active = premium.isPremium(i.guildId);
    if (sub === 'status') {
      const e = embed(active ? t(lang, 'premiumOn', t(lang, 'until', premium.premiumUntil(i.guildId))) : t(lang, 'premiumOff'))
        .setColor(active ? (cfg.color ?? COLOR) : OFF_COLOR)
        .addFields({ name: t(lang, 'perksTitle'), value: t(lang, 'perks').map((p) => `${active ? '✅' : '🔒'} ${p}`).join('\n') });
      if (!active && !premium.trialUsed(i.guildId)) e.setFooter({ text: t(lang, 'trialHint', premium.TRIAL_DAYS).replaceAll('`', '') });
      return i.reply({ embeds: [e], flags: MessageFlags.Ephemeral });
    }
    if (!i.memberPermissions.has(PermissionFlagsBits.ManageGuild)) return reply(i, t(lang, 'needManage'), true);
    if (sub === 'color') {
      if (!active) return reply(i, t(lang, 'premiumOnly'), true);
      const value = i.options.getString('hex').trim().toLowerCase();
      if (value === 'reset') cfg.color = null;
      else if (/^#?[0-9a-f]{6}$/.test(value)) cfg.color = parseInt(value.replace('#', ''), 16);
      else return reply(i, t(lang, 'badColor'), true);
      save(i.guildId);
      refresh(i.guild).catch(console.error);
      return i.reply({ embeds: [embed(cfg.color === null ? t(lang, 'colorReset') : t(lang, 'colorSet', `#${value.replace('#', '')}`)).setColor(cfg.color ?? COLOR)], flags: MessageFlags.Ephemeral });
    }
    if (sub === 'trial') {
      const result = premium.startTrial(i.guildId, i.guild.name);
      if (result.error) return reply(i, t(lang, result.error), true);
      logPremium(`🎁 Essai lancé sur **${i.guild.name}** (\`${i.guildId}\`) par ${i.user}`);
      refresh(i.guild).catch(console.error);
      return reply(i, t(lang, 'trialOk', t(lang, 'until', result.until)));
    }
    const result = premium.redeemKey(i.options.getString('key'), i.guildId, i.guild.name);
    if (result.error) return reply(i, t(lang, { invalid: 'keyInvalid', used: 'keyUsed', already: 'keyAlready' }[result.error]), true);
    logPremium(`🔑 Clé activée sur **${i.guild.name}** (\`${i.guildId}\`) par ${i.user} · ${t('fr', 'duration', result.days)}`);
    refresh(i.guild).catch(console.error);
    return reply(i, t(lang, 'redeemOk', t(lang, 'until', result.until)));
  },
  async owner(i, cfg) {
    const lang = langFor(i);
    if (!owners.has(i.user.id)) return reply(i, t(lang, 'notOwner'), true);
    const sub = i.options.getSubcommand();
    if (sub === 'key-create') {
      const days = i.options.getInteger('days');
      const uses = i.options.getInteger('uses') ?? 1;
      const key = premium.createKey(days, uses, i.user.id);
      logPremium(`🔑 Clé créée par ${i.user} · ${t('fr', 'duration', days)} · ${uses} utilisation(s)`);
      return reply(i, t(lang, 'keyCreated', key, t(lang, 'duration', days), uses), true);
    }
    if (sub === 'keys') {
      const keys = premium.listKeys().slice(-25);
      const text = keys.map((k) => t(lang, 'keyLine', k.id, t(lang, 'duration', k.days), k.used.length, k.uses)).join('\n');
      return i.reply({ embeds: [embed(text || t(lang, 'keysEmpty')).setTitle(t(lang, 'keysTitle'))], flags: MessageFlags.Ephemeral });
    }
    if (sub === 'key-delete') return reply(i, t(lang, premium.deleteKey(i.options.getString('key')) ? 'keyDeleted' : 'keyNotFound'), true);
    if (sub === 'premium-list') {
      const list = premium.listPremium().slice(0, 25);
      const text = list.map((r) => t(lang, 'premiumListLine', r.name, r.id, t(lang, 'until', r.until))).join('\n');
      return i.reply({ embeds: [embed(text || t(lang, 'premiumListEmpty')).setTitle(t(lang, 'premiumListTitle'))], flags: MessageFlags.Ephemeral });
    }
    if (sub === 'premium-add') {
      const guildId = i.options.getString('guild') ?? i.guildId;
      const until = premium.addPremium(guildId, i.options.getInteger('days'), client.guilds.cache.get(guildId)?.name);
      logPremium(`💎 Premium donné à \`${guildId}\` par ${i.user} · fin : ${t('fr', 'until', until)}`);
      return reply(i, t(lang, 'premiumGiven', guildId, t(lang, 'until', until)), true);
    }
    if (sub === 'premium-remove') {
      const guildId = i.options.getString('guild') ?? i.guildId;
      premium.removePremium(guildId);
      logPremium(`⚪ Premium retiré de \`${guildId}\` par ${i.user}`);
      return reply(i, t(lang, 'premiumRemoved', guildId), true);
    }
    if (sub === '247') {
      // Owner : 24/7 sur ce serveur sans premium, et qui ne s'arrête pas à l'expiration.
      cfg.stay247 = cfg.forced247 = i.options.getBoolean('enabled');
      save(i.guildId);
      return reply(i, t(lang, cfg.stay247 ? 'on247' : 'off247'), true);
    }
    const global = db.get('global', 'stations') ?? {};
    if (sub === 'station-add') {
      const name = i.options.getString('name');
      const url = i.options.getString('url');
      const logo = i.options.getString('logo');
      const key = stationKey(name);
      if (!key) return reply(i, t(lang, 'badName'), true);
      if (!isStreamUrl(url) || (logo && !isStreamUrl(logo))) return reply(i, t(lang, 'badUrl'), true);
      global[key] = { name, url, logo: logo ?? undefined };
      db.set('global', 'stations', global);
      return reply(i, t(lang, 'added', name, key), true);
    }
    // station-remove
    const key = i.options.getString('station');
    if (!global[key]) return reply(i, t(lang, 'onlyCustom'), true);
    delete global[key];
    db.set('global', 'stations', global);
    if (cfg.station === key) stop(i.guild);
    return reply(i, t(lang, 'removed'), true);
  },
};
// Commandes qui pilotent la radio : rôle DJ requis s'il est défini (/play et /world le vérifient dans playFor).
const CONTROL = new Set(['stop', 'volume', 'effect', 'sleep']);

async function autocomplete(i) {
  const q = i.options.getFocused().toLowerCase();
  const pick = (entries) => entries.filter(([k, s]) => k.includes(q) || s.name.toLowerCase().includes(q))
    .slice(0, 25).map(([k, s]) => ({ name: s.name.slice(0, 100), value: k }));
  if (i.commandName === 'world') {
    if (q.length < 2) return i.respond([]);
    const found = await searchWorld(q);
    return i.respond(found.slice(0, 25).map((s) => ({
      name: `${flag(s.countrycode)} ${s.name.trim()}${s.tags ? ` · ${s.tags.split(',').slice(0, 2).join(', ')}` : ''}`.slice(0, 100),
      value: s.stationuuid,
    })));
  }
  if (i.commandName === 'favorites') return i.respond(pick(Object.entries(db.user(i.user.id).favs)));
  if (i.commandName === 'owner') return i.respond(owners.has(i.user.id) ? pick(Object.entries(db.get('global', 'stations') ?? {})) : []);
  return i.respond(pick(Object.entries(stationsOf(i.guildId))));
}

// --- Client ---
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

client.once('clientReady', async () => {
  const app = await client.application.fetch();
  for (const id of app.owner?.members?.keys() ?? [app.owner?.id]) if (id) owners.add(id);
  // Les commandes sont globales : un seul shard les enregistre (et crée les émojis des badges).
  const ownerGuild = process.env.OWNER_GUILD_ID;
  if (!client.shard || client.shard.ids.includes(0)) {
    await client.application.commands.set(ownerGuild ? commands : [...commands, ownerCommand]);
    if (ownerGuild) await client.application.commands.set([ownerCommand], ownerGuild).catch((e) => console.error('OWNER_GUILD_ID :', e.message));
  }
  await ensureBadges().catch((e) => console.error('Badges :', e.message));
  console.log(`Connecté en tant que ${client.user.tag}${client.shard ? ` (shard ${client.shard.ids})` : ''}`);
  // Reprend les radios 24/7 après un redémarrage.
  for (const guild of client.guilds.cache.values()) {
    const cfg = cfgOf(guild.id);
    const allowed = cfg.forced247 || premium.isPremium(guild.id);
    const channel = cfg.stay247 && allowed && cfg.channelId && guild.channels.cache.get(cfg.channelId);
    if (channel?.isVoiceBased() && stationsOf(guild.id)[cfg.station]) playStation(guild, channel.id, cfg.station, '24/7');
  }
  await tick().catch(console.error);
  setInterval(() => tick().catch(console.error), TICK_MS);
});

client.on('interactionCreate', async (i) => {
  if (!i.inGuild() || !i.guild) return;
  try {
    if (i.isAutocomplete()) return await autocomplete(i);
    if ((i.isButton() || i.isStringSelectMenu() || i.isModalSubmit()) && i.customId.startsWith('radio:')) return await onPanelAction(i);
    if (!i.isChatInputCommand()) return;
    const cfg = cfgOf(i.guildId);
    if (CONTROL.has(i.commandName) && !canControl(i.member, cfg)) return await reply(i, t(langFor(i), 'needDj', cfg.djRole), true);
    await handlers[i.commandName]?.(i, cfg);
  } catch (e) {
    console.error(e);
    if (i.isRepliable() && !i.replied && !i.deferred) reply(i, t(langFor(i), 'error'), true).catch(() => {});
  }
});

// Quitte quand le salon est vide, sauf en 24/7.
client.on('voiceStateUpdate', (oldState) => {
  const connection = getVoiceConnection(oldState.guild.id);
  if (!connection || cfgOf(oldState.guild.id).stay247) return;
  const channel = oldState.guild.channels.cache.get(connection.joinConfig.channelId);
  if (channel && !channel.members.some((m) => !m.user.bot)) stop(oldState.guild);
});

client.login(process.env.DISCORD_TOKEN);
