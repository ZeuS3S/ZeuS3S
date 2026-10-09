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

module.exports = { canControl, stationKey, isStreamUrl, volumeBar, flag, formatMinutes };
