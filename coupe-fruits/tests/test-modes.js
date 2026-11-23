const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 390, height: 780 }, hasTouch: true }); await pg.addInitScript({ path: __dirname + '/opengrp.js' });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.waitForTimeout(600);
  const box = await pg.locator('#cv').boundingBox();
  const swipeAt = async (bad, k) => {
    const [W, H] = await pg.evaluate(() => __coupe.size());
    await pg.evaluate(([bad, x, y, k]) => __coupe.spawnAt(bad, x, y, k), [bad, W / 2, H / 3, k]);
    await pg.mouse.move(box.x + W / 2 - 120, box.y + H / 3 + 5); await pg.mouse.down();
    await pg.mouse.move(box.x + W / 2 + 120, box.y + H / 3 + 5, { steps: 4 }); await pg.mouse.up();
  };
  // Chrono + difficile : étoile double, durian -20, fin au temps écoulé
  await pg.click('#modeSeg [data-v=chrono]'); await pg.click('#diffSeg [data-v=difficile]');
  assert.match(await pg.textContent('#modeHelp'), /60 secondes/);
  assert.strictEqual(await pg.textContent('#lives'), '⏱ 60 s');
  await pg.click('#go'); await pg.evaluate(() => { __coupe.state().next = 999; });
  await swipeAt(false, 'star'); assert.ok((await pg.evaluate(() => __coupe.state().dbl)) > 5, 'star active');
  await swipeAt(false); assert.strictEqual(await pg.evaluate(() => __coupe.state().score), 20, 'fruit doubled');
  await swipeAt(true); assert.strictEqual(await pg.evaluate(() => __coupe.state().score), 0, 'durian -20');
  await swipeAt(false); await pg.screenshot({ path: 'shot-chrono.png' });
  await pg.evaluate(() => { __coupe.state().timeLeft = .3; }); await pg.waitForTimeout(1200);
  assert.strictEqual(await pg.textContent('#overTitle'), 'Nouveau record !');
  assert.match(await pg.textContent('#overStats'), /fruits? coupés? · meilleur combo ×1 · chrono difficile/i);
  const best = await pg.evaluate(() => localStorage.getItem('coupe.best.chrono.difficile')); assert.strictEqual(best, '20');
  // Zen : pas de durian au lancer
  await pg.click('#change');
  await pg.click('#modeSeg [data-v=zen]'); await pg.click('#go');
  await pg.evaluate(() => { __coupe.state().t = 300; }); await pg.waitForTimeout(4000);
  // Glaçon : ralenti
  await pg.evaluate(() => { __coupe.state().next = 999; }); await pg.waitForTimeout(1500);
  await swipeAt(false, 'ice'); assert.ok((await pg.evaluate(() => __coupe.state().slow)) > 3, 'ice active');
  // Effacer les records (double clic de confirmation)
  await pg.click('#pause'); await pg.click('#wipe'); assert.match(await pg.textContent('#wipe'), /Confirmer/);
  await pg.click('#wipe'); assert.strictEqual(await pg.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('coupe.best')).length), 0);
  // Options mémorisées après rechargement
  await pg.reload(); await pg.waitForTimeout(400);
  assert.strictEqual(await pg.getAttribute('#modeSeg [data-v=zen]', 'aria-pressed'), 'true');
  await pg.screenshot({ path: 'shot-start2.png' });
  assert.deepStrictEqual(errs, []);
  console.log('modes OK');
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
