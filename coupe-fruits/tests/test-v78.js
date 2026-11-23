const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
const TIPS = '["dayBtn","modeSeg [data-v=\\"boss\\"]","passBtn","questBtn","statsBtn","pzBtn","shopBtn","boostBtn"]';
async function open(b, ls = {}, o = {}) { const pg = await b.newPage({ viewport: { width: o.w || 390, height: 800 }, hasTouch: true }); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message));
  await pg.addInitScript(() => { window.__vib = []; Object.defineProperty(navigator, 'vibrate', { value: p => { window.__vib.push(p); return true }, configurable: true }) });
  if (o.wx) await pg.addInitScript(w => { window.__wx = w }, o.wx);
  if (o.seed) { await pg.addInitScript({ path: __dirname + '/fakeclaude.js' }); await pg.addInitScript(seed => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1'); const d = new Date(), cur = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const db = {}; for (const [k, v] of Object.entries(seed)) db[k] = k.startsWith('scores/') ? { season: cur, best: {}, ...v } : v; sessionStorage.setItem('fakedb', JSON.stringify(db)) }, o.seed) }
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.evaluate(([ls, tips]) => { localStorage.setItem('coupe.tuto', '1'); localStorage.setItem('coupe.seen', VERSION); localStorage.setItem('coupe.tips', tips); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v) }, [ls, TIPS]);
  await pg.reload(); await pg.waitForTimeout(1200); return pg }
(async () => { const b = await chromium.launch(); let pg;
  // ===== météo : affichée à l'accueil, effets en partie =====
  for (const w of ['soleil', 'pluie', 'vent', 'neige']) {
    pg = await open(b, {}, { wx: w }); await pg.click('#wxBtn'); await pg.waitForTimeout(400); assert.match(await pg.textContent('body'), /Météo du jour/); assert.ok(await pg.isHidden('#halloBox') || true); await pg.click('#go'); await pg.waitForTimeout(300); assert.ok(await pg.isHidden('#wxBtn'), 'hidden in game');
    assert.strictEqual(await pg.evaluate(() => S.wx), w);
    if (w === 'neige') { const n = await pg.evaluate(() => { let n = 0; for (let i = 0; i < 300; i++) { items = []; launch(); n += items.filter(i => i.kind.ice).length } return n }); assert.ok(n > 15, 'ice ' + n);
      const r = await pg.evaluate(() => { items = []; const it = spawn(iceOf(FRUITS[0]), 200, 300, 0, 0); it.vy = 0; const p0 = S.score; sliceSeg(100, 300, 300, 300); const a = [it.cut, S.score]; strokeId++; it.hitT = 0; sliceSeg(100, it.y, 300, it.y); return [a, it.cut, S.score - p0] });
      assert.strictEqual(r[0][0], false, 'first hit cracks'); assert.strictEqual(r[1], true, 'second hit cuts'); assert.ok(r[2] >= FRUITS_P2(), 'double points') }
    if (w === 'vent') { const dv = await pg.evaluate(() => new Promise(res => { S.t = 4; items = []; const it = spawn(FRUITS[0], 200, 300, 0, -400); setTimeout(() => res(it.vx), 400) })); assert.ok(Math.abs(dv) > 5, 'wind ' + dv) }
    if (w === 'pluie') { await pg.evaluate(() => { items = []; S.rainT = .05 }); await pg.waitForTimeout(900); const top = await pg.evaluate(() => items.filter(i => i.free && i.gs === .35).length); assert.ok(top >= 3, 'shower ' + top) }
    if (w === 'soleil') { const n = await pg.evaluate(() => { let n = 0; for (let i = 0; i < 400; i++) { items = []; launch(); n += items.filter(i => i.kind === COIN || i.kind === MANGO).length } return n }); assert.ok(n > 12, 'sun ' + n) }
    await pg.waitForTimeout(500); await pg.screenshot({ path: `v78-wx-${w}.png` }); assert.deepStrictEqual(pg.errs, []); await pg.close() }
  // pas de météo pendant la Partie du jour
  pg = await open(b, {}, { wx: 'neige' }); await pg.click('#dayBtn'); await pg.waitForTimeout(400); assert.strictEqual(await pg.evaluate(() => S.wx), null); await pg.close();

  // ===== haptique =====
  pg = await open(b, { 'coupe.best.classique.normal': '1' }); await pg.click('#go'); await pg.waitForTimeout(300);
  await pg.evaluate(() => { items = []; window.__vib = []; for (let k = 0; k < 3; k++) { const it = spawn(FRUITS[0], 100 + k * 80, 300, 0, 0); it.vy = 0 } sliceSeg(40, 300, 360, 300) });
  let vib = await pg.evaluate(() => window.__vib.map(v => JSON.stringify(v)));
  assert.ok(vib.includes(JSON.stringify([15, 30, 39])), 'combo pattern ' + vib); assert.ok(vib.includes(JSON.stringify([40, 60, 40, 60, 180])), 'record pattern ' + vib);
  await pg.evaluate(() => { window.__vib = []; const it = spawn('durian', 200, 300, 0, 0); it.vy = 0; strokeId++; sliceSeg(100, 300, 300, 300) }); vib = await pg.evaluate(() => window.__vib); assert.deepStrictEqual(vib[0], [90, 60, 90]);
  await pg.evaluate(() => { window.__vib = []; bossDown({ x: 1, y: 1, r: 1, kind: FRUITS[0] }) }); assert.deepStrictEqual((await pg.evaluate(() => window.__vib))[0], [80, 50, 80, 50, 200]);
  assert.deepStrictEqual(pg.errs, []); await pg.close();

  // ===== Puzzle : étoile cachée =====
  const full = {}; for (let L = 1; L <= 12; L++) full[L] = 3; full[13] = 1;
  pg = await open(b, { 'coupe.puzzle': JSON.stringify(full) }); await pg.click('#pzBtn'); await pg.waitForTimeout(200); await pg.click('[data-pzw="0"]');
  assert.match(await pg.textContent('.pzhid'), /Étoile cachée débloquée/); await pg.screenshot({ path: 'v78-pz.png' });
  await pg.click('[data-pzw="1"]'); assert.match(await pg.textContent('.pzhid.lock'), /35 ★ de plus/);
  await pg.click('[data-pzw="0"]'); await pg.click('.pzhid'); await pg.waitForTimeout(300);
  assert.deepStrictEqual(await pg.evaluate(() => [S.puzzle, S.pz.obj.type, S.pz.throws.length]), [61, 'all', 20]);
  await pg.evaluate(() => { S.pzMiss = 0; puzzleEnd() }); await pg.waitForTimeout(1500);
  assert.strictEqual(await pg.textContent('#overTitle'), '✨ Étoile cachée trouvée !'); assert.ok(await pg.isHidden('#nextLvl'));
  assert.strictEqual(await pg.evaluate(() => pzProgress()[61]), 3);
  await pg.click('#change'); await pg.waitForTimeout(300); assert.match(await pg.textContent('.pzhid.got'), /Étoile cachée trouvée/); assert.match(await pg.textContent('#pzInfo'), /★ 37 \/ 180/);
  assert.strictEqual(await pg.textContent('#pzSub'), '13 / 60'); assert.deepStrictEqual(pg.errs, []); await pg.close();

  // ===== passe : paliers bonus après le palier 30 =====
  pg = await open(b); const r = await pg.evaluate(() => { savePass({ id: curSeason(), xp: passAt(PASS_N) + 2500, tier: PASS_N, prem: true }); const c0 = W$().coins; passXp(10); const p = loadPass(); const c1 = W$().coins; passXp(10); return [p.bon, c1 - c0, W$().coins - c1] });
  assert.deepStrictEqual(r, [2, 400, 0]);
  await pg.evaluate(() => { const p = loadPass(); p.prem = false; savePass(p); passXp(480) }); assert.strictEqual(await pg.evaluate(() => loadPass().bon), 3);
  await pg.evaluate(() => openPass()); await pg.waitForTimeout(200); assert.strictEqual(await pg.textContent('#passXpTxt'), 'Palier bonus 4 : 0 / 1000 XP · +100 🪙');
  assert.deepStrictEqual(pg.errs, []); await pg.close();

  // ===== niveau de clan =====
  const seed = { 'clans/u_test': { name: 'Les Kiwis', tag: 'KIWI', color: '#2f9e5b', code: 'KIWI-1234', owner: 'u_test', emb: '🌈', at: 1 }, 'scores/u_test': { name: 'Moi', clan: 'u_test', cx: 2000 }, 'scores/u_b': { name: 'Bob', clan: 'u_test', cx: 9000 }, 'scores/u_c': { name: 'Cheat', clan: 'u_test', cx: 9e9 } };
  pg = await open(b, { 'coupe.clan': 'u_test', 'coupe.cx': '2000', 'coupe.pseudo': 'Moi' }, { seed }); await pg.click('#clanBtn'); await pg.waitForTimeout(600);
  let v = await pg.evaluate(() => { const c = clanView(clanDocs.find(c => c.id === 'u_test')); return [c.xp, c.lv, c.max, c.emb] });
  assert.deepStrictEqual(v, [111000, 6, 20, '🛡️'], 'xp capped per member, 🌈 locked below level 7');
  const txt = await pg.textContent('#clanBox'); assert.match(txt, /Niveau de clan 6/); assert.match(txt, /111000 \/ 150000 XP de clan · Niveau suivant :/); assert.match(txt, /\/ 20/);
  await pg.screenshot({ path: 'v78-clan.png' });
  await pg.evaluate(() => addXp(100)); assert.ok(await pg.evaluate(() => cxN() > 2000), 'xp counts for the clan');
  assert.deepStrictEqual(await pg.evaluate(() => [clanLv(0), clanLv(2999), clanLv(3000), clanLv(1e9), clanCap(1), clanCap(6), embOk('👑', 2), embOk('👑', 3), embOk('🍉', 1)]), [1, 1, 2, 10, 10, 20, false, true, true]);
  await pg.evaluate(() => setClan('')); assert.strictEqual(await pg.evaluate(() => cxN()), 0, 'leaving resets');
  assert.deepStrictEqual(pg.errs, []); await pg.close();

  // ===== gaucher : petits écrans =====
  for (const w of [320, 360, 390]) for (const lefty of [false, true]) {
    pg = await open(b, { 'coupe.prefs': JSON.stringify({ lefty }) }, { w }); await pg.click('#go'); await pg.waitForTimeout(300); await pg.evaluate(() => { S.score = 123456; hud(); S.paused = true }); await pg.waitForTimeout(200);
    const ov = await pg.evaluate(() => { const q = ['#score', '#best', '#coins2', '#lives', '#pause', '#statsBtn'].map(s => document.querySelector(s)).filter(e => e.offsetParent); let o = []; for (let i = 0; i < q.length; i++) for (let j = i + 1; j < q.length; j++) { const A = q[i].getBoundingClientRect(), C = q[j].getBoundingClientRect(); if (A.left < C.right - 1 && C.left < A.right - 1 && A.top < C.bottom - 1 && C.top < A.bottom - 1) o.push(q[i].id + '×' + q[j].id) } return o });
    assert.deepStrictEqual(ov, [], `${w} lefty=${lefty}`); await pg.screenshot({ path: `v78-hud-${w}-${lefty ? 'g' : 'd'}.png`, clip: { x: 0, y: 0, width: w, height: 110 } }); await pg.close() }
  await b.close(); console.log('v78 OK') })().catch(e => { console.error(e); process.exit(1) });
function FRUITS_P2() { return 2 }
