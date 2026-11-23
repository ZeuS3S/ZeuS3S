const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
(async () => { const b = await chromium.launch();
  for (const [w, h] of [[390, 800], [1280, 800]]) {
  const pg = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true }); await pg.addInitScript({ path: __dirname + '/opengrp.js' });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + __dirname + '/coupe.html');
  await pg.evaluate(() => { localStorage.setItem('coupe.tuto', '1'); localStorage.setItem('coupe.skins', JSON.stringify(['erable', 'orage'])); localStorage.setItem('coupe.skin', 'orage'); localStorage.setItem('coupe.wallet', JSON.stringify({ coins: 100, earned: 100 })); });
  await pg.reload(); await pg.waitForTimeout(1400);
  // Planche animée : deux images successives différentes
  await pg.click('#go'); await pg.evaluate(() => { const s = __coupe.state(); s.next = 999; s.waveT = 999; });
  const px = () => pg.evaluate(() => { const c = document.getElementById('cv'), g = c.getContext('2d'), d = g.getImageData(0, c.height / 2, c.width, 4).data; let h = 0; for (let i = 0; i < d.length; i += 7) h = (h * 31 + d[i]) | 0; return h });
  const a1 = await px(); let moved = false; for (let i = 0; i < 6 && !moved; i++) { await pg.waitForTimeout(150); moved = (await px()) !== a1 } assert.ok(moved, 'board animates'); await pg.screenshot({ path: `v31-orage-${w}.png` });
  // Musique : choix indépendant du fond
  await pg.click('#pause'); assert.ok(await pg.locator('#trackSel option[value=orage]').count() === 1); assert.ok(await pg.locator('#trackSel option[disabled]').count() >= 3, 'locked tracks listed');
  await pg.selectOption('#trackSel', 'erable'); assert.strictEqual(await pg.evaluate(() => __coupe.curTheme()), 'erable'); await pg.screenshot({ path: `v31-music-${w}.png` }); await pg.click('#home');
  // Effets de coupe : passe premium complet -> Étincelles et Supernova
  await pg.evaluate(() => { const d = new Date(); localStorage.setItem('coupe.pass', JSON.stringify({ id: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, xp: 0, tier: 0, prem: true })); __coupe.passXp(123000); });
  const items = await pg.evaluate(() => JSON.parse(localStorage.getItem('coupe.fx'))); assert.ok(items.includes('etincelles') && items.includes('supernova'), 'fx from pass');
  await pg.click('#shopBtn'); await pg.click('[data-cat=coupe]'); await pg.click('[data-fx=etincelles]'); assert.strictEqual(await pg.evaluate(() => __coupe.fxOn()), 'etincelles'); await pg.click('[data-fx=supernova]'); assert.strictEqual(await pg.evaluate(() => __coupe.fxOn()), 'supernova');
  assert.ok(await pg.locator('[data-fx=petales]').isDisabled()); await pg.screenshot({ path: `v31-fx-${w}.png` }); await pg.click('#statsClose');
  // Coffre de série : 7e jour -> Pétales
  await pg.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - 1); localStorage.removeItem('coupe.chest'); localStorage.setItem('coupe.chestStreak', JSON.stringify({ last: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`, n: 6 })); }); await pg.reload(); await pg.waitForTimeout(1400);
  assert.ok(await pg.locator('#chestBtn.series').count() === 1, 'pink streak chest'); await pg.click('[data-hp=prog]'); await pg.click('#chestBtn'); await pg.evaluate(() => showHome('play')); assert.ok((await pg.evaluate(() => JSON.parse(localStorage.getItem('coupe.fx')))).includes('petales'));
  // Maîtrise : 15 000 fraises -> autocollant doré + 1 500 pièces
  const c0 = await pg.evaluate(() => JSON.parse(localStorage.getItem('coupe.wallet')).coins);
  await pg.evaluate(() => { const st = JSON.parse(localStorage.getItem('coupe.stats') || '{}'); localStorage.setItem('coupe.stats', JSON.stringify({ games: 1, cut: 15000, durians: 0, missed: 0, time: 0, bestCombo: 0, bestStreak: 0, modes: {}, md: {}, powers: {}, history: [], fruits: { '🍓': 15000 } })); __coupe.checkMastery(); });
  assert.ok((await pg.evaluate(() => __coupe.stickers())).or_fraise, 'golden sticker'); assert.ok(await pg.evaluate(() => JSON.parse(localStorage.getItem('coupe.wallet')).coins) >= c0 + 1500, 'silver coins');
  // Collection Agrumes
  await pg.evaluate(() => { const s = JSON.parse(localStorage.getItem('coupe.stickers') || '{}'); s.orange = 1; s.citron = 1; localStorage.setItem('coupe.stickers', JSON.stringify(s)); __coupe.checkColls(); });
  assert.ok((await pg.evaluate(() => JSON.parse(localStorage.getItem('coupe.colls')))).includes('agrumes'));
  await pg.click('#statsBtn'); await pg.click('[data-tab=album]'); assert.match(await pg.textContent('#statsBody'), /Agrumes.*Baies.*Verger tropical.*Légendes.*Or/s); await pg.screenshot({ path: `v31-album-${w}.png` });
  // Défis de saison
  const ids = await pg.evaluate(() => __coupe.seasonQuests()); assert.strictEqual(ids.length, 10);
  await pg.evaluate(() => __coupe.seasonProgress({ mode: 'vagues', wave: 30, cut: 16000, cherries: 120, grenades: 20, score: 9000, bestCombo: 12, bestStreak: 200, durians: 0, real: 300, fruits: { '🥥': 400, '🥭': 20 }, powers: { ice: 200 } }));
  assert.ok((await pg.evaluate(() => __coupe.loadSQ())).done.length >= 6, 'season quests progress');
  await pg.evaluate(() => __coupe.openStats('quests')); assert.match(await pg.textContent('#statsBody'), /Défis de saison/); await pg.locator('text=Défis de saison').scrollIntoViewIfNeeded(); await pg.screenshot({ path: `v31-season-${w}.png` });
  // Avatar + prestige
  await pg.evaluate(() => __coupe.openStats('me')); await pg.click('#avEdit'); assert.ok(await pg.locator('[data-av="👑"]').isDisabled());
  await pg.click('[data-av="🍊"]'); assert.strictEqual(await pg.evaluate(() => __coupe.avatar()), '🍊');
  await pg.evaluate(() => localStorage.setItem('coupe.xp', '9000000')); await pg.click('[data-tab=ach]'); await pg.evaluate(() => __coupe.openStats('me'));
  await pg.click('#prestBtn'); await pg.click('#prestBtn'); assert.strictEqual(await pg.evaluate(() => __coupe.prestige()), 1); assert.strictEqual(await pg.evaluate(() => __coupe.lvl().L), 1);
  await pg.screenshot({ path: `v31-me-${w}.png` }); await pg.click('#statsClose'); await pg.click('#pause'); assert.ok(await pg.locator('#trackSel option[value=epopee]').count() === 1, 'epic music unlocked'); await pg.click('#close');
  // Supernova en jeu
  await pg.click('#go'); await pg.evaluate(() => { const s = __coupe.state(); s.next = 999; s.waveT = 999; const [W, H] = __coupe.size(); __coupe.spawnAt(false, W / 2, H / 3); });
  const box = await pg.locator('#cv').boundingBox(); const [W, H] = await pg.evaluate(() => __coupe.size()); await pg.mouse.move(box.x + W / 2 - 120, box.y + H / 3); await pg.mouse.down(); await pg.mouse.move(box.x + W / 2 + 120, box.y + H / 3, { steps: 5 }); await pg.mouse.up();
  await pg.waitForTimeout(60); await pg.screenshot({ path: `v31-nova-${w}.png` });
  assert.deepStrictEqual(errs, []); console.log('v3.1 OK', w); await pg.close(); }
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
