const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 390, height: 800 }, hasTouch: true });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(fs.readFileSync(__dirname + '/fakeclaude.js', 'utf8'));
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.waitForTimeout(600);
  await pg.evaluate(() => localStorage.setItem('coupe.tuto', '1'));
  const st = () => pg.evaluate(() => __coupe.state());
  const box = await pg.locator('#cv').boundingBox();
  const swipe = async (bad) => { const [W, H] = await pg.evaluate(() => __coupe.size()); await pg.evaluate(bad => { const [W, H] = __coupe.size(); __coupe.spawnAt(bad, W / 2, H / 3); }, bad); await pg.mouse.move(box.x + W / 2 - 120, box.y + H / 3 + 5); await pg.mouse.down(); await pg.mouse.move(box.x + W / 2 + 120, box.y + H / 3 + 5, { steps: 6 }); await pg.mouse.up(); };
  // 1. Plafond de fruits
  await pg.click('#diffSeg [data-v=difficile]'); await pg.click('#go');
  await pg.evaluate(() => { const s = __coupe.state(); s.next = 999; s.waveT = 999; for (let i = 0; i < 40; i++) __coupe.launch(); });
  assert.ok(await pg.evaluate(() => __coupe.onBoard()) <= 10, 'at most 10 objects on Hard');
  // 2. Seconde chance
  await pg.click('#pause'); await pg.click('#home'); await pg.click('#diffSeg [data-v=normal]');
  await pg.evaluate(() => { localStorage.setItem('coupe.wallet', JSON.stringify({ coins: 600, earned: 600 })); });
  await pg.click('#go'); await pg.evaluate(() => { const s = __coupe.state(); s.next = 999; s.waveT = 999; });
  await swipe(false);
  for (let i = 0; i < 3; i++) await swipe(true);
  await pg.waitForTimeout(300); assert.ok(await pg.locator('#revive').isVisible(), 'second chance offered');
  await pg.screenshot({ path: 'v23-revive.png' });
  await pg.click('#reviveYes'); let s = await st(); assert.strictEqual(s.lives, 1); assert.strictEqual(s.running, true); assert.strictEqual(+(await pg.textContent('#coins2')), 600 - 500, 'Pouah needs 25 durians now, -500 second chance');
  await swipe(true); await pg.waitForTimeout(1500); assert.strictEqual(await pg.locator('#revive').isVisible(), false, 'only once'); assert.ok(await pg.locator('#over').isVisible());
  // 3. Saison + sauvegarde en ligne (fausse base)
  await pg.click('#overStatsBtn'); await pg.click('.tabs [data-tab=lb]');
  await pg.fill('#pseudoIn', 'Gaby'); await pg.click('#pseudoSave'); await pg.waitForTimeout(400);
  assert.match(await pg.textContent('#lbSeason'), /Saison de/);
  const fdb = await pg.evaluate(() => JSON.parse(sessionStorage.getItem('fakedb')));
  const mine = fdb['scores/u_test']; assert.ok(mine && mine.season && mine.best['classique.normal'] > 0, 'season score written');
  await pg.click('.tabs [data-tab=me]'); await pg.waitForTimeout(1800);
  assert.match(await pg.textContent('#cloudBox'), /Connecté : Testeur/);
  const saved = await pg.evaluate(() => JSON.parse(sessionStorage.getItem('fakedb'))['data/users/u_test/save']);
  assert.ok(saved && saved.data['coupe.wallet'], 'progress saved online');
  await pg.screenshot({ path: 'v23-cloud.png' });
  // champion de la saison passée
  await pg.evaluate(() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); const pv = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const st = JSON.parse(sessionStorage.getItem('fakedb')); st['scores/u_bob'] = { name: 'Bob', level: 9, season: pv, best: { 'classique.normal': 4321 } }; sessionStorage.setItem('fakedb', JSON.stringify(st)); });
  // nouvel appareil : tout effacé localement, la progression revient
  const xpBefore = await pg.evaluate(() => __coupe.xp());
  await pg.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('coupe.')) localStorage.removeItem(k); });
  await pg.reload(); await pg.waitForTimeout(1500);
  assert.strictEqual(await pg.evaluate(() => __coupe.xp()), xpBefore, 'progress restored from the cloud');
  await pg.click('#statsBtn').catch(() => {}); if (!(await pg.locator('#stats').isVisible())) await pg.click('#statsBtn');
  await pg.click('.tabs [data-tab=lb]'); await pg.waitForTimeout(300); assert.match(await pg.textContent('#lbSeason'), /Champion de .*Bob \(4321/);
  await pg.screenshot({ path: 'v23-season.png' }); await pg.click('#statsClose');
  // 4. Boutique : déguisement + sons
  await pg.evaluate(() => { localStorage.setItem('coupe.wallet', JSON.stringify({ coins: 5000, earned: 5000 })); });
  await pg.click('#statsBtn'); await pg.evaluate(() => __coupe.openStats('shop'));
  await pg.evaluate(() => __coupe.setShop('durian')); await pg.click('[data-costume=lunettes]'); await pg.click('[data-costume=lunettes]'); await pg.evaluate(() => __coupe.setShop('coupe')); assert.strictEqual(await pg.evaluate(() => localStorage.getItem('coupe.costume')), 'lunettes');
  assert.strictEqual(await pg.locator('[data-listen]').count(), 4); await pg.click('[data-listen=retro]');
  await pg.click('#statsClose');
  // 5. Puzzle
  await pg.click('#pzBtn'); assert.ok(await pg.locator('#pzPanel').isVisible()); assert.strictEqual(await pg.isDisabled('[data-pz="2"]'), true);
  await pg.screenshot({ path: 'v23-pzpanel.png' });
  await pg.click('[data-pz="1"]'); s = await st(); assert.strictEqual(s.puzzle, 1); assert.strictEqual(s.lives, 1);
  await pg.waitForTimeout(1500); await pg.screenshot({ path: 'v23-pzstart.png' });
  const px = await pg.evaluate(() => { const c = document.getElementById('cv').getContext('2d'), it = __coupe.items().find(i => i.y > 0 && i.y < 800); if (!it) return null; const p = c.getImageData(it.x, it.y, 1, 1).data, q = c.getImageData(8, 400, 1, 1).data; return Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]) });
  assert.ok(px > 60, 'puzzle fruits are drawn opaque (contrast ' + px + ')');
  await pg.click('#pause'); await pg.click('#home'); await pg.click('#pzBtn'); await pg.click('[data-pz="1"]'); await pg.waitForTimeout(200);
  await pg.evaluate(() => { const s = __coupe.state(); s.pz.i = s.pz.throws.length; s.pz.t = s.pz.lastT + 1; });
  await pg.waitForTimeout(1600); assert.match(await pg.textContent('#overTitle'), /Niveau 1 réussi/); assert.match(await pg.textContent('#final'), /★★★/);
  assert.ok(await pg.locator('#nextLvl').isVisible()); await pg.screenshot({ path: 'v23-pzwin.png' });
  await pg.click('#nextLvl'); s = await st(); assert.strictEqual(s.puzzle, 2);
  await pg.evaluate(() => { const s = __coupe.state(); s.pz.i = s.pz.throws.length; }); await swipe(true); await pg.waitForTimeout(1600);
  assert.match(await pg.textContent('#overTitle'), /Niveau 2 raté/); assert.match(await pg.textContent('#overMsg'), /durian/);
  await pg.click('#change'); assert.ok(await pg.locator('#pzPanel').isVisible(), 'back to level list'); assert.strictEqual(await pg.isDisabled('[data-pz="2"]'), false);
  await pg.click('#pzClose'); await pg.click('#go'); assert.strictEqual(await pg.textContent('#again'), '↻ Rejouer');
  assert.deepStrictEqual(errs, []); console.log('v2.3 OK'); await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
