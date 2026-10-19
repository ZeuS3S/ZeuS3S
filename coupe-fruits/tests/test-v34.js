const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
(async () => { const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 390, height: 760 }, hasTouch: true, deviceScaleFactor: 2 });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript({ path: __dirname + '/fakeclaude.js' });
  await pg.addInitScript(() => { window.shared = null; navigator.canShare = o => !!(o && o.files); navigator.share = async o => { window.shared = { n: o.files.length, type: o.files[0].type, text: o.text } } });
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.evaluate(() => localStorage.setItem('coupe.tuto', '1')); await pg.reload(); await pg.waitForTimeout(800);
  // plein écran : le réglage existe quand la page le permet
  await pg.click('#pause'); assert.strictEqual(await pg.locator('#fs').isVisible(), await pg.evaluate(() => document.fullscreenEnabled)); await pg.keyboard.press('Escape'); await pg.waitForTimeout(200);
  // téléphone qui rame : passage en résolution normale
  await pg.click('#go'); await pg.waitForTimeout(300);
  assert.strictEqual(await pg.evaluate(() => document.getElementById('cv').width / __coupe.size()[0]), 2);
  await pg.evaluate(() => { const busy = () => { const t = performance.now(); while (performance.now() - t < 35); if (window.busyOn) requestAnimationFrame(busy) }; window.busyOn = 1; requestAnimationFrame(busy) });
  await pg.waitForTimeout(4000); await pg.evaluate(() => window.busyOn = 0);
  assert.strictEqual(await pg.evaluate(() => document.getElementById('cv').width / __coupe.size()[0]), 1, 'dpr drops to 1');
  // fin de partie puis partage de la carte
  await pg.evaluate(() => { const s = __coupe.state(); s.next = 999; __coupe.addPts(300) });
  const box = await pg.locator('#cv').boundingBox(); const [W, H] = await pg.evaluate(() => __coupe.size());
  for (let i = 0; i < 3; i++) { await pg.evaluate(() => { const [W, H] = __coupe.size(); __coupe.spawnAt(true, W / 2, H / 3) }); await pg.mouse.move(box.x + W / 2 - 120, box.y + H / 3); await pg.mouse.down(); await pg.mouse.move(box.x + W / 2 + 120, box.y + H / 3, { steps: 5 }); await pg.mouse.up(); await pg.waitForTimeout(150) }
  await pg.waitForTimeout(1800); await pg.click('#cardBtn'); await pg.waitForTimeout(400);
  assert.ok(await pg.locator('#cardShare').isVisible()); await pg.click('#cardShare'); await pg.waitForTimeout(200);
  const sh = await pg.evaluate(() => window.shared); assert.strictEqual(sh.n, 1); assert.strictEqual(sh.type, 'image/png'); assert.match(sh.text, /\d+ points sur Coupe-Fruits/);
  await pg.screenshot({ path: 'v34-card.png' });
  assert.deepStrictEqual(errs, []); console.log('v3.4 OK'); await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
