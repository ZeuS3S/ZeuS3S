const { PermissionFlagsBits } = require('discord.js');

// Admins (Gérer le serveur) passent toujours ; sinon le rôle DJ est requis s'il est défini.
const canControl = (member, cfg) =>
  member.permissions.has(PermissionFlagsBits.ManageGuild) || !cfg.djRole || member.roles.cache.has(cfg.djRole);

// Clé de station : minuscules, chiffres, tirets.
const stationKey = (name) => name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const isStreamUrl = (url) => {
  try { return ['http:', 'https:'].includes(new URL(url).protocol); } catch { return false; }
};

// ▰▰▰▱▱▱▱▱▱▱ pour un volume de 0 à 100 (au-delà de 100 : barre pleine + 🔥).
const volumeBar = (volume) => {
  const full = Math.min(10, Math.round(volume / 10));
  return '▰'.repeat(full) + '▱'.repeat(10 - full) + (volume > 100 ? ' 🔥' : '');
};

// 🇫🇷 depuis un code pays ISO (FR).
const flag = (code) => (/^[a-z]{2}$/i.test(code ?? '') ? String.fromCodePoint(...[...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0))) : '🌍');

// 754 → « 12 h 34 min ».
const formatMinutes = (minutes) => {
  const m = Math.floor(minutes);
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`;
};

// Paroles LRC « [01:23.45] ligne » → [{ ms, line }] triées.
const parseLrc = (lrc) => (lrc ?? '').split('\n').flatMap((row) => {
  const m = row.match(/^\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/);
  return m ? [{ ms: (Number(m[1]) * 60 + Number(m[2])) * 1000, line: m[3].trim() }] : [];
}).sort((a, b) => a.ms - b.ms);

// Index de la ligne en cours à `ms` du début du titre (-1 avant la première).
const lineAt = (lines, ms) => {
  let idx = -1;
  for (let n = 0; n < lines.length && lines[n].ms <= ms; n++) idx = n;
  return idx;
};

// 83000 → « 1:23 ».
const clock = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;

// `1:42` ━━━━━●────── `3:28`
const progressBar = (elapsed, duration, size = 14) => {
  const pos = Math.round(Math.min(1, Math.max(0, elapsed / duration)) * (size - 1));
  return `\`${clock(Math.min(elapsed, duration))}\` ${'━'.repeat(pos)}●${'─'.repeat(size - 1 - pos)} \`${clock(duration)}\``;
};

// Lundi 00:00 UTC de la semaine contenant `ms` (début du récap hebdomadaire).
const weekStart = (ms) => {
  const d = new Date(ms);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.getTime();
};

// Retire les émojis (la police de la carte n'en a pas).
const stripEmoji = (text) => text.replace(/[\p{Extended_Pictographic}\p{Regional_Indicator}\uFE0F\u200D]/gu, '').trim();

module.exports = {
  canControl, stationKey, isStreamUrl, volumeBar, flag, formatMinutes, parseLrc, lineAt, clock, progressBar, weekStart, stripEmoji,
};
