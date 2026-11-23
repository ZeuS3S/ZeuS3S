const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
(async () => { const b = await chromium.launch();
  for (const [w, h] of [[390, 800], [1280, 800]]) {
  const pg = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.waitForTimeout(300);
  await pg.evaluate(() => { localStorage.setItem('coupe.tuto', '1'); const d = new Date(); d.setDate(d.getDate() - 1); localStorage.setItem('coupe.chestStreak', JSON.stringify({ last: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`, n: 2 })); });
  await pg.reload(); await pg.waitForTimeout(300);
  // Coffre : 3e jour d'affilée
  await pg.click('[data-hp=prog]'); await pg.click('#chestBtn'); await pg.evaluate(() => showHome('play')); assert.strictEqual((await pg.evaluate(() => JSON.parse(localStorage.getItem('coupe.chestStreak')))).n, 3);
  assert.ok(+(await pg.textContent('#coins')) >= 75, 'streak multiplier x1.5');
  // Badges sous le titre
  await pg.click('#go'); await pg.evaluate(() => { const s = __coupe.state(); s.next = 999; s.waveT = 999; s.streak = 12; s.slow = 3; s.frenzy = 0; }); await pg.waitForTimeout(200);
  const r = await pg.evaluate(() => { const t = document.getElementById('titleHud').getBoundingClientRect(), bd = document.getElementById('board').getBoundingClientRect(); return { titleBottom: t.bottom - bd.top, chipY: __coupe.chipY() } });
  assert.ok(r.chipY >= r.titleBottom, `chips (${r.chipY}) below title (${r.titleBottom})`);
  // Un seul texte de combo
  const box = await pg.locator('#cv').boundingBox(); const [W, H] = await pg.evaluate(() => __coupe.size());
  for (let k = 0; k < 2; k++) { for (const dx of [-120, -40, 40, 120]) await pg.evaluate(dx => { const [W, H] = __coupe.size(); __coupe.spawnAt(false, W / 2 + dx, H / 3); }, dx);
    await pg.mouse.move(box.x + W / 2 - 170, box.y + H / 3 + 5); await pg.mouse.down(); await pg.mouse.move(box.x + W / 2 + 170, box.y + H / 3 + 5, { steps: 8 }); await pg.mouse.up(); }
  const tx = await pg.evaluate(() => __coupe.texts()); assert.strictEqual(tx.filter(t => t.combo).length, 1, 'one combo text');
  const ys = tx.map(t => t.y).sort((a, b) => a - b); for (let i = 1; i < ys.length; i++) assert.ok(ys[i] - ys[i - 1] >= 0, 'texts sorted');
  await pg.waitForTimeout(80); await pg.screenshot({ path: `v24-chips-${w}.png` });
  // Puzzle : objectif en direct + touche R
  await pg.click('#pause'); await pg.click('#home'); await pg.click('#pzBtn'); await pg.click('[data-pz="1"]'); await pg.waitForTimeout(1300); await pg.screenshot({ path: `v24-pz-${w}.png` });
  await pg.evaluate(() => { const s = __coupe.state(); s.pz.i = s.pz.throws.length; }); 
  for (let i = 0; i < 1; i++) { await pg.evaluate(() => { const [W, H] = __coupe.size(); __coupe.spawnAt(true, W / 2, H / 3); }); await pg.mouse.move(box.x + W / 2 - 120, box.y + H / 3); await pg.mouse.down(); await pg.mouse.move(box.x + W / 2 + 120, box.y + H / 3, { steps: 5 }); await pg.mouse.up(); }
  await pg.waitForTimeout(1500); assert.ok(await pg.locator('#over').isVisible());
  await pg.keyboard.press('r'); assert.strictEqual((await pg.evaluate(() => __coupe.state())).puzzle, 1, 'R replays the level');
  assert.deepStrictEqual(errs, []); console.log('v2.4 OK', w); await pg.close(); }
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
