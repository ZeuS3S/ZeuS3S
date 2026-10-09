const test = require('node:test');
const assert = require('node:assert');
const { PermissionFlagsBits } = require('discord.js');
const { canControl, stationKey, isStreamUrl, volumeBar, flag, formatMinutes } = require('./access');
const http = require('node:http');
const { fetchTitle } = require('./icy');

const member = ({ admin = false, roles = [] } = {}) => ({
  permissions: { has: (p) => admin && p === PermissionFlagsBits.ManageGuild },
  roles: { cache: { has: (r) => roles.includes(r) } },
});

test('canControl', () => {
  assert.ok(canControl(member(), { djRole: null }));
  assert.ok(!canControl(member(), { djRole: 'dj' }));
  assert.ok(canControl(member({ roles: ['dj'] }), { djRole: 'dj' }));
  assert.ok(canControl(member({ admin: true }), { djRole: 'dj' }));
});

test('stationKey', () => {
  assert.equal(stationKey('Chérie FM !'), 'cherie-fm');
  assert.equal(stationKey('!!!'), '');
});

test('isStreamUrl', () => {
  assert.ok(isStreamUrl('https://ex.com/a.mp3'));
  assert.ok(!isStreamUrl('file:///etc/passwd'));
  assert.ok(!isStreamUrl('pas une url'));
});

test('stations: clés valides et URLs http(s)', () => {
  for (const [k, s] of Object.entries(require('./stations'))) {
    assert.equal(stationKey(k), k);
    assert.ok(isStreamUrl(s.url), k);
  }
});

test('volumeBar', () => {
  assert.equal(volumeBar(0), '▱'.repeat(10));
  assert.equal(volumeBar(45), '▰▰▰▰▰▱▱▱▱▱');
  assert.equal(volumeBar(100), '▰'.repeat(10));
});

test('fetchTitle lit le titre ICY', async () => {
  const meta = Buffer.from("StreamTitle='PNL - Au DD';");
  const block = Buffer.concat([meta, Buffer.alloc(16 - (meta.length % 16))]);
  const srv = http.createServer((q, r) => {
    r.writeHead(200, { 'icy-metaint': '8' });
    r.end(Buffer.concat([Buffer.alloc(8), Buffer.from([block.length / 16]), block, Buffer.alloc(8)]));
  }).listen(0);
  const url = `http://127.0.0.1:${srv.address().port}/`;
  assert.equal(await fetchTitle(url), 'PNL - Au DD');
  srv.close();
  assert.equal(await fetchTitle('http://127.0.0.1:1/'), null);
});

test('flag et formatMinutes', () => {
  assert.equal(flag('fr'), '🇫🇷');
  assert.equal(flag(''), '🌍');
  assert.equal(formatMinutes(754.6), '12 h 34 min');
  assert.equal(formatMinutes(5), '5 min');
});

test('i18n : mêmes clés en français et en anglais', () => {
  const { STRINGS, t } = require('./i18n');
  assert.deepEqual(Object.keys(STRINGS.en).sort(), Object.keys(STRINGS.fr).sort());
  assert.equal(t('en', 'joinMine', '1'), '❌ Join <#1> to control me.');
});

test('db : sauvegarde, relecture et migration de data.json', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'radio-'));
  process.env.DB_FILE = path.join(dir, 'test.db');
  const db = require('./db');
  const cfg = db.guild('g1');
  assert.equal(cfg.volume, 50);
  cfg.volume = 80;
  db.saveGuild('g1');
  db.saveUser('u1', { favs: { nrj: { name: 'NRJ' } } });
  assert.equal(db.user('u1').favs.nrj.name, 'NRJ');
  const { DatabaseSync } = require('node:sqlite');
  const row = new DatabaseSync(process.env.DB_FILE).prepare("SELECT data FROM store WHERE id = 'g1'").get();
  assert.equal(JSON.parse(row.data).volume, 80);
});

test('audio : chaque effet sort du son', async () => {
  const { execFileSync } = require('node:child_process');
  const ffmpegPath = require('ffmpeg-static');
  const { EFFECTS, createStream } = require('./audio');
  const mp3 = execFileSync(ffmpegPath, ['-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', '-f', 'mp3', '-'], { maxBuffer: 1e7 });
  const srv = http.createServer((q, r) => r.end(mp3)).listen(0);
  const url = `http://127.0.0.1:${srv.address().port}/`;
  for (const effect of Object.keys(EFFECTS)) {
    // Pas de for await : le côté écriture du Duplex ffmpeg ne se ferme jamais.
    const bytes = await new Promise((resolve, reject) => {
      let n = 0;
      createStream(url, effect).on('data', (c) => { n += c.length; }).on('end', () => resolve(n)).on('error', reject);
    });
    assert.ok(bytes > 48000 * 4 * 0.5, `${effect}: ${bytes} octets`);
  }
  srv.close();
});
