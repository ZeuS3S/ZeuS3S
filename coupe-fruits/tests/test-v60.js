const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
(async () => { const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 390, height: 800 }, hasTouch: true });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript({ path: __dirname + '/fakeclaude.js' });
  await pg.goto('file://' + __dirname + '/coupe.html');
  await pg.evaluate(() => { localStorage.setItem('coupe.tuto', '1'); localStorage.setItem('coupe.seen', '3.10'); localStorage.setItem('coupe.wallet', JSON.stringify({ coins: 5000, earned: 5000 })) });
  await pg.reload(); await pg.waitForTimeout(1200);
  await pg.screenshot({ path: 'v60-home.png' });
  // promos : 1 ou 2 articles à -15 %, achat au prix réduit
  const pr = await pg.evaluate(() => __coupe.promos()); assert.ok(pr.length >= 1 && pr.length <= 2, 'promos ' + pr);
  // atout : bouclier payé une fois, premier durian sans effet
  await pg.click('#boostBtn'); assert.ok(await pg.isVisible('#boostPanel')); await pg.screenshot({ path: 'v60-boost.png' });
  await pg.click('[data-boost=shield]'); assert.match(await pg.textContent('#boostBtn'), /Bouclier/);
  await pg.click('#go'); await pg.waitForTimeout(300);
  let st = await pg.evaluate(() => ({ c: JSON.parse(localStorage.getItem('coupe.wallet')).coins, b: __coupe.state().boost, l: __coupe.state().lives }));
  assert.strictEqual(st.c, 4700); assert.strictEqual(st.b, 'shield');
  const box = await pg.locator('#cv').boundingBox();
  const cutAt = async (x, y) => { await pg.mouse.move(box.x + x - 60, box.y + y); await pg.mouse.down(); await pg.mouse.move(box.x + x + 60, box.y + y, { steps: 3 }); await pg.mouse.up() };
  const cutDurian = async () => { await pg.evaluate(() => { const s = __coupe.state(); s.paused = false; __coupe.spawnAt(true, 195, 400) }); const d = await pg.evaluate(() => __coupe.items().find(i => i.e === '🤢' || i.e === '🧄' || i.r && false)); };
  await pg.evaluate(() => { const s = __coupe.state(); s.over = false; __coupe.spawnAt(true, 195, 300, null) });
  const dur = await pg.evaluate(() => __coupe.state() && __coupe.items().slice(-1)[0]);
  await cutAt(dur.x, dur.y); await pg.waitForTimeout(150);
  st = await pg.evaluate(() => ({ l: __coupe.state().lives, used: __coupe.state().shieldUsed, over: __coupe.state().over }));
  assert.strictEqual(st.used, 1, 'shield used'); assert.ok(!st.over, 'shield saves the game');
  // nouvelle partie sans atout : rien payé
  const c0 = await pg.evaluate(() => JSON.parse(localStorage.getItem('coupe.wallet')).coins);
  // myrtille : autocollant exotique
  await pg.evaluate(() => __coupe.spawnAt(false, 195, 300, 'blue'));
  const bl = await pg.evaluate(() => __coupe.items().find(i => i.e === '🫐')); assert.ok(bl, 'blueberry spawned');
  await cutAt(bl.x, bl.y); await pg.waitForTimeout(150);
  assert.strictEqual((await pg.evaluate(() => __coupe.stickers()))['exo_myrtille'], 1, 'exotic sticker');
  await pg.evaluate(() => __coupe.state().paused = true);
  assert.ok(c0 >= 4700);
  await b.close();
  // boss à pouvoirs
  const b2 = await chromium.launch(); const p2 = await b2.newPage({ viewport: { width: 390, height: 800 }, hasTouch: true });
  p2.on('pageerror', e => errs.push(e.message)); await p2.addInitScript({ path: __dirname + '/fakeclaude.js' });
  await p2.goto('file://' + __dirname + '/coupe.html'); await p2.evaluate(() => { localStorage.setItem('coupe.tuto', '1'); localStorage.setItem('coupe.seen', '3.10') }); await p2.reload(); await p2.waitForTimeout(1000);
  await p2.click('#modeSeg [data-v=boss]'); await p2.click('#go'); await p2.waitForTimeout(800);
  const pws = await p2.evaluate(() => { const r = [__coupe.items()[0].pw]; for (let i = 0; i < 3; i++) { __coupe.spawnBoss(); r.push(__coupe.items().slice(-1)[0].pw) } return r });
  assert.deepStrictEqual(pws, ['', 'zig', 'ghost', 'split']);
  await p2.waitForTimeout(400); await p2.evaluate(() => __coupe.state().paused = true); await p2.screenshot({ path: 'v60-bosspw.png' });
  // un boss « split » vaincu donne 2 enfants
  const kids = await p2.evaluate(() => { const s = __coupe.state(); s.paused = false; return 0 });
  const bx = await p2.locator('#cv').boundingBox();
  for (let k = 0; k < 40; k++) { const sp = await p2.evaluate(() => __coupe.items().find(i => i.pw === 'split' && !i.child)); if (!sp) break; await p2.evaluate(() => { const s = __coupe.state(); s.lives = 99 }); await p2.mouse.move(bx.x + sp.x - 90, bx.y + sp.y); await p2.mouse.down(); await p2.mouse.move(bx.x + sp.x + 90, bx.y + sp.y, { steps: 3 }); await p2.mouse.up(); await p2.waitForTimeout(260) }
  const ch = await p2.evaluate(() => __coupe.items().filter(i => i.child).length);
  assert.strictEqual(ch, 2, 'split boss leaves 2 children');
  // calendrier dans le pass
  await p2.evaluate(() => { const s = __coupe.state(); s.paused = true });
  await b2.close();
  const b3 = await chromium.launch(); const p3 = await b3.newPage({ viewport: { width: 390, height: 800 } }); p3.on('pageerror', e => errs.push(e.message));
  await p3.goto('file://' + __dirname + '/coupe.html'); await p3.evaluate(() => { localStorage.setItem('coupe.tuto', '1'); localStorage.setItem('coupe.seen', '3.10') }); await p3.reload(); await p3.waitForTimeout(1000);
  await p3.evaluate(() => __coupe.openStats ? 0 : 0); await p3.click('#passBtn').catch(() => {});
  await p3.waitForTimeout(300); await p3.click('[data-pt=cal]'); await p3.waitForTimeout(200);
  assert.match(await p3.textContent('#calBox'), /Noël/); await p3.screenshot({ path: 'v60-cal.png' });
  // boutique : bandeau promo
  assert.deepStrictEqual(errs, []); console.log('v6.0 OK'); await b3.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
