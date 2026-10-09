const test = require('node:test');
const assert = require('node:assert');
const { PermissionFlagsBits } = require('discord.js');
const { canControl, stationKey, isStreamUrl } = require('./access');

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
