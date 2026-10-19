const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
(async () => { const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 390, height: 800 }, hasTouch: true });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript({ path: __dirname + '/fakeclaude.js' });
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.waitForTimeout(1400);
  // Niveaux : 600 XP pour le niveau 2
  assert.deepStrictEqual(await pg.evaluate(() => __coupe.lvl()), { L: 1, cur: 0, need: 600 });
  // Passe : palier 1 à 600 XP, palier 2 à 1 300 XP, 30 paliers = 61 500 XP
  await pg.evaluate(() => __coupe.passXp(2599)); assert.strictEqual((await pg.evaluate(() => __coupe.pass())).tier, 1);
  await pg.evaluate(() => __coupe.passXp(1)); assert.strictEqual((await pg.evaluate(() => __coupe.pass())).tier, 2);
  await pg.evaluate(() => __coupe.passXp(123000)); assert.strictEqual((await pg.evaluate(() => __coupe.pass())).tier, 30);
  // Passe depuis le profil : le profil se ferme
  await pg.click('#statsBtn'); assert.strictEqual(await pg.textContent('#statsBtn'), '👤'); await pg.evaluate(() => __coupe.openStats('quests')); await pg.click('#openPass');
  assert.ok(await pg.locator('#stats').isHidden(), 'profile closed'); assert.ok(await pg.locator('#passPanel').isVisible(), 'pass open'); await pg.click('#passClose');
  // Titres : sélecteur
  await pg.click('#statsBtn'); await pg.click('[data-tab=me]'); assert.strictEqual(await pg.locator('#titleSel').count(), 1); assert.strictEqual(await pg.locator('[data-title]').count(), 0);
  await pg.screenshot({ path: 'v29-me.png' });
  // Classement : compte claude.ai affiché, pseudo proposé
  await pg.click('[data-tab=lb]'); await pg.waitForTimeout(200); assert.match(await pg.textContent('#statsBody'), /Connecté : Testeur/); assert.strictEqual(await pg.inputValue('#pseudoIn'), 'Testeur');
  await pg.screenshot({ path: 'v29-lb.png' });
  assert.deepStrictEqual(errs, []); console.log('v2.9 OK'); await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
