const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
(async () => { const b = await chromium.launch();
  for (const [w, h] of [[390, 800], [1280, 800]]) {
  const pg = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true }); await pg.addInitScript({ path: __dirname + '/opengrp.js' });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + __dirname + '/coupe.html');
  await pg.evaluate(() => { localStorage.setItem('coupe.tuto', '1'); localStorage.setItem('coupe.wallet', JSON.stringify({ coins: 5000, earned: 5000 })); }); await pg.reload(); await pg.waitForTimeout(1400);
  // Accueil : tient sans défiler
  const fit = await pg.evaluate(() => { const c = document.querySelector('#start .card'); return c.scrollHeight <= c.clientHeight + 1 }); assert.ok(fit, 'start card fits');
  await pg.screenshot({ path: `v26-start-${w}.png` });
  // Réglages : pas de doublons, interrupteurs, fermer
  await pg.click('#pause'); assert.ok(await pg.locator('#close').isVisible()); assert.ok(await pg.locator('#gameBtns').isHidden());
  await pg.click('#cb'); assert.strictEqual(await pg.getAttribute('#cb', 'aria-pressed'), 'true');
  assert.strictEqual(await pg.locator('#menu button:has-text("Musique")').count(), 0, 'no music toggle duplicate');
  await pg.screenshot({ path: `v26-settings-${w}.png` }); await pg.click('#close'); assert.ok(await pg.locator('#menu').isHidden());
  // Passe : achat premium, récompenses rétroactives
  await pg.evaluate(() => __coupe.passXp(21200)); await pg.click('#passBtn'); assert.strictEqual(await pg.textContent('#passTier'), '10');
  await pg.click('#buyPrem'); assert.match(await pg.textContent('#buyPrem'), /Confirmer/); await pg.click('#buyPrem');
  assert.match(await pg.textContent('#passPrem'), /Premium actif/);
  const p = await pg.evaluate(() => __coupe.pass()); assert.ok(p.prem && p.got.length === 10);
  assert.ok((await pg.evaluate(() => JSON.parse(localStorage.getItem('coupe.costumes')))).includes('toque'));
  await pg.evaluate(() => __coupe.passXp(18000)); assert.ok((await pg.evaluate(() => JSON.parse(localStorage.getItem('coupe.passItems')))).includes('aurore'), 'tier 15 exclusive');
  await pg.waitForTimeout(200); await pg.screenshot({ path: `v26-pass-${w}.png` }); await pg.click('#passClose');
  // Relances : 2 par jour
  await pg.click('#questBtn'); const d0 = await pg.evaluate(() => __coupe.dailyIdx()), w0 = await pg.evaluate(() => __coupe.weekIds());
  await pg.click('[data-reroll="daily"]'); assert.notStrictEqual(await pg.evaluate(() => __coupe.dailyIdx()), d0, 'daily changed');
  await pg.click(`[data-reroll="${w0[0]}"]`); const w1 = await pg.evaluate(() => __coupe.weekIds()); assert.notStrictEqual(w1[0], w0[0]); assert.strictEqual(w1[1], w0[1]);
  assert.strictEqual(await pg.evaluate(() => __coupe.rerollsLeft()), 0); assert.ok(await pg.locator('[data-reroll]').first().isDisabled());
  await pg.reload(); await pg.waitForTimeout(1400); assert.deepStrictEqual(await pg.evaluate(() => __coupe.weekIds()), w1, 'reroll persists');
  await pg.click('#questBtn'); await pg.screenshot({ path: `v26-quests-${w}.png` });
  // Profil : 5 onglets, boutique à part
  assert.strictEqual(await pg.locator('.tabs [role=tab]').count(), 5); await pg.evaluate(() => __coupe.openStats('me')); await pg.screenshot({ path: `v26-me-${w}.png` });
  await pg.click('#statsClose'); await pg.click('#shopBtn'); assert.ok(await pg.locator('.tabs').isHidden()); assert.strictEqual(await pg.textContent('#statsTitle'), 'Boutique');
  // Pas de barre de défilement visible
  assert.strictEqual(await pg.evaluate(() => getComputedStyle(document.querySelector('.card')).scrollbarWidth), 'none');
  assert.deepStrictEqual(errs, []); console.log('v2.6 OK', w); await pg.close(); }
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
