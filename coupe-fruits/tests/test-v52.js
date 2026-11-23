const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
(async () => { const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 390, height: 800 }, hasTouch: true });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript({ path: __dirname + '/fakeclaude.js' });
  await pg.addInitScript(() => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1'); const d = new Date(), cur = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const dn = Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5), w = Math.floor((dn + 3) / 7);
    sessionStorage.setItem('fakedb', JSON.stringify({ 'clans/u_bob': { name: 'Les Pépins', tag: 'PEP', color: '#2f9e5b', code: 'PEP-1234', owner: 'u_bob', kicked: [] },
      'scores/u_bob': { name: 'Bob', season: cur, best: {}, clan: 'u_bob', wk: { w, n: 2980 } }, 'scores/u_test': { name: 'Gaby', season: cur, best: {}, clan: 'u_bob' } })) });
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.evaluate(() => { localStorage.setItem('coupe.tuto', '1'); localStorage.setItem('coupe.seen', '3.10'); localStorage.setItem('coupe.pseudo', 'Gaby'); localStorage.setItem('coupe.clan', 'u_bob'); localStorage.setItem('coupe.tips', '["dayBtn","modeSeg [data-v=\\"boss\\"]","passBtn","questBtn","statsBtn","pzBtn","shopBtn"]') }); await pg.reload(); await pg.waitForTimeout(1500);
  await pg.click('#clanBtn'); await pg.waitForTimeout(300);
  assert.match(await pg.textContent('#clanBox'), /Mission de la semaine.*Coupez 3000 fruits ensemble.*2980 \/ 3000/s);
  await pg.screenshot({ path: 'v52-mis.png' }); await pg.click('#statsClose');
  // une partie où je coupe 25 fruits : la mission passe et paie
  const c0 = await pg.evaluate(() => JSON.parse(localStorage.getItem('coupe.wallet') || '{"coins":0}').coins);
  await pg.click('#go'); await pg.evaluate(() => { const s = __coupe.state(); s.next = 999; s.cut = 25; s.launched = 25; __coupe.addPts(250) });
  const box = await pg.locator('#cv').boundingBox(); const [W, H] = await pg.evaluate(() => __coupe.size());
  for (let i = 0; i < 3; i++) { await pg.evaluate(() => { const [W, H] = __coupe.size(); __coupe.spawnAt(true, W / 2, H / 3) }); await pg.mouse.move(box.x + W / 2 - 120, box.y + H / 3); await pg.mouse.down(); await pg.mouse.move(box.x + W / 2 + 120, box.y + H / 3, { steps: 5 }); await pg.mouse.up(); await pg.waitForTimeout(150) }
  await pg.waitForTimeout(2500);
  assert.strictEqual(await pg.evaluate(() => JSON.parse(localStorage.getItem('coupe.wkcut')).n), 25);
  const doc = await pg.evaluate(() => JSON.parse(sessionStorage.getItem('fakedb'))['scores/u_test']); assert.strictEqual(doc.wk.n, 25, 'weekly cut published');
  const c1 = await pg.evaluate(() => JSON.parse(localStorage.getItem('coupe.wallet')).coins); assert.ok(c1 - c0 >= 800, 'mission reward ' + (c1 - c0));
  assert.ok(await pg.evaluate(() => !!localStorage.getItem('coupe.mis')));
  await pg.evaluate(() => sessionStorage.clear());
  assert.deepStrictEqual(errs, []); console.log('v5.2 mission OK'); await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
