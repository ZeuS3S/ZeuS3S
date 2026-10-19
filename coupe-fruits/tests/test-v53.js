const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
async function endGame(pg, pumps) { await pg.click('#go'); await pg.evaluate(p => { const s = __coupe.state(); s.next = 999; s.fruits['🎃'] = p }, pumps);
  const box = await pg.locator('#cv').boundingBox(); const [W, H] = await pg.evaluate(() => __coupe.size());
  for (let i = 0; i < 3; i++) { await pg.evaluate(() => { const [W, H] = __coupe.size(); __coupe.spawnAt(true, W / 2, H / 3) }); await pg.mouse.move(box.x + W / 2 - 120, box.y + H / 3); await pg.mouse.down(); await pg.mouse.move(box.x + W / 2 + 120, box.y + H / 3, { steps: 5 }); await pg.mouse.up(); await pg.waitForTimeout(150) }
  await pg.waitForTimeout(2500); await pg.click('#change'); await pg.waitForTimeout(200) }
(async () => { const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 390, height: 800 }, hasTouch: true });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(() => { const D = Date; const t = new D('2026-10-20T15:00:00').getTime(), off = t - D.now(); window.Date = class extends D { constructor(...a) { super(...(a.length ? a : [D.now() + off])) } static now() { return D.now() + off } } });
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.evaluate(() => { localStorage.setItem('coupe.tuto', '1'); localStorage.setItem('coupe.seen', '3.10'); localStorage.setItem('coupe.tips', '["dayBtn","modeSeg [data-v=\\"boss\\"]","passBtn","questBtn","statsBtn","pzBtn","shopBtn"]'); localStorage.setItem('coupe.pumpk', JSON.stringify({ y: 2026, n: 40 })) }); await pg.reload(); await pg.waitForTimeout(2200);
  // citrouilles déjà coupées avec l'ancien système : les paliers 1 et 2 sont rattrapés au chargement
  assert.ok(await pg.evaluate(() => document.body.classList.contains('hallo')));
  assert.match(await pg.textContent('#halloBox'), /palier 2\/15/);
  assert.ok(await pg.evaluate(() => JSON.parse(localStorage.getItem('coupe.wallet')).coins >= 200), 'tier 1 coins');
  await pg.screenshot({ path: 'v53-home.png' });
  // le bandeau ouvre le passe d'Halloween
  await pg.click('[data-hp=prog]'); await pg.click('#halloBox'); await pg.evaluate(() => showHome('play')); await pg.waitForTimeout(300); assert.ok(await pg.locator('#hpBox').isVisible()); assert.strictEqual(await pg.locator('.hpr').count(), 15);
  assert.strictEqual(await pg.locator('#passTrack').isVisible(), false); assert.match(await pg.textContent('.hpr.cur'), /Avatar 🎃/);
  await pg.screenshot({ path: 'v55-hpass.png' });
  await pg.click('[data-pt=main]'); assert.ok(await pg.locator('#passTrack').isVisible()); assert.strictEqual(await pg.locator('#hpBox').isVisible(), false);
  // tout le passe de saison d'un coup
  await pg.click('#bpAll'); assert.ok(await pg.evaluate(() => document.getElementById('passTrack').classList.contains('all')));
  const last = await pg.locator('#passTrack .tn >> nth=29').boundingBox(); assert.ok(last && last.width > 0, 'tier 30 rendered in list');
  await pg.screenshot({ path: 'v55-all.png' }); await pg.click('#bpAll'); await pg.click('#passClose');
  // une partie avec 10 citrouilles : palier 3 (avatar 🎃)
  await endGame(pg, 10); assert.ok(await pg.evaluate(() => JSON.parse(localStorage.getItem('coupe.unlocks')).includes('av_🎃')));
  assert.match(await pg.textContent('#halloBox'), /palier 3\/15/);
  // fin du passe : toutes les récompenses
  await pg.evaluate(() => localStorage.setItem('coupe.pumpk', JSON.stringify({ y: 2026, n: 699 }))); await endGame(pg, 1);
  const st = await pg.evaluate(() => ({ sk: JSON.parse(localStorage.getItem('coupe.skins')), ju: JSON.parse(localStorage.getItem('coupe.juices')), co: JSON.parse(localStorage.getItem('coupe.costumes')), un: JSON.parse(localStorage.getItem('coupe.unlocks')), t: __coupe.titles() }));
  assert.ok(st.sk.includes('hante') && st.ju.includes('potion') && st.co.includes('sorciere') && st.un.includes('av_👻') && st.t.includes('citrouille'), JSON.stringify(st));
  await pg.click('#shopBtn'); assert.strictEqual(await pg.locator('[data-skin=hante]').count(), 1); await pg.evaluate(() => __coupe.setShop('durian')); assert.strictEqual(await pg.locator('[data-costume=sorciere]').count(), 1); await pg.click('#statsClose');
  assert.deepStrictEqual(errs, []); console.log('v5.5 halloween pass OK'); await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
