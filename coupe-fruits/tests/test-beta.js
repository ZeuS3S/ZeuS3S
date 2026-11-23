const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1000, height: 800 } }); await pg.addInitScript(() => { try { if (!localStorage.getItem('coupe.tuto')) localStorage.setItem('coupe.tuto', '1'); if (!localStorage.getItem('coupe.seen')) localStorage.setItem('coupe.seen', '3.10') } catch (e) {} }); 
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.waitForTimeout(300);
  assert.ok(await pg.locator('#beta').isVisible(), 'beta notice');
  // Ancienne version : succès, pièces et fonds présents
  await pg.evaluate(() => { localStorage.setItem('coupe.seen', '3.1'); localStorage.setItem('coupe.ach', JSON.stringify({ pouah: 1, combo3: 1 }));
    localStorage.setItem('coupe.achPaid', JSON.stringify(['pouah'])); localStorage.setItem('coupe.wallet', JSON.stringify({ coins: 300, earned: 300 })); });
  await pg.reload(); await pg.waitForTimeout(400);
  assert.deepStrictEqual(await pg.evaluate(() => __coupe.ach()), {}, 'achievements reset on new beta version');
  assert.strictEqual(await pg.textContent('#coins'), '300', 'coins kept');
  // Même version : pas de nouvelle remise à zéro
  await pg.evaluate(() => localStorage.setItem('coupe.ach', JSON.stringify({ pouah: 1 }))); await pg.reload(); await pg.waitForTimeout(300);
  assert.ok((await pg.evaluate(() => __coupe.ach())).pouah, 'not reset twice');
  // Re-débloquer Pouah ne repaie pas
  await pg.evaluate(() => { localStorage.setItem('coupe.ach', '{}'); localStorage.removeItem('coupe.achBase'); localStorage.setItem('coupe.stats', JSON.stringify({ games: 1, cut: 0, durians: 24, missed: 0, time: 0, bestCombo: 0, bestStreak: 0, modes: {}, md: {}, fruits: {}, powers: {}, history: [] })); }); await pg.reload(); await pg.waitForTimeout(300);
  await pg.click('#statsClose').catch(() => {}); await pg.click('#go'); await pg.evaluate(() => { __coupe.state().next = 999; });
  const box = await pg.locator('#cv').boundingBox(); const [W, H] = await pg.evaluate(() => __coupe.size());
  await pg.evaluate(() => { const [W, H] = __coupe.size(); __coupe.spawnAt(true, W / 2, H / 3); });
  await pg.mouse.move(box.x + W / 2 - 120, box.y + H / 3 + 5); await pg.mouse.down(); await pg.mouse.move(box.x + W / 2 + 120, box.y + H / 3 + 5, { steps: 6 }); await pg.mouse.up();
  assert.ok((await pg.evaluate(() => __coupe.ach())).pouah, 'pouah unlocked again');
  assert.strictEqual(await pg.textContent('#coins2'), '300', 'no second reward');
  assert.deepStrictEqual(errs, []); console.log('beta OK'); await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
