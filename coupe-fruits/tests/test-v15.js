const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1100, height: 800 } }); await pg.addInitScript(() => { try { if (!localStorage.getItem('coupe.tuto')) localStorage.setItem('coupe.tuto', '1'); if (!localStorage.getItem('coupe.seen')) localStorage.setItem('coupe.seen', '3.10') } catch (e) {} }); 
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  // Choisir une date où le défi du jour est « combo ×4 » (indice 1)
  let day = new Date(2026, 9, 13, 12);
  for (let i = 0; i < 8; i++) { const n = Math.round(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()) / 864e5); if (n % 8 === 1) break; day = new Date(day.getTime() + 864e5); }
  await pg.clock.setFixedTime(day);
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.waitForTimeout(500);
  assert.strictEqual(await pg.evaluate(() => __coupe.daily()), 1);
  await pg.evaluate(() => __coupe.openStats('quests')); assert.match(await pg.textContent('#statsBody'), /Défi du jour.*Fais un combo ×4/); await pg.click('#statsClose'); assert.ok(await pg.locator('#dailyDot').isVisible());
  const box = await pg.locator('#cv').boundingBox();
  const st = () => pg.evaluate(() => __coupe.state());
  const ach = () => pg.evaluate(() => __coupe.ach());
  const spawn = (bad, k, dx = 0) => pg.evaluate(([bad, k, dx]) => { const [W, H] = __coupe.size(); __coupe.spawnAt(bad, W / 2 + dx, H / 3, k); }, [bad, k, dx]);
  const swipe = async (w = 120) => { const [W, H] = await pg.evaluate(() => __coupe.size());
    await pg.mouse.move(box.x + W / 2 - w, box.y + H / 3 + 5); await pg.mouse.down();
    await pg.mouse.move(box.x + W / 2 + w, box.y + H / 3 + 5, { steps: 8 }); await pg.mouse.up(); };
  await pg.click('#modeSeg [data-v=chrono]'); await pg.click('#go'); await pg.evaluate(() => { __coupe.state().next = 999; });
  // Série : 15 fraises, la 15e vaut 13 points (×1,25)
  for (let i = 0; i < 15; i++) { await spawn(false); await swipe(); }
  let s = await st(); assert.strictEqual(s.streak, 15); assert.strictEqual(s.score, 153, '15th fruit already x1.25');
  await spawn(false); await swipe(); s = await st(); assert.strictEqual(s.score, 166, 'x1.25 continues');
  // Durian : la série retombe à 0
  await spawn(true); await swipe(); assert.strictEqual((await st()).streak, 0, 'durian breaks streak');
  // Bullet time + défi du jour : glaçon puis combo ×4
  await spawn(false, 'ice'); await swipe();
  for (const dx of [-270, -210, -150, -90, -30, 30, 90, 150, 210, 270]) await spawn(false, null, dx);
  await swipe(280);
  s = await st(); assert.ok(s.bestCombo >= 4); assert.ok((await ach()).bullet, 'bullet time');
  assert.ok((await pg.evaluate(() => JSON.parse(localStorage.getItem('coupe.daily')))).length === 1, 'daily done');
  // Nez bouché : 3 durians d'un geste (succès secret)
  for (const dx of [-280, -200, -120, -40, 40, 120, 200, 280]) await spawn(true, null, dx);
  await swipe(290); assert.ok((await ach()).nez, 'nez bouche');
  // Frénésie
  await spawn(false, 'frenzy'); await swipe(); assert.ok(!(await ach()).frenesie, 'one frenzy is no longer enough');
  await pg.waitForTimeout(1400); await pg.screenshot({ path: 'shot-v15-game.png' });
  // Fin de partie, stats et défi réussi
  await pg.evaluate(() => { const s = __coupe.state(); s.frenzy = 0; s.timeLeft = .2; }); await pg.waitForTimeout(2300); // le ralenti cinéma du record ralentit aussi le chrono
  assert.ok(await pg.locator('#over').isVisible());
  await pg.click('#overStatsBtn'); assert.match(await pg.textContent('#statsBody'), /Meilleure série/);
  // Lames : 5 succès ou plus → Braise disponible
  await pg.evaluate(() => { const a = JSON.parse(localStorage.getItem('coupe.ach') || '{}'); for (const id of ['premiere', 'cent', 'zenitude', 'mille', 'combo8']) a[id] = 1; localStorage.setItem('coupe.ach', JSON.stringify(a)); });
  const n = Object.keys(await ach()).length; assert.ok(n >= 5 && n < 10, 'between 5 and 9 achievements: ' + n);
  await pg.evaluate(() => __coupe.openStats('shop'));
  await pg.evaluate(() => __coupe.setShop('coupe')); assert.strictEqual(await pg.isDisabled('[data-blade=braise]'), false);
  assert.strictEqual(await pg.isDisabled('[data-blade=arc]'), true);
  await pg.click('[data-blade=braise]'); assert.strictEqual(await pg.evaluate(() => localStorage.getItem('coupe.blade')), 'braise');
  assert.match(await pg.textContent('[data-blade=braise]'), /Équipée/);
  await pg.screenshot({ path: 'shot-blades.png' });
  await pg.evaluate(() => __coupe.openStats('ach')); assert.match(await pg.textContent('#achCount'), /\/48$/);
  await pg.click('#statsClose'); await pg.click('#change');
  assert.ok(await pg.locator('#dailyDot').isHidden());
  assert.deepStrictEqual(errs, []);
  console.log('v1.5 OK'); await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
