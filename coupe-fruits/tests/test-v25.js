const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
(async () => { const b = await chromium.launch();
  for (const [w, h] of [[390, 800], [1280, 800]]) {
  const pg = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript({ path: __dirname + '/fakeclaude.js' });
  await pg.goto('file://' + __dirname + '/coupe.html');
  // Écran de chargement visible puis caché
  assert.ok(await pg.locator('#splash').isVisible(), 'splash shown'); await pg.screenshot({ path: `v25-splash-${w}.png` });
  await pg.waitForTimeout(1500); assert.ok(!(await pg.locator('#splash').isVisible()), 'splash hidden');
  await pg.evaluate(() => { localStorage.setItem('coupe.tuto', '1'); localStorage.setItem('coupe.pseudo', 'Gaby'); }); await pg.reload(); await pg.waitForTimeout(1400);
  // Réglages
  await pg.click('#pause'); assert.strictEqual(await pg.textContent('#menuTitle'), 'Réglages');
  await pg.fill('#sens', '140'); await pg.locator('#sens').dispatchEvent('input'); assert.strictEqual(await pg.evaluate(() => __coupe.prefs.sens), 1.4);
  await pg.fill('#vMusic', '0'); await pg.locator('#vMusic').dispatchEvent('input'); assert.strictEqual(await pg.textContent('#vMusicO'), '0 %');
  await pg.screenshot({ path: `v25-settings-${w}.png` }); await pg.click('#close');
  // Cerise double : un seul geste = bonus
  await pg.click('#go'); await pg.evaluate(() => { const s = __coupe.state(); s.next = 999; s.waveT = 999; });
  const box = await pg.locator('#cv').boundingBox(); const [W, H] = await pg.evaluate(() => __coupe.size());
  await pg.evaluate(() => { const [W, H] = __coupe.size(); __coupe.cherries(W / 2, H / 3); }); await pg.waitForTimeout(50); await pg.screenshot({ path: `v25-cherry-${w}.png` });
  const ys = await pg.evaluate(() => __coupe.items().map(i => i.y)); const y = ys[0];
  await pg.mouse.move(box.x + W / 2 - 150, box.y + y); await pg.mouse.down(); await pg.mouse.move(box.x + W / 2 + 150, box.y + y, { steps: 8 }); await pg.mouse.up();
  const st = await pg.evaluate(() => __coupe.state()); assert.strictEqual(st.cherries, 1, 'double cherry bonus'); assert.strictEqual(st.fruits['🍒'], 2);
  // Passe de saison : 10 paliers -> toque débloquée
  await pg.evaluate(() => __coupe.passXp(21000)); const p = await pg.evaluate(() => __coupe.pass()); assert.strictEqual(p.tier, 10);
  await pg.evaluate(() => __coupe.passXp(10000)); 
  // Autocollants
  for (let i = 0; i < 5; i++) await pg.evaluate(() => __coupe.dropSticker());
  assert.strictEqual(Object.values(await pg.evaluate(() => __coupe.stickers())).reduce((a, b) => a + b, 0), 5);
  // Fin de partie : record -> fil d'actu, ligue
  await pg.evaluate(() => { __coupe.addPts(1600); }); await pg.waitForTimeout(1300); await pg.evaluate(() => { __coupe.addPts(1600); }); // deux fois 1 600 : un pic de 3 200 en 1 s serait refusé par l'anti-triche await pg.evaluate(() => { localStorage.setItem('coupe.best.classique.normal', '10'); });
  await pg.evaluate(() => { const [W, H] = __coupe.size(); __coupe.spawnAt(true, W / 2, H / 3); });
  for (let k = 0; k < 3; k++) { await pg.evaluate(() => { const [W, H] = __coupe.size(); __coupe.spawnAt(true, W / 2, H / 3); }); await pg.mouse.move(box.x + W / 2 - 120, box.y + H / 3); await pg.mouse.down(); await pg.mouse.move(box.x + W / 2 + 120, box.y + H / 3, { steps: 5 }); await pg.mouse.up(); await pg.waitForTimeout(50); }
  if (await pg.locator('#revive').isVisible()) await pg.click('#reviveNo');
  await pg.waitForTimeout(1600); assert.ok(await pg.locator('#over').isVisible(), 'game over');
  assert.strictEqual(await pg.evaluate(() => __coupe.league()), 'argent');
  await pg.waitForTimeout(300); const feed = await pg.evaluate(() => __coupe.feed()); assert.ok(feed && feed.ev.some(e => e.k === 'rec') && feed.ev.some(e => e.k === 'lg'), 'feed written');
  await pg.screenshot({ path: `v25-over-${w}.png` });
  // Classement : ligue + fil
  await pg.click('#overStatsBtn'); await pg.click('[data-tab="lb"]'); await pg.waitForTimeout(300);
  assert.match(await pg.textContent('#statsBody'), /Ligue Argent/); await pg.click('[data-tab=act]'); await pg.waitForTimeout(300); assert.match(await pg.textContent('#feedList'), /Nouveau record : 3[0-9]{3} pts/);
  await pg.screenshot({ path: `v25-lb-${w}.png`, fullPage: false }); await pg.locator('#feedList').scrollIntoViewIfNeeded(); await pg.screenshot({ path: `v25-feed-${w}.png` });
  await pg.click('[data-tab="album"]'); assert.match(await pg.textContent('#statsBody'), /\/ 25/); await pg.screenshot({ path: `v25-album-${w}.png` });
  await pg.evaluate(() => __coupe.openStats('quests')); assert.match(await pg.textContent('#statsBody'), /Palier \d+ \/ 30/); await pg.screenshot({ path: `v25-pass-${w}.png` });
  await pg.evaluate(() => __coupe.openStats('shop')); await pg.screenshot({ path: `v25-shop-${w}.png` });
  // Anglais
  await pg.evaluate(() => { window.__trMiss = new Set(); }); await pg.click('#statsClose'); await pg.click('#pause'); await pg.click('#lang');
  assert.strictEqual(await pg.textContent('#menuTitle'), 'Settings');
  assert.deepStrictEqual(errs, []); console.log('v2.5 OK', w); await pg.close(); }
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
