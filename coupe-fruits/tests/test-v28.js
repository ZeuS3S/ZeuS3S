const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
(async () => { const b = await chromium.launch();
  for (const [w, h] of [[390, 800], [1280, 800]]) {
  const pg = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.evaluate(() => localStorage.setItem('coupe.tuto', '1')); await pg.reload(); await pg.waitForTimeout(1400);
  // Partie à 0 point -> titre secret Touriste, puis retour à l'accueil
  await pg.click('#go'); await pg.evaluate(() => { const s = __coupe.state(); s.next = 999; s.waveT = 999; });
  const box = await pg.locator('#cv').boundingBox(); const [W, H] = await pg.evaluate(() => __coupe.size());
  for (let i = 0; i < 3; i++) { await pg.evaluate(() => { const [W, H] = __coupe.size(); __coupe.spawnAt(true, W / 2, H / 3); }); await pg.mouse.move(box.x + W / 2 - 120, box.y + H / 3); await pg.mouse.down(); await pg.mouse.move(box.x + W / 2 + 120, box.y + H / 3, { steps: 5 }); await pg.mouse.up(); await pg.waitForTimeout(30); }
  await pg.waitForTimeout(1600); assert.ok(await pg.locator('#over').isVisible());
  const t = await pg.evaluate(() => __coupe.titles()); assert.ok(t.includes('touriste'), 'Touriste'); assert.ok(t.includes('kamikaze'), 'Kamikaze');
  assert.strictEqual(await pg.textContent('#change'), '⌂ Accueil'); await pg.click('#change'); assert.ok(await pg.locator('#start').isVisible(), 'back home');
  // Titres : liste à débloquer, secrets masqués
  await pg.click('#statsBtn'); await pg.click('details.more summary'); const body = await pg.textContent('#statsBody');
  assert.match(body, /Touriste/); assert.match(body, /\?\?\?.*Titre secret/s); assert.match(body, /VIP du verger.*Achète le passe premium/s);
  await pg.selectOption('#titleSel', 'touriste'); assert.strictEqual(await pg.textContent('#titleHud'), 'Touriste');
  await pg.screenshot({ path: `v28-titles-${w}.png` }); await pg.click('#statsClose');
  // Lames : la couleur est le bouton
  await pg.click('#shopBtn'); await pg.evaluate(() => __coupe.setShop('coupe')); await pg.locator('[data-blade=classique]').scrollIntoViewIfNeeded(); assert.strictEqual(await pg.locator('.blades .alt').count(), 0, 'no extra button');
  await pg.click('[data-blade=classique]'); assert.strictEqual(await pg.getAttribute('[data-blade=classique]', 'aria-pressed'), 'true');
  await pg.screenshot({ path: `v28-blades-${w}.png` });
  assert.deepStrictEqual(errs, []); console.log('v2.8 OK', w); await pg.close(); }
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
