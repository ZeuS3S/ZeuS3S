const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
async function seq(b) { const pg = await b.newPage({ viewport: { width: 390, height: 760 }, hasTouch: true });
  await pg.addInitScript({ path: __dirname + '/fakeclaude.js' });
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.evaluate(() => { localStorage.setItem('coupe.tuto', '1'); localStorage.setItem('coupe.pseudo', 'Gaby') }); await pg.reload(); await pg.waitForTimeout(800);
  await pg.click('#dayBtn'); await pg.waitForTimeout(50);
  const r = await pg.evaluate(() => { const s = __coupe.state(); s.paused = true; const before = __coupe.items().length; for (let i = 0; i < 5; i++) __coupe.launch(); return __coupe.items().slice(before).map(i => i.e) });
  return [pg, r] }
(async () => { const b = await chromium.launch();
  const [p1, a] = await seq(b), [p2, c] = await seq(b); await p2.close();
  assert.ok(a.length >= 5); assert.deepStrictEqual(a, c, 'same fruits for everyone'); console.log('seq', a.join(''));
  const pg = p1; const errs = []; pg.on('pageerror', e => errs.push(e.message));
  assert.strictEqual(await pg.evaluate(() => __coupe.state().mode), 'chrono'); assert.strictEqual(await pg.evaluate(() => __coupe.state().diff), 'difficile'); assert.strictEqual(await pg.evaluate(() => __coupe.state().lives), 3); assert.match(await pg.textContent('#lives'), /♥♥♥ ⏱ \d+/);
  // fin de la partie du jour : record du jour enregistré et envoyé
  await pg.evaluate(() => { const s = __coupe.state(); s.paused = false; s.next = 999; __coupe.addPts(240); s.timeLeft = .05 }); await pg.waitForTimeout(2000);
  assert.ok(await pg.locator('#over').isVisible());
  const db = await pg.evaluate(() => JSON.parse(sessionStorage.getItem('fakedb'))['scores/u_test']); assert.ok(db && db.day && db.day.s >= 240, 'day score synced ' + JSON.stringify(db && db.day));
  // retour à l'accueil : le mode choisi avant revient
  await pg.click('#change'); assert.strictEqual(await pg.evaluate(() => document.querySelector('#modeSeg [aria-pressed=true]').dataset.v), 'classique');
  assert.match(await pg.textContent('#dayBtn'), /record \d+/);
  await pg.click('#go'); await pg.waitForTimeout(100); assert.strictEqual(await pg.evaluate(() => __coupe.state().mode), 'classique'); assert.ok(!(await pg.evaluate(() => __coupe.state().rng)), 'normal game not seeded');
  await pg.click('#pause'); await pg.click('#home');
  // classement du jour
  await pg.click('#statsBtn'); await pg.click('[data-tab=lb]'); await pg.waitForTimeout(300); await pg.click('[data-lbv=jour]'); await pg.waitForTimeout(300);
  assert.match(await pg.textContent('#lbList'), /Gaby/); assert.strictEqual(await pg.locator('#lbMode').isVisible(), false);
  await pg.screenshot({ path: 'v39-lb.png' });
  await pg.evaluate(() => sessionStorage.clear());
  assert.deepStrictEqual(errs, []); console.log('v3.9 OK'); await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
