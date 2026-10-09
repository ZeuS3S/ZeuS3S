const {
  Client, GatewayIntentBits, SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags, ChannelType,
  InteractionContextType, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ActivityType,
  AttachmentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ContainerBuilder, TextDisplayBuilder, SectionBuilder,
  ThumbnailBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, SeparatorBuilder, SeparatorSpacingSize,
  RoleSelectMenuBuilder, ChannelSelectMenuBuilder,
} = require('discord.js');
const {
  joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior,
  VoiceConnectionStatus, entersState, getVoiceConnection, StreamType,
} = require('@discordjs/voice');
const STATIONS = require('./stations');
const {
  canControl, stationKey, isStreamUrl, volumeBar, flag, formatMinutes, parseLrc, lineAt, progressBar, weekStart,
} = require('./access');
const { fetchTitle } = require('./icy');
const { fetchTrack, fetchImage, cachedImage, fetchLyrics, searchWorld, worldStation } = require('./web');
const { EFFECTS, createStream } = require('./audio');
const db = require('./db');
const { t } = require('./i18n');
const { renderCard, dominantColor, badgeFiles, BADGE_DIR } = require('./card');
const premium = require('./premium');

const COLOR = 0xf5a623;
const PAUSE_COLOR = 0x5865f2;
const OFF_COLOR = 0x2b2d31;
const ERROR_COLOR = 0xed4245;
const REFRESH_MS = 15000;
const LYRICS_MS = 3000;
const TICK_MS = 60000;
const SLEEP_STEPS = [0, 15, 30, 60, 120];
const V2 = MessageFlags.IsComponentsV2;
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

const voiceMembers = (guild) =>
  guild.channels.cache.get(cfgOf(guild.id).channelId)?.members.filter((m) => !m.user.bot) ?? new Map();
const listenersOf = (guild) => voiceMembers(guild).size;

const topOf = (cfg) => Object.values(cfg.stats).sort((a, b) => b.minutes - a.minutes || b.plays - a.plays);
const genreOf = (key, station) => station.genre ?? (key.startsWith('rb-') ? 'world' : 'other');

// Couleur de la radio : définie dans stations.js, sinon couleur moyenne de son logo, sinon orange.
const logoColors = new Map();
const stationColor = (station) => station.color ?? logoColors.get(station.logo) ?? COLOR;
async function learnLogoColor(station) {
  if (station.color || !station.logo || logoColors.has(station.logo)) return;
  logoColors.set(station.logo, (await dominantColor(await fetchImage(station.logo))) ?? COLOR);
}

// Une autre radio à proposer quand un flux est mort : même genre si possible.
function suggestionFor(guildId, key) {
  const entries = Object.entries(stationsOf(guildId)).filter(([k]) => k !== key);
  const genre = genreOf(key, stationsOf(guildId)[key] ?? {});
  const same = entries.filter(([k, st]) => genreOf(k, st) === genre && STATIONS[k]);
  const pool = same.length ? same : entries.filter(([k]) => STATIONS[k]);
  return pool[Math.floor(Math.random() * pool.length)]?.[0] ?? null;
}

// --- Lecture ---
const sessions = new Map(); // guildId -> session en cours

function playStation(guild, channelId, key, requester) {
  let s = sessions.get(guild.id);
  if (!s) {
    const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
    s = { player, history: [], panel: null, lastRender: null, sleepAt: null, sleepMinutes: 0, failStreak: 0 };
    s.timer = setInterval(() => {
      countListening(guild);
      refresh(guild).catch(console.error);
    }, REFRESH_MS);
    s.lyricTimer = setInterval(() => lyricTick(guild).catch(() => {}), LYRICS_MS);
    sessions.set(guild.id, s);
    player.on('error', (e) => console.error(`[${guild.name}] flux en erreur:`, e.message));
    player.on(AudioPlayerStatus.Playing, () => {
      if (!s.loading) return;
      s.loading = false;
      refresh(guild).catch(console.error);
    });
    // Un flux live qui coupe passe en Idle : on relance la même station, sauf s'il échoue 3 fois de suite.
    player.on(AudioPlayerStatus.Idle, () => {
      if (s.stopped) return;
      s.failStreak = Date.now() - s.resourceStartedAt < 15000 ? s.failStreak + 1 : 0;
      if (s.failStreak >= 3) {
        Object.assign(s, { broken: true, loading: false });
        refresh(guild).catch(console.error);
        return;
      }
      setTimeout(() => !s.stopped && !s.broken && sessions.get(guild.id) === s && startResource(s, guild.id), 3000);
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
  Object.assign(s, {
    stopped: false, paused: false, broken: false, failStreak: 0, title: null, track: null, titleAt: null, lyrics: null, startedAt: now(),
  });
  startResource(s, guild.id);
  refresh(guild).catch(console.error);
}

function startResource(s, guildId) {
  const cfg = cfgOf(guildId);
  const station = stationsOf(guildId)[cfg.station];
  if (!station) return;
  const effect = premium.isPremium(guildId) ? cfg.effect : 'normal'; // Effets réservés au premium.
  s.loading = true; // Écran d'attente jusqu'au premier son (événement Playing).
  s.resourceStartedAt = Date.now();
  s.resource = createAudioResource(createStream(station.url, effect), { inputType: StreamType.Raw, inlineVolume: true });
  s.resource.volume.setVolume(cfg.volume / 100);
  s.player.play(s.resource);
}

// Temps d'écoute cumulé (minutes × auditeurs) pour /top et le récap de la semaine.
function countListening(guild) {
  const s = sessions.get(guild.id);
  const cfg = cfgOf(guild.id);
  const members = voiceMembers(guild);
  if (!s || s.paused || s.loading || s.broken || !members.size || !cfg.stats[cfg.station]) return;
  const minutes = (members.size * REFRESH_MS) / 60000;
  cfg.stats[cfg.station].minutes += minutes;
  const week = cfg.week;
  if (week) {
    week.minutes[cfg.station] = (week.minutes[cfg.station] ?? 0) + minutes;
    for (const id of members.keys()) if (!week.listeners.includes(id) && week.listeners.length < 1000) week.listeners.push(id);
  }
  save(guild.id);
}

function togglePause(guild) {
  const s = sessions.get(guild.id);
  // Un direct ne se met pas vraiment en pause : on coupe le flux et on reprend le direct au retour.
  s.paused = !s.paused;
  s.stopped = s.paused;
  if (s.paused) s.player.stop(); else startResource(s, guild.id);
}

function retry(guild) {
  const s = sessions.get(guild.id);
  Object.assign(s, { broken: false, failStreak: 0, stopped: false, paused: false });
  startResource(s, guild.id);
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
  if (s && !s.paused && !s.broken) startResource(s, guild.id);
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
    clearInterval(s.lyricTimer);
    clearTimeout(s.sleepTimer);
    s.panel?.edit(notice(reason ?? t(langOf(guild), 'stopped'), OFF_COLOR)).catch(() => {});
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

// Nouveau titre détecté : infos, pochette, paroles minutées, historique, stats de la semaine.
async function onNewTitle(guild, s, title) {
  const cfg = cfgOf(guild.id);
  if (s.title) s.history = [{ title: s.title, cover: s.track?.cover ?? null, at: now() }, ...s.history].slice(0, 10);
  // Début du titre connu seulement si on l'a vu changer (pas pour le premier titre, pris en cours).
  s.titleAt = s.title ? Date.now() - REFRESH_MS / 2 : null;
  Object.assign(s, { title, track: null, lyrics: null, lyricIdx: -1 });
  s.track = await fetchTrack(title);
  await fetchImage(s.track?.cover);
  if (s.titleAt) {
    const lines = parseLrc((await fetchLyrics(title))?.syncedLyrics);
    s.lyrics = lines.length ? lines : null;
  }
  const titles = cfg.week?.titles;
  if (titles && (titles[title] || Object.keys(titles).length < 300)) titles[title] = (titles[title] ?? 0) + 1;
}

// --- Composants (nouvelle mise en page Discord) ---
const text = (content) => new TextDisplayBuilder().setContent(content);
const container = (color) => new ContainerBuilder().setAccentColor(color);
const notice = (content, color = COLOR) => ({
  components: [container(color).addTextDisplayComponents(text(content))], flags: V2, files: [], attachments: [],
});
const row = (...components) => new ActionRowBuilder().addComponents(...components);
const button = (id, emoji, style = ButtonStyle.Secondary, label) => {
  const b = new ButtonBuilder().setCustomId(id).setStyle(style);
  if (emoji) b.setEmoji(emoji);
  return label ? b.setLabel(label.slice(0, 80)) : b;
};

// --- Panneau « en cours » ---
// Badges « EN DIRECT » : émojis d'application créés au démarrage (voir ensureBadges), sinon texte.
const badges = {};
const badgeOf = (lang, paused) => badges[`${paused ? 'pause' : 'live'}_${lang}`] ?? `\`${t(lang, paused ? 'paused' : 'live')}\``;
const renderOf = (payload) => JSON.stringify(payload.components);

// image : false = met à jour le texte en gardant l'image déjà envoyée (paroles, progression).
async function panelPayload(guild, { image = true } = {}) {
  const lang = langOf(guild);
  const cfg = cfgOf(guild.id);
  const s = sessions.get(guild.id);
  const stations = stationsOf(guild.id);
  const station = stations[cfg.station];
  const channel = guild.channels.cache.get(cfg.channelId);
  const isPremium = premium.isPremium(guild.id);
  const live = !s.loading && !s.broken;
  const accent = s.broken ? ERROR_COLOR : s.paused ? PAUSE_COLOR : (isPremium && cfg.color) || stationColor(station);
  const c = container(accent);

  const head = [`-# ${client.user.username} · ${channel?.name ?? '…'}`];
  if (s.broken) {
    const suggestion = stations[suggestionFor(guild.id, cfg.station)];
    head.push(`## ⚠️ ${station.name}`, t(lang, 'streamDown', station.name), suggestion ? t(lang, 'streamSuggest', suggestion.name) : '');
  } else if (s.loading) {
    head.push(`## ⏳ ${station.name}`, t(lang, 'connecting', station.name));
  } else {
    head.push(`## ${badgeOf(lang, s.paused)} ${station.name}`, `🎵 **${s.title ?? t(lang, 'noTitle')}**`);
  }
  const headText = text(head.filter(Boolean).join('\n'));
  if (station.logo) c.addSectionComponents(new SectionBuilder().addTextDisplayComponents(headText).setThumbnailAccessory(new ThumbnailBuilder().setURL(station.logo)));
  else c.addTextDisplayComponents(headText);

  if (live) c.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL('attachment://card.png')));

  const lines = [];
  const elapsed = s.titleAt ? Date.now() - s.titleAt : null;
  if (live && elapsed !== null && s.track?.durationMs) lines.push(progressBar(elapsed, s.track.durationMs));
  if (live && !s.paused && elapsed !== null && s.lyrics) {
    const idx = lineAt(s.lyrics, elapsed);
    const prev = s.lyrics[idx - 1]?.line;
    const next = s.lyrics[idx + 1]?.line;
    if (prev) lines.push(`-# ${prev}`);
    lines.push(`🎤 **${s.lyrics[idx]?.line || '♪'}**`);
    if (next) lines.push(`-# ${next}`);
  }
  const info = [
    `📍 ${channel?.name ?? '—'}`,
    `👤 ${s.requester}`,
    `⏱️ ${cfg.stay247 ? t(lang, 'h24') : `<t:${s.startedAt}:R>`}`,
    `🔊 ${cfg.volume} %`,
  ];
  if (cfg.effect !== 'normal' && isPremium) info.push(EFFECTS[cfg.effect].label);
  if (s.sleepAt) info.push(`💤 <t:${s.sleepAt}:R>`);
  if (isPremium) info.push('💎');
  if (live && s.track) lines.push(`🎧 [Deezer](${s.track.deezerUrl}) · 🟢 [Spotify](${s.track.spotifyUrl})`);
  lines.push(`-# ${info.join(' · ')}`);
  c.addTextDisplayComponents(text(lines.join('\n')));
  c.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  if (s.broken) {
    const suggestion = suggestionFor(guild.id, cfg.station);
    c.addActionRowComponents(row(
      button('radio:retry', '🔄', ButtonStyle.Primary, t(lang, 'btnRetry')),
      ...(suggestion ? [button(`radio:goto:${suggestion}`, '▶️', ButtonStyle.Success, stations[suggestion].name)] : []),
      button('radio:stop', '⏹️', ButtonStyle.Danger),
    ));
  } else {
    // Lecteur compact : précédente, lecture/pause, suivante, volume, stop.
    c.addActionRowComponents(row(
      button('radio:prev', '⏮️'),
      button('radio:toggle', s.paused ? '▶️' : '⏸️', ButtonStyle.Primary),
      button('radio:next', '⏭️'),
      button('radio:volume', '🔊'),
      button('radio:stop', '⏹️', ButtonStyle.Danger),
    ));
  }
  // Tout le reste dans un seul menu.
  const option = (value, emoji, key, description) => ({ value, emoji, label: t(lang, key), description });
  c.addActionRowComponents(row(new StringSelectMenuBuilder().setCustomId('radio:more').setPlaceholder(t(lang, 'morePh')).addOptions(
    option('stations', '📻', 'moreStations', t(lang, 'moreStationsDesc')),
    option('random', '🎲', 'moreRandom', t(lang, 'moreRandomDesc')),
    option('sleep', '💤', 'moreSleep', s.sleepAt ? t(lang, 'moreSleepOn', s.sleepMinutes) : t(lang, 'moreSleepDesc')),
    option('effect', '🎛️', 'moreEffect', `${EFFECTS[cfg.effect].label}${isPremium ? '' : ' · 💎 Premium'}`),
    option('fav', '⭐', 'moreFav', t(lang, 'moreFavDesc')),
    option('lyrics', '📝', 'moreLyrics', t(lang, 'moreLyricsDesc')),
    option('history', '📜', 'moreHistory', t(lang, 'moreHistoryDesc')),
  )));

  const payload = { components: [c], flags: V2 };
  if (!live) payload.attachments = []; // Retire l'ancienne carte pendant l'attente ou l'erreur.
  if (live && image) {
    const card = await renderCard({
      title: s.title, station: station.name, label: t(lang, s.paused ? 'cardPaused' : 'cardLive'), color: stationColor(station),
      paused: s.paused, cover: cachedImage(s.track?.cover), logo: cachedImage(station.logo),
    });
    payload.files = [new AttachmentBuilder(card, { name: 'card.png' })];
    payload.attachments = [];
  }
  return payload;
}

// Envoie le panneau mis à jour ; l'image n'est régénérée qu'avec image: true.
async function editPanel(guild, opts) {
  const s = sessions.get(guild.id);
  if (!s?.panel) return;
  const payload = await panelPayload(guild, opts);
  s.lastRender = renderOf(payload);
  await s.panel.edit(payload).then(() => { if (payload.files) s.hasImage = true; }).catch(() => { s.panel = null; });
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

// Toutes les 15 s : titre, carte (l'égaliseur bouge), statut du salon et message de statut.
async function refresh(guild) {
  const s = sessions.get(guild.id);
  if (!s) return;
  const cfg = cfgOf(guild.id);
  const station = stationsOf(guild.id)[cfg.station];
  await learnLogoColor(station);
  await fetchImage(station.logo);
  if (!s.paused && !s.broken) {
    const title = await fetchTitle(station.url);
    if (title && title !== s.title) await onNewTitle(guild, s, title);
  }
  if (sessions.get(guild.id) !== s) return; // Arrêtée pendant la lecture du titre.
  const status = s.broken ? '⚠️' : s.paused ? '⏸️' : `📻 ${station.name}${s.title ? ` · ${s.title}` : ''}`;
  if (status !== s.lastStatus) setVoiceStatus(cfg.channelId, (s.lastStatus = status));
  if (s.panel) {
    const animated = !s.paused && !s.loading && !s.broken;
    const payload = await panelPayload(guild);
    const render = renderOf(payload);
    if (animated || render !== s.lastRender) {
      s.lastRender = render;
      await s.panel.edit(payload).then(() => { s.hasImage = Boolean(payload.files); }).catch(() => { s.panel = null; });
    }
  }
  await updateStatusMessage(guild);
}

// Toutes les 3 s : fait avancer les paroles synchronisées et la barre de progression, sans renvoyer l'image.
async function lyricTick(guild) {
  const s = sessions.get(guild.id);
  if (!s?.panel || !s.hasImage || !s.lyrics || !s.titleAt || s.paused || s.loading || s.broken) return;
  const idx = lineAt(s.lyrics, Date.now() - s.titleAt);
  if (idx === s.lyricIdx) return;
  s.lyricIdx = idx;
  await editPanel(guild, { image: false });
}

// Statut affiché sous le nom du salon vocal (permission « Définir le statut du salon vocal », sinon ignoré).
function setVoiceStatus(channelId, status) {
  client.rest.put(`/channels/${channelId}/voice-status`, { body: { status: status.slice(0, 500) } }).catch(() => {});
}

// Affiche le panneau en réponse et remplace l'ancien par un petit message.
async function sendPanel(i) {
  const s = sessions.get(i.guildId);
  const payload = await panelPayload(i.guild);
  const message = i.deferred
    ? await i.editReply(payload)
    : (await i.reply({ ...payload, withResponse: true })).resource.message;
  if (s.panel && s.panel.id !== message.id) s.panel.edit(notice(t(langOf(i.guild), 'panelMoved'), OFF_COLOR)).catch(() => {});
  Object.assign(s, { panel: message, lastRender: renderOf(payload), hasImage: Boolean(payload.files) });
}

// Lance une station pour le membre de l'interaction, avec toutes les vérifications.
async function playFor(i, key, station) {
  const lang = langFor(i);
  const cfg = cfgOf(i.guildId);
  const respond = (content) => (i.deferred ? i.editReply({ embeds: [embed(content)] }) : reply(i, content, true));
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
  user.favs[key] = { name: station.name, url: station.url, logo: station.logo, genre: station.genre, color: station.color };
  db.saveUser(i.user.id, user);
  return reply(i, t(lang, 'favAdded', station.name), true);
}

async function sendLyrics(i) {
  const lang = langFor(i);
  const title = sessions.get(i.guildId)?.title;
  if (!title) return reply(i, t(lang, 'lyricsNoTitle'), true);
  await i.deferReply({ flags: MessageFlags.Ephemeral });
  const lyrics = await fetchLyrics(title);
  const plain = lyrics?.plainLyrics ?? parseLrc(lyrics?.syncedLyrics).map((l) => l.line).join('\n');
  if (!plain) return i.editReply({ embeds: [embed(t(lang, 'lyricsNone', title))] });
  const body = plain.length > 4000 ? `${plain.slice(0, 4000)}…` : plain;
  return i.editReply({ embeds: [embed(body).setTitle(`📝 ${lyrics.artistName} — ${lyrics.trackName}`.slice(0, 256))] });
}

// Historique : les 10 derniers titres, et un menu pour se faire envoyer un titre en MP.
function historyPayload(i) {
  const lang = langFor(i);
  const s = sessions.get(i.guildId);
  const items = [...(s?.title ? [{ title: s.title, at: null }] : []), ...(s?.history ?? [])];
  const c = container(COLOR).addTextDisplayComponents(text(`## ${t(lang, 'historyTitle')}\n${items.length
    ? items.map((h, n) => `${n === 0 && h.at === null ? '🔴' : `\`${n + 1}.\``} ${h.title}${h.at ? ` · <t:${h.at}:R>` : ''}`).join('\n')
    : t(lang, 'historyEmpty')}`));
  if (items.length) {
    c.addActionRowComponents(row(new StringSelectMenuBuilder().setCustomId('hist:dm').setPlaceholder(t(lang, 'historyDm'))
      .addOptions(items.map((h, n) => ({ label: h.title.slice(0, 100), value: String(n), emoji: '📩' })))));
  }
  return { components: [c], flags: V2 | MessageFlags.Ephemeral };
}

async function onHistoryAction(i) {
  const lang = langFor(i);
  const s = sessions.get(i.guildId);
  const items = [...(s?.title ? [{ title: s.title }] : []), ...(s?.history ?? [])];
  const item = items[Number(i.values[0])];
  if (!item) return reply(i, t(lang, 'historyEmpty'), true);
  const track = await fetchTrack(item.title);
  const station = stationsOf(i.guildId)[cfgOf(i.guildId).station];
  const dm = new EmbedBuilder().setColor(stationColor(station ?? {})).setTitle(`🎵 ${item.title}`.slice(0, 256))
    .setDescription(`${t(lang, 'dmFrom', station?.name ?? '📻', i.guild.name)}${track ? `\n\n🎧 [Deezer](${track.deezerUrl}) · 🟢 [Spotify](${track.spotifyUrl})` : ''}`)
    .setThumbnail(track?.cover ?? null).setTimestamp();
  const sent = await i.user.send({ embeds: [dm] }).then(() => true).catch(() => false);
  return reply(i, t(lang, sent ? 'dmSent' : 'dmClosed'), true);
}

async function onPanelAction(i) {
  const lang = langFor(i);
  const cfg = cfgOf(i.guildId);
  const s = sessions.get(i.guildId);
  if (!s) return i.update(notice(t(lang, 'nothing'), OFF_COLOR));
  // Le menu « Plus d'options » envoie son choix comme action.
  const action = i.customId === 'radio:more' ? i.values[0] : i.customId.slice('radio:'.length);
  // Accessibles à tous les auditeurs (réponses visibles par toi seul).
  if (action === 'fav') return toggleFavorite(i, cfg.station, stationsOf(i.guildId)[cfg.station]);
  if (action === 'lyrics') return sendLyrics(i);
  if (action === 'history') return i.reply(historyPayload(i));
  if (action === 'stations') return i.reply({ ...stationsPayload(i), flags: V2 | MessageFlags.Ephemeral });

  if (!canControl(i.member, cfg)) return reply(i, t(lang, 'needDj', cfg.djRole), true);
  if (i.member.voice.channelId !== cfg.channelId) return reply(i, t(lang, 'joinMine', cfg.channelId), true);

  const stations = stationsOf(i.guildId);
  const keys = Object.keys(stations);
  const idx = keys.indexOf(cfg.station);
  if (action === 'stop') {
    s.panel = null; // Ce message est mis à jour juste en dessous.
    stop(i.guild);
    return i.update(notice(t(langOf(i.guild), 'stoppedBy', i.user), OFF_COLOR));
  }
  // Fenêtres à remplir : volume et minuteur.
  const modal = (id, title, label, value, max) => i.showModal(new ModalBuilder().setCustomId(id).setTitle(title).addComponents(
    row(new TextInputBuilder().setCustomId('value').setLabel(label).setStyle(TextInputStyle.Short)
      .setValue(String(value)).setMinLength(1).setMaxLength(String(max).length).setRequired(true)),
  ));
  if (action === 'volume') return modal('radio:volmodal', t(lang, 'btnVolume'), t(lang, 'volumeModalLabel', premium.maxVolume(i.guildId)), cfg.volume, 200);
  if (action === 'sleep') return modal('radio:sleepmodal', t(lang, 'moreSleep'), t(lang, 'sleepModalLabel'), s.sleepMinutes, 720);
  if (action === 'effect') {
    if (!premium.isPremium(i.guildId)) return reply(i, t(lang, 'premiumOnly'), true);
    return i.reply({
      components: [container(COLOR).addTextDisplayComponents(text(`**${t(lang, 'moreEffect')}**`)).addActionRowComponents(row(
        new StringSelectMenuBuilder().setCustomId('radio:effectpick').setPlaceholder(t(lang, 'chooseEffect'))
          .addOptions(Object.entries(EFFECTS).map(([k, fx]) => ({ label: fx.label, value: k, default: k === cfg.effect }))),
      ))],
      flags: V2 | MessageFlags.Ephemeral,
    });
  }

  if (action === 'prev') switchStation(i.guild, keys.at(idx - 1));
  if (action === 'next') switchStation(i.guild, keys[(idx + 1) % keys.length]);
  if (action === 'random') {
    const others = keys.filter((k) => k !== cfg.station);
    switchStation(i.guild, others[Math.floor(Math.random() * others.length)] ?? cfg.station);
  }
  if (action === 'select') switchStation(i.guild, i.values[0]); // Anciens panneaux.
  if (action.startsWith('goto:') && stations[action.slice(5)]) switchStation(i.guild, action.slice(5));
  if (action === 'retry') retry(i.guild);
  if (action === 'toggle') togglePause(i.guild);
  if (action === 'effectpick' || action === 'effect') setEffect(i.guild, i.values[0]);
  if (action === 'volmodal' || action === 'sleepmodal') {
    const value = Number(i.fields.getTextInputValue('value'));
    const max = action === 'volmodal' ? premium.maxVolume(i.guildId) : 720;
    if (action === 'volmodal' && Number.isInteger(value) && value > max && value <= 200) return reply(i, t(lang, 'premiumOnly'), true);
    if (!Number.isInteger(value) || value < 0 || value > max) return reply(i, t(lang, 'badNumber', max), true);
    if (action === 'volmodal') setVolume(i.guildId, value); else setSleep(i.guild, value);
  }

  // Choix fait depuis un message privé à toi (menu des effets) : on met à jour le vrai panneau à part.
  if (i.message?.flags.has(MessageFlags.Ephemeral)) {
    editPanel(i.guild).catch(console.error);
    return i.update(notice(t(lang, 'effectSet', EFFECTS[cfg.effect].label)));
  }
  s.panel = i.message;
  const payload = await panelPayload(i.guild);
  Object.assign(s, { lastRender: renderOf(payload), hasImage: Boolean(payload.files) });
  return i.update(payload);
}

// --- /stations : par genre, avec deux menus (genre, radio) ---
function stationsPayload(i, genre = 'all') {
  const lang = langFor(i);
  const names = t(lang, 'genres');
  const all = Object.entries(stationsOf(i.guildId));
  const present = Object.keys(names).filter((g) => g === 'all' || all.some(([k, st]) => genreOf(k, st) === g));
  const list = (genre === 'all' ? all : all.filter(([k, st]) => genreOf(k, st) === genre)).slice(0, 25);
  const c = container(COLOR)
    .addTextDisplayComponents(text(`## ${t(lang, 'stationsTitle')}\n-# ${names[genre] ?? genre} · ${list.length}\n${list.map(([, st]) => st.name).join('  ·  ')}`))
    .addActionRowComponents(row(new StringSelectMenuBuilder().setCustomId('st:genre').setPlaceholder(t(lang, 'genrePh'))
      .addOptions(present.map((g) => ({ label: names[g], value: g, default: g === genre })))))
    .addActionRowComponents(row(new StringSelectMenuBuilder().setCustomId('st:play').setPlaceholder(t(lang, 'pickStation'))
      .addOptions(list.map(([k, st]) => ({ label: st.name.slice(0, 100), value: k, description: names[genreOf(k, st)] })))))
    .addTextDisplayComponents(text(`-# ${t(lang, 'stationsFooter')}`));
  return { components: [c], flags: V2 };
}

async function onStationsAction(i) {
  if (i.customId === 'st:genre') return i.update(stationsPayload(i, i.values[0]));
  const key = i.values[0];
  const station = stationsOf(i.guildId)[key];
  if (!station) return reply(i, t(langFor(i), 'unknownStation'), true);
  return playFor(i, key, station);
}

// --- Favoris : liste + un menu pour lancer ---
function favoritesPayload(i) {
  const lang = langFor(i);
  const favs = Object.entries(db.user(i.user.id).favs);
  const c = container(COLOR).addTextDisplayComponents(text(favs.length
    ? `## ${t(lang, 'favTitle')}\n${favs.map(([, st]) => st.name).join('  ·  ')}\n-# ${t(lang, 'favHint')}`
    : `## ${t(lang, 'favTitle')}\n-# ${t(lang, 'favEmpty')}`));
  if (favs.length) {
    c.addActionRowComponents(row(new StringSelectMenuBuilder().setCustomId('fav:play').setPlaceholder(t(lang, 'pickFav'))
      .addOptions(favs.map(([k, st]) => ({ label: st.name.slice(0, 100), value: k })))));
  }
  return { components: [c], flags: V2 | MessageFlags.Ephemeral };
}

async function onFavAction(i) {
  const key = i.values?.[0] ?? i.customId.split(':').slice(2).join(':'); // Menu, ou bouton d'un ancien message.
  const station = db.user(i.user.id).favs[key];
  if (!station) return reply(i, t(langFor(i), 'favUnknown'), true);
  return playFor(i, key, station);
}

// --- Panneau de config (/admin config) : mêmes permissions que les commandes /admin ---
function configPayload(i) {
  const lang = langFor(i);
  const cfg = cfgOf(i.guildId);
  const isPremium = premium.isPremium(i.guildId);
  const can247 = isPremium || owners.has(i.user.id);
  const premiumText = isPremium ? t(lang, 'until', premium.premiumUntil(i.guildId)) : '—';
  const dj = new RoleSelectMenuBuilder().setCustomId('cfg:dj').setPlaceholder(t(lang, 'cfgDjPh')).setMinValues(0).setMaxValues(1);
  if (cfg.djRole) dj.setDefaultRoles(cfg.djRole);
  const status = new ChannelSelectMenuBuilder().setCustomId('cfg:status').setPlaceholder(t(lang, 'cfgStatusPh'))
    .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setMinValues(0).setMaxValues(1);
  if (cfg.status) status.setDefaultChannels(cfg.status.channelId);
  const c = container(isPremium && cfg.color ? cfg.color : COLOR)
    .addTextDisplayComponents(text(`## ⚙️ ${t(lang, 'cfgTitle')} · ${i.guild.name}\n-# 💎 Premium : ${premiumText}`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(text(`**${t(lang, 'cfgDj')}**\n-# ${t(lang, 'cfgDjHint')}`))
    .addActionRowComponents(row(dj))
    .addTextDisplayComponents(text(`**${t(lang, 'cfgStatus')}**\n-# ${t(lang, 'cfgStatusHint')}`))
    .addActionRowComponents(row(status))
    .addTextDisplayComponents(text(`**${t(lang, 'cfgLang')}**`))
    .addActionRowComponents(row(new StringSelectMenuBuilder().setCustomId('cfg:lang').addOptions(
      { label: t(lang, 'langAuto'), value: 'auto', emoji: '🌐', default: cfg.lang === 'auto' },
      { label: 'Français', value: 'fr', emoji: '🇫🇷', default: cfg.lang === 'fr' },
      { label: 'English', value: 'en', emoji: '🇬🇧', default: cfg.lang === 'en' },
    )))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addActionRowComponents(row(
      button('cfg:247', can247 ? '🔁' : '🔒', cfg.stay247 ? ButtonStyle.Success : ButtonStyle.Secondary, t(lang, 'cfg247', cfg.stay247)),
      button('cfg:color', isPremium ? '🎨' : '🔒', ButtonStyle.Secondary, t(lang, 'cfgColor')),
    ));
  return { components: [c], flags: V2 };
}

async function onConfigAction(i) {
  const lang = langFor(i);
  const cfg = cfgOf(i.guildId);
  if (!i.memberPermissions.has(PermissionFlagsBits.ManageGuild)) return reply(i, t(lang, 'needManage'), true);
  const action = i.customId.slice('cfg:'.length);
  if (action === 'dj') cfg.djRole = i.values[0] ?? null;
  if (action === 'lang') cfg.lang = i.values[0];
  if (action === 'status') {
    const channel = i.channels.first();
    statusMessages.delete(i.guildId);
    if (!channel) cfg.status = null;
    else {
      const perms = channel.permissionsFor(i.guild.members.me);
      if (!perms?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
        return reply(i, t(lang, 'statusNoPerm'), true);
      }
      cfg.status = { channelId: channel.id, messageId: null };
    }
  }
  if (action === '247') {
    const enabled = !cfg.stay247;
    if (enabled && !premium.isPremium(i.guildId) && !owners.has(i.user.id)) return reply(i, t(lang, 'premiumNeeded'), true);
    cfg.stay247 = enabled;
    if (!enabled) cfg.forced247 = false;
  }
  if (action === 'color') {
    if (!premium.isPremium(i.guildId)) return reply(i, t(lang, 'premiumOnly'), true);
    const current = cfg.color === null ? '' : `#${cfg.color.toString(16).padStart(6, '0')}`;
    return i.showModal(new ModalBuilder().setCustomId('cfg:colormodal').setTitle(t(lang, 'cfgColor')).addComponents(
      row(new TextInputBuilder().setCustomId('hex').setLabel(t(lang, 'cfgColorLabel')).setStyle(TextInputStyle.Short)
        .setValue(current).setPlaceholder('#ff3b3b').setMaxLength(7).setRequired(true)),
    ));
  }
  if (action === 'colormodal') {
    if (!premium.isPremium(i.guildId)) return reply(i, t(lang, 'premiumOnly'), true);
    const value = i.fields.getTextInputValue('hex').trim().toLowerCase();
    if (value === 'reset') cfg.color = null;
    else if (/^#?[0-9a-f]{6}$/.test(value)) cfg.color = parseInt(value.replace('#', ''), 16);
    else return reply(i, t(lang, 'badColor'), true);
  }
  save(i.guildId);
  if (action === 'status') updateStatusMessage(i.guild).catch(console.error);
  refresh(i.guild).catch(console.error);
  return i.update(configPayload(i));
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
    e.setColor(s.paused ? PAUSE_COLOR : stationColor(station))
      .setDescription(`${t(lang, s.paused ? 'paused' : 'live')} · **${station.name}**\n🎵 ${s.title ?? t(lang, 'noTitle')}`)
      .addFields(
        { name: t(lang, 'channel'), value: `<#${cfg.channelId}>`, inline: true },
        { name: t(lang, 'listeners'), value: `${listenersOf(guild)}`, inline: true },
        { name: t(lang, 'since'), value: `<t:${s.startedAt}:R>`, inline: true },
      );
    if (s.track?.cover ?? station.logo) e.setThumbnail(s.track?.cover ?? station.logo);
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

// Salon où le bot écrit de lui-même (récap, premium) : celui du message de statut, sinon le salon système.
const announceChannel = (guild) => guild.channels.cache.get(cfgOf(guild.id).status?.channelId ?? guild.systemChannelId);

// --- Récap de fin de semaine (lundi 00:00 UTC) ---
const newWeek = (start) => ({ start, minutes: {}, titles: {}, listeners: [] });

function recapEmbed(guild, week) {
  const lang = langOf(guild);
  const cfg = cfgOf(guild.id);
  const medals = ['🥇', '🥈', '🥉'];
  const total = Object.values(week.minutes).reduce((a, b) => a + b, 0);
  const stations = Object.entries(week.minutes).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([k, m], n) => `${medals[n]} ${cfg.stats[k]?.name ?? k} — ${formatMinutes(m)}`);
  const titles = Object.entries(week.titles).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([title, count], n) => `${medals[n]} ${title} ×${count}`);
  const e = new EmbedBuilder().setColor(COLOR).setTitle(t(lang, 'recapTitle', guild.name)).setThumbnail(guild.iconURL())
    .setDescription(t(lang, 'recapIntro', formatMinutes(total), week.listeners.length));
  if (stations.length) e.addFields({ name: t(lang, 'recapStations'), value: stations.join('\n') });
  if (titles.length) e.addFields({ name: t(lang, 'recapTitles'), value: titles.join('\n') });
  return e;
}

async function maybeRecap(guild) {
  const cfg = cfgOf(guild.id);
  const start = weekStart(Date.now());
  if (cfg.week?.start === start) return;
  const week = cfg.week;
  cfg.week = newWeek(start);
  save(guild.id);
  if (!week || Object.values(week.minutes).reduce((a, b) => a + b, 0) < 1) return; // Rien écouté : pas de récap.
  await announceChannel(guild)?.send({ embeds: [recapEmbed(guild, week)] }).catch(() => {});
}

// Journal premium des owners (PREMIUM_LOG_CHANNEL_ID), via l'API : marche depuis n'importe quel shard.
function logPremium(content) {
  const channelId = process.env.PREMIUM_LOG_CHANNEL_ID;
  if (channelId) client.rest.post(`/channels/${channelId}/messages`, { body: { embeds: [embed(content).setTimestamp().toJSON()] } }).catch(() => {});
}

// Prévient le serveur 3 jours avant la fin du premium, puis à la fin (et retire les avantages).
async function premiumNotice(guild, kind) {
  const lang = langOf(guild);
  const cfg = cfgOf(guild.id);
  premium.markRecord(guild.id, kind === 'warn' ? { warned: true } : { expired: true });
  if (kind === 'expired') {
    if (cfg.effect !== 'normal') setEffect(guild, 'normal');
    setVolume(guild.id, cfg.volume); // Ramène à 100 % max.
    refresh(guild).catch(console.error);
    logPremium(`⌛ Premium terminé sur **${guild.name}** (\`${guild.id}\`)`);
  }
  const content = kind === 'warn' ? t(lang, 'premiumWarn', `<t:${Math.floor(premium.premiumUntil(guild.id) / 1000)}:R>`) : t(lang, 'premiumExpired');
  await announceChannel(guild)?.send({ embeds: [embed(content).setColor(kind === 'warn' ? COLOR : OFF_COLOR)] }).catch(() => {});
}

// Toutes les minutes : totaux multi-shards, présence du bot, premium, récap, messages de statut.
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
    const kind = premium.pendingNotice(guild.id);
    if (kind) await premiumNotice(guild, kind);
    if (cfg.stay247 && !cfg.forced247 && !premium.isPremium(guild.id)) { // Premium expiré : fin du 24/7.
      cfg.stay247 = false;
      save(guild.id);
    }
    await maybeRecap(guild);
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
  loc(new SlashCommandBuilder(), 'help', 'All the bot commands', 'Toutes les commandes du bot', 'aide'),
  loc(new SlashCommandBuilder(), 'play', 'Play a station in your voice channel', 'Lance une radio dans ton salon vocal').addStringOption(stationOption),
  loc(new SlashCommandBuilder(), 'world', 'Search 40,000 stations worldwide', 'Cherche parmi 40 000 radios du monde entier', 'monde')
    .addStringOption((o) => loc(o, 'search', 'Station name', 'Nom de la radio', 'recherche').setRequired(true).setAutocomplete(true)),
  loc(new SlashCommandBuilder(), 'stop', 'Stop the radio and leave', 'Arrête la radio et quitte le salon'),
  loc(new SlashCommandBuilder(), 'stations', 'Browse stations by genre', 'Parcourt les radios par genre'),
  loc(new SlashCommandBuilder(), 'nowplaying', 'Show the live panel', 'Affiche le panneau en cours'),
  loc(new SlashCommandBuilder(), 'volume', 'Set the volume', 'Règle le volume')
    .addIntegerOption((o) => loc(o, 'value', '0 to 100 (200 with Premium)', '0 à 100 (200 en Premium)', 'valeur').setRequired(true).setMinValue(0).setMaxValue(200)),
  loc(new SlashCommandBuilder(), 'effect', '💎 Apply an audio effect', '💎 Applique un effet audio', 'effet')
    .addStringOption((o) => loc(o, 'name', 'Effect', 'Effet', 'nom').setRequired(true)
      .addChoices(...Object.entries(EFFECTS).map(([value, fx]) => ({ name: value === 'normal' ? fx.label : `${fx.label} 💎`, value })))),
  loc(new SlashCommandBuilder(), 'sleep', 'Stop the radio after a while', 'Arrête la radio après un moment', 'minuteur')
    .addIntegerOption((o) => loc(o, 'minutes', 'Minutes (0 = cancel)', 'Minutes (0 = annuler)').setRequired(true).setMinValue(0).setMaxValue(720)),
  loc(new SlashCommandBuilder(), 'lyrics', 'Lyrics of the current song', 'Paroles du titre en cours', 'paroles'),
  loc(new SlashCommandBuilder(), 'history', 'Last songs played, sent to you by DM on request', 'Derniers titres diffusés, envoyés en MP sur demande', 'historique'),
  loc(new SlashCommandBuilder(), 'top', 'Most listened stations on this server', 'Radios les plus écoutées du serveur'),
  loc(new SlashCommandBuilder(), 'favorites', 'Your favorite stations', 'Tes radios favorites', 'favoris')
    .addSubcommand((c) => loc(c, 'list', 'Your favorites, one click to play', 'Tes favoris, un clic pour lancer', 'liste'))
    .addSubcommand((c) => loc(c, 'add', 'Add the current station', 'Ajoute la radio en cours', 'ajouter'))
    .addSubcommand((c) => loc(c, 'play', 'Play a favorite', 'Lance un favori', 'lancer').addStringOption(stationOption))
    .addSubcommand((c) => loc(c, 'remove', 'Remove a favorite', 'Retire un favori', 'retirer').addStringOption(stationOption)),
  loc(new SlashCommandBuilder(), 'admin', 'Radio settings', 'Configuration de la radio')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild).setContexts(InteractionContextType.Guild)
    .addSubcommand((c) => loc(c, 'config', 'Settings panel (DJ role, status, language, 24/7, color)', 'Panneau de config (rôle DJ, statut, langue, 24/7, couleur)'))
    .addSubcommand((c) => loc(c, 'dj-role', 'Role required to control the radio (empty = everyone)', 'Rôle requis pour contrôler la radio (vide = tout le monde)')
      .addRoleOption((o) => loc(o, 'role', 'DJ role', 'Rôle DJ')))
    .addSubcommand((c) => loc(c, '247', '💎 24/7 mode: stays in the channel, even empty or after a restart', '💎 Mode 24/7 : reste dans le salon, même vide ou après un redémarrage')
      .addBooleanOption((o) => loc(o, 'enabled', 'Enable?', 'Activer ?', 'actif').setRequired(true)))
    .addSubcommand((c) => loc(c, 'status', 'Live status message in a channel (empty = disable)', 'Message de statut en direct dans un salon (vide = désactiver)', 'statut')
      .addChannelOption((o) => loc(o, 'channel', 'Text channel', 'Salon textuel', 'salon').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)))
    .addSubcommand((c) => loc(c, 'language', 'Bot language on this server', 'Langue du bot sur ce serveur', 'langue')
      .addStringOption((o) => loc(o, 'value', 'Language', 'Langue', 'valeur').setRequired(true)
        .addChoices({ name: 'Auto', value: 'auto' }, { name: 'Français', value: 'fr' }, { name: 'English', value: 'en' }))),
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
    .addStringOption((o) => loc(o, 'logo', 'Logo image URL', 'URL du logo'))
    .addStringOption((o) => loc(o, 'genre', 'Genre in /stations', 'Genre dans /stations')
      .addChoices(...['chill', 'hits', 'rap', 'oldies', 'talk', 'eclectic', 'humor', 'other'].map((g) => ({ name: g, value: g })))))
  .addSubcommand((c) => loc(c, 'station-remove', 'Remove a station added by an owner', 'Supprime une radio ajoutée par un owner').addStringOption(stationOption));

// Owners : OWNER_IDS (séparés par des virgules) + propriétaire de l'application / membres de l'équipe.
const owners = new Set((process.env.OWNER_IDS ?? '').split(',').map((id) => id.trim()).filter(Boolean));

// --- /help : généré depuis les définitions des commandes, donc toujours à jour ---
const HELP_CATEGORIES = {
  helpRadio: ['play', 'world', 'stations', 'stop', 'nowplaying', 'volume', 'effect', 'sleep', 'lyrics'],
  helpPerso: ['favorites', 'history', 'top'],
  helpPremium: ['premium'],
  helpAdmin: ['admin'],
  helpOwner: ['owner'],
};
const commandIds = new Map(); // nom -> ID, pour des mentions cliquables </play:ID>

function helpLines(command, lang) {
  const json = command.toJSON();
  const desc = (c) => (lang === 'fr' && c.description_localizations?.fr) || c.description;
  const mention = (name) => (commandIds.has(json.name) ? `</${name}:${commandIds.get(json.name)}>` : `\`/${name}\``);
  const subs = (json.options ?? []).filter((o) => o.type === 1);
  if (!subs.length) return [`${mention(json.name)} — ${desc(json)}`];
  return subs.map((sub) => `${mention(`${json.name} ${sub.name}`)} — ${desc(sub)}`);
}

function helpPayload(i) {
  const lang = langFor(i);
  const all = [...commands, ownerCommand];
  const e = new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(t(lang, 'helpTitle', client.user.username))
    .setThumbnail(client.user.displayAvatarURL())
    .setDescription(t(lang, 'helpIntro', Object.keys(stationsOf(i.guildId)).length));
  for (const [category, names] of Object.entries(HELP_CATEGORIES)) {
    if (category === 'helpOwner' && !owners.has(i.user.id)) continue;
    const lines = names.flatMap((name) => helpLines(all.find((c) => c.name === name), lang));
    e.addFields({ name: t(lang, category), value: lines.join('\n').slice(0, 1024) });
  }
  e.setFooter({ text: t(lang, 'helpFooter') });

  const invite = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot+applications.commands&permissions=${INVITE_PERMISSIONS}`;
  const links = row(new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(invite).setEmoji('➕').setLabel(t(lang, 'helpInvite')));
  if (isStreamUrl(process.env.SUPPORT_URL)) {
    links.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(process.env.SUPPORT_URL).setEmoji('💬').setLabel(t(lang, 'helpSupport')));
  }
  return { embeds: [e], components: [links], flags: MessageFlags.Ephemeral };
}
// Voir les salons, envoyer des messages, intégrer des liens, joindre des fichiers, se connecter, parler, statut du salon vocal.
const INVITE_PERMISSIONS = (PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages | PermissionFlagsBits.EmbedLinks
  | PermissionFlagsBits.AttachFiles | PermissionFlagsBits.Connect | PermissionFlagsBits.Speak | PermissionFlagsBits.SetVoiceChannelStatus).toString();

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
      genre: 'world',
    });
  },
  async stop(i) {
    if (!sessions.has(i.guildId)) return reply(i, t(langFor(i), 'nothing'), true);
    stop(i.guild);
    return reply(i, t(langFor(i), 'stoppedBy', i.user));
  },
  stations: (i) => i.reply({ ...stationsPayload(i), flags: V2 | MessageFlags.Ephemeral }),
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
  history: (i) => i.reply(historyPayload(i)),
  help: (i) => i.reply(helpPayload(i)),
  async top(i, cfg) {
    const lang = langFor(i);
    const top = topOf(cfg).slice(0, 10);
    const content = top.length
      ? top.map((st, n) => t(lang, 'topLine', n + 1, st.name, formatMinutes(st.minutes), st.plays)).join('\n')
      : t(lang, 'topEmpty');
    return i.reply({ embeds: [embed(content).setTitle(t(lang, 'topTitle', i.guild.name)).setThumbnail(i.guild.iconURL())] });
  },
  async favorites(i, cfg) {
    const lang = langFor(i);
    const sub = i.options.getSubcommand();
    const favs = db.user(i.user.id).favs;
    if (sub === 'list') return i.reply(favoritesPayload(i));
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
    if (sub === 'config') return i.reply({ ...configPayload(i), flags: V2 | MessageFlags.Ephemeral });
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
    // language
    cfg.lang = i.options.getString('value');
    save(i.guildId);
    return reply(i, t(langFor(i), 'langSet', cfg.lang), true);
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
      const content = keys.map((k) => t(lang, 'keyLine', k.id, t(lang, 'duration', k.days), k.used.length, k.uses)).join('\n');
      return i.reply({ embeds: [embed(content || t(lang, 'keysEmpty')).setTitle(t(lang, 'keysTitle'))], flags: MessageFlags.Ephemeral });
    }
    if (sub === 'key-delete') return reply(i, t(lang, premium.deleteKey(i.options.getString('key')) ? 'keyDeleted' : 'keyNotFound'), true);
    if (sub === 'premium-list') {
      const list = premium.listPremium().slice(0, 25);
      const content = list.map((r) => t(lang, 'premiumListLine', r.name, r.id, t(lang, 'until', r.until))).join('\n');
      return i.reply({ embeds: [embed(content || t(lang, 'premiumListEmpty')).setTitle(t(lang, 'premiumListTitle'))], flags: MessageFlags.Ephemeral });
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
      global[key] = { name, url, logo: logo ?? undefined, genre: i.options.getString('genre') ?? undefined };
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
  // IDs des commandes pour les mentions cliquables de /help.
  const registered = await client.application.commands.fetch().catch(() => null);
  for (const command of registered?.values() ?? []) commandIds.set(command.name, command.id);
  if (ownerGuild) {
    const ownerCmds = await client.application.commands.fetch({ guildId: ownerGuild }).catch(() => null);
    for (const command of ownerCmds?.values() ?? []) commandIds.set(command.name, command.id);
  }
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

const COMPONENT_HANDLERS = { radio: onPanelAction, st: onStationsAction, fav: onFavAction, hist: onHistoryAction, cfg: onConfigAction };

client.on('interactionCreate', async (i) => {
  if (!i.inGuild() || !i.guild) return;
  try {
    if (i.isAutocomplete()) return await autocomplete(i);
    if (i.isMessageComponent() || i.isModalSubmit()) return await COMPONENT_HANDLERS[i.customId.split(':')[0]]?.(i);
    if (!i.isChatInputCommand()) return;
    const cfg = cfgOf(i.guildId);
    if (CONTROL.has(i.commandName) && !canControl(i.member, cfg)) return await reply(i, t(langFor(i), 'needDj', cfg.djRole), true);
    await handlers[i.commandName]?.(i, cfg);
  } catch (e) {
    // Code court pour retrouver l'erreur dans les logs quand un membre la signale.
    const code = Date.now().toString(36).slice(-6).toUpperCase();
    console.error(`[erreur ${code}]`, e);
    if (i.isRepliable() && !i.replied && !i.deferred) reply(i, t(langFor(i), 'error', code), true).catch(() => {});
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
