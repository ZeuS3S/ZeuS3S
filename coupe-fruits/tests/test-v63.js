const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
const TIPS = '["dayBtn","modeSeg [data-v=\\"boss\\"]","passBtn","questBtn","statsBtn","pzBtn","shopBtn","boostBtn"]';
async function open(b, seed, ls) { const pg = await b.newPage({ viewport: { width: 390, height: 800 }, hasTouch: true }); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message));
  await pg.addInitScript({ path: __dirname + '/fakeclaude.js' });
  await pg.addInitScript(seed => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1'); const d = new Date(), cur = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const db = {}; for (const [k, v] of Object.entries(seed)) db[k] = k.startsWith('scores/') ? { season: cur, best: {}, ...v } : v; sessionStorage.setItem('fakedb', JSON.stringify(db)) }, seed);
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.evaluate(([ls, tips]) => { localStorage.setItem('coupe.tuto', '1'); localStorage.setItem('coupe.seen', '3.10'); localStorage.setItem('coupe.tips', tips); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v) }, [ls, TIPS]);
  await pg.reload(); await pg.waitForTimeout(1500); return pg }
const db = pg => pg.evaluate(() => JSON.parse(sessionStorage.getItem('fakedb')));
const put = (pg, k, v) => pg.evaluate(async ([k, v]) => { const d = await window.claude.use('db'); await d.doc(k).set(v) }, [k, v]);
const clans = async pg => { await pg.click('#clanBtn'); await pg.waitForTimeout(400) };
(async () => { const b = await chromium.launch();
  // ===== 1. cosmétiques de passe =====
  let pg = await open(b, {}, { 'coupe.pseudo': 'Gaby' });
  await pg.evaluate(() => { hpGrant([70, 'frame', 'citrouille']); const p = loadPass(); p.prem = true; savePass(p); grant(4, true, p); grant(12, true, p); grant(24, true, p); grant(29, true, p); savePass(p) });
  assert.deepStrictEqual(await pg.evaluate(() => ['frame_citrouille', 'frame_neon', 'trail_etoiles', 'music_disco', 'ncol_arcenciel'].map(k => unlocks().includes(k))), [true, true, true, true, true]);
  // un palier d'Halloween passé avant la mise à jour donne l'objet après coup
  await pg.evaluate(() => { localStorage.setItem('coupe.hpass', JSON.stringify({ y: new Date().getFullYear(), got: [9] })); hpCheck() });
  assert.ok(await pg.evaluate(() => unlocks().includes('trail_toile')), 'retro halloween tier');
  await pg.click('#shopBtn'); await pg.evaluate(() => __coupe.setShop('mine')); await pg.waitForTimeout(200);
  const txt = await pg.textContent('#statsBody'); for (const s of ['Cadres d’avatar', 'Couleur du pseudo', 'Traînées de lame', 'Musiques exclusives', 'Bannières de clan', '🔒 Passe premium · palier 26']) assert.ok(txt.includes(s), s);
  await pg.click('[data-cos="frame:neon"]'); await pg.click('[data-cos="ncol:arcenciel"]'); await pg.click('[data-cos="trail:etoiles"]'); await pg.click('[data-cos="music:orgue"]').catch(() => {});
  assert.ok(await pg.isDisabled('[data-cos="frame:diamant"]'), 'locked frame');
  await pg.click('[data-cos="music:disco"]'); assert.strictEqual(await pg.evaluate(() => prefs.track), 'disco');
  assert.ok(await pg.evaluate(() => curTheme() === THEMES.disco), 'disco theme plays');
  await pg.locator('h3:has-text("Cadres d’avatar")').scrollIntoViewIfNeeded(); await pg.screenshot({ path: 'v63-mine.png' });
  await pg.waitForTimeout(600); const me = (await db(pg))['scores/u_test']; assert.strictEqual(me.fr, 'neon'); assert.strictEqual(me.nc, 'arcenciel'); assert.strictEqual(me.tl, 'etoiles');
  await pg.click('#statsClose'); await pg.click('#go'); await pg.waitForTimeout(300);
  const box = await pg.locator('#cv').boundingBox(); await pg.mouse.move(box.x + 60, box.y + 300); await pg.mouse.down(); for (let i = 0; i < 12; i++) { await pg.mouse.move(box.x + 60 + i * 22, box.y + 300 + Math.sin(i) * 30); await pg.waitForTimeout(16) }
  const np = await pg.evaluate(() => parts.length); await pg.mouse.up(); assert.ok(np > 5, 'trail particles ' + np);
  // le profil public d'un autre joueur montre ses cosmétiques, et une valeur inconnue est ignorée
  await put(pg, 'scores/u_zed', { name: 'Zed', season: (await pg.evaluate(() => curSeason())), best: { 'classique.normal': 10 }, fr: 'diamant', nc: 'dore', tl: 'flammes' });
  await put(pg, 'scores/u_bad', { name: 'Bad', season: (await pg.evaluate(() => curSeason())), best: { 'classique.normal': 5 }, fr: '"><img src=x onerror=alert(1)>', nc: 'x" onclick="' });
  await pg.evaluate(() => __coupe.state().paused = true);
  await pg.waitForTimeout(400); await pg.evaluate(() => openPub('u_zed')); assert.ok(await pg.isVisible('#pubBody .avbig.fr-diamant')); assert.ok(await pg.isVisible('#pubBody .nc-dore')); assert.match(await pg.textContent('#pubBody'), /Traînée de flammes/);
  await pg.evaluate(() => openPub('u_bad')); assert.strictEqual(await pg.locator('#pubBody img').count(), 0); assert.strictEqual(await pg.locator('#pubBody [onclick]').count(), 0);
  assert.deepStrictEqual(pg.errs, []); await pg.close();

  // ===== 2. clan vu par le chef =====
  const now = Date.now();
  pg = await open(b, { 'clans/u_test': { name: 'Les Kiwis', tag: 'KIWI', color: '#2f9e5b', code: 'KIWI-1234', owner: 'u_test', kicked: [], ok: ['u_c'], roles: { u_b: 'sous' }, perms: { sous: ['invite', 'accept', 'kick', 'edit', 'msg'], membre: ['invite'] }, open: false, ban: 'royale' },
    'scores/u_test': { name: 'Gaby', clan: 'u_test' }, 'scores/u_b': { name: 'Bea', clan: 'u_test', cact: { c: 'u_test', kick: ['u_c', 'u_test'], msg: { t: 'Tous au mode Boss ce soir !', at: now } } },
    'scores/u_c': { name: 'Cid', clan: 'u_test' }, 'scores/u_d': { name: 'Dan', clan: 'u_test' } }, { 'coupe.pseudo': 'Gaby', 'coupe.clan': 'u_test' });
  await clans(pg); let t = await pg.textContent('#clanBox');
  assert.match(t, /Ton rôle : Chef/); assert.match(t, /Tous au mode Boss ce soir !— Bea/); assert.match(t, /1 demande à valider/); await pg.click('[data-csub=members]'); t = await pg.textContent('#clanBox'); assert.match(t, /Demandes \(1\)/); assert.ok(!/Cid/.test(t), 'Cid kicked by the sous-chef');
  assert.ok(/Gaby/.test(t), 'a sous-chef cannot kick the chef'); await pg.click('[data-csub=mine]');
  assert.ok(await pg.isVisible('.cban'), 'banner');
  await pg.click('[data-csub=set]'); await pg.waitForTimeout(100); await pg.screenshot({ path: 'v63-chef.png', fullPage: true });
  await pg.click('[data-csub=members]'); await pg.click('[data-cacc=u_d]'); await pg.waitForTimeout(300);
  assert.ok((await db(pg))['clans/u_test'].ok.includes('u_d'), 'chef accepts'); assert.ok((await db(pg))['clans/u_test'].kicked.includes('u_c'), 'sous kick absorbed');
  await pg.click('[data-csub=set]'); await pg.click('[data-perm="membre:msg"]'); await pg.waitForTimeout(300); assert.deepStrictEqual((await db(pg))['clans/u_test'].perms.membre.sort(), ['chat', 'invite', 'msg'], 'old grids keep the wall open');
  assert.ok(await pg.isVisible('[data-perm="membre:msg"]'), 'still on the settings tab after re-render');
  await pg.click('[data-csub=members]'); await pg.click('[data-crole=u_d]'); await pg.waitForTimeout(300); assert.strictEqual((await db(pg))['clans/u_test'].roles.u_d, 'sous');
  await pg.click('[data-csub=set]'); await pg.click('#clanOpen'); await pg.waitForTimeout(300); assert.strictEqual((await db(pg))['clans/u_test'].open, true);
  assert.deepStrictEqual(pg.errs, []); await pg.close();

  // ===== 3. clan vu par un simple membre =====
  pg = await open(b, { 'clans/u_a': { name: 'Les Pépins', tag: 'PEP', color: '#7b4dff', code: 'PEP-1234', owner: 'u_a', kicked: [], roles: { u_s: 'sous' }, perms: { sous: ['invite'], membre: [] }, open: true },
    'scores/u_a': { name: 'Ana', clan: 'u_a' }, 'scores/u_s': { name: 'Sam', clan: 'u_a', cact: { c: 'u_a', kick: ['u_test'] } }, 'scores/u_m': { name: 'Max', clan: 'u_a', cact: { c: 'u_a', kick: ['u_test'], edit: { name: 'Pirates', tag: 'PIR', at: now } } },
    'scores/u_test': { name: 'Gaby', clan: 'u_a' } }, { 'coupe.pseudo': 'Gaby', 'coupe.clan': 'u_a' });
  await clans(pg); t = await pg.textContent('#clanBox');
  assert.match(t, /Ton rôle : Membre/); assert.match(t, /Les Pépins/, 'edit without permission ignored'); assert.ok(!/Code d’invitation/.test(t), 'no invite permission → code hidden');
  await pg.click('[data-csub=members]'); assert.ok(!/Code d’invitation/.test(await pg.textContent('#clanBox'))); assert.strictEqual(await pg.locator('#clanBox [data-kick]').count(), 0);
  await pg.click('[data-csub=set]'); assert.strictEqual(await pg.locator('#clanEdit').count(), 0); assert.ok(await pg.isDisabled('[data-perm="membre:msg"]')); await pg.click('[data-csub=mine]');
  assert.strictEqual(await pg.evaluate(() => myClanId()), 'u_a', 'kicks without permission ignored');
  // le chef donne l'annonce aux membres : j'écris l'annonce, elle va dans MON document
  await put(pg, 'clans/u_a', { ...(await db(pg))['clans/u_a'], perms: { sous: ['invite'], membre: ['msg'] } }); await pg.waitForTimeout(300);
  await pg.click('#clanMsgBtn'); await pg.fill('#clanMsgIn', 'Bonne chance à tous'); await pg.click('#clanMsgSave'); await pg.waitForTimeout(500);
  const d3 = await db(pg); assert.strictEqual(d3['scores/u_test'].cact.msg.t, 'Bonne chance à tous'); assert.ok(!d3['clans/u_a'].msg, 'chef doc untouched');
  assert.match(await pg.textContent('#clanBox'), /Bonne chance à tous— Gaby/); await pg.screenshot({ path: 'v63-membre.png', fullPage: true });
  // le chef me retire : je quitte le clan
  await put(pg, 'clans/u_a', { ...(await db(pg))['clans/u_a'], kicked: ['u_test'] }); await pg.waitForTimeout(400);
  assert.strictEqual(await pg.evaluate(() => myClanId()), '', 'kicked by chef');
  assert.deepStrictEqual(pg.errs, []); await pg.close();

  // ===== 4. clan sur demande : je rejoins, j'attends, un sous-chef accepte =====
  pg = await open(b, { 'clans/u_a': { name: 'Les Pépins', tag: 'PEP', color: '#7b4dff', code: 'PEP-1234', owner: 'u_a', kicked: [], roles: { u_s: 'sous' }, open: false },
    'scores/u_a': { name: 'Ana', clan: 'u_a' }, 'scores/u_s': { name: 'Sam', clan: 'u_a' } }, { 'coupe.pseudo': 'Gaby' });
  await clans(pg); await pg.click('#clanJoinBtn'); await pg.fill('#clanCode', 'pep-1234'); await pg.click('#clanJoin'); await pg.waitForTimeout(600);
  assert.match(await pg.textContent('#clanBox'), /Demande envoyée/); await pg.screenshot({ path: 'v63-attente.png' });
  await put(pg, 'scores/u_s', { ...(await db(pg))['scores/u_s'], cact: { c: 'u_a', ok: ['u_test'] } }); await pg.waitForTimeout(500);
  assert.match(await pg.textContent('#clanBox'), /Ton rôle : Membre/); assert.match(await pg.textContent('#toasts').catch(() => ''), /Demande acceptée|/);
  assert.deepStrictEqual(pg.errs, []); console.log('v6.3 OK'); await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
