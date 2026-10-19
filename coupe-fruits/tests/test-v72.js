const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
const TIPS = '["dayBtn","modeSeg [data-v=\\"boss\\"]","passBtn","questBtn","statsBtn","pzBtn","shopBtn","boostBtn"]';
async function at(b, iso, ls = {}) { const pg = await b.newPage({ viewport: { width: 390, height: 800 }, hasTouch: true }); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message));
  await pg.addInitScript(iso => { const D = Date; const t = new D(iso).getTime(), off = t - D.now(); window.Date = class extends D { constructor(...a) { super(...(a.length ? a : [D.now() + off])) } static now() { return D.now() + off } } }, iso);
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.evaluate(([ls, tips]) => { localStorage.setItem('coupe.tuto', '1'); localStorage.setItem('coupe.seen', VERSION); localStorage.setItem('coupe.tips', tips); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v) }, [ls, TIPS]);
  await pg.reload(); await pg.waitForTimeout(2000); return pg }
(async () => { const b = await chromium.launch();
  // novembre : pommes et passe de la Récolte
  let pg = await at(b, '2026-11-12T15:00:00', { 'coupe.apples': JSON.stringify({ y: 2026, n: 80 }), 'coupe.pumpk': JSON.stringify({ y: 2026, n: 999 }) });
  assert.ok(!(await pg.evaluate(() => document.body.classList.contains('hallo'))), 'no Halloween theme in November');
  assert.match(await pg.textContent('#halloBox'), /Passe de la Récolte · palier 4\/15/); await pg.screenshot({ path: 'v72-home.png' });
  assert.ok(await pg.evaluate(() => unlocks().includes('av_🍁') && unlocks().includes('frame_feuilles')), 'tiers 3 and 4 granted');
  assert.ok(await pg.evaluate(() => !unlocks().includes('av_👻')), 'Halloween pumpkins do not count in November');
  await pg.click('[data-hp=prog]'); await pg.click('#halloBox'); await pg.evaluate(() => showHome('play')); await pg.waitForTimeout(300); assert.match(await pg.textContent('#passTitle'), /Passe de la Récolte/); assert.match(await pg.textContent('[data-pt=hallo]'), /Récolte/);
  assert.strictEqual(await pg.locator('.hpr').count(), 15); const t = await pg.textContent('#hpBox'); for (const s of ['Jus Cidre', 'Bannière Moisson', 'Traînée de feuilles', 'Planche Forêt d’automne', 'Musique Récolte', 'Titre Cueilleur d’or', 'Pseudo cuivré', 'Avatar 🌰', '80 pommes']) assert.ok(t.includes(s), s);
  await pg.screenshot({ path: 'v72-pass.png' });
  // des pommes tombent, et en couper fait avancer le passe
  assert.ok(await pg.evaluate(() => { let n = 0; for (let i = 0; i < 3000; i++) { const k = (() => { const r = Math.random; return curEv().fruit })(); if (k.e === '🍎') n++ } return n > 0 }));
  await pg.evaluate(() => { addPumpkins(250) }); assert.ok(await pg.evaluate(() => unlocks().includes('trail_feuilles') && ownedSkins().includes('foret') === false || unlocks().includes('trail_feuilles')));
  assert.ok(await pg.evaluate(() => JSON.parse(localStorage.getItem('coupe.juices')).includes('cidre')), 'cider juice');
  await pg.evaluate(() => addPumpkins(400)); assert.ok(await pg.evaluate(() => unlocks().includes('av_🌰') && unlocks().includes('music_recolte') && unlocks().includes('ncol_cuivre') && JSON.parse(localStorage.getItem('coupe.skins')).includes('foret')), 'all tiers');
  assert.ok(await pg.evaluate(() => gotTitles().some(t => t.id === 'cueilleur') || TITLES.find(t => t.id === 'cueilleur').ok()), 'title');
  assert.deepStrictEqual(pg.errs, []); await pg.close();
  // décembre : aucun passe d'événement, pas de bandeau
  pg = await at(b, '2026-12-05T15:00:00'); assert.ok(await pg.isHidden('#halloBox')); await pg.evaluate(() => addPumpkins(50)); assert.deepStrictEqual(pg.errs, []); await pg.close();
  // octobre : Halloween inchangé
  pg = await at(b, '2026-10-20T15:00:00', { 'coupe.pumpk': JSON.stringify({ y: 2026, n: 50 }) }); assert.match(await pg.textContent('#halloBox'), /Passe d’Halloween · palier 3\/15/); assert.deepStrictEqual(pg.errs, []);
  console.log('v7.2 Récolte OK'); await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
