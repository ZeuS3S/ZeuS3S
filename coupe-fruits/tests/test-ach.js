const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1100, height: 800 } }); await pg.addInitScript(() => { try { if (!localStorage.getItem('coupe.tuto')) localStorage.setItem('coupe.tuto', '1'); if (!localStorage.getItem('coupe.seen')) localStorage.setItem('coupe.seen', '3.10') } catch (e) {} });  await pg.addInitScript({ path: __dirname + '/opengrp.js' });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const url = 'file://' + __dirname + '/coupe.html';
  await pg.goto(url); await pg.waitForTimeout(500);
  assert.strictEqual(await pg.locator('#stats').isVisible(), false, 'no patch notes for brand-new player');
  // Ancien joueur : les nouveautés s'ouvrent une fois
  await pg.evaluate(() => { localStorage.setItem('coupe.seen', '3.1'); });
  await pg.reload(); await pg.waitForTimeout(400);
  assert.ok(await pg.locator('#stats').isVisible(), 'patch notes auto-open');
  assert.match(await pg.textContent('#statsBody'), /Version 3\.10 · Ambiances de la Carrière et Défi 3 étoiles \(actuelle\)/);
  await pg.screenshot({ path: 'shot-news.png' });
  await pg.reload(); await pg.waitForTimeout(400);
  assert.strictEqual(await pg.locator('#stats').isVisible(), false, 'only once');
  await pg.click('#newsBtn'); assert.match(await pg.textContent('#statsBody'), /Version 1\.0/); await pg.click('#statsClose');

  const box = await pg.locator('#cv').boundingBox();
  const st = () => pg.evaluate(() => __coupe.state());
  const spawn = (k, dx = 0) => pg.evaluate(([k, dx]) => { const [W, H] = __coupe.size(); __coupe.spawnAt(false, W / 2 + dx, H / 3, k); }, [k, dx]);
  const swipe = async (w = 120) => { const [W, H] = await pg.evaluate(() => __coupe.size());
    await pg.mouse.move(box.x + W / 2 - w, box.y + H / 3 + 5); await pg.mouse.down();
    await pg.mouse.move(box.x + W / 2 + w, box.y + H / 3 + 5, { steps: 6 }); await pg.mouse.up(); };
  await pg.click('#go'); await pg.evaluate(() => { __coupe.state().next = 999; });
  // Noix de coco : deux coups
  await spawn('coco'); await swipe(); let s = await st();
  assert.strictEqual(s.score, 0, 'coco survives first hit');
  await swipe(); s = await st(); assert.strictEqual(s.score, 30, 'coco opens on second hit');
  // Mangue dorée + succès légendaire + notification
  await spawn('mango'); await swipe(); s = await st();
  assert.strictEqual(s.score, 130); assert.ok(!(await pg.evaluate(() => __coupe.ach())).mangue, 'one mango is no longer enough');
  await pg.waitForTimeout(300);
  await pg.screenshot({ path: 'shot-toast.png' });
  // Combo ×3 d'un seul geste
  for (const dx of [-200, -150, -100, -50, 0, 50, 100, 150, 200]) await spawn(null, dx); await swipe(280);
  assert.ok((await pg.evaluate(() => __coupe.ach())).combo3, 'combo3');
  // Frénésie : pluie de fruits
  await spawn('frenzy'); await swipe(); assert.ok((await st()).frenzy > 4);
  await pg.waitForTimeout(1500); await pg.screenshot({ path: 'shot-frenzy.png' });
  await pg.evaluate(() => { const s = __coupe.state(); s.frenzy = 0; });
  // Fin de partie : succès listés
  await pg.waitForTimeout(3000);
  for (let i = 0; i < 3; i++) { await pg.evaluate(() => { const [W, H] = __coupe.size(); __coupe.spawnAt(true, W / 2, H / 3); }); await swipe(); }
  await pg.waitForTimeout(1400);
  assert.ok(await pg.locator('#over').isVisible());
  const oa = await pg.textContent('#overAch'); assert.match(oa, /Combo/);
  // Onglet Succès
  await pg.click('#overStatsBtn'); await pg.click('.tabs [data-tab=ach]');
  const body = await pg.textContent('#statsBody');
  assert.match(body, /Succès secret/); assert.match(body, /Tous.*À faire.*Débloqués/s);
  assert.match(await pg.textContent('#achCount'), /^\d+\/48$/);
  await pg.screenshot({ path: 'shot-ach.png' });
  await pg.click('#statsClose');
  // Tout effacer
  await pg.click('#again'); await pg.click('#pause'); await pg.click('#wipe'); await pg.click('#wipe');
  assert.deepStrictEqual(await pg.evaluate(() => __coupe.ach()), {});
  assert.deepStrictEqual(errs, []);
  console.log('ach OK'); await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
