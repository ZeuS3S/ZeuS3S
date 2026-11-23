const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
const TIPS = '["dayBtn","modeSeg [data-v=\\"boss\\"]","passBtn","questBtn","statsBtn","pzBtn","shopBtn","boostBtn"]';
const d = new Date(), cur = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, pd = new Date(d.getFullYear(), d.getMonth() - 1, 1), prev = `${pd.getFullYear()}-${String(pd.getMonth() + 1).padStart(2, '0')}`;
const clan = (id, name, tag) => ({ name, tag, color: '#2f9e5b', code: tag + '-1111', owner: id, kicked: [], open: true, emb: '🐉' });
const sc = (name, clanId, prevPts, extra = {}) => ({ name, clan: clanId, season: cur, best: {}, prev: { season: prev, best: { 'classique.normal': prevPts } }, ...extra });
// 4 clans ; je suis dans celui dont on donne l'id, avec mes propres points de la saison passée
function seed(mine, myPts = 100) { const db = { 'clans/u_a': clan('u_a', 'Alpha', 'ALP'), 'clans/u_b': clan('u_b', 'Bravo', 'BRV'), 'clans/u_c': clan('u_c', 'Charlie', 'CHA'), 'clans/u_d': clan('u_d', 'Delta', 'DEL'),
  'scores/u_a': sc('Ana', 'u_a', 3000), 'scores/u_b': sc('Bob', 'u_b', 2000), 'scores/u_c': sc('Cid', 'u_c', 1000), 'scores/u_d': sc('Dan', 'u_d', 500), 'scores/u_test': sc('Gaby', mine, myPts) }; return db }
async function open(b, db, ls = {}) { const pg = await b.newPage({ viewport: { width: 390, height: 1400 }, hasTouch: true }); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message));
  await pg.addInitScript({ path: __dirname + '/fakeclaude.js' });
  await pg.addInitScript(db => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1'); sessionStorage.setItem('fakedb', JSON.stringify(db)) }, db);
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.evaluate(([ls, tips]) => { localStorage.setItem('coupe.tuto', '1'); localStorage.setItem('coupe.seen', '3.10'); localStorage.setItem('coupe.tips', tips); localStorage.setItem('coupe.pseudo', 'Gaby'); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v) }, [ls, TIPS]);
  await pg.reload(); await pg.waitForTimeout(1500); return pg }
const has = (pg, keys) => pg.evaluate(keys => keys.map(k => unlocks().includes(k)), keys);
const coins = pg => pg.evaluate(() => JSON.parse(localStorage.getItem('coupe.wallet') || '{"coins":0}').coins);
const ALL = ['frame_couronne', 'ncol_champion', 'trail_comete', 'banner_podium'];
(async () => { const b = await chromium.launch();
  // 1er : récompenses 1, 2 et 3 ; 2e : 2 et 3 ; 3e : 3 ; 4e : rien
  for (const [clanId, rk, want, money] of [['u_a', 0, [true, true, true, true], 4500], ['u_b', 1, [false, false, true, true], 4500], ['u_c', 2, [false, false, false, true], 1500], ['u_d', 3, [false, false, false, false], 0]]) {
    const pg = await open(b, seed(clanId), { 'coupe.clan': clanId }); await pg.waitForTimeout(500);
    assert.deepStrictEqual(await has(pg, ALL), want, 'rank ' + (rk + 1)); assert.strictEqual(await coins(pg), money, 'coins rank ' + (rk + 1));
    if (rk === 0) { await pg.click('#clanBtn'); await pg.click('[data-csub=top]'); await pg.waitForTimeout(200);
      assert.strictEqual(await pg.locator('.podium .pod').count(), 3, 'last season podium'); await pg.locator('#statsBody').screenshot({ path: 'v67-top.png' });
      await pg.click('[data-csub=rw]'); const t = await pg.textContent('#clanBox'); assert.match(t, /1er du top.*Récompenses 1, 2 et 3.*2e du top.*Récompenses 2 et 3.*3e du top.*Récompense 3/s); assert.match(t, /Saison de .* ton clan a fini 1er/);
      await pg.locator('#statsBody').screenshot({ path: 'v67-rw.png' }) }
    // une seule fois par saison
    await pg.reload(); await pg.waitForTimeout(1500); assert.strictEqual(await coins(pg), money, 'paid once'); assert.deepStrictEqual(pg.errs, []); await pg.close() }
  // pas de points la saison passée (arrivé après la fin) : rien
  let pg = await open(b, seed('u_a', 0), { 'coupe.clan': 'u_a' }); await pg.waitForTimeout(500); assert.deepStrictEqual(await has(pg, ALL), [false, false, false, false], 'no points, no reward'); await pg.close();
  // onglet Clan : sous-onglets, emblème, MVP, mur
  const db = seed('u_test'); db['clans/u_test'] = { ...clan('u_test', 'Kiwis', 'KIWI'), emb: '🦊' }; db['scores/u_x'] = { name: 'Xia', clan: 'u_test', season: cur, best: { 'classique.normal': 50 }, wk: { w: -1, n: 0 }, cact: { c: 'u_test', wall: [{ t: 'Salut la team !', at: Date.now() - 60000 }] } };
  pg = await open(b, db, { 'coupe.clan': 'u_test' });
  await pg.evaluate(() => { const w = Math.floor((Math.round(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) / 864e5) + 3) / 7); localStorage.setItem('coupe.wkcut', JSON.stringify({ w, n: 42 })) });
  assert.ok(await pg.isVisible('#clanBtn'), 'clan button next to the profile'); await pg.click('#clanBtn'); await pg.waitForTimeout(300); assert.strictEqual(await pg.textContent('#statsTitle'), 'Clan'); assert.ok(await pg.isHidden('.tabs'), 'own page, no profile tabs'); await pg.screenshot({ path: 'v69-home-clan.png', clip: { x: 0, y: 0, width: 390, height: 420 } });
  let t = await pg.textContent('#clanBox'); assert.match(t, /🦊/); assert.match(t, /Salut la team !/, 'chat preview on the clan tab'); assert.match(t, /du top/);
  await pg.click('[data-csub=members]'); t = await pg.textContent('#clanBox'); assert.match(t, /Gaby 🏅 MVP/); assert.match(t, /🍉 42 cette semaine/);
  await pg.click('[data-csub=chat]'); await pg.fill('#chatIn', 'On vise le podium'); await pg.press('#chatIn', 'Enter'); await pg.waitForTimeout(500);
  const st = await pg.evaluate(() => JSON.parse(sessionStorage.getItem('fakedb'))); assert.strictEqual(st['scores/u_test'].cact.wall[0].t, 'On vise le podium');
  t = await pg.textContent('#clanBox'); assert.ok(t.indexOf('Salut la team') < t.indexOf('On vise le podium'), 'chat order: newest at the bottom');
  // le chef coupe le mur aux membres : le message de Xia disparaît
  await pg.click('[data-csub=set]'); await pg.click('[data-perm="membre:chat"]'); await pg.waitForTimeout(400); await pg.click('[data-csub=chat]'); assert.ok(!(await pg.textContent('#clanBox')).includes('Salut la team'), 'muted role hidden'); await pg.click('[data-csub=set]');
  // emblème modifiable
  await pg.click('#clanEdit'); await pg.click('[data-emb="🔥"]'); await pg.click('#clanSave'); await pg.waitForTimeout(400);
  assert.strictEqual((await pg.evaluate(() => JSON.parse(sessionStorage.getItem('fakedb'))))['clans/u_test'].emb, '🔥');
  await pg.locator('#clanBox .clan').screenshot({ path: 'v67-mine.png' });
  // le classement n'a plus la vue Clans
  await pg.click('#statsBtn'); assert.strictEqual(await pg.locator('.tabs [data-tab=clan]').count(), 0, 'no clan tab in the profile'); await pg.click('[data-tab=lb]'); assert.strictEqual(await pg.locator('[data-lbv=clans]').count(), 0);
  await pg.click('#clanBtn'); assert.strictEqual(await pg.textContent('#statsTitle'), 'Clan'); await pg.click('#clanBtn'); assert.ok(await pg.isHidden('#stats'), 'second tap closes');
  assert.deepStrictEqual(pg.errs, []); console.log('v6.7 OK'); await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
