const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
(async () => { const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 390, height: 800 }, hasTouch: true }); await pg.addInitScript(() => { try { if (!localStorage.getItem('coupe.tuto')) localStorage.setItem('coupe.tuto', '1'); if (!localStorage.getItem('coupe.seen')) localStorage.setItem('coupe.seen', '3.10') } catch (e) {} }); 
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.waitForTimeout(400);
  await pg.click('#modeSeg [data-v=chrono]'); await pg.click('#go'); await pg.waitForTimeout(1200);
  const snap = () => pg.evaluate(() => { const s = __coupe.state(); return JSON.stringify([s.timeLeft, s.real, s.score, s.t]) });
  // Menu pause : rien ne bouge, la musique se tait
  await pg.click('#pause'); await pg.waitForTimeout(300); const a = await snap(); await pg.waitForTimeout(1500);
  assert.strictEqual(await snap(), a, 'game frozen in pause menu'); assert.strictEqual(await pg.evaluate(() => __coupe.musicHeld()), true, 'music silenced');
  await pg.screenshot({ path: 'pause-390.png' });
  // Profil ouvert depuis la pause, puis fermé : toujours en pause
  await pg.click('#statsBtn'); await pg.waitForTimeout(800); await pg.click('#statsClose'); await pg.waitForTimeout(800);
  assert.strictEqual(await snap(), a, 'still frozen after profile'); assert.ok(await pg.locator('#menu').isVisible());
  // Reprise : le temps repart et la musique revient
  await pg.click('#resume'); await pg.waitForTimeout(1800); assert.notStrictEqual(await snap(), a, 'game resumes');
  assert.strictEqual(await pg.evaluate(() => __coupe.musicHeld()), false, 'music back');
  // Profil ouvert en jeu (sans menu) : pause aussi
  await pg.click('#statsBtn'); await pg.waitForTimeout(300); const c = await snap(); await pg.waitForTimeout(1200); assert.strictEqual(await snap(), c, 'frozen in profile');
  await pg.screenshot({ path: 'profile-390.png' });
  await pg.click('.tabs [data-tab=ach]'); await pg.click('[data-af=done]'); assert.match(await pg.textContent('#statsBody'), /Rien ici/);
  await pg.click('[data-af=todo]'); assert.strictEqual(await pg.locator('.ach').count(), 48); await pg.screenshot({ path: 'ach-390.png' });
  await pg.evaluate(() => __coupe.openStats('shop')); await pg.evaluate(() => __coupe.setShop('coupe')); assert.ok(await pg.locator('[data-blade=classique]').count() === 1, 'blades in shop');
  await pg.click('#statsClose'); await pg.waitForTimeout(1500); assert.notStrictEqual(await snap(), c, 'resumes after profile');
  assert.strictEqual(await pg.locator('.tabs [role=tab]').count(), 5);
  assert.deepStrictEqual(errs, []); console.log('pause+profil OK'); await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
