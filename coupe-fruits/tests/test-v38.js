const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
(async () => { const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 390, height: 760 }, hasTouch: true });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript({ path: __dirname + '/fakeclaude.js' });
  // samedi simulé
  await pg.addInitScript(() => { window.__sat = 1 }); await pg.addInitScript(() => { const D = Date; const sat = new D('2026-10-17T12:00:00').getTime(), off = sat - D.now(); window.Date = class extends D { constructor(...a) { super(...(a.length ? a : [D.now() + off])) } static now() { return D.now() + off } } });
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.evaluate(() => { localStorage.setItem('coupe.tuto', '1'); localStorage.setItem('coupe.chestStreak', JSON.stringify({ last: '2026-10-16', n: 4 })) }); await pg.reload(); await pg.waitForTimeout(800);
  assert.ok(await pg.locator('#eventBox').isVisible(), 'samedi'); assert.strictEqual(await pg.textContent('#streak'), '🔥 4');
  await pg.screenshot({ path: 'v38-home.png' });
  // samedi : XP doublée en fin de partie
  const xp0 = await pg.evaluate(() => __coupe.xp());
  await pg.click('#go'); await pg.evaluate(() => { __coupe.state().next = 999; __coupe.addPts(100) });
  // piment : points ×2
  const box = await pg.locator('#cv').boundingBox(); const [W, H] = await pg.evaluate(() => __coupe.size());
  const swipe = async y => { await pg.mouse.move(box.x + W / 2 - 100, box.y + y); await pg.mouse.down(); await pg.mouse.move(box.x + W / 2 + 100, box.y + y, { steps: 5 }); await pg.mouse.up(); await pg.waitForTimeout(80) };
  await pg.evaluate(() => { const [W, H] = __coupe.size(); __coupe.spawnAt(false, W / 2, H / 2, 'chili') }); await swipe(H / 2);
  assert.ok(await pg.evaluate(() => __coupe.state().chili > 4), 'chili on');
  // grenade dessinée en fruit
  await pg.evaluate(() => { const [W, H] = __coupe.size(); __coupe.spawnAt(false, W / 2, H / 3, 'bomb'); __coupe.state().paused = true }); await pg.waitForTimeout(100);
  await pg.screenshot({ path: 'v38-pom.png' }); await pg.evaluate(() => __coupe.state().paused = false);
  const s0 = await pg.evaluate(() => __coupe.state().score);
  await pg.evaluate(() => { const [W, H] = __coupe.size(); __coupe.spawnAt(false, W / 2, H * .7, 'x') }); await swipe(H * .7);
  const gain = await pg.evaluate(() => __coupe.state().score) - s0; assert.ok(gain >= 20, 'double points ' + gain);
  for (let i = 0; i < 3; i++) { await pg.evaluate(() => { const [W, H] = __coupe.size(); __coupe.spawnAt(true, W / 2, H / 3) }); await swipe(H / 3) }
  await pg.waitForTimeout(1800); assert.ok(await pg.locator('#over').isVisible());
  const sc = await pg.evaluate(() => __coupe.state().score), dxp = await pg.evaluate(() => __coupe.xp()) - xp0;
  assert.strictEqual(dxp, (Math.floor(sc / 3) + 25) * 2, 'samedi ×2 xp');
  assert.strictEqual(await pg.evaluate(() => __coupe.music()), false, 'music stops after game');
  // gaucher + texte plus grand
  await pg.click('#change'); await pg.click('#pause'); await pg.click('#lefty'); await pg.click('#bigtxt'); await pg.click('#close');
  const order = await pg.evaluate(() => getComputedStyle(document.querySelector('.hud')).flexDirection); assert.strictEqual(order, 'row-reverse');
  assert.ok(await pg.evaluate(() => document.body.classList.contains('bigtxt')));
  await pg.screenshot({ path: 'v38-lefty.png' });
  assert.deepStrictEqual(errs, []); console.log('v3.8 OK'); await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
