const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
(async () => { const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 390, height: 800 }, hasTouch: true });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.evaluate(() => localStorage.setItem('coupe.tuto', '1')); await pg.reload(); await pg.waitForTimeout(1400);
  await pg.click('#modeSeg [data-v=vagues]'); await pg.click('#go');
  // Partie de Vagues jouée vite au doigt : 50 coups rapides, vague 6 en 25 s -> rien de suspect
  await pg.evaluate(() => { const s = __coupe.state(); Object.assign(s, { strokes: 50, botStrokes: 30, wave: 6, real: 25, wallD: 25 }); });
  assert.deepStrictEqual(await pg.evaluate(() => __coupe.verdict()), [], 'fast human play is not flagged');
  // 50 vrais coups de doigt rapides : aucun n'est compté comme robot
  const box = await pg.locator('#cv').boundingBox();
  for (let i = 0; i < 50; i++) { const y = box.y + 200 + (i % 10) * 30; await pg.mouse.move(box.x + 60, y); await pg.mouse.down(); await pg.mouse.move(box.x + 200, y + 8, { steps: 4 }); await pg.mouse.up(); }
  const s = await pg.evaluate(() => __coupe.state()); assert.ok(s.strokes >= 50 + 50 - 1); 
  // Soft flag : la partie garde ses pièces et son XP
  await pg.evaluate(() => { const s = __coupe.state(); s.strokes = 100; s.botStrokes = 99; __coupe.addPts(500); s.timeLeft = .05; }); await pg.waitForTimeout(1600);
  assert.match(await pg.textContent('#overSus'), /tu gardes tes pièces/); assert.ok(+(await pg.textContent('#coins')) >= 50, 'coins kept');
  assert.deepStrictEqual(errs, []); console.log('anti-triche allégé OK'); await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
