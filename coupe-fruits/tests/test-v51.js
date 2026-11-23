const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
(async () => { const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 390, height: 800 }, hasTouch: true });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript({ path: __dirname + '/fakeclaude.js' });
  await pg.addInitScript(() => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1'); const d = new Date(), cur = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, now = Date.now(), my = now - 3600e3;
    sessionStorage.setItem('fakedb', JSON.stringify({
      'scores/u_test': { name: 'Gaby', season: cur, best: { 'classique.normal': 2000 }, at: now },
      'scores/u_bob': { name: 'Bob', av: '🍍', season: cur, best: { 'classique.normal': 5000 }, at: now - 60e3, clan: 'u_bob' },
      'clans/u_bob': { name: 'Les Pépins', tag: 'PEP', color: '#2f9e5b', code: 'PEP-1234', owner: 'u_bob', kicked: [] },
      'feed/u_test': { name: 'Gaby', av: '🍓', ev: [{ k: 'rec', n: 2000, m: 'classique', d: 'normal', at: my }], re: {} },
      'feed/u_bob': { name: 'Bob', av: '🍍', clan: 'u_bob', ev: [{ k: 'rec', n: 5000, m: 'classique', d: 'normal', at: now - 60e3 }, { k: 'day', n: 1234, at: now - 2 * 864e5 }], re: { ['u_test:' + my]: { e: '🔥', t: now - 30e3 } } } })) });
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.evaluate(() => { localStorage.setItem('coupe.tuto', '1'); localStorage.setItem('coupe.seen', '3.10'); localStorage.setItem('coupe.pseudo', 'Gaby'); localStorage.setItem('coupe.tips', '["dayBtn","modeSeg [data-v=\\"boss\\"]","passBtn","questBtn","statsBtn","pzBtn","shopBtn"]') }); await pg.reload(); await pg.waitForTimeout(1500);
  console.log(errs, await pg.evaluate(() => [document.getElementById('actDot').hidden, getComputedStyle(document.getElementById('actDot')).display, document.getElementById('actDot').getBoundingClientRect().width]));
  assert.ok(await pg.locator('#actDot').isVisible(), 'red dot on profile button');
  await pg.click('#statsBtn'); await pg.click('[data-tab=act]'); await pg.waitForTimeout(300);
  const t = await pg.textContent('#statsBody');
  assert.match(t, /Pour toi/); assert.match(t, /Bob t’a dépassé en Classique normal \(5000 contre 2000\)/); assert.match(t, /Bob a réagi 🔥 à ton exploit/);
  assert.match(t, /Aujourd’hui/); assert.match(t, /Cette semaine/); assert.match(t, /Partie du jour : 1234 pts/); assert.match(t, /PEP/);
  await pg.screenshot({ path: 'v51-act.png' });
  assert.strictEqual(await pg.locator('#actDot').isVisible(), false, 'seen after opening');
  // réagir 👏 au record de Bob : écrit dans MON document
  await pg.click('.fe2:not(.me) [data-e="👏"] >> nth=0'); await pg.waitForTimeout(300);
  const mine = await pg.evaluate(() => JSON.parse(sessionStorage.getItem('fakedb'))['feed/u_test']); assert.ok(Object.values(mine.re).some(r => r.e === '👏'), 'reaction saved');
  assert.strictEqual(mine.ev.length, 1, 'events kept');
  assert.ok(await pg.locator('.rxb.on').count() === 1);
  // on ne réagit pas à ses propres exploits
  assert.ok(await pg.locator('.fe2.me .rxb >> nth=0').isDisabled());
  // filtres
  await pg.click('[data-ff=me]'); assert.ok(!/Bob/.test(await pg.textContent('#feedList'))); await pg.click('[data-ff=clan]'); assert.match(await pg.textContent('#feedList'), /Rien pour l’instant/);
  await pg.evaluate(() => sessionStorage.clear());
  assert.deepStrictEqual(errs, []); console.log('v5.1 feed OK'); await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
