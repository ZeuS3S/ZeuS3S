const { PermissionFlagsBits } = require('discord.js');

// Admins (Gérer le serveur) passent toujours ; sinon le rôle DJ est requis s'il est défini.
const canControl = (member, cfg) =>
  member.permissions.has(PermissionFlagsBits.ManageGuild) || !cfg.djRole || member.roles.cache.has(cfg.djRole);

// Clé de station : minuscules, chiffres, tirets.
const stationKey = (name) => name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const isStreamUrl = (url) => {
  try { return ['http:', 'https:'].includes(new URL(url).protocol); } catch { return false; }
};

module.exports = { canControl, stationKey, isStreamUrl };
