const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
(async () => { const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 390, height: 760 }, hasTouch: true });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.evaluate(() => localStorage.setItem('coupe.tuto', '1')); await pg.reload(); await pg.waitForTimeout(900);
  await pg.click('#modeSeg [data-v=chrono]'); await pg.click('#go'); await pg.evaluate(() => { const s = __coupe.state(); s.next = 999; s.waveT = 999 });
  const box = await pg.locator('#cv').boundingBox(); const [W, H] = await pg.evaluate(() => __coupe.size());
  // un seul geste rapide à travers 4 fruits : combo ×4
  for (const dx of [-120, -40, 40, 120]) await pg.evaluate(dx => { const [W, H] = __coupe.size(); __coupe.spawnAt(false, W / 2 + dx, H / 3) }, dx);
  await pg.mouse.move(box.x + W / 2 - 160, box.y + H / 3); await pg.mouse.down(); await pg.mouse.move(box.x + W / 2 + 160, box.y + H / 3, { steps: 8 });
  assert.strictEqual(await pg.evaluate(() => __coupe.state().stroke), 4, 'real combo');
  // doigt toujours posé : un fruit coupé 1 s plus tard ne prolonge pas le combo
  await pg.waitForTimeout(1000); await pg.evaluate(() => { const [W, H] = __coupe.size(); __coupe.spawnAt(false, W / 2, H * .6) });
  await pg.mouse.move(box.x + W / 2 - 60, box.y + H * .6); await pg.mouse.move(box.x + W / 2 + 60, box.y + H * .6, { steps: 4 });
  assert.strictEqual(await pg.evaluate(() => __coupe.state().stroke), 1, 'combo restarts after a pause');
  await pg.mouse.up();
  assert.deepStrictEqual(errs, []); console.log('v4.9 combo OK'); await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
