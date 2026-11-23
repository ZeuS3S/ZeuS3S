const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
(async () => { const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 390, height: 760 }, hasTouch: true });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript({ path: __dirname + '/fakeclaude.js' });
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.evaluate(() => localStorage.setItem('coupe.tuto', '1')); await pg.reload(); await pg.waitForTimeout(800);
  await pg.click('#modeSeg [data-v=boss]'); assert.match(await pg.textContent('#modeHelp'), /fruits géants/);
  await pg.screenshot({ path: 'v40-home.png' });
  await pg.click('#go'); await pg.waitForTimeout(1600);
  const box = await pg.locator('#cv').boundingBox();
  const boss = () => pg.evaluate(() => __coupe.items().find(i => i.r > 60));
  let bs = await boss(); assert.ok(bs, 'a boss is on the board'); assert.strictEqual(await pg.evaluate(() => __coupe.items().length), 1, 'only the boss');
  await pg.screenshot({ path: 'v40-boss.png' });
  // on le frappe jusqu'à le vaincre (un geste par coup)
  let hits = 0; while ((bs = await boss()) && hits < 12) { await pg.mouse.move(box.x + bs.x - 80, box.y + bs.y); await pg.mouse.down(); await pg.mouse.move(box.x + bs.x + 80, box.y + bs.y, { steps: 3 }); await pg.mouse.up(); hits++ }
  assert.ok(!(await boss()), 'boss down after ' + hits); const st = await pg.evaluate(() => { const s = __coupe.state(); return { b: s.bosses, sc: s.score, lives: s.lives } });
  assert.strictEqual(st.b, 1); assert.ok(st.sc >= 50 + 6 * 6, 'points ' + st.sc); assert.strictEqual(hits, 7, 'normal boss 1 = 7 hits');
  // le boss suivant arrive ; s'il tombe, une vie part
  await pg.waitForTimeout(3500); assert.ok(await boss(), 'next boss'); await pg.waitForTimeout(9000);
  assert.ok((await pg.evaluate(() => __coupe.state().lives)) < 3, 'missed boss costs a life');
  assert.deepStrictEqual(errs, []); console.log('v4.0 boss OK'); await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
