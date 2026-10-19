const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
(async () => { const b = await chromium.launch();
  for (const [w, h] of [[390, 800], [1280, 800]]) {
  const pg = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.evaluate(() => localStorage.setItem('coupe.tuto', '1')); await pg.reload(); await pg.waitForTimeout(1400);
  assert.ok(await pg.locator('#stats').isHidden(), 'no news popup for a new player');
  await pg.screenshot({ path: `v30-start-${w}.png` });
  const box = await pg.locator('#cv').boundingBox(); const [W, H] = await pg.evaluate(() => __coupe.size());
  const swipe = async y => { await pg.mouse.move(box.x + W / 2 - 160, box.y + y); await pg.mouse.down(); await pg.mouse.move(box.x + W / 2 + 160, box.y + y, { steps: 6 }); await pg.mouse.up(); };
  // Grenade : tout est tranché, le durian pris dedans ne coûte rien
  await pg.click('#go'); await pg.evaluate(() => { const s = __coupe.state(); s.next = 999; s.waveT = 999; });
  await pg.waitForTimeout(1000); assert.ok(await pg.locator('#comm.show').count() === 1, 'commentator speaks at start');
  await pg.evaluate(() => { const [W, H] = __coupe.size(); for (const dx of [-120, -60, 60, 120]) __coupe.spawnAt(false, W / 2 + dx, H * .7); __coupe.spawnAt(true, W / 2, H * .8); __coupe.spawnAt(false, W / 2, H / 3, 'bomb'); });
  const lives0 = (await pg.evaluate(() => __coupe.state())).lives; await swipe(H / 3);
  let s = await pg.evaluate(() => __coupe.state()); assert.strictEqual(s.grenades, 1); assert.strictEqual(s.lives, lives0, 'no penalty'); assert.ok(s.cut >= 4, 'fruits sliced by the blast');
  assert.strictEqual(await pg.evaluate(() => __coupe.items().length), 0, 'board cleared'); await pg.waitForTimeout(120); await pg.screenshot({ path: `v30-boom-${w}.png` });
  // Ralenti cinéma au record
  await pg.evaluate(() => { localStorage.setItem('coupe.best.classique.normal', '5'); }); await pg.reload(); await pg.waitForTimeout(1400); await pg.click('#go');
  await pg.evaluate(() => { const s = __coupe.state(); s.next = 999; s.waveT = 999; const [W, H] = __coupe.size(); __coupe.spawnAt(false, W / 2, H / 3); }); await swipe(H / 3);
  assert.ok((await pg.evaluate(() => __coupe.state())).cine > 0, 'cinema slow-mo'); await pg.waitForTimeout(150); await pg.screenshot({ path: `v30-cine-${w}.png` });
  // Anti-triche : score modifié à la main
  await pg.evaluate(() => { __coupe.state().score = 99999; }); assert.ok((await pg.evaluate(() => __coupe.verdict())).includes('score modifié'));
  await pg.evaluate(() => { __coupe.state().lives = 1; const [W, H] = __coupe.size(); __coupe.spawnAt(true, W / 2, H / 3); }); await swipe(H / 3); await pg.waitForTimeout(1700);
  assert.ok(await pg.locator('#overSus').isVisible(), 'flagged'); assert.strictEqual(await pg.evaluate(() => JSON.parse(localStorage.getItem('coupe.season') || 'null')), null, 'not in season bests');
  await pg.screenshot({ path: `v30-sus-${w}.png` });
  // Mode Vagues
  await pg.click('#change'); await pg.click('#modeSeg [data-v=vagues]'); await pg.click('#go'); assert.strictEqual(await pg.textContent('#lives'), '⏱ 15 s');
  await pg.waitForTimeout(2200); s = await pg.evaluate(() => __coupe.state()); assert.strictEqual(s.wave, 1);
  await pg.evaluate(() => __coupe.cutAll()); await pg.waitForTimeout(150); s = await pg.evaluate(() => __coupe.state()); assert.ok(s.timeLeft > 15, 'time bonus after wave');
  await pg.waitForTimeout(2000); assert.strictEqual((await pg.evaluate(() => __coupe.state())).wave, 2); await pg.screenshot({ path: `v30-wave-${w}.png` });
  await pg.evaluate(() => { const [W, H] = __coupe.size(); __coupe.spawnAt(true, W / 2, H / 3); }); const t0 = (await pg.evaluate(() => __coupe.state())).timeLeft; await swipe(H / 3);
  assert.ok((await pg.evaluate(() => __coupe.state())).timeLeft < t0 - 2.5, 'durian costs 3 s');
  await pg.evaluate(() => { __coupe.state().timeLeft = .1; }); await pg.waitForTimeout(1500); assert.ok(await pg.locator('#over').isVisible());
  await pg.waitForTimeout(1300); assert.strictEqual(await pg.textContent('#final'), '2'); assert.strictEqual(await pg.textContent('#finalUnit'), 'vague atteinte');
  assert.strictEqual(await pg.evaluate(() => localStorage.getItem('coupe.best.vagues.normal')), '2');
  assert.ok(await pg.locator('#overXp.pop').count() === 1, 'animated rewards'); await pg.screenshot({ path: `v30-over-${w}.png` });
  // Classement : onglet Vagues présent ; boutique : 3 rayons
  await pg.click('#change'); await pg.click('#shopBtn'); assert.strictEqual(await pg.locator('[data-cat]').count(), 4);
  await pg.evaluate(() => __coupe.setShop('durian')); assert.strictEqual(await pg.locator('[data-costume]').count(), 7); await pg.screenshot({ path: `v30-shop-${w}.png` }); await pg.click('#statsClose');
  // Sauvegarde modifiée hors du jeu -> retirée du classement
  await pg.evaluate(() => localStorage.setItem('coupe.seal', 'faux')); await pg.reload(); await pg.waitForTimeout(1400);
  assert.strictEqual(await pg.evaluate(() => localStorage.getItem('coupe.tainted')), '1', 'tainted');
  assert.deepStrictEqual(errs, []); console.log('v3.0 OK', w); await pg.close(); }
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
