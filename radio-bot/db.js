// Stockage SQLite (intégré à Node) : une ligne JSON par serveur et par membre. Partagé entre les shards.
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(process.env.DB_FILE || `${__dirname}/radio.db`);
db.exec(`PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;
  CREATE TABLE IF NOT EXISTS store (scope TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY (scope, id))`);
const getStmt = db.prepare('SELECT data FROM store WHERE scope = ? AND id = ?');
const setStmt = db.prepare('INSERT OR REPLACE INTO store (scope, id, data) VALUES (?, ?, ?)');
const listStmt = db.prepare('SELECT id, data FROM store WHERE scope = ?');
const delStmt = db.prepare('DELETE FROM store WHERE scope = ? AND id = ?');
const read = (scope, id) => JSON.parse(getStmt.get(scope, id)?.data ?? '{}');

// Accès bruts, relus à chaque appel (partagés entre shards) : premium, clés, radios globales.
const get = (scope, id) => {
  const row = getStmt.get(scope, id);
  return row ? JSON.parse(row.data) : null;
};
const set = (scope, id, data) => setStmt.run(scope, id, JSON.stringify(data));
const del = (scope, id) => delStmt.run(scope, id);
const list = (scope) => listStmt.all(scope).map((r) => ({ id: r.id, ...JSON.parse(r.data) }));
function transaction(fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

const GUILD_DEFAULTS = () => ({
  djRole: null, stay247: false, forced247: false, channelId: null, station: null, volume: 50, effect: 'normal', lang: 'auto',
  custom: {}, recent: {}, stats: {}, status: null, color: null, week: null,
});

// Un serveur n'appartient qu'à un shard : on peut le garder en mémoire.
const guilds = new Map();
const guild = (id) => {
  if (!guilds.has(id)) guilds.set(id, { ...GUILD_DEFAULTS(), ...read('guild', id) });
  return guilds.get(id);
};
const saveGuild = (id) => setStmt.run('guild', id, JSON.stringify(guild(id)));

// Un membre peut modifier ses favoris depuis deux shards : on relit à chaque fois.
const user = (id) => ({ favs: {}, ...read('user', id) });
const saveUser = (id, data) => setStmt.run('user', id, JSON.stringify(data));

// Reprend l'ancien data.json (v1) une seule fois.
const OLD = `${__dirname}/data.json`;
if (fs.existsSync(OLD)) {
  for (const [id, data] of Object.entries(JSON.parse(fs.readFileSync(OLD, 'utf8')))) {
    if (!getStmt.get('guild', id)) setStmt.run('guild', id, JSON.stringify(data));
  }
  try { fs.renameSync(OLD, `${OLD}.migrated`); } catch { /* déjà migré par un autre shard */ }
}

module.exports = { guild, saveGuild, user, saveUser, get, set, del, list, transaction };
