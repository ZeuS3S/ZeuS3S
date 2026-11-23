const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[390, 800], [1280, 800]]) {
  const pg = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true }); await pg.addInitScript(() => { try { if (!localStorage.getItem('coupe.tuto')) localStorage.setItem('coupe.tuto', '1'); if (!localStorage.getItem('coupe.seen')) localStorage.setItem('coupe.seen', '3.10') } catch (e) {} });  await pg.addInitScript({ path: __dirname + '/opengrp.js' });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|fonts/.test(m.text())) errs.push(m.text()) });
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.waitForTimeout(500);
  // Niveau et coffre
  assert.strictEqual(await pg.textContent('#lvlBadge'), '1'); assert.strictEqual(await pg.textContent('#meTitle'), 'Commis');
  await pg.click('[data-hp=prog]'); await pg.click('#chestBtn'); await pg.evaluate(() => showHome('play')); const c1 = +(await pg.textContent('#coins')); assert.ok(c1 >= 50, 'chest gives coins');
  assert.strictEqual(await pg.isDisabled('#chestBtn'), true, 'chest once a day');
  // Partie : XP, défi de la semaine, ralenti de fin, carte
  const xp0 = await pg.evaluate(() => __coupe.xp());
  await pg.click('#go'); await pg.waitForTimeout(300); assert.strictEqual(await pg.evaluate(() => __coupe.music()), true, 'music playing');
  assert.strictEqual(await pg.textContent('#titleHud'), 'Commis', 'title under score');
  await pg.evaluate(() => { const s = __coupe.state(); s.next = 999; __coupe.addPts(600); s.cut = 30; s.launched = 30; });
  const box = await pg.locator('#cv').boundingBox(); const [W, H] = await pg.evaluate(() => __coupe.size());
  for (let i = 0; i < 3; i++) { await pg.evaluate(() => { const [W, H] = __coupe.size(); __coupe.spawnAt(true, W / 2, H / 3); }); await pg.mouse.move(box.x + W / 2 - 120, box.y + H / 3); await pg.mouse.down(); await pg.mouse.move(box.x + W / 2 + 120, box.y + H / 3, { steps: 5 }); await pg.mouse.up(); }
  await pg.waitForTimeout(400); assert.strictEqual(await pg.locator('#over').isVisible(), false, 'end slow-mo delays the panel');
  await pg.waitForTimeout(1100); assert.ok(await pg.locator('#over').isVisible());
  assert.strictEqual(await pg.evaluate(() => __coupe.xp()) - xp0, 225, 'xp = 600/3 + 25');
  assert.match(await pg.textContent('#overXp'), /\+225 XP/);
  assert.ok(+(await pg.textContent('#lvlBadge')) >= 1);
  const wk = await pg.evaluate(() => JSON.parse(localStorage.getItem('coupe.week'))); assert.ok(Object.keys(wk.prog).length === 3, 'weekly progress tracked');
  await pg.click('#cardBtn'); await pg.waitForTimeout(300); assert.ok(await pg.locator('#cardPanel').isVisible());
  assert.ok((await pg.getAttribute('#cardImg', 'src')).startsWith('data:image/png'), 'card image');
  assert.strictEqual(await pg.locator('#cardSave').isVisible(), false, 'no downloads outside claude.ai → hint instead');
  await pg.screenshot({ path: `v20-card-${w}.png` }); await pg.click('#cardClose');
  // Profil : Joueur, Défis, Classement (hors claude.ai), Boutique jus
  await pg.click('#overStatsBtn'); await pg.click('.tabs [data-tab=me]'); assert.match(await pg.textContent('#statsBody'), /Commis.*Changer de titre.*Toutes mes stats/s);
  await pg.screenshot({ path: `v20-me-${w}.png` });
  await pg.evaluate(() => __coupe.openStats('quests')); assert.strictEqual(await pg.locator('.quest').count(), 14); await pg.screenshot({ path: `v20-quests-${w}.png` });
  await pg.evaluate(() => __coupe.openStats('lb')); assert.match(await pg.textContent('#statsBody'), /claude\.ai/);
  await pg.evaluate(() => __coupe.openStats('shop')); await pg.evaluate(() => __coupe.setShop('coupe')); assert.strictEqual(await pg.locator('[data-juice]').count(), 4);
  await pg.click('#statsClose');
  // Options : accessibilité + anglais
  await pg.click('#change'); await pg.click('#pause');
  await pg.click('#big'); assert.strictEqual(await pg.getAttribute('#big', 'aria-pressed'), 'true');
  await pg.click('#cb'); await pg.click('#reduce'); await pg.fill('#vMusic', '0'); await pg.locator('#vMusic').dispatchEvent('input'); assert.strictEqual(await pg.evaluate(() => __coupe.music()), false, 'music off');
  await pg.click('#lang'); assert.strictEqual(await pg.textContent('#close'), 'Close'); assert.strictEqual(await pg.textContent('#big'), 'Big fruits');
  await pg.click('#close'); assert.strictEqual(await pg.textContent('#go'), '▶ Play'); assert.match(await pg.textContent('#modeHelp'), /lives on normal/);
  await pg.screenshot({ path: `v20-en-${w}.png` });
  await pg.reload(); await pg.waitForTimeout(400); assert.strictEqual(await pg.textContent('#go'), '▶ Play', 'language remembered');
  await pg.click('#go'); await pg.evaluate(() => { const s = __coupe.state(); s.next = 999; const [W, H] = __coupe.size(); __coupe.spawnAt(true, W / 2, H / 3); }); await pg.waitForTimeout(200); await pg.screenshot({ path: `v20-cb-${w}.png` });
  await pg.click('#pause'); await pg.click('#lang'); await pg.click('#resume'); await pg.click('#pause'); assert.strictEqual(await pg.textContent('#resume'), '▶ Reprendre', 'back to French');
  const ov = await pg.evaluate(() => document.documentElement.scrollWidth > innerWidth); assert.strictEqual(ov, false);
  assert.deepStrictEqual(errs, []); console.log('v2.0 OK', w); await pg.close(); }
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
