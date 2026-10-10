// Premium par serveur, activé par une clé créée par un owner du bot.
const { randomInt } = require('node:crypto');
const db = require('./db');

const FOREVER = 8.64e15; // Date maximale en JavaScript : premium à vie.
const DAY = 86400000;
const TRIAL_DAYS = 3;
const MAX_VOLUME = { free: 100, premium: 200 };
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sans 0/O ni 1/I.

// Fiche premium d'un serveur : { until, name, warned, expired }.
const record = (guildId) => db.get('premium', guildId);
const premiumUntil = (guildId) => record(guildId)?.until ?? 0;
const isPremium = (guildId) => premiumUntil(guildId) > Date.now();
const maxVolume = (guildId) => MAX_VOLUME[isPremium(guildId) ? 'premium' : 'free'];

// Ajoute des jours (0 = à vie) à partir de la fin actuelle si elle est future : une 2e clé prolonge.
function addPremium(guildId, days, name) {
  const until = Math.min(days ? Math.max(Date.now(), premiumUntil(guildId)) + days * DAY : FOREVER, FOREVER);
  // Pas de rappel « fin dans 3 jours » pour un premium qui dure 3 jours ou moins (l'essai).
  const short = days > 0 && until - Date.now() <= 3 * DAY;
  db.set('premium', guildId, { until, name: name ?? record(guildId)?.name ?? null, warned: short, expired: false });
  return until;
}
const removePremium = (guildId) => db.del('premium', guildId);
const markRecord = (guildId, patch) => db.set('premium', guildId, { ...record(guildId), ...patch });

// Ce que le tick doit annoncer : 'warn' (moins de 3 jours), 'expired', ou rien.
function pendingNotice(guildId, now = Date.now()) {
  const r = record(guildId);
  if (!r) return null;
  if (r.until <= now) return r.expired ? null : 'expired';
  return r.until - now < 3 * DAY && !r.warned ? 'warn' : null;
}

// Essai gratuit : une seule fois par serveur, même après la fin du premium.
function startTrial(guildId, name) {
  return db.transaction(() => {
    if (db.get('trial', guildId)) return { error: 'trialUsed' };
    if (isPremium(guildId)) return { error: 'alreadyPremium' };
    db.set('trial', guildId, { at: Date.now() });
    return { until: addPremium(guildId, TRIAL_DAYS, name) };
  });
}
const trialUsed = (guildId) => Boolean(db.get('trial', guildId));

const listPremium = () => db.list('premium').filter((r) => r.until > Date.now()).sort((a, b) => a.until - b.until);

function createKey(days, uses, createdBy) {
  const group = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  const key = `RADIO-${group()}-${group()}-${group()}`;
  db.set('key', key, { days, uses, used: [], createdBy, createdAt: Date.now() });
  return key;
}

// Renvoie { until } ou { error: 'invalid' | 'used' | 'already' }. Transaction : deux shards ne peuvent pas consommer la même clé.
function redeemKey(rawKey, guildId, name) {
  const key = rawKey.trim().toUpperCase();
  return db.transaction(() => {
    const data = db.get('key', key);
    if (!data) return { error: 'invalid' };
    if (data.used.includes(guildId)) return { error: 'already' };
    if (data.used.length >= data.uses) return { error: 'used' };
    data.used.push(guildId);
    db.set('key', key, data);
    return { until: addPremium(guildId, data.days, name), days: data.days };
  });
}

const listKeys = () => db.list('key');
const deleteKey = (key) => db.del('key', key.trim().toUpperCase()).changes > 0;

module.exports = {
  FOREVER, TRIAL_DAYS, isPremium, premiumUntil, maxVolume, addPremium, removePremium, markRecord, pendingNotice,
  startTrial, trialUsed, listPremium, createKey, redeemKey, listKeys, deleteKey,
};
