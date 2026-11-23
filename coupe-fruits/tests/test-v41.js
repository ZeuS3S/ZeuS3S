const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
(async () => { const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 390, height: 760 }, hasTouch: true });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript({ path: __dirname + '/fakeclaude.js' });
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.waitForTimeout(3200);
  assert.strictEqual(await pg.locator('#tip').isVisible(), false, 'no tip before first game');
  await pg.evaluate(() => localStorage.setItem('coupe.tuto', '1')); await pg.reload(); await pg.waitForTimeout(3200);
  assert.ok(await pg.locator('#tip').isVisible()); assert.match(await pg.textContent('#tip'), /Partie du jour/);
  await pg.screenshot({ path: 'v41-tip.png' });
  // toucher le bouton montré : la bulle se ferme ET le bouton marche
  await pg.click('#go'); assert.strictEqual(await pg.locator('#tip').isVisible(), false); assert.ok(await pg.evaluate(() => __coupe.state().running));
  await pg.click('#pause'); await pg.click('#home'); await pg.waitForTimeout(1500);
  assert.match(await pg.textContent('#tip'), /Boss/, 'next tip');
  await pg.mouse.click(5, 5); assert.deepStrictEqual(await pg.evaluate(() => JSON.parse(localStorage.getItem('coupe.tips'))), ['dayBtn', 'modeSeg [data-v="boss"]']);
  await pg.screenshot({ path: 'v41-tip2.png' });
  assert.deepStrictEqual(errs, []); console.log('v4.1 OK'); await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
