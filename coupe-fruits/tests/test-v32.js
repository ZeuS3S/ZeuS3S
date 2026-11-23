const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
(async () => { const b = await chromium.launch();
  for (const [w, h] of [[390, 800], [1280, 800]]) {
  const pg = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript({ path: __dirname + '/fakeclaude.js' });
  await pg.addInitScript(() => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1'); const d = new Date(), cur = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    sessionStorage.setItem('fakedb', JSON.stringify({ 'clans/u_bob': { name: 'Les Pépins', tag: 'PEP', color: '#2f9e5b', code: 'PEP-1234', owner: 'u_bob', kicked: [] },
      'scores/u_bob': { name: 'Bob', av: '🍍', pr: 2, level: 18, title: 'Maître de saison', season: cur, best: { 'classique.normal': 5000 }, rec: { classique: 5000, vagues: 12 }, ach3: ['roi'], blade: 'or', fx: 'supernova', clan: 'u_bob' } })); });
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.evaluate(() => { localStorage.setItem('coupe.tuto', '1'); localStorage.setItem('coupe.pseudo', 'Gaby'); }); await pg.reload(); await pg.waitForTimeout(1500);
  // Profil public de Bob
  await pg.click('#statsBtn'); await pg.click('[data-tab=lb]'); await pg.waitForTimeout(300);
  assert.match(await pg.textContent('#lbList'), /Bob.*PEP/s); await pg.click('[data-pub=u_bob]'); assert.ok(await pg.locator('#pubPanel').isVisible());
  const pub = await pg.textContent('#pubBody'); assert.match(pub, /Bob/); assert.match(pub, /PEP/); assert.match(pub, /🌊 12/); assert.match(pub, /Roi de l’empire fruitier/); assert.match(pub, /Supernova/);
  await pg.screenshot({ path: `v32-pub-${w}.png` }); await pg.click('#pubClose');
  // Clans : rejoindre avec le code
  await pg.click('#clanBtn'); await pg.click('[data-csub=top]'); assert.match(await pg.textContent('#clanBox'), /Les Pépins/); await pg.click('[data-csub=mine]');
  await pg.click('#clanJoinBtn'); await pg.fill('#clanCode', 'pep-1234'); await pg.click('#clanJoin'); await pg.waitForTimeout(300);
  assert.strictEqual(await pg.evaluate(() => __coupe.myClanId()), 'u_bob'); await pg.click('[data-csub=set]'); assert.match(await pg.textContent('#clanBox'), /Quitter le clan/);
  assert.strictEqual(await pg.evaluate(() => JSON.parse(sessionStorage.getItem('fakedb'))['scores/u_test'].clan), 'u_bob', 'membership saved');
  await pg.screenshot({ path: `v32-clan-${w}.png` });
  // Quitter puis créer son clan
  await pg.click('#clanLeave'); await pg.waitForTimeout(300); assert.strictEqual(await pg.evaluate(() => __coupe.myClanId()), '');
  await pg.click('#clanNew'); await pg.fill('#clanName', 'Zesteurs'); await pg.fill('#clanTag', 'zest'); await pg.click('[data-cc="#ff5a3c"]'); await pg.click('#clanSave'); await pg.waitForTimeout(300);
  const db = await pg.evaluate(() => JSON.parse(sessionStorage.getItem('fakedb'))); assert.strictEqual(db['clans/u_test'].tag, 'ZEST'); assert.strictEqual(db['clans/u_test'].color, '#ff5a3c'); assert.match(db['clans/u_test'].code, /^ZEST-\d{4}$/);
  assert.strictEqual(await pg.evaluate(() => __coupe.myClanId()), 'u_test'); await pg.click('[data-csub=set]'); assert.match(await pg.textContent('#clanBox'), /Dissoudre/); await pg.screenshot({ path: `v32-myclan-${w}.png` });
  await pg.click('#clanDel'); await pg.waitForTimeout(300); assert.strictEqual(await pg.evaluate(() => __coupe.myClanId()), ''); assert.ok(await pg.evaluate(() => JSON.parse(sessionStorage.getItem('fakedb'))['clans/u_test'].gone));
  // Bob retire Gaby : Gaby quitte le clan automatiquement
  await pg.click('#clanJoinBtn'); await pg.fill('#clanCode', 'PEP-1234'); await pg.click('#clanJoin'); await pg.waitForTimeout(300);
  await pg.evaluate(() => { const st = JSON.parse(sessionStorage.getItem('fakedb')); st['clans/u_bob'].kicked = ['u_test']; sessionStorage.setItem('fakedb', JSON.stringify(st)); });
  await pg.reload(); await pg.waitForTimeout(1500); await pg.click('#statsBtn'); await pg.click('[data-tab=lb]'); await pg.waitForTimeout(400);
  assert.strictEqual(await pg.evaluate(() => __coupe.myClanId()), '', 'kicked member leaves');
  await pg.evaluate(() => sessionStorage.clear());
  assert.deepStrictEqual(errs, []); console.log('v3.2 OK', w); await pg.close(); }
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
