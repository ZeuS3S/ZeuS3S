const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
async function killGame(pg) { const box = await pg.locator('#cv').boundingBox(); const [W, H] = await pg.evaluate(() => __coupe.size());
  for (let i = 0; i < 3; i++) { await pg.evaluate(() => { const [W, H] = __coupe.size(); __coupe.spawnAt(true, W / 2, H / 3) }); await pg.mouse.move(box.x + W / 2 - 120, box.y + H / 3); await pg.mouse.down(); await pg.mouse.move(box.x + W / 2 + 120, box.y + H / 3, { steps: 5 }); await pg.mouse.up(); await pg.waitForTimeout(150) }
  await pg.waitForTimeout(1800) }
(async () => { const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 390, height: 760 }, hasTouch: true });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript({ path: __dirname + '/fakeclaude.js' });
  await pg.addInitScript(() => { window.buzzed = []; navigator.vibrate = ms => { window.buzzed.push(ms); return true } });
  // 6. lien de défi : mode et difficulté choisis, encart affiché
  await pg.goto('file://' + __dirname + '/coupe.html?defi=50&m=chrono&d=facile&n=%3Cb%3EBob'); await pg.evaluate(() => localStorage.setItem('coupe.tuto', '1')); await pg.reload(); await pg.waitForTimeout(800);
  assert.ok(await pg.locator('#defiBox').isVisible()); const t = await pg.textContent('#defiBox'); assert.match(t, /Défi de <b>Bob/); assert.match(t, /À battre : 50 points · Chrono facile/);
  assert.strictEqual(await pg.getAttribute('#modeSeg [data-v=chrono]', 'aria-pressed'), 'true');
  await pg.screenshot({ path: 'v36-defi.png' });
  await pg.click('#go'); await pg.waitForTimeout(300); await pg.evaluate(() => __coupe.addPts(60)); await pg.waitForTimeout(1300);
  assert.match(await pg.textContent('#defiBox'), /Défi relevé/);
  // 3. vibrations : le réglage les coupe
  await pg.evaluate(() => { const [W, H] = __coupe.size(); __coupe.spawnAt(false, W / 2, H / 2) });
  const box = await pg.locator('#cv').boundingBox(); const [W, H] = await pg.evaluate(() => __coupe.size());
  const swipe = async () => { await pg.mouse.move(box.x + W / 2 - 100, box.y + H / 2); await pg.mouse.down(); await pg.mouse.move(box.x + W / 2 + 100, box.y + H / 2, { steps: 5 }); await pg.mouse.up() };
  await swipe(); assert.ok((await pg.evaluate(() => window.buzzed)).includes(8), 'buzz on cut');
  await pg.click('#pause'); assert.ok(await pg.locator('#vib').isVisible()); await pg.click('#vib'); assert.strictEqual(await pg.getAttribute('#vib', 'aria-pressed'), 'false');
  await pg.click('#resume'); await pg.waitForTimeout(1200); await pg.evaluate(() => { window.buzzed = []; const [W, H] = __coupe.size(); __coupe.spawnAt(false, W / 2, H / 2) }); await swipe();
  assert.deepStrictEqual(await pg.evaluate(() => window.buzzed), [], 'no buzz when off');
  // 7. fantôme du record : une partie record en Classique enregistre la trace, la suivante l'affiche
  await pg.click('#pause'); await pg.click('#home'); await pg.waitForTimeout(300);
  await pg.click('#modeSeg [data-v=classique]'); await pg.click('#diffSeg [data-v=normal]');
  await pg.click('#go'); await pg.evaluate(() => __coupe.state().next = 999);
  await pg.evaluate(() => __coupe.addPts(100)); await pg.waitForTimeout(2300); await killGame(pg);
  const gh = await pg.evaluate(() => JSON.parse(localStorage.getItem('coupe.ghost.classique.normal'))); assert.ok(gh.length >= 2 && gh[0] === 100, 'ghost saved ' + JSON.stringify(gh));
  await pg.click('#again'); await pg.evaluate(() => __coupe.state().next = 999); await pg.waitForTimeout(1300);
  assert.ok(await pg.locator('#ghostHud').isVisible()); assert.match(await pg.textContent('#ghostHud'), /Record −100/);
  await pg.evaluate(() => __coupe.addPts(150)); await pg.waitForTimeout(1100); assert.match(await pg.textContent('#ghostHud'), /Record \+50/);
  assert.strictEqual(await pg.locator('#count').isVisible(), false, 'no countdown on new game'); await pg.screenshot({ path: 'v36-ghost.png' });
  await killGame(pg); assert.strictEqual(await pg.locator('#ghostHud').isVisible(), false, 'hidden after game');
  assert.deepStrictEqual(errs, []); console.log('v3.6 OK'); await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
