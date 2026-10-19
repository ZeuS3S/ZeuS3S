const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
(async () => { const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 390, height: 800 }, hasTouch: true });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.waitForTimeout(300);
  // Ancien joueur : 5 durians déjà coupés dans les stats, nouvelle version bêta
  await pg.evaluate(() => { localStorage.setItem('coupe.seen', '3.1'); localStorage.setItem('coupe.ach', JSON.stringify({ pouah: 1 }));
    localStorage.setItem('coupe.stats', JSON.stringify({ games: 9, cut: 900, durians: 5, missed: 0, time: 600, bestCombo: 3, bestStreak: 9, modes: {}, md: {}, fruits: { '🥥': 80 }, powers: {}, history: [] })); });
  await pg.reload(); await pg.waitForTimeout(500); if (await pg.locator('#stats').isVisible()) await pg.click('#statsClose');
  await pg.click('[data-hp=prog]'); await pg.click('#chestBtn'); await pg.evaluate(() => showHome('play')); await pg.waitForTimeout(200);
  const a1 = await pg.evaluate(() => __coupe.ach());
  assert.ok(!a1.pouah, 'Pouah not given without slicing a durian'); assert.ok(!a1.cent && !a1.coco10, 'cumulative achievements restart from zero');
  assert.strictEqual((await pg.evaluate(() => JSON.parse(localStorage.getItem('coupe.achBase')))).cut, 900, 'baseline saved');
  // Première partie : tutoriel visible, puis caché après un fruit coupé
  await pg.click('#go'); await pg.waitForTimeout(200); assert.ok(await pg.locator('#tuto').isVisible(), 'tutorial shown');
  await pg.screenshot({ path: 'v22-tuto.png' });
  await pg.evaluate(() => { __coupe.state().next = 999; __coupe.state().waveT = 999; });
  const box = await pg.locator('#cv').boundingBox(); const [W, H] = await pg.evaluate(() => __coupe.size());
  const swipe = async (bad) => { await pg.evaluate(bad => { const [W, H] = __coupe.size(); __coupe.spawnAt(bad, W / 2, H / 3); }, bad); await pg.mouse.move(box.x + W / 2 - 120, box.y + H / 3 + 5); await pg.mouse.down(); await pg.mouse.move(box.x + W / 2 + 120, box.y + H / 3 + 5, { steps: 6 }); await pg.mouse.up(); };
  await swipe(false); assert.match(await pg.textContent('#tuto'), /Étape 2 sur 3/, 'guided tutorial: step 2 after the first cut'); await pg.click('#tutoSkip'); assert.strictEqual(await pg.locator('#tuto').isVisible(), false, 'tutorial skipped'); await pg.evaluate(() => { __coupe.state().next = 999 });
  assert.ok(!(await pg.evaluate(() => __coupe.ach())).pouah);
  await swipe(true); assert.ok(!(await pg.evaluate(() => __coupe.ach())).pouah, 'one durian is no longer enough for Pouah');
  // Vague spéciale
  const before = await pg.evaluate(() => __coupe.state() && document.querySelectorAll('x').length);
  await pg.evaluate(() => { __coupe.state().waveT = .01; }); await pg.waitForTimeout(700);
  const s = await pg.evaluate(() => { const s = __coupe.state(); return { banner: s.banner && s.banner.t, next: s.next } });
  assert.match(s.banner || '', /^Vague : (Rangée|Fontaine|Salve) !$/); await pg.screenshot({ path: 'v22-wave.png' });
  // Record battu en direct
  await pg.evaluate(() => { localStorage.setItem('coupe.best.classique.normal', '15'); }); await pg.reload(); await pg.waitForTimeout(400);
  await pg.click('#go'); await pg.evaluate(() => { __coupe.state().next = 999; __coupe.state().waveT = 999; }); await swipe(false); await swipe(false);
  assert.strictEqual((await pg.evaluate(() => __coupe.state())).recShown, 1, 'live record alert');
  assert.deepStrictEqual(errs, []); console.log('v2.2 OK'); await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
