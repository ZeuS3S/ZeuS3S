const fs = require('fs');
const path = require('path');

const FILE = path.join(process.env.DATA_DIR || path.join(__dirname, 'data'), 'config.json');
let db = {};
try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { /* premier lancement */ }

const defaults = () => ({
  trap: { enabled: false, channelId: null, action: 'ban', deleteSeconds: 3600, timeoutMinutes: 60, exemptRoles: [] },
  statusRules: [],
  logs: { channelId: null, history: [] },
  welcome: {
    enabled: false,
    channelId: null,
    title: 'Bienvenue {user} !',
    message: 'Content de te voir sur **{server}**.\nTu es le membre n°{count}.',
  },
});

function get(guildId) {
  if (!db[guildId]) db[guildId] = defaults();
  return db[guildId];
}

function save() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(`${FILE}.tmp`, JSON.stringify(db, null, 2));
  fs.renameSync(`${FILE}.tmp`, FILE);
}

module.exports = { get, save };
