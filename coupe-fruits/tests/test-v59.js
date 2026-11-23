const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
(async () => { const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 390, height: 800 }, hasTouch: true });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.evaluate(() => { localStorage.setItem('coupe.tuto', '1'); localStorage.setItem('coupe.seen', '3.10') }); await pg.reload(); await pg.waitForTimeout(1200);
  await pg.click('#go'); await pg.evaluate(() => { const s = __coupe.state(); s.lives = 99; s.max = 99 });
  let seen = false; for (let i = 0; i < 60 && !seen; i++) { await pg.waitForTimeout(200); seen = await pg.evaluate(() => __coupe.items().some(i => i.e === '💣')) }
  assert.ok(seen, 'a grenade shows up early'); await pg.evaluate(() => __coupe.state().paused = true); await pg.screenshot({ path: 'v59-bomb.png' });
  assert.deepStrictEqual(errs, []); console.log('v5.9 OK'); await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
