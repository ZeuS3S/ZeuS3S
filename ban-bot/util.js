const { MessageFlags } = require('discord.js');

const COLORS = { blurple: 0x5865f2, red: 0xd9534f, green: 0x3ba55d, grey: 0x4e5058 };
const eph = { flags: MessageFlags.Ephemeral };

function dur(seconds) {
  if (!seconds) return 'Aucun';
  return seconds >= 3600 ? `${Math.round((seconds / 3600) * 10) / 10} h` : `${Math.round(seconds / 60)} min`;
}

// Nombre entre min et max, ou null si le texte n'est pas un nombre
function num(text, min, max) {
  const n = Number(String(text).trim().replace(',', '.'));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;
}

module.exports = { COLORS, eph, dur, num };
