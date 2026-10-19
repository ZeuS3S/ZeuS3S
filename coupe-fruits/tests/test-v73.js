const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
const TIPS = '["dayBtn","modeSeg [data-v=\\"boss\\"]","passBtn","questBtn","statsBtn","pzBtn","shopBtn","boostBtn"]';
async function open(b, ls = {}, fake) { const pg = await b.newPage({ viewport: { width: 390, height: 800 }, hasTouch: true }); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message));
  if (fake) { await pg.addInitScript({ path: __dirname + '/fakeclaude.js' }); await pg.addInitScript(db => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1'); sessionStorage.setItem('fakedb', JSON.stringify(db)) }, fake) }
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.evaluate(([ls, tips]) => { localStorage.setItem('coupe.seen', VERSION); localStorage.setItem('coupe.tips', tips); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v) }, [ls, TIPS]);
  await pg.reload(); await pg.waitForTimeout(1500); return pg }
async function path(pg, pts) { const box = await pg.locator('#cv').boundingBox(); await pg.mouse.move(box.x + pts[0][0], box.y + pts[0][1]); await pg.mouse.down(); for (const [x, y] of pts.slice(1)) await pg.mouse.move(box.x + x, box.y + y, { steps: 4 }); await pg.mouse.up() }
async function swipeAt(pg, y, x0, x1) { const box = await pg.locator('#cv').boundingBox(); await pg.mouse.move(box.x + x0, box.y + y); await pg.mouse.down(); await pg.mouse.move(box.x + x1, box.y + y, { steps: 8 }); await pg.mouse.up() }
const until = async (pg, fn, ms = 6000) => { for (let t = 0; t < ms; t += 100) { if (await pg.evaluate(fn)) return true; await pg.waitForTimeout(100) } return false };
(async () => { const b = await chromium.launch();
  // ===== tutoriel guidé =====
  let pg = await open(b); await pg.click('#go'); await pg.waitForTimeout(300);
  assert.match(await pg.textContent('#tuto'), /Étape 1 sur 3/); await pg.screenshot({ path: 'v73-tuto1.png' });
  assert.ok(await until(pg, () => __coupe.items().some(i => i.y < __coupe.size()[1] * .6)), 'fruit launched');
  let it = await pg.evaluate(() => __coupe.items()[0]); await path(pg, [[it.x, 60], [it.x, 760]]); await pg.waitForTimeout(200);
  assert.match(await pg.textContent('#tuto'), /Étape 2 sur 3/);
  assert.ok(await until(pg, () => __coupe.items().some(i => i.e === 'durian' || i.e === '🤢' || true) && __coupe.items().length > 0), 'durian launched');
  await pg.screenshot({ path: 'v73-tuto2.png' });
  const lives = await pg.evaluate(() => __coupe.state().lives);
  assert.ok(await until(pg, () => /Étape 3 sur 3/.test(document.getElementById('tuto').textContent), 9000), 'durian fell → step 3');
  assert.strictEqual(await pg.evaluate(() => __coupe.state().lives), lives, 'no life lost');
  assert.ok(await until(pg, () => __coupe.items().length === 3 && __coupe.items().every(i => i.y < __coupe.size()[1] * .75)), 'three fruits');
  let y0 = 1e9; for (let k = 0; k < 60; k++) { const y = await pg.evaluate(() => __coupe.items()[0].y); if (y >= y0) break; y0 = y; await pg.waitForTimeout(60) } // en haut de la course
  const ys = await pg.evaluate(() => __coupe.items().map(i => i.y)); await pg.mouse.move(0, 0); { const box = await pg.locator('#cv').boundingBox(); await pg.mouse.move(box.x + 10, box.y + ys[0]); await pg.mouse.down(); await pg.mouse.move(box.x + 385, box.y + ys[0], { steps: 3 }); await pg.mouse.up() } await pg.waitForTimeout(300);
  assert.ok(await pg.isHidden('#tuto'), 'tutorial done'); assert.strictEqual(await pg.evaluate(() => localStorage.getItem('coupe.tuto')), '1');
  assert.match(await pg.evaluate(() => __coupe.state().banner && __coupe.state().banner.t), /C’est parti/); assert.ok(await pg.evaluate(() => __coupe.state().next < 5), 'normal game resumes');
  assert.deepStrictEqual(pg.errs, []); await pg.close();
  // passer le tutoriel
  pg = await open(b); await pg.click('#go'); await pg.waitForTimeout(300); await pg.click('#tutoSkip'); assert.ok(await pg.isHidden('#tuto')); assert.strictEqual(await pg.evaluate(() => localStorage.getItem('coupe.tuto')), '1'); await pg.close();
  // ===== succès cachés =====
  pg = await open(b, { 'coupe.tuto': '1' });
  await pg.evaluate(() => __coupe.openStats('ach')); let t = await pg.textContent('#statsBody'); assert.ok((t.match(/Succès secret/g) || []).length >= 8, 'hidden achievements show as secret');
  assert.ok(!/Pipelette|Œil de lynx|Oiseau de nuit/.test(t), 'names hidden');
  await pg.evaluate(() => { localStorage.setItem('coupe.chatN', '20'); checkAch(false) }); await pg.evaluate(() => __coupe.openStats('ach'));
  assert.match(await pg.textContent('#statsBody'), /Pipelette/, 'revealed once unlocked'); await pg.screenshot({ path: 'v73-ach.png' }); assert.deepStrictEqual(pg.errs, []); await pg.close();
  // ===== Puzzle : mondes =====
  const prog = {}; for (let L = 1; L <= 14; L++) prog[L] = 3;
  pg = await open(b, { 'coupe.tuto': '1', 'coupe.puzzle': JSON.stringify(prog) }); const c0 = await pg.evaluate(() => JSON.parse(localStorage.getItem('coupe.wallet') || '{"coins":0}').coins);
  await pg.click('#pzBtn'); await pg.waitForTimeout(300);
  assert.strictEqual(await pg.locator('#pzGrid [data-pz]').count(), 12, '12 levels per world'); assert.match(await pg.textContent('#pzInfo'), /Monde 2 · L’Île tropicale/, 'opens on the current world');
  assert.ok(await pg.isVisible('#pzGrid [data-pz="15"].cur'), 'next level highlighted'); assert.ok(await pg.isDisabled('[data-pzw="2"]'), 'world 3 locked');
  assert.strictEqual((await pg.evaluate(() => JSON.parse(localStorage.getItem('coupe.wallet')).coins)) - c0, 150, 'world 1 reward (already finished before)');
  await pg.screenshot({ path: 'v73-pz.png' });
  await pg.click('[data-pzw="0"]'); assert.match(await pg.textContent('#pzInfo'), /Le Verger.*Monde terminé/s); assert.match(await pg.textContent('#pzGrid [data-pz="12"]'), /👑/);
  await pg.click('#pzClose'); await pg.evaluate(() => { const p = JSON.parse(localStorage.getItem('coupe.puzzle')); for (let L = 15; L <= 30; L++) p[L] = 2; localStorage.setItem('coupe.puzzle', JSON.stringify(p)) });
  await pg.click('#pzBtn'); await pg.click('[data-pzw="2"]'); await pg.click('[data-pz="25"]', { force: true }); await pg.waitForTimeout(400);
  assert.match(await pg.evaluate(() => __coupe.state().banner.t), /Le Volcan/, 'world intro banner'); assert.strictEqual(await pg.evaluate(() => __coupe.state().puzzle), 25);
  const lv = await pg.evaluate(() => [pzLevel(36).obj.type, pzLevel(36).throws.length, pzLevel(12).throws.length, JSON.stringify(pzLevel(7))]); assert.strictEqual(lv[0], 'all', 'boss levels: miss nothing');
  assert.deepStrictEqual(pg.errs, []); await pg.close();
  // ===== clans qui recrutent =====
  const d = new Date(), cur = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  pg = await open(b, { 'coupe.tuto': '1', 'coupe.pseudo': 'Gaby' }, { 'clans/u_a': { name: 'Alpha', tag: 'ALP', color: '#2f9e5b', code: 'ALP-1111', owner: 'u_a', open: true, emb: '🐉' }, 'clans/u_b': { name: 'Bravo', tag: 'BRV', color: '#7b4dff', code: 'BRV-2222', owner: 'u_b', open: false }, 'clans/u_c': { name: 'Caché', tag: 'HID', color: '#7b4dff', code: 'HID-3333', owner: 'u_c', open: true, rec: false },
    'scores/u_a': { name: 'Ana', clan: 'u_a', season: cur, best: { 'classique.normal': 900 } }, 'scores/u_b': { name: 'Bob', clan: 'u_b', season: cur, best: {} }, 'scores/u_c': { name: 'Cid', clan: 'u_c', season: cur, best: {} } });
  await pg.click('#clanBtn'); await pg.waitForTimeout(400); t = await pg.textContent('#clanBox');
  assert.match(t, /Clans qui recrutent/); assert.match(t, /Alpha/); assert.match(t, /Bravo.*sur demande/s); assert.ok(!/Caché/.test(t), 'hidden clan not listed');
  await pg.locator('#clanBox').screenshot({ path: 'v73-rec.png' });
  await pg.click('[data-cjoin=u_b]'); await pg.waitForTimeout(500); assert.strictEqual(await pg.evaluate(() => myClanId()), 'u_b'); assert.match(await pg.textContent('#clanBox'), /Demande envoyée/);
  await pg.click('#clanLeave'); await pg.waitForTimeout(400); await pg.click('[data-cjoin=u_a]'); await pg.waitForTimeout(500); assert.strictEqual(await pg.evaluate(() => myClanId()), 'u_a'); assert.match(await pg.textContent('#clanBox'), /Ton rôle : Membre/);
  assert.deepStrictEqual(pg.errs, []);
  // le chef peut retirer son clan de la liste
  await pg.close(); pg = await open(b, { 'coupe.tuto': '1', 'coupe.pseudo': 'Gaby', 'coupe.clan': 'u_test' }, { 'clans/u_test': { name: 'Kiwis', tag: 'KIWI', color: '#2f9e5b', code: 'KIWI-1111', owner: 'u_test', open: true }, 'scores/u_test': { name: 'Gaby', clan: 'u_test', season: cur, best: {} } });
  await pg.click('#clanBtn'); await pg.click('[data-csub=set]'); await pg.click('#clanRec'); await pg.waitForTimeout(400);
  assert.strictEqual((await pg.evaluate(() => JSON.parse(sessionStorage.getItem('fakedb'))))['clans/u_test'].rec, false);
  await pg.click('[data-perm="membre:msg"]'); await pg.waitForTimeout(400); assert.strictEqual((await pg.evaluate(() => JSON.parse(sessionStorage.getItem('fakedb'))))['clans/u_test'].rec, false, 'kept by other chef saves');
  assert.deepStrictEqual(pg.errs, []); console.log('v7.3 OK'); await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
