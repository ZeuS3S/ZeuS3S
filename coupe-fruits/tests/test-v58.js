const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
(async () => { const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 390, height: 800 }, hasTouch: true });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.evaluate(() => { localStorage.setItem('coupe.tuto', '1'); localStorage.setItem('coupe.seen', '3.10') }); await pg.reload(); await pg.waitForTimeout(1200);
  await pg.click('#modeSeg [data-v=chrono]'); await pg.click('#go'); await pg.evaluate(() => { const s = __coupe.state(); s.next = 999; s.waveT = 999 });
  const box = await pg.locator('#cv').boundingBox();
  // noix de coco : aller-retour sans lever le doigt -> cassée
  await pg.evaluate(() => { const [W, H] = __coupe.size(); __coupe.spawnAt(false, W / 2, H / 2, 'coco'); __coupe.state().slow = 99 });
  let c = await pg.evaluate(() => __coupe.items().find(i => i.e === '🥥'));
  await pg.mouse.move(box.x + c.x - 90, box.y + c.y); await pg.mouse.down(); await pg.mouse.move(box.x + c.x + 90, box.y + c.y, { steps: 4 });
  assert.ok(await pg.evaluate(() => __coupe.items().some(i => i.e === '🥥')), 'first hit cracks only');
  await pg.waitForTimeout(260); c = await pg.evaluate(() => __coupe.items().find(i => i.e === '🥥'));
  await pg.mouse.move(box.x + c.x + 90, box.y + c.y, { steps: 2 }); await pg.mouse.move(box.x + c.x - 90, box.y + c.y, { steps: 4 }); await pg.mouse.up();
  assert.ok(!(await pg.evaluate(() => __coupe.items().some(i => i.e === '🥥'))), 'second pass in same stroke cuts the coconut');
  // grenade : 1 lancer sur 30
  assert.ok(await pg.evaluate(() => document.documentElement.innerHTML.includes('Rn()<1/30)kind=GRENADE')));
  assert.deepStrictEqual(errs, []); console.log('v5.8 OK'); await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
