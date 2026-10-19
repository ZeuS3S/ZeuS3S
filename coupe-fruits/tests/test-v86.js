const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
const TIPS = '["dayBtn","modeSeg [data-v=\\"boss\\"]","passBtn","questBtn","statsBtn","pzBtn","shopBtn","boostBtn"]';
async function open(b, ls = {}, o = {}) { const pg = await b.newPage({ viewport: { width: o.w || 390, height: 800 }, hasTouch: true }); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message));
  if (o.ts !== undefined) await pg.addInitScript(w => { window.__ts = w }, o.ts);
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.evaluate(([ls, tips]) => { localStorage.setItem('coupe.tuto', '1'); localStorage.setItem('coupe.seen', VERSION); localStorage.setItem('coupe.tips', tips); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v) }, [ls, TIPS]);
  await pg.reload(); await pg.waitForTimeout(1200); return pg }
const cut = (pg, e) => pg.evaluate(e => { const k = FRUITS.find(f => f.e === e); const it = spawn(k, 200, 300, 0, 0); it.vy = 0; strokeId++; sliceSeg(100, 300, 300, 300) }, e);
(async () => { const b = await chromium.launch(); let pg;
  // ===== accueil en deux pages =====
  pg = await open(b); assert.ok(await pg.isVisible('#go')); assert.ok(await pg.isHidden('#chestBtn')); assert.ok(await pg.isVisible('#progDot'), 'chest ready dot');
  await pg.click('[data-hp=prog]'); assert.ok(await pg.isHidden('#go')); assert.ok(await pg.isVisible('#chestBtn')); const tb = await pg.textContent('#todayBox');
  for (const t of ['Aujourd’hui', 'Défi du jour', 'Quête météo', 'Commande 1', '0 / 2500']) assert.ok(tb.includes(t), t);
  await pg.click('#chestBtn'); await pg.waitForTimeout(200); assert.ok(await pg.isHidden('#progDot'), 'dot gone');
  await pg.click('[data-today=car]'); await pg.waitForTimeout(300); assert.ok(await pg.isVisible('#carList')); await pg.close();

  // ===== boutique : prix qui montent, promos, téléphone =====
  pg = await open(b, { 'coupe.wallet': JSON.stringify({ coins: 100, earned: 1 }) }, { w: 320 });
  const pr = await pg.evaluate(() => Object.values(KINDS).map(K => K.list.filter(k => k.price > 0 && !k.pass && !k.ev).map(k => k.price).sort((a, b) => a - b)));
  assert.ok(pr.every(l => l.every((p, i) => !i || p >= l[i - 1])), 'sorted'); assert.strictEqual(pr[0][0], 1000, 'cheapest unchanged'); assert.ok(pr[0][pr[0].length - 1] >= 20000 * 1.7, 'top x1.8 ' + pr[0]);
  await pg.click('#shopBtn'); await pg.waitForTimeout(300); const pp = await pg.$$eval('[data-promo]', e => e.map(x => x.dataset.promo)); assert.ok(pp.length >= 1);
  await pg.click(`[data-promo="${pp[0]}"]`); await pg.waitForTimeout(700); const [kd, id] = pp[0].split(':');
  const card = pg.locator(`[data-${kd}="${id}"]`).locator('xpath=ancestor::div[contains(concat(" ",@class," ")," skin ")][1]'); assert.ok(await card.isVisible(), 'jumped to promo item'); assert.ok(/flash/.test(await card.getAttribute('class')));
  const nm = await card.locator('.nm').boundingBox(), sm = await card.locator('.nm small').boundingBox(), bd = await card.locator('.promo').boundingBox(); assert.ok(bd.height < 24, 'badge on one line ' + bd.height); assert.ok(sm.x + sm.width <= nm.x + nm.width + 1, 'price inside card');
  await card.screenshot({ path: 'v86-promo.png' }); assert.deepStrictEqual(pg.errs, []); await pg.close();

  // ===== plafond quotidien =====
  pg = await open(b); let r = await pg.evaluate(() => { const c0 = W$().coins, x0 = getXp(); earn(2000); const a = W$().coins - c0; earn(800); return [a, W$().coins - c0, earnedToday(), getXp() > x0] }); assert.deepStrictEqual(r, [2000, 2500, 2500, true]);
  await pg.click('#go'); await pg.waitForTimeout(300); await pg.evaluate(() => { S.score = 5000; LEDGER.set(S, 5000); finish() }); await pg.waitForTimeout(1500);
  assert.match(await pg.textContent('#overCoins'), /Plafond du jour atteint : \+\d+ XP/); await pg.close();

  // ===== notifications regroupées =====
  pg = await open(b); await pg.waitForTimeout(3000); await pg.evaluate(() => { toastMsg('🧩', 'Fragment', 'A', '#000'); toastMsg('🪙', 'Pièces', 'B', '#000'); toastMsg('⭐', 'Étoile', 'C', '#000') }); await pg.waitForTimeout(500);
  assert.strictEqual(await pg.locator('#toast li').count(), 3); assert.match(await pg.textContent('#toast'), /3 nouveautés/); await pg.screenshot({ path: 'v86-toast.png', clip: { x: 0, y: 0, width: 390, height: 220 } }); await pg.close();

  // ===== boss de lieu + succès de Carrière =====
  pg = await open(b, { 'coupe.career': JSON.stringify({ 1: 3, 2: 3, 3: 3, 4: 3 }) }); await pg.click('#pzBtn'); await pg.click('[data-pt2=car]'); await pg.waitForTimeout(300);
  assert.match(await pg.textContent('[data-car="5"]'), /👑/); await pg.click('[data-car="5"]'); await pg.waitForTimeout(300);
  assert.strictEqual(await pg.evaluate(() => S.carO.rule.id), 'nodur'); await pg.evaluate(() => { const it = spawn('durian', 200, 300, 0, 0); it.vy = 0; strokeId++; sliceSeg(100, 300, 300, 300) }); await pg.waitForTimeout(1600);
  assert.strictEqual(await pg.textContent('#overTitle'), 'Commande ratée'); assert.match(await pg.textContent('#overMsg'), /Règle du boss non respectée : Sans couper de durian/);
  await pg.click('#again'); await pg.waitForTimeout(300); const o5 = await pg.evaluate(() => S.carO.o); for (const [e, n] of Object.entries(o5)) for (let i = 0; i < n; i++) await cut(pg, e); await pg.waitForTimeout(1600);
  assert.strictEqual(await pg.textContent('#overTitle'), 'Commande livrée !'); const got = await pg.evaluate(() => Object.keys(loadAch())); for (const a of ['car_first', 'car_lieu', 'car_15']) assert.ok(got.includes(a), a);
  assert.ok(await pg.evaluate(() => carOrder(10).rule.id === 'vite' && carOrder(10).time < carOrder(9).time * 1.5 && !carOrder(9).rule)); assert.deepStrictEqual(pg.errs, []); await pg.close();

  // ===== saisons de talents =====
  pg = await open(b, { 'coupe.talpts': '3', 'coupe.talents': JSON.stringify({ aimant: 2 }) }, { ts: 'aimant' }); assert.strictEqual(await pg.evaluate(() => tal('aimant')), 4); assert.strictEqual(await pg.evaluate(() => tal('or')), 0);
  await pg.click('#statsBtn'); await pg.waitForTimeout(300); assert.match(await pg.textContent('#statsBody'), /Vedette du mois : 🧲 Aimant \(effet ×2\)/); assert.strictEqual(await pg.locator('.tal.star').count(), 1); await pg.close();

  // ===== mode Nuit =====
  pg = await open(b); assert.ok(await pg.isDisabled('#modeSeg [data-v=nuit]'), 'locked before level 20'); await pg.evaluate(() => { let x = 0; while (lvlInfo(x).L < 20) x += 500; localStorage.setItem('coupe.xp', x) }); await pg.reload(); await pg.waitForTimeout(1000);
  await pg.click('#modeSeg [data-v=nuit]'); await pg.click('#go'); await pg.waitForTimeout(400); assert.strictEqual(await pg.evaluate(() => S.mode), 'nuit');
  const lum = await pg.evaluate(() => { S.nightP = { x: 60, y: 300 }; render(); const d = (x, y) => { const p = g.getImageData(x * dpr, y * dpr, 1, 1).data; return p[0] + p[1] + p[2] }; return [d(60, 300), d(W - 40, H - 60)] });
  assert.ok(lum[0] > lum[1] * 3, 'lit near blade, dark elsewhere ' + lum); await pg.screenshot({ path: 'v86-nuit.png' }); assert.deepStrictEqual(pg.errs, []); await pg.close();
  await b.close(); console.log('v86 OK') })().catch(e => { console.error(e); process.exit(1) });
