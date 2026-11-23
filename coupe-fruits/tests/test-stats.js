const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 390, height: 780 }, hasTouch: true }); await pg.addInitScript(() => { try { if (!localStorage.getItem('coupe.tuto')) localStorage.setItem('coupe.tuto', '1'); if (!localStorage.getItem('coupe.seen')) localStorage.setItem('coupe.seen', '3.10') } catch (e) {} });  await pg.addInitScript({ path: __dirname + '/opengrp.js' });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.waitForTimeout(600);
  const box = await pg.locator('#cv').boundingBox();
  const st = () => pg.evaluate(() => __coupe.state());
  const swipeAt = async (bad, k) => {
    const [W, H] = await pg.evaluate(() => __coupe.size());
    await pg.evaluate(([bad, x, y, k]) => __coupe.spawnAt(bad, x, y, k), [bad, W / 2, H / 3, k]);
    await pg.mouse.move(box.x + W / 2 - 120, box.y + H / 3 + 5); await pg.mouse.down();
    await pg.mouse.move(box.x + W / 2 + 120, box.y + H / 3 + 5, { steps: 4 }); await pg.mouse.up();
  };
  const play = async () => { await pg.click('#go'); await pg.evaluate(() => { __coupe.state().next = 999; }); };
  // Stats vides
  await pg.click('#statsBtn'); assert.match(await pg.textContent('#statsBody'), /Aucune partie/); await pg.click('#statsClose');
  // Vies selon le mode
  const hearts = async (m, d) => { await pg.click(`#modeSeg [data-v=${m}]`); await pg.click(`#diffSeg [data-v=${d}]`); return pg.textContent('#lives'); };
  assert.strictEqual(await hearts('classique', 'facile'), '♥♥♥♥');
  assert.strictEqual(await hearts('classique', 'difficile'), '♥♥');
  assert.strictEqual(await hearts('survie', 'normal'), '♥');
  assert.strictEqual(await hearts('classique', 'normal'), '♥♥♥');
  // Classique normal : durian -1, cœur +1, plafonné
  await play(); await swipeAt(false); await swipeAt(false); await swipeAt(true);
  assert.strictEqual((await st()).lives, 2);
  await swipeAt(false, 'life'); assert.strictEqual((await st()).lives, 3, 'heart gives life');
  await swipeAt(false, 'life'); assert.strictEqual((await st()).lives, 3, 'capped at max');
  assert.strictEqual(await pg.textContent('#lives'), '♥♥♥');
  await swipeAt(true); await swipeAt(true); await swipeAt(true); await pg.waitForTimeout(1400);
  assert.ok(await pg.locator('#over').isVisible(), 'classique over');
  // Survie : un durian suffit
  await pg.click('#change'); await pg.click('#modeSeg [data-v=survie]'); await play();
  await swipeAt(false); await swipeAt(true); await pg.waitForTimeout(1400);
  assert.ok(await pg.locator('#over').isVisible(), 'survie over after one durian');
  // Page de stats
  await pg.click('#overStatsBtn');
  const body = await pg.textContent('#statsBody');
  assert.match(body, /2\s*Parties/); assert.match(body, /3\s*Fruits coupés/); assert.match(body, /Durians tranchés par erreur : 5/);
  assert.match(body, /❤️ 2/);
  assert.strictEqual(await pg.locator('.chart .bar').count(), 2);
  assert.strictEqual(await pg.locator('.fr').count(), 1);
  assert.strictEqual(await pg.locator('.tbl td.best').count(), 1);
  await pg.click('summary:has-text("Plus")'); await pg.hover('.chart .bar >> nth=0'); assert.ok(await pg.locator('.chart .bar >> nth=0 >> .tip').isVisible(), 'tooltip');
  await pg.screenshot({ path: 'shot-stats.png' });
  await pg.keyboard.press('Escape'); assert.strictEqual(await pg.locator('#stats').isVisible(), false);
  // Stats pendant une partie : met en pause
  await pg.click('#again'); await pg.click('#statsBtn'); assert.strictEqual((await st()).paused, true);
  await pg.click('#statsClose'); await pg.waitForTimeout(1200); assert.strictEqual((await st()).paused, false);
  const ov = await pg.evaluate(() => document.documentElement.scrollWidth > innerWidth); assert.strictEqual(ov, false);
  assert.deepStrictEqual(errs, []);
  // PC
  const pc = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await pc.goto('file://' + __dirname + '/coupe.html'); await pc.evaluate(s => localStorage.setItem('coupe.stats', s), await pg.evaluate(() => localStorage.getItem('coupe.stats')));
  await pc.reload(); await pc.waitForTimeout(400); await pc.click('#statsBtn'); await pc.screenshot({ path: 'shot-stats-pc.png' });
  console.log('stats OK'); await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
