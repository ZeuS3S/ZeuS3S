const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
const TIPS = '["dayBtn","modeSeg [data-v=\\"boss\\"]","passBtn","questBtn","statsBtn","pzBtn","shopBtn","boostBtn"]';
(async () => { const b = await chromium.launch(); const store = {}, pages = [], refused = [];
  const emit = () => { for (const p of pages) p.evaluate(s => window.__dbEmit && window.__dbEmit(s), store).catch(() => {}) };
  async function account(uid, name) { const ctx = await b.newContext({ viewport: { width: 390, height: 1600 }, hasTouch: true });
    await ctx.exposeFunction('__dbGet', () => store);
    await ctx.exposeFunction('__dbSet', (p, d) => { if (p.split('/')[1] !== uid && !p.startsWith('data/users/' + uid + '/')) { refused.push(uid + '→' + p); return 'permission_denied' } store[p] = d; setTimeout(emit, 30); return '' });
    await ctx.addInitScript(u => { window.__UID = u }, uid); await ctx.addInitScript({ path: __dirname + '/sharedb.js' });
    const pg = await ctx.newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message)); pages.push(pg);
    await pg.goto('file://' + __dirname + '/coupe.html'); await pg.evaluate(([n, tips]) => { localStorage.setItem('coupe.tuto', '1'); localStorage.setItem('coupe.seen', '3.10'); localStorage.setItem('coupe.tips', tips); localStorage.setItem('coupe.pseudo', n) }, [name, TIPS]);
    await pg.reload(); await pg.waitForTimeout(1200); await pg.click('#clanBtn'); await pg.waitForTimeout(300); pg.uid = uid; return pg }
  const box = pg => pg.textContent('#clanBox'), wait = (ms = 500) => new Promise(r => setTimeout(r, ms)), clanOf = pg => pg.evaluate(() => myClanId());
  const ana = await account('u_ana', 'Ana'), bea = await account('u_bea', 'Bea'), cid = await account('u_cid', 'Cid');

  // 1. Ana crée le clan et le met sur demande
  await ana.click('#clanNew'); await ana.fill('#clanName', 'Les Kiwis'); await ana.fill('#clanTag', 'kiwi'); await ana.click('#clanSave'); await wait();
  assert.match(await box(ana), /Ton rôle : Chef/); const code = store['clans/u_ana'].code; assert.match(code, /^KIWI-\d{4}$/);
  await ana.click('[data-csub=set]'); await ana.click('#clanOpen'); await wait(); assert.strictEqual(store['clans/u_ana'].open, false);
  // 2. Bea demande à entrer, Ana accepte
  await bea.click('#clanJoinBtn'); await bea.fill('#clanCode', code); await bea.click('#clanJoin'); await wait(800);
  assert.match(await box(bea), /Demande envoyée/); await ana.click('[data-csub=members]'); assert.match(await box(ana), /Demandes \(1\)/);
  await ana.click('[data-cacc=u_bea]'); await wait(800); assert.match(await box(bea), /Ton rôle : Membre/, 'Bea accepted');
  // 3. Ana nomme Bea sous-chef ; Cid demande, et c'est Bea qui l'accepte
  await ana.click('[data-crole=u_bea]'); await wait(800); assert.match(await box(bea), /Ton rôle : Sous-chef/);
  await cid.click('#clanJoinBtn'); await cid.fill('#clanCode', code); await cid.click('#clanJoin'); await wait(800);
  await bea.click('[data-csub=members]'); await bea.click('[data-cacc=u_cid]'); await wait(800); assert.match(await box(cid), /Ton rôle : Membre/, 'sous-chef accepts');
  assert.ok(store['scores/u_bea'].cact.ok.includes('u_cid'), 'acceptance stored in Bea’s own document');
  // 4. Bea publie l'annonce : tout le monde la voit
  await bea.click('[data-csub=mine]'); await ana.click('[data-csub=mine]'); await bea.click('#clanMsgBtn'); await bea.fill('#clanMsgIn', 'Mission de la semaine : on y va !'); await bea.click('#clanMsgSave'); await wait(800);
  for (const p of [ana, cid]) assert.match(await box(p), /Mission de la semaine : on y va !— Bea/);
  // 5. Cid (membre) n'a aucun bouton de gestion ; s'il triche en écrivant chez Ana, la base refuse
  for (const k of ['members', 'set']) { await cid.click(`[data-csub=${k}]`); assert.strictEqual(await cid.locator('#clanBox [data-kick], #clanBox [data-crole], #clanBox [data-cgive], #clanBox #clanEdit').count(), 0, k) } await cid.click('[data-csub=mine]');
  const cheat = await cid.evaluate(async () => { try { await dbNS.doc('clans/u_ana').set({ name: 'Piraté', owner: 'u_cid' }); return 'ok' } catch (e) { return e.code } });
  assert.strictEqual(cheat, 'permission_denied'); assert.strictEqual(store['clans/u_ana'].name, 'Les Kiwis');
  // et une action qu'il s'écrit chez lui sans en avoir le droit n'a aucun effet
  await cid.evaluate(() => cactPut({ kick: ['u_bea'], edit: { name: 'Piraté', tag: 'PIR', at: Date.now() } })); await wait(800);
  assert.match(await box(ana), /Les Kiwis/); assert.match(await box(ana), /Bea/); assert.strictEqual(await clanOf(bea), 'u_ana');
  // 6. Bea retire Cid : Cid sort du clan et ne peut pas revenir
  await bea.click('[data-csub=members]'); await bea.click('[data-kick=u_cid]'); await bea.click('[data-kick=u_cid]'); await wait(900);
  assert.strictEqual(await clanOf(cid), '', 'Cid removed'); await cid.click('#clanJoinBtn'); await cid.fill('#clanCode', code); await cid.click('#clanJoin'); await wait(300);
  assert.strictEqual(await clanOf(cid), ''); await bea.locator('#clanBox .clan').screenshot({ path: 'v66-sous.png' });
  // 7. Ana passe le rôle de chef à Bea
  await ana.click('[data-csub=members]'); await ana.click('[data-cgive=u_bea]'); await ana.click('[data-cgive=u_bea]'); await wait(800); await ana.click('[data-csub=mine]'); await bea.click('[data-csub=mine]');
  assert.match(await box(ana), /Proposition envoyée à Bea/); assert.match(await box(bea), /te propose de devenir chef/);
  await bea.locator('#clanBox .clan').screenshot({ path: 'v66-offre.png' });
  await bea.click('#giveYes'); await wait(1200);
  assert.match(await box(bea), /Ton rôle : Chef/); assert.match(await box(ana), /Ton rôle : Sous-chef/);
  assert.strictEqual(await clanOf(ana), 'u_bea'); assert.strictEqual(store['clans/u_ana'].gone, true, 'old doc closed by Ana');
  const nd = store['clans/u_bea']; assert.strictEqual(nd.code, code); assert.strictEqual(nd.name, 'Les Kiwis'); assert.ok(nd.kicked.includes('u_cid'), 'Cid stays removed');
  assert.match(await box(ana), /Mission de la semaine : on y va !/); for (const p of [ana, bea]) { await p.click('[data-csub=top]'); assert.strictEqual(await p.locator('#clanBox .lblist .lbrow').count(), 1, 'no duplicate clan after the hand-over'); await p.click('[data-csub=mine]') }
  // personne ne peut s'autoproclamer chef : un faux clan "from" sans proposition n'est pas suivi
  const cid2 = cid; await cid2.evaluate(() => saveClan({ name: 'Faux', tag: 'KIWI', code: 'KIWI-0000', owner: 'u_cid', from: 'u_bea', at: Date.now() })); await wait(800);
  assert.strictEqual(await clanOf(ana), 'u_bea'); assert.strictEqual(await clanOf(bea), 'u_bea');
  await ana.locator('#clanBox .clan').screenshot({ path: 'v66-apres.png' });
  for (const p of pages) assert.deepStrictEqual(p.errs, [], p.uid);
  assert.deepStrictEqual(refused, ['u_cid→clans/u_ana']); console.log('v6.6 clans multi-comptes OK'); await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
