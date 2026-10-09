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

test('premium : clés, utilisations et durée', () => {
  const premium = require('./premium'); // Utilise la base de test créée plus haut (DB_FILE).
  const key = premium.createKey(30, 2, 'owner');
  assert.match(key, /^RADIO-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.equal(premium.isPremium('gA'), false);
  const first = premium.redeemKey(key.toLowerCase(), 'gA');
  assert.ok(first.until > Date.now() + 29 * 86400000);
  assert.ok(premium.isPremium('gA'));
  assert.deepEqual(premium.redeemKey(key, 'gA'), { error: 'already' });
  assert.ok(premium.redeemKey(key, 'gB').until);
  assert.deepEqual(premium.redeemKey(key, 'gC'), { error: 'used' });
  assert.deepEqual(premium.redeemKey('RADIO-FAUX-FAUX-FAUX', 'gC'), { error: 'invalid' });
  // Une 2e clé prolonge au lieu de remplacer.
  const again = premium.addPremium('gA', 10);
  assert.ok(again > first.until + 9 * 86400000);
  assert.equal(premium.addPremium('gD', 0), premium.FOREVER);
  premium.removePremium('gA');
  assert.equal(premium.isPremium('gA'), false);
  assert.ok(premium.deleteKey(key));
  assert.equal(premium.listKeys().length, 0);
});

test('carte « en cours » : PNG 1000×300, avec et sans pochette', async () => {
  const { renderCard } = require('./card');
  for (const cover of [null, require('node:fs').readFileSync(`${__dirname}/assets/badges/live_fr_1.png`)]) {
    const img = await renderCard({ title: 'PNL - Au DD', station: '🎧 LoFi', label: 'En direct', color: 0xb388ff, paused: false, cover, logo: null });
    assert.equal(img.subarray(1, 4).toString(), 'PNG');
    assert.equal(img.readUInt32BE(16), 1000);
    assert.equal(img.readUInt32BE(20), 300);
  }
});

test('paroles LRC, progression, semaine', () => {
  const { parseLrc, lineAt, progressBar, weekStart, stripEmoji } = require('./access');
  const lines = parseLrc('[00:05.00] deux\n[00:01.50] un\ntexte sans temps\n[01:00.00]');
  assert.deepEqual(lines.map((l) => l.line), ['un', 'deux', '']);
  assert.equal(lineAt(lines, 0), -1);
  assert.equal(lineAt(lines, 1500), 0);
  assert.equal(lineAt(lines, 59999), 1);
  assert.equal(progressBar(0, 60000, 5), '`0:00` ●──── `1:00`');
  assert.equal(progressBar(90000, 60000, 5), '`1:00` ━━━━● `1:00`');
  assert.equal(weekStart(Date.UTC(2026, 9, 11, 23, 59)), Date.UTC(2026, 9, 5)); // Dimanche → lundi précédent.
  assert.equal(weekStart(Date.UTC(2026, 9, 5, 0, 0)), Date.UTC(2026, 9, 5));
  assert.equal(stripEmoji('🇫🇷 France Inter'), 'France Inter');
});


test('premium : essai, rappels et volume max', () => {
  const premium = require('./premium');
  assert.equal(premium.maxVolume('gT'), 100);
  const trial = premium.startTrial('gT', 'Serveur test');
  assert.ok(trial.until > Date.now() + 2.9 * 86400000);
  assert.equal(premium.maxVolume('gT'), 200);
  assert.deepEqual(premium.startTrial('gT'), { error: 'trialUsed' });
  assert.equal(premium.pendingNotice('gT'), null); // Essai court : pas de rappel immédiat.
  premium.addPremium('gW', 30);
  assert.equal(premium.pendingNotice('gW'), null);
  assert.equal(premium.pendingNotice('gW', premium.premiumUntil('gW') - 86400000), 'warn');
  assert.equal(premium.pendingNotice('gT', trial.until - 86400000), null);
  assert.equal(premium.pendingNotice('gT', trial.until + 1), 'expired');
  premium.markRecord('gT', { expired: true });
  assert.equal(premium.pendingNotice('gT', trial.until + 1), null);
  assert.equal(premium.listPremium().find((r) => r.id === 'gT').name, 'Serveur test');
  premium.removePremium('gT');
  assert.deepEqual(premium.startTrial('gT'), { error: 'trialUsed' }); // L'essai reste consommé.
  assert.equal(premium.addPremium('gP', 0), premium.FOREVER);
  assert.equal(premium.pendingNotice('gP'), null); // À vie : jamais de rappel.
});

test('santé : 200 si tous les shards sont prêts, 503 sinon', async () => {
  const { startHealthServer } = require('./health');
  const shard = (id, status) => ({ id, eval: async (fn) => fn({ ws: { status, ping: 40 }, guilds: { cache: { size: 10 } }, liveRadios: 2 }) });
  const manager = { totalShards: 2, shards: new Map([[0, shard(0, 0)], [1, shard(1, 0)]]) };
  const server = startHealthServer(manager, 0);
  await new Promise((r) => server.once('listening', r));
  const url = `http://127.0.0.1:${server.address().port}`;
  let res = await fetch(`${url}/health`);
  assert.equal(res.status, 200);
  assert.deepEqual((({ status, guilds, live }) => ({ status, guilds, live }))(await res.json()), { status: 'ok', guilds: 20, live: 4 });
  manager.shards.set(1, { id: 1, eval: () => Promise.reject(new Error('mort')) }); // Shard planté.
  res = await fetch(url);
  assert.equal(res.status, 503);
  assert.equal((await res.json()).status, 'degraded');
  manager.totalShards = 'auto'; // Encore en démarrage.
  manager.shards.set(1, shard(1, 0));
  assert.equal((await fetch(url)).status, 503);
  assert.equal((await fetch(`${url}/autre`)).status, 404);
  server.close();
});
