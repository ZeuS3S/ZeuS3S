const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
const TIPS = '["dayBtn","modeSeg [data-v=\\"boss\\"]","passBtn","questBtn","statsBtn","pzBtn","shopBtn","boostBtn"]';
async function open(b, ls = {}, o = {}) { const pg = await b.newPage({ viewport: { width: o.w || 390, height: 800 }, hasTouch: true }); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message));
  if (o.wx) await pg.addInitScript(w => { window.__wx = w }, o.wx);
  if (o.seed) { await pg.addInitScript({ path: __dirname + '/fakeclaude.js' }); await pg.addInitScript(seed => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1'); const d = new Date(), cur = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const db = {}; for (const [k, v] of Object.entries(seed)) db[k] = k.startsWith('scores/') ? { season: cur, best: {}, ...v } : v; sessionStorage.setItem('fakedb', JSON.stringify(db)) }, o.seed) }
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.evaluate(([ls, tips]) => { localStorage.setItem('coupe.tuto', '1'); localStorage.setItem('coupe.seen', VERSION); localStorage.setItem('coupe.tips', tips); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v) }, [ls, TIPS]);
  await pg.reload(); await pg.waitForTimeout(1200); return pg }
const cut = (pg, e) => pg.evaluate(e => { const k = FRUITS.find(f => f.e === e) || e; const it = spawn(k, 200, 300, 0, 0); it.vy = 0; strokeId++; sliceSeg(100, 300, 300, 300); return it.cut }, e);
(async () => { const b = await chromium.launch(); let pg;
  // ===== quête météo + lame saisonnière =====
  pg = await open(b, {}, { wx: 'neige' }); await pg.evaluate(() => localStorage.setItem('coupe.wxs', JSON.stringify({ k: seaKey(), n: 4 })));
  await pg.click('#wxBtn'); await pg.waitForTimeout(300); assert.match(await pg.textContent('body'), /Quête : Brise 10 fruits glacés \(0\/10\)/);
  await pg.click('#go'); await pg.waitForTimeout(300); const c0 = await pg.evaluate(() => W$().coins);
  const r = await pg.evaluate(() => { items = []; for (let i = 0; i < 10; i++) { const it = spawn(iceOf(FRUITS[0]), 200, 300, 0, 0); it.vy = 0; strokeId++; sliceSeg(100, 300, 300, 300); strokeId++; it.hitT = 0; sliceSeg(100, it.y, 300, it.y) } wxqAdd('pluie'); return wxq() });
  assert.deepStrictEqual([r.n, r.done], [10, 1]); assert.ok(await pg.evaluate(c0 => W$().coins - c0 >= 100, c0), 'quest coins');
  const sb = await pg.evaluate(() => [sBlades(), BLADES.find(b => b.sea === SEAS[seaOf(new Date().getMonth())][0]).id]); assert.deepStrictEqual(sb[0], [sb[1]], 'seasonal blade');
  await pg.evaluate(() => { S.running = false }); await pg.reload(); await pg.waitForTimeout(800); await pg.click('#shopBtn'); await pg.waitForTimeout(200); await pg.evaluate(() => __coupe.setShop('coupe'));
  await pg.waitForTimeout(200);
  assert.ok(!(await pg.isDisabled(`[data-blade="${sb[1]}"]`)), 'season blade usable'); const other = ['s_hiver', 's_printemps', 's_ete', 's_automne'].find(x => x !== sb[1]);
  assert.match(await pg.textContent(`[data-blade="${other}"]`), /🔒 Seulement/); await pg.screenshot({ path: 'v80-blades.png' }); assert.deepStrictEqual(pg.errs, []); await pg.close();

  // ===== talents =====
  pg = await open(b); assert.strictEqual(await pg.evaluate(() => talPts()), 0, 'starts at 0'); await pg.evaluate(() => { let x = 0; while (lvlInfo(x).L < 9) x += 50; localStorage.setItem('coupe.xp', x) }); assert.strictEqual(await pg.evaluate(() => talPts()), 0, 'levels give no points by themselves');
  await pg.evaluate(() => { const r = Math.random; Math.random = () => 0; talDrop(.04, 'En fin de partie'); talDrop(.04, 'En fin de partie'); Math.random = () => .99; talDrop(.5, 'x'); Math.random = r; talDrop(1, 'En montant de niveau') }); assert.strictEqual(await pg.evaluate(() => talFrag()), 3, 'fragments'); await pg.evaluate(() => localStorage.setItem('coupe.talpts', '3')); await pg.reload(); await pg.waitForTimeout(800);
  assert.strictEqual(await pg.evaluate(() => talPts()), 3);
  await pg.click('#statsBtn'); await pg.waitForTimeout(300); await pg.click('[data-tal=aimant]'); await pg.click('[data-tal=aimant]'); await pg.click('[data-tal=xp]');
  assert.deepStrictEqual(await pg.evaluate(() => { const t = talents(); return [t.or, t.xp, t.aimant, t.coffre] }), [0, 1, 2, 0]); assert.ok(await pg.isDisabled('[data-tal=or]'), 'no points left'); assert.match(await pg.textContent('#statsBody'), /0 point libre/);
  assert.ok(Math.abs(await pg.evaluate(() => xpMult()) - 1.05) < 1e-9); await pg.locator('.tal').first().scrollIntoViewIfNeeded(); await pg.screenshot({ path: 'v80-tal.png' });
  await pg.click('#statsClose'); await pg.click('#go'); await pg.waitForTimeout(300); const k0 = await pg.evaluate(() => W$().coins);
  await pg.evaluate(() => { const it = spawn(COIN, 200, 300, 0, 0); it.vy = 0; strokeId++; sliceSeg(100, 300, 300, 300) }); assert.strictEqual(await pg.evaluate(k0 => W$().coins - k0, k0), 5, 'magnet talent +2');
  await pg.evaluate(() => { localStorage.setItem('coupe.talents', JSON.stringify({ or: 3, xp: 3 })) }); assert.ok(await pg.evaluate(() => Object.values(talents()).every(v => v === 0)), 'overspent resets');
  assert.deepStrictEqual(pg.errs, []); await pg.close();
  // ===== commandes : faisables et de plus en plus longues =====
  pg = await open(b); const ords = await pg.evaluate(() => Array.from({ length: CAR_N }, (_, i) => carOrder(i + 1))), base = await pg.evaluate(() => BASE.map(f => f.e)); assert.ok(ords.every(o => Object.keys(o.o).every(e => base.includes(e)) && o.time > 10 && o.cl), 'orders valid');
  assert.ok(Object.values(ords[59].o).reduce((a, b) => a + b) > Object.values(ords[0].o).reduce((a, b) => a + b) * 5); await pg.close();

  // ===== Carrière =====
  pg = await open(b, { 'coupe.opts': JSON.stringify({ mode: 'zen', diff: 'facile' }) }); await pg.click('#pzBtn'); await pg.click('[data-pt2=car]'); await pg.waitForTimeout(200); assert.match(await pg.textContent('#pzTitle'), /Carrière/); assert.ok(await pg.isHidden('#pzGrid'));
  assert.strictEqual(await pg.locator('[data-car]').count(), 5); assert.strictEqual(await pg.locator('[data-cw]:not([disabled])').count(), 1, 'only first place open'); assert.strictEqual(await pg.locator('[data-car]:not([disabled])').count(), 1); await pg.screenshot({ path: 'v80-car.png' });
  await pg.click('[data-car="1"]'); await pg.waitForTimeout(300);
  let st = await pg.evaluate(() => [S.career, mode, diff, S.timeLeft > 10, hasLives(), S.carO.o]); assert.deepStrictEqual(st.slice(0, 5), [1, 'classique', 'normal', true, true]);
  for (const [e, n] of Object.entries(st[5])) for (let i = 0; i < n; i++) await cut(pg, e);
  await pg.waitForTimeout(1600); assert.strictEqual(await pg.textContent('#overTitle'), 'Commande livrée !'); assert.strictEqual(await pg.evaluate(() => carProgress()[1]), 3); assert.ok(await pg.isVisible('#nextLvl'));
  await pg.screenshot({ path: 'v80-carwin.png' });
  await pg.click('#nextLvl'); await pg.waitForTimeout(300); assert.strictEqual(await pg.evaluate(() => S.career), 2);
  await pg.evaluate(() => { S.timeLeft = .05 }); await pg.waitForTimeout(1600); assert.strictEqual(await pg.textContent('#overTitle'), 'Commande ratée');
  await pg.click('#again'); await pg.waitForTimeout(300); assert.strictEqual(await pg.evaluate(() => S.career), 2); await pg.evaluate(() => { S.lives = 0; end() }); await pg.waitForTimeout(1600);
  assert.match(await pg.textContent('#overMsg'), /Plus de vies/); await pg.click('#change'); await pg.waitForTimeout(300); assert.ok(await pg.isVisible('#carList')); assert.deepStrictEqual(await pg.evaluate(() => [mode, diff]), ['zen', 'facile'], 'mode restored');
  assert.strictEqual(await pg.evaluate(() => localStorage.getItem('coupe.best.classique.normal')), null, 'no record from career');
  await pg.evaluate(() => localStorage.setItem('coupe.career', JSON.stringify({ 1: 3, 2: 2, 3: 1, 4: 1 }))); await pg.click('#pzClose'); await pg.click('#pzBtn'); assert.ok(await pg.isVisible('#carList'), 'remembers tab'); await pg.click('[data-car="5"]'); await pg.waitForTimeout(300);
  const c5 = await pg.evaluate(() => W$().coins), o5 = await pg.evaluate(() => S.carO.o); for (const [e, n] of Object.entries(o5)) for (let i = 0; i < n; i++) await cut(pg, e);
  await pg.waitForTimeout(1600); assert.ok(await pg.evaluate(c5 => W$().coins - c5 >= 150, c5), 'chapter reward'); assert.deepStrictEqual(pg.errs, []); await pg.close();

  // ===== badges de clan =====
  const seed = { 'clans/u_test': { name: 'Les Kiwis', tag: 'KIWI', color: '#2f9e5b', code: 'KIWI-1234', owner: 'u_test', at: 1 }, 'scores/u_test': { name: 'Moi', clan: 'u_test', cx: 30000 }, 'scores/u_b': { name: 'Bob', clan: 'u_test', cx: 30000, wk: { w: 0, n: 50 } } };
  pg = await open(b, { 'coupe.clan': 'u_test', 'coupe.cx': '30000', 'coupe.pseudo': 'Moi' }, { seed });
  await pg.evaluate(async () => { const d = await window.claude.use('db'); await d.doc('scores/u_b').update({ wk: { w: weekIdx(), n: 50 } }); localStorage.setItem('coupe.wkcut', JSON.stringify({ w: weekIdx(), n: 10 })) }).catch(() => {});
  await pg.click('#clanBtn'); await pg.waitForTimeout(600);
  const on = await pg.$$eval('.cbg:not(.off)', e => e.map(x => x.textContent)); assert.ok(on.includes('⭐ Niveau 5'), on.join()); assert.ok(!on.includes('💎 Niveau 10'));
  assert.match(await pg.textContent('.cbadges b'), /Badges · \d \/ 7/); await pg.locator('.cbadges').scrollIntoViewIfNeeded(); await pg.screenshot({ path: 'v80-badges.png' });
  await pg.click('[data-csub=top]'); await pg.waitForTimeout(200); assert.match(await pg.textContent('.cbi'), /⭐/); assert.deepStrictEqual(pg.errs, []); await pg.close();

  // ===== accueil : le dock à 6 boutons tient à 320 px =====
  pg = await open(b, {}, { w: 320 }); const dk = await pg.evaluate(() => [...document.querySelectorAll('.dock button')].map(x => { const r = x.getBoundingClientRect(); return [r.width | 0, x.scrollWidth <= x.clientWidth + 1] }));
  assert.strictEqual(dk.length, 5); assert.ok(dk.every(d => d[0] >= 36 && d[1]), JSON.stringify(dk)); await pg.screenshot({ path: 'v80-home320.png' }); await pg.close();
  await b.close(); console.log('v80 OK') })().catch(e => { console.error(e); process.exit(1) });
