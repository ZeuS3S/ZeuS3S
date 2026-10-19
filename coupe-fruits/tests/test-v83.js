const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
const TIPS = '["dayBtn","modeSeg [data-v=\\"boss\\"]","passBtn","questBtn","statsBtn","pzBtn","shopBtn","boostBtn"]';
async function open(b, ls = {}, o = {}) { const pg = await b.newPage({ viewport: { width: o.w || 390, height: 800 }, hasTouch: true }); pg.errs = []; pg.on('pageerror', e => pg.errs.push(e.message));
  if (o.we !== undefined) await pg.addInitScript(w => { window.__we = w }, o.we);
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.evaluate(([ls, tips]) => { localStorage.setItem('coupe.tuto', '1'); localStorage.setItem('coupe.seen', VERSION); localStorage.setItem('coupe.tips', tips); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v) }, [ls, TIPS]);
  await pg.reload(); await pg.waitForTimeout(1200); return pg }
(async () => { const b = await chromium.launch(); let pg;
  // ===== carte du monde =====
  pg = await open(b, { 'coupe.career': JSON.stringify({ 1: 3, 2: 3, 3: 2 }), 'coupe.avatar': '🍓' }); await pg.click('#pzBtn'); await pg.click('[data-pt2=car]'); await pg.waitForTimeout(400);
  assert.strictEqual(await pg.locator('.carpath button').count(), 5); assert.strictEqual(await pg.locator('.carplaces button').count(), 12); assert.strictEqual(await pg.locator('.carplaces button:not([disabled])').count(), 1, 'place 2 locked');
  assert.strictEqual(await pg.getAttribute('.carpath button.cur', 'data-car'), '4'); assert.strictEqual(await pg.textContent('.cur .carme'), '🍓');
  const xs = await pg.$$eval('.carpath button', e => e.map(x => x.getBoundingClientRect().left | 0)); assert.ok(new Set(xs).size >= 4, 'winding path ' + xs);
  await pg.screenshot({ path: 'v83-map.png' });
  await pg.evaluate(() => { localStorage.setItem('coupe.career', JSON.stringify({ 1: 3, 2: 3, 3: 2, 4: 1, 5: 1 })); openCareer() }); assert.strictEqual(await pg.locator('.carplaces button:not([disabled])').count(), 2, 'place 2 opens'); assert.match(await pg.textContent('.carreg h3'), /Le restaurant/, 'shows the place of the next order');
  await pg.click('[data-cw="0"]'); assert.match(await pg.textContent('.carreg h3'), /Le marché/); await pg.evaluate(() => localStorage.setItem('coupe.career', JSON.stringify({ 1: 3, 2: 3, 3: 2 }))); await pg.click('#pzClose'); await pg.click('#pzBtn'); await pg.waitForTimeout(300); await pg.click('[data-car="4"]'); await pg.waitForTimeout(300); assert.strictEqual(await pg.evaluate(() => S.career), 4); assert.deepStrictEqual(pg.errs, []); await pg.close();

  // ===== talents : fragments, étages, effets =====
  pg = await open(b);
  let r = await pg.evaluate(() => { const R = Math.random; Math.random = () => 0; for (let i = 0; i < 7; i++) talDrop(.1, 'En fin de partie'); Math.random = R; return [talPts(), talFrag()] }); assert.deepStrictEqual(r, [1, 2], '7 fragments = 1 point + 2');
  await pg.evaluate(() => localStorage.setItem('coupe.talpts', '9')); await pg.click('#statsBtn'); await pg.waitForTimeout(300);
  assert.ok(await pg.isDisabled('[data-tal=vie]'), 'tier 2 locked'); assert.match(await pg.textContent('#statsBody'), /Étage 2 · 🔒 6 points à placer/);
  for (const id of ['or', 'or', 'xp', 'xp', 'aimant', 'aimant']) await pg.click(`[data-tal=${id}]`);
  assert.ok(!(await pg.isDisabled('[data-tal=vie]')), 'tier 2 open'); await pg.click('[data-tal=vie]'); await pg.click('[data-tal=vie]'); assert.ok(await pg.isDisabled('[data-tal=vie]'), 'max 2');
  assert.ok(await pg.isDisabled('[data-tal=temps]'), 'tier 3 locked'); await pg.locator('.tal').nth(4).scrollIntoViewIfNeeded(); await pg.screenshot({ path: 'v83-tal.png' });
  // un étage sauté (sauvegarde modifiée) : tout repart à zéro
  assert.ok(await pg.evaluate(() => { localStorage.setItem('coupe.talents', JSON.stringify({ temps: 1 })); return Object.values(talents()).every(v => v === 0) }));
  await pg.evaluate(() => localStorage.setItem('coupe.talents', JSON.stringify({ or: 3, xp: 3, vie: 2, chance: 1 })));
  await pg.click('#statsClose'); await pg.evaluate(() => startCareer(1)); await pg.waitForTimeout(200);
  assert.deepStrictEqual(await pg.evaluate(() => [S.lives, S.max]), [5, 5], 'Cœur solide');
  r = await pg.evaluate(() => { const R = Math.random; Math.random = () => .95; const a = talDrop(.8, 'x'); Math.random = () => .7; const b2 = talDrop(.8, 'x'); Math.random = R; return [a, b2] }); assert.deepStrictEqual(r, [true, true], 'chance raises drop rate');
  // ===== pourboire =====
  const c0 = await pg.evaluate(() => W$().coins);
  await pg.evaluate(() => { const R = Math.random; Math.random = () => .5; tip(10, CAR_CL[0]); Math.random = R }); assert.strictEqual(await pg.evaluate(c0 => W$().coins - c0, c0), 20);
  assert.match(await pg.evaluate(() => JSON.stringify(toastQ) + document.body.textContent), /Pourboire de Mamie Rose !/); assert.deepStrictEqual(pg.errs, []); await pg.close();

  // ===== événement week-end =====
  pg = await open(b, {}, { we: 'geants' }); await pg.click('#go'); await pg.waitForTimeout(300); assert.strictEqual(await pg.evaluate(() => S.we), 'geants');
  assert.ok(await pg.evaluate(() => { const it = spawn(FRUITS[0], 100, 100, 0, 0); return it.r > R() * 1.25 }), 'giant fruits'); await pg.screenshot({ path: 'v83-we.png' }); await pg.close();
  pg = await open(b, {}, { we: 'glace' }); await pg.click('#go'); await pg.waitForTimeout(300); const n = await pg.evaluate(() => { let n = 0; for (let i = 0; i < 300; i++) { items = []; launch(); n += items.filter(i => i.kind.ice).length } return n }); assert.ok(n > 60, 'ice ' + n); await pg.close();
  pg = await open(b, {}, { we: 'averse' }); await pg.click('#go'); await pg.waitForTimeout(300); await pg.evaluate(() => { items = []; S.weT = .05 }); await pg.waitForTimeout(900); assert.ok(await pg.evaluate(() => items.filter(i => i.rain).length >= 3), 'deluge'); await pg.close();
  pg = await open(b, {}, { we: 'none' }); await pg.click('#go'); await pg.waitForTimeout(300); assert.strictEqual(await pg.evaluate(() => S.we), null);
  // calendrier : seulement du vendredi au dimanche, un week-end sur deux, la même règle les 3 jours
  r = await pg.evaluate(() => { delete window.__we; const D = Date, out = []; for (let d = 0; d < 28; d++) { const t = new D(2026, 9, 12 + d, 12); window.Date = class extends D { constructor(...a) { return a.length ? new D(...a) : new D(t) } static now() { return t.getTime() } }; const w = weNow(); out.push([t.getDay(), w ? w.id : '']) } window.Date = D; return out });
  assert.ok(r.every(([d, w]) => !w || [5, 6, 0].includes(d)), 'only fri-sun'); const on = r.filter(x => x[1]); assert.strictEqual(on.length, 6, 'two weekends out of four'); assert.ok(new Set(on.slice(0, 3).map(x => x[1])).size === 1, 'same rule all weekend');
  assert.deepStrictEqual(pg.errs, []); await pg.close();
  await b.close(); console.log('v83 OK') })().catch(e => { console.error(e); process.exit(1) });
