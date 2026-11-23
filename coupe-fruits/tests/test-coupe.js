const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
(async () => {
  const b = await chromium.launch();
  for (const vp of [{ width: 390, height: 780, hasTouch: true }, { width: 1280, height: 800 }]) {
    const pg = await b.newPage({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.hasTouch }); await pg.addInitScript(() => { try { if (!localStorage.getItem('coupe.tuto')) localStorage.setItem('coupe.tuto', '1'); if (!localStorage.getItem('coupe.seen')) localStorage.setItem('coupe.seen', '3.10') } catch (e) {} });  await pg.addInitScript({ path: __dirname + '/opengrp.js' });
    const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.goto('file://' + __dirname + '/coupe.html'); await pg.waitForTimeout(1400);
    await pg.screenshot({ path: `shot-start-${vp.width}.png` });
    await pg.click('#go');
    const box = await pg.locator('#cv').boundingBox();
    const swipeAt = async (bad) => {
      const [W, H] = await pg.evaluate(() => __coupe.size());
      await pg.evaluate(([bad, x, y]) => __coupe.spawnAt(bad, x, y), [bad, W / 2, H / 3]);
      await pg.mouse.move(box.x + W / 2 - 120, box.y + H / 3 + 5); await pg.mouse.down();
      await pg.mouse.move(box.x + W / 2 + 120, box.y + H / 3 + 5, { steps: 4 }); await pg.mouse.up();
    };
    await pg.evaluate(() => { __coupe.state().next = 999; }); // pas de lancers aléatoires pendant le test
    // pause : tout se fige, la coupe est bloquée, puis reprise
    await pg.evaluate(() => __coupe.spawnAt(false, 100, 100));
    await pg.click('#pause');
    assert.strictEqual(await pg.locator('#menu').isVisible(), true, 'menu opens');
    const y1 = await pg.evaluate(() => __coupe.state().paused); assert.strictEqual(y1, true);
    await pg.waitForTimeout(300);
    await pg.fill('#vSfx', '0'); await pg.locator('#vSfx').dispatchEvent('input'); assert.strictEqual(await pg.textContent('#vSfxO'), '0 %');
    await pg.click('#resume'); assert.strictEqual(await pg.evaluate(() => __coupe.state().paused), true, 'countdown first'); assert.ok(await pg.locator('#count').isVisible()); await pg.waitForTimeout(1200); assert.strictEqual(await pg.evaluate(() => __coupe.state().paused), false, 'resumed');
    await pg.keyboard.press('Escape'); assert.strictEqual(await pg.locator('#menu').isVisible(), true, 'Escape opens');
    await pg.keyboard.press('Escape'); assert.strictEqual(await pg.locator('#menu').isVisible(), false, 'Escape closes');
    await pg.waitForTimeout(2500); // laisser tomber le fruit de test (coûte une vie)
    await pg.evaluate(() => { const s = __coupe.state(); s.lives = 3; });
    await swipeAt(false);
    let s = await pg.evaluate(() => __coupe.state());
    assert.ok(s.score >= 10, 'score after fruit ' + s.score);
    await swipeAt(true); s = await pg.evaluate(() => __coupe.state());
    assert.strictEqual(s.lives, 2, 'durian costs a life');
    await swipeAt(true); await swipeAt(true);
    await pg.waitForTimeout(1400);
    assert.strictEqual(await pg.locator('#over').isVisible(), true, 'game over panel');
    assert.ok(+(await pg.textContent('#best')) >= 10, 'best saved');
    await pg.screenshot({ path: `shot-over-${vp.width}.png` });
    await pg.click('#again'); await pg.click('#pause'); await pg.click('#home');
    assert.strictEqual(await pg.locator('#start').isVisible(), true, 'home shows start');
    assert.strictEqual(await pg.textContent('#pause'), '⚙️');
    const overflow = await pg.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.strictEqual(overflow, false, 'no horizontal scroll');
    assert.deepStrictEqual(errs, []);
    console.log('OK', vp.width, 'score', s.score);
  }
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
