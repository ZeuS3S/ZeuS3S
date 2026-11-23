const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
(async () => { const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 390, height: 760 }, hasTouch: true });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript({ path: __dirname + '/fakeclaude.js' });
  await pg.addInitScript(() => { if (!sessionStorage.getItem('d')) { sessionStorage.setItem('d', 1); localStorage.setItem('coupe.daily', 'null'); localStorage.setItem('coupe.puzzle', '5'); localStorage.setItem('coupe.chestStreak', 'null') } });
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.evaluate(() => localStorage.setItem('coupe.tuto', '1')); await pg.reload(); await pg.waitForTimeout(800);
  assert.ok(await pg.evaluate(() => !!window.__coupe), 'survives corrupted save');
  // interrupteur Commentateur
  await pg.click('#pause'); await pg.click('#commSw'); assert.strictEqual(await pg.getAttribute('#commSw', 'aria-pressed'), 'false');
  assert.strictEqual(await pg.evaluate(() => __coupe.prefs.comm), false); await pg.click('#close');
  // taper « p » dans un champ ne ferme pas le profil
  await pg.click('#statsBtn'); await pg.click('[data-tab=lb]'); await pg.waitForTimeout(300);
  const inp = pg.locator('#stats input').first(); await inp.click(); await pg.keyboard.type('Sp'); assert.ok(await pg.locator('#stats').isVisible()); await pg.click('#statsClose');
  // Vagues : recommencer ne garde pas les lancers de l'ancienne partie
  await pg.click('#modeSeg [data-v=vagues]'); await pg.click('#go'); await pg.waitForTimeout(300);
  await pg.evaluate(() => { const s = __coupe.state(); s.wave = 30; s.waveT = 0 }); await pg.waitForTimeout(400);
  await pg.click('#pause'); await pg.click('#restart'); await pg.waitForTimeout(2000);
  assert.ok(await pg.evaluate(() => __coupe.state().wvLeft >= 0), 'no stale wave spawns');
  // profil ouvert pendant la partie : la partie reste en pause même via le passe
  await pg.click('#statsBtn'); await pg.waitForTimeout(100); assert.ok(await pg.evaluate(() => __coupe.state().paused));
  await pg.click('#statsClose'); await pg.waitForTimeout(100); assert.ok(await pg.locator('#count').isVisible(), 'countdown after profile'); await pg.waitForTimeout(1200); assert.strictEqual(await pg.evaluate(() => __coupe.state().paused), false);
  await pg.click('#statsBtn'); await pg.click('#pause'); assert.strictEqual(await pg.locator('#stats').isVisible(), false, 'menu replaces profile'); assert.ok(await pg.locator('#menu').isVisible());
  await pg.click('#resume'); await pg.waitForTimeout(1300); assert.strictEqual(await pg.evaluate(() => __coupe.state().paused), false);
  // puzzle : Recommencer relance le même niveau
  await pg.click('#pause'); await pg.click('#home'); await pg.click('#pzBtn'); await pg.click('#pzGrid button >> nth=0'); await pg.waitForTimeout(300);
  assert.strictEqual(await pg.evaluate(() => __coupe.state().puzzle), 1);
  await pg.click('#pause'); await pg.click('#restart'); await pg.waitForTimeout(200); assert.strictEqual(await pg.evaluate(() => __coupe.state().puzzle), 1, 'puzzle restart');
  // horizontal : le bouton Jouer est visible
  await pg.click('#pause'); await pg.click('#home'); await pg.waitForTimeout(200); if (await pg.locator('#pzPanel').isVisible()) await pg.click('#pzClose');
  await pg.setViewportSize({ width: 844, height: 390 }); await pg.waitForTimeout(400);
  await pg.screenshot({ path: 'v37-land.png' }); const gb = await pg.locator('#go').boundingBox(); assert.ok(gb && gb.y + gb.height <= 390, 'Jouer visible en paysage ' + JSON.stringify(gb));
  assert.deepStrictEqual(errs, []); console.log('v3.7 OK'); await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
