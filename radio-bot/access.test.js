const test = require('node:test');
const assert = require('node:assert');
const { PermissionFlagsBits } = require('discord.js');
const { canControl, stationKey, isStreamUrl, volumeBar } = require('./access');
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
