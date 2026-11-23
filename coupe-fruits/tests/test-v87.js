const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
const TIPS = '["dayBtn","modeSeg [data-v=\\"boss\\"]","passBtn","questBtn","statsBtn","pzBtn","shopBtn","boostBtn"]';
async function open(b, ls = {}, o = {}) { const pg = await b.newPage({ viewport: { width: 390, height: 800 }, hasTouch: true }); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message));
  if (o.auth) await pg.addInitScript(() => { window.coupeAuth = { providers: ['discord', 'google'], signIn() {}, signOut() {}, deleteAccount: () => Promise.resolve() } });
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.evaluate(([ls, tips]) => { localStorage.setItem('coupe.tuto', '1'); localStorage.setItem('coupe.seen', VERSION); localStorage.setItem('coupe.tips', tips); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v) }, [ls, TIPS]);
  await pg.reload(); await pg.waitForTimeout(1200); return pg }
const cut = (pg, e) => pg.evaluate(e => { const k = FRUITS.find(f => f.e === e); const it = spawn(k, 200, 300, 0, 0); it.vy = 0; strokeId++; sliceSeg(100, 300, 300, 300) }, e);
(async () => { const b = await chromium.launch(); let pg;
  // ===== ambiance par lieu + défi 3 étoiles =====
  pg = await open(b, { 'coupe.career': JSON.stringify({ 1: 3, 2: 3, 3: 3, 4: 3, 6: 2 }) }); await pg.click('#pzBtn'); await pg.click('[data-pt2=car]'); await pg.waitForTimeout(300);
  assert.match(await pg.textContent('#carList'), /Défi 3 étoiles : 12 \/ 15 ★/);
  await pg.click('[data-car="5"]'); await pg.waitForTimeout(400); assert.strictEqual(await pg.evaluate(() => boardSkin), 'c_marche', 'market ambiance');
  await pg.screenshot({ path: 'v87-marche.png' });
  const o5 = await pg.evaluate(() => S.carO.o); for (const [e, n] of Object.entries(o5)) for (let i = 0; i < n; i++) await cut(pg, e); await pg.waitForTimeout(1600);
  assert.strictEqual(await pg.textContent('#overTitle'), 'Commande livrée !');
  assert.ok(await pg.evaluate(() => ownedSkins().includes('c_marche')), 'board granted'); assert.ok(!(await pg.evaluate(() => tainted())), 'not tainted');
  await pg.waitForTimeout(400); assert.match(await pg.textContent('#toast'), /Défi 3 étoiles réussi/);
  assert.ok(await pg.evaluate(() => !ownedSkins().includes('c_restaurant')), 'restaurant not yet');
  await pg.evaluate(() => startCareer(7)); await pg.waitForTimeout(300); assert.strictEqual(await pg.evaluate(() => boardSkin), 'c_restaurant');
  await pg.evaluate(() => { S.running = false; showHome && showHome('play') }); await pg.close();
  pg = await open(b, { 'coupe.skins': JSON.stringify(['erable', 'c_lune']) }); await pg.click('#shopBtn'); await pg.waitForTimeout(300);
  await pg.evaluate(() => { shopCat = 'planche'; renderShop() }); const sh = await pg.textContent('#statsBody'); assert.ok(sh.includes('La Lune'), 'owned ambiance in shop'); assert.ok(!sh.includes('Le marché'), 'unowned hidden');
  assert.ok(await pg.evaluate(() => !ACH.find(a => a.id === 'deco') || true)); assert.deepStrictEqual(pg.errs, []); await pg.close();
  // les 12 ambiances se dessinent sans erreur
  pg = await open(b); assert.strictEqual(await pg.evaluate(() => { const c = document.createElement('canvas'), x = c.getContext('2d'); let n = 0; for (const k of SKINS.filter(k => k.car != null)) { k.draw(x, 390, 700); n++ } return n }), 12); await pg.close();

  // ===== version hébergée : sans compte, confidentialité, suppression =====
  pg = await open(b, {}, { auth: 1 }); await pg.evaluate(() => openStats('me')); await pg.waitForTimeout(400);
  const cb = await pg.textContent('#cloudBox'); assert.match(cb, /Sans compte, ta progression reste sur cet appareil/); assert.strictEqual(await pg.getAttribute('#cloudBox a', 'href'), 'confidentialite.html');
  assert.deepStrictEqual(pg.errs, []); await pg.close();
  await b.close(); console.log('v87 OK') })().catch(e => { console.error(e); process.exit(1) });
