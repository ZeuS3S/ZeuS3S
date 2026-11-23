const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
(async () => { const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 390, height: 800 }, hasTouch: true });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.evaluate(() => { localStorage.setItem('coupe.tuto', '1'); localStorage.setItem('coupe.seen', '3.10'); localStorage.setItem('coupe.tips', '["dayBtn","modeSeg [data-v=\\"boss\\"]","passBtn","questBtn","statsBtn","pzBtn","shopBtn"]');
    localStorage.setItem('coupe.skins', JSON.stringify(['erable', 'nuit'])); localStorage.setItem('coupe.costumes', JSON.stringify(['aucun', 'sorciere'])); localStorage.setItem('coupe.unlocks', JSON.stringify(['av_🎃'])) }); await pg.reload(); await pg.waitForTimeout(1500);
  // profil : plus d'onglet Défis ; le bouton de l'accueil ouvre les défis seuls
  await pg.click('#statsBtn'); assert.strictEqual(await pg.locator('.tabs [data-tab=quests]').count(), 0); await pg.click('#statsClose');
  await pg.click('#questBtn'); assert.strictEqual(await pg.textContent('#statsTitle'), 'Défis'); assert.strictEqual(await pg.locator('.tabs').isVisible(), false); assert.ok(await pg.locator('.quest').count() > 0);
  await pg.click('#statsBtn'); await pg.waitForTimeout(100); assert.strictEqual(await pg.textContent('#statsTitle'), 'Profil', '👤 from défis opens profile'); await pg.click('#statsClose');
  // boutique : Mes cosmétiques ne montre que ce qu'on possède, et on peut équiper
  await pg.click('#shopBtn'); await pg.click('[data-cat=mine]'); await pg.waitForTimeout(200);
  assert.strictEqual(await pg.locator('[data-skin]').count(), 2); assert.strictEqual(await pg.locator('[data-costume=sorciere]').count(), 1); assert.strictEqual(await pg.locator('[data-costume=lunettes]').count(), 0);
  await pg.click('[data-skin=nuit]'); assert.strictEqual(await pg.evaluate(() => localStorage.getItem('coupe.skin')), 'nuit');
  await pg.click('[data-myav="🎃"]'); assert.strictEqual(await pg.evaluate(() => __coupe.avatar()), '🎃');
  await pg.screenshot({ path: 'v57-mine.png' });
  assert.deepStrictEqual(errs, []); console.log('v5.7 OK'); await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
