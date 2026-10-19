const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
const TIPS = '["dayBtn","modeSeg [data-v=\\"boss\\"]","passBtn","questBtn","statsBtn","pzBtn","shopBtn","boostBtn"]';
(async () => { const b = await chromium.launch(); const store = {}, pages = [], refused = [];
  const emit = () => { for (const p of pages) p.evaluate(s => window.__dbEmit && window.__dbEmit(s), store).catch(() => {}) };
  async function account(uid, name) { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await ctx.exposeFunction('__dbGet', () => store);
    await ctx.exposeFunction('__dbSet', (p, d) => { if (p.split('/')[1] !== uid && !p.startsWith('data/users/' + uid + '/')) { refused.push(uid + '→' + p); return 'permission_denied' } store[p] = d; setTimeout(emit, 30); return '' });
    await ctx.addInitScript(u => { window.__UID = u }, uid); await ctx.addInitScript({ path: __dirname + '/sharedb.js' });
    const pg = await ctx.newPage(); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message)); pages.push(pg);
    await pg.goto('file://' + __dirname + '/coupe.html'); await pg.evaluate(([n, tips]) => { localStorage.setItem('coupe.tuto', '1'); localStorage.setItem('coupe.seen', '3.10'); localStorage.setItem('coupe.tips', tips); localStorage.setItem('coupe.pseudo', n) }, [name, TIPS]);
    await pg.reload(); await pg.waitForTimeout(1200); await pg.click('#clanBtn'); await pg.waitForTimeout(300); pg.uid = uid; return pg }
  const box = pg => pg.textContent('#clanBox'), wait = (ms = 500) => new Promise(r => setTimeout(r, ms)), clanOf = pg => pg.evaluate(() => myClanId());
  const ana = await account('u_ana', 'Ana'), bea = await account('u_bea', 'Bea');
  await ana.click('#clanNew'); await ana.fill('#clanName', 'Les Kiwis'); await ana.fill('#clanTag', 'kiwi'); await ana.click('#clanSave'); await wait();
  const code = store['clans/u_ana'].code; await bea.click('#clanJoinBtn'); await bea.fill('#clanCode', code); await bea.click('#clanJoin'); await wait(800);
  assert.strictEqual(await ana.locator('.ctabs [role=tab]').count(), 6, '6 clan tabs for a member'); assert.strictEqual(await clanOf(bea), 'u_ana');
  // Bea écrit dans le chat (Entrée, puis une réaction rapide)
  await bea.click('[data-csub=chat]'); assert.match(await box(bea), /Aucun message/);
  await bea.fill('#chatIn', 'Salut la team !'); await bea.press('#chatIn', 'Enter'); await wait(1700);
  await bea.click('[data-qe="🔥"]'); assert.strictEqual(await bea.inputValue('#chatIn'), '🔥'); await bea.click('#chatSend'); await wait(800);
  assert.deepStrictEqual(store['scores/u_bea'].cact.wall.map(w => w.t), ['Salut la team !', '🔥'], 'messages stored in Bea’s own document');
  // trop vite : le 2e message part pas
  await wait(1000); await bea.fill('#chatIn', 'un'); await bea.press('#chatIn', 'Enter'); await bea.fill('#chatIn', 'deux'); await bea.press('#chatIn', 'Enter'); await wait(800);
  assert.deepStrictEqual(store['scores/u_bea'].cact.wall.map(w => w.t).slice(-2), ['🔥', 'un'], 'anti-spam: 1 message every 1.5 s');
  // Ana voit la pastille sur le bouton Clan et l'onglet Chat, puis lit
  assert.ok(await ana.isVisible('#clanDot'), 'dot on the clan button'); assert.match(await ana.textContent('.ctabs [data-csub=chat]'), /3/); assert.match(await box(ana), /Chat · 3 nouveaux/);
  await ana.click('[data-csub=chat]'); await wait(300); assert.ok(await ana.isHidden('#clanDot'), 'read'); assert.strictEqual(await ana.locator('.cbadge').count(), 0);
  let t = await box(ana); assert.ok(t.indexOf('Salut la team !') < t.indexOf('un'), 'oldest at the top'); assert.match(t, /Aujourd’hui/); assert.match(t, /🙂 Bea/);
  // Ana répond ; Bea voit le message du chef
  await ana.fill('#chatIn', 'Bienvenue Bea 👑'); await ana.press('#chatIn', 'Enter'); await wait(800); assert.match(await box(bea), /👑 Ana.*Bienvenue Bea 👑/s);
  assert.strictEqual(await bea.locator('[data-chide]').count(), 0, 'a member cannot hide messages');
  await bea.locator('#clanBox .clan').screenshot({ path: 'v70-chat-bea.png' });
  // Ana masque le message « un » : il disparaît chez tout le monde
  const key = 'u_bea:' + store['scores/u_bea'].cact.wall.find(w => w.t === 'un').at; await ana.click(`[data-chide="${key}"]`); await wait(800);
  for (const p of [ana, bea]) assert.ok(!/\bun\b/.test((await box(p)).replace(/Bienvenue/g, '')), 'hidden for ' + p.uid);
  assert.ok(store['clans/u_ana'].hid.includes(key));
  // 15 messages gardés par joueur
  await bea.evaluate(async () => { for (let i = 0; i < 17; i++) { const a = cactGet(); cactPut({ wall: [...(a.wall || []), { t: 'm' + i, at: Date.now() + i }].slice(-15) }) } }); await wait(900);
  assert.strictEqual(store['scores/u_bea'].cact.wall.length, 15); assert.ok(/m16/.test(await box(ana)) && !/\bm0\b/.test(await box(ana)));
  // le chat reste collé en bas quand un message arrive
  assert.ok(await ana.evaluate(() => { const c = $('cchat'); return c.scrollHeight - c.scrollTop - c.clientHeight < 40 }), 'stuck to the bottom');
  await ana.locator('#clanBox .clan').screenshot({ path: 'v70-chat-ana.png' });
  // le chef coupe le chat aux membres
  await ana.click('[data-csub=set]'); await ana.click('[data-perm="membre:chat"]'); await wait(800); assert.match(await box(bea), /Le chef n’a pas ouvert le chat à ton rôle/);
  // annonce : au-dessus de la carte du clan, supprimable par qui a le droit d'écrire l'annonce
  await ana.click('[data-csub=mine]'); await bea.click('[data-csub=mine]');
  await ana.click('#clanMsgBtn'); await ana.fill('#clanMsgIn', 'Tournoi samedi 20 h !'); await ana.click('#clanMsgSave'); await wait(800);
  for (const p of [ana, bea]) { assert.ok(await p.evaluate(() => { const a = document.querySelector('#clanBox .cann'), c = document.querySelector('#clanBox .clan'); return !!a && !!c && (a.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING) > 0 }), 'announcement above the clan card for ' + p.uid); assert.match(await p.textContent('#clanBox .cann'), /Tournoi samedi 20 h !— Ana/) }
  assert.strictEqual(await bea.locator('#clanMsgDel').count(), 0, 'a member without the right cannot delete it');
  await ana.locator('#clanBox').screenshot({ path: 'v71-annonce.png' });
  await ana.click('#clanMsgDel'); assert.match(await ana.textContent('#clanMsgDel'), /Confirmer/); await ana.click('#clanMsgDel'); await wait(800);
  for (const p of [ana, bea]) assert.strictEqual(await p.locator('#clanBox .cann').count(), 0, 'deleted for ' + p.uid);
  assert.ok(await ana.isVisible('#clanMsgBtn'), 'can write a new one');
  // une sous-cheffe peut supprimer l'annonce du chef
  await ana.click('#clanMsgBtn'); await ana.fill('#clanMsgIn', 'Annonce du chef'); await ana.click('#clanMsgSave'); await wait(600);
  await ana.click('[data-csub=members]'); await ana.click('[data-crole=u_bea]'); await wait(800); await ana.click('[data-csub=mine]');
  await bea.click('#clanMsgDel'); await bea.click('#clanMsgDel'); await wait(800);
  for (const p of [ana, bea]) assert.strictEqual(await p.locator('#clanBox .cann').count(), 0, 'sous-chef deleted it for ' + p.uid);
  await ana.locator('#clanBox').screenshot({ path: 'v70-home.png' });
  for (const p of pages) assert.deepStrictEqual(p.errs, [], p.uid);
  console.log('v7.0 chat OK'); await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
