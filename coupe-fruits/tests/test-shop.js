const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[390, 800], [1280, 800]]) {
  const pg = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true }); await pg.addInitScript(() => { try { if (!localStorage.getItem('coupe.tuto')) localStorage.setItem('coupe.tuto', '1'); if (!localStorage.getItem('coupe.seen')) localStorage.setItem('coupe.seen', '3.10') } catch (e) {} }); 
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.waitForTimeout(500);
  const coins = async () => +(await pg.textContent('#coins'));
  assert.strictEqual(await coins(), 0);
  assert.ok(await pg.locator('.coinpill').isVisible(), 'wallet visible on home');
  // Boutique : tout est trop cher au départ
  await pg.click('#shopBtn'); let n = 0; for (const c of ['planche', 'coupe', 'durian']) { await pg.click(`[data-cat=${c}]`); assert.strictEqual(await pg.getAttribute(`[data-cat=${c}]`, 'aria-pressed'), 'true', 'real click on ' + c); n += await pg.locator('.skin').count(); } assert.strictEqual(n, 25, '10 backgrounds + 4 juices + 7 costumes + 4 sounds'); await pg.evaluate(() => __coupe.setShop('planche'));
  assert.strictEqual(await pg.isDisabled('[data-skin=bambou]'), true);
  assert.match(await pg.textContent('[data-skin=bambou]'), /Il manque 1000/);
  assert.strictEqual(await pg.textContent('[data-skin=erable]'), 'Équipé');
  await pg.screenshot({ path: `shot-shop-${w}.png` }); await pg.click('#statsClose');
  // Partie : pièce tranchée (+3), puis fin de partie (1 pièce / 10 pts + succès)
  await pg.click('#go'); await pg.evaluate(() => { __coupe.state().next = 999; });
  assert.strictEqual(await pg.locator('.coinpill').isVisible(), false, 'pill hidden in game');
  const box = await pg.locator('#cv').boundingBox();
  const swipe = async (bad, k) => { const [W, H] = await pg.evaluate(() => __coupe.size());
    await pg.evaluate(([bad, k]) => { const [W, H] = __coupe.size(); __coupe.spawnAt(bad, W / 2, H / 3, k); }, [bad, k]);
    await pg.mouse.move(box.x + W / 2 - 120, box.y + H / 3 + 5); await pg.mouse.down(); await pg.mouse.move(box.x + W / 2 + 120, box.y + H / 3 + 5, { steps: 6 }); await pg.mouse.up(); };
  await swipe(false, 'coin'); assert.strictEqual(+(await pg.textContent('#coins2')), 3, 'coin pickup');
  assert.strictEqual((await pg.evaluate(() => __coupe.state())).streak, 0, 'coin is not a fruit');
  await pg.evaluate(() => { __coupe.addPts(1490); });
  for (let i = 0; i < 3; i++) await swipe(true);
  await pg.waitForTimeout(1400); assert.ok(await pg.locator('#over').isVisible());
  // 3 (pièce) + 149 (score) = 152 : 521 XP ne suffisent plus pour le niveau 2 ni le palier 1 du passe
  const total = await coins(); assert.strictEqual(total, 162, 'coins after game: ' + total); // +10 : le succès caché « Les mains vides » (aucun fruit coupé)
  assert.match(await pg.textContent('#overCoins'), /\+162 🪙/);
  assert.strictEqual((await pg.evaluate(() => __coupe.lvl())).L, 1);
  // Achat en deux clics + succès Premier achat
  await pg.click('#overStatsBtn'); await pg.evaluate(() => __coupe.openStats('shop'));
  assert.match(await pg.textContent('[data-skin=bambou]'), /Il manque 838/, 'bambou costs 1000');
  await pg.evaluate(() => { const w = JSON.parse(localStorage.getItem('coupe.wallet')); w.coins = 1100; localStorage.setItem('coupe.wallet', JSON.stringify(w)); });
  await pg.evaluate(() => __coupe.openStats('me')); await pg.evaluate(() => __coupe.openStats('shop'));
  await pg.click('[data-skin=bambou]'); assert.match(await pg.textContent('[data-skin=bambou]'), /Confirmer/);
  await pg.click('[data-skin=bambou]'); assert.strictEqual(await pg.textContent('[data-skin=bambou]'), 'Équipé');
  assert.strictEqual(await coins(), 1100 - 1000 + 10, 'paid 1000, +10 for Premier achat');
  assert.ok((await pg.evaluate(() => __coupe.ach())).achat);
  assert.strictEqual(await pg.evaluate(() => localStorage.getItem('coupe.skin')), 'bambou');
  await pg.click('[data-skin=erable]'); assert.strictEqual(await pg.textContent('[data-skin=erable]'), 'Équipé');
  await pg.click('[data-skin=bambou]'); await pg.click('#statsClose'); await pg.click('#change'); await pg.waitForTimeout(300);
  await pg.screenshot({ path: `shot-bambou-${w}.png` });
  // Rechargement : le fond reste
  await pg.reload(); await pg.waitForTimeout(400); assert.strictEqual(await pg.evaluate(() => localStorage.getItem('coupe.skin')), 'bambou');
  const ov = await pg.evaluate(() => document.documentElement.scrollWidth > innerWidth); assert.strictEqual(ov, false);
  assert.deepStrictEqual(errs, []);
  console.log('shop OK', w); await pg.close(); }
  // Aperçu de tous les fonds
  const pg = await b.newPage({ viewport: { width: 390, height: 800 } }); await pg.addInitScript(() => { try { if (!localStorage.getItem('coupe.tuto')) localStorage.setItem('coupe.tuto', '1'); if (!localStorage.getItem('coupe.seen')) localStorage.setItem('coupe.seen', '3.10') } catch (e) {} }); 
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.waitForTimeout(400);
  for (const id of ['ardoise', 'marbre', 'plage', 'nuit', 'neon']) {
    await pg.evaluate(id => { localStorage.setItem('coupe.skins', JSON.stringify(['erable', id])); localStorage.setItem('coupe.skin', id); }, id);
    await pg.reload(); await pg.waitForTimeout(300); await pg.click('#go'); await pg.waitForTimeout(1600); await pg.screenshot({ path: `skin-${id}.png` }); }
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
