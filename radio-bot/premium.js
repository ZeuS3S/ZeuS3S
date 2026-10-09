// Premium par serveur, activé par une clé créée par un owner du bot.
const { randomInt } = require('node:crypto');
const db = require('./db');

const FOREVER = 8.64e15; // Date maximale en JavaScript : premium à vie.
const DAY = 86400000;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sans 0/O ni 1/I.

const premiumUntil = (guildId) => db.get('premium', guildId)?.until ?? 0;
const isPremium = (guildId) => premiumUntil(guildId) > Date.now();

function addPremium(guildId, days) {
  const until = days ? Math.max(Date.now(), premiumUntil(guildId)) + days * DAY : FOREVER;
  db.set('premium', guildId, { until: Math.min(until, FOREVER) });
  return Math.min(until, FOREVER);
}
const removePremium = (guildId) => db.del('premium', guildId);

function createKey(days, uses, createdBy) {
  const group = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  const key = `RADIO-${group()}-${group()}-${group()}`;
  db.set('key', key, { days, uses, used: [], createdBy, createdAt: Date.now() });
  return key;
}

// Renvoie { until } ou { error: 'invalid' | 'used' | 'already' }. Transaction : deux shards ne peuvent pas consommer la même clé.
function redeemKey(rawKey, guildId) {
  const key = rawKey.trim().toUpperCase();
  return db.transaction(() => {
    const data = db.get('key', key);
    if (!data) return { error: 'invalid' };
    if (data.used.includes(guildId)) return { error: 'already' };
    if (data.used.length >= data.uses) return { error: 'used' };
    data.used.push(guildId);
    db.set('key', key, data);
    return { until: addPremium(guildId, data.days) };
  });
}

const listKeys = () => db.list('key');
const deleteKey = (key) => db.del('key', key.trim().toUpperCase()).changes > 0;

module.exports = { FOREVER, isPremium, premiumUntil, addPremium, removePremium, createKey, redeemKey, listKeys, deleteKey };
