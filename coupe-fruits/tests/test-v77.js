// Rayons de la boutique : un vrai toucher (et un vrai clic) change de rayon, dans tous les sens, sur grand et petit écran.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert');
(async () => { const b = await chromium.launch();
  for (const [w, h] of [[390, 800], [320, 568]]) for (const how of ['tap', 'click']) { const pg = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true }); const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.goto('file://' + __dirname + '/coupe.html'); await pg.evaluate(() => { localStorage.setItem('coupe.tuto', '1'); localStorage.setItem('coupe.seen', VERSION); localStorage.setItem('coupe.tips', '["dayBtn","modeSeg [data-v=\\"boss\\"]","passBtn","questBtn","statsBtn","pzBtn","shopBtn","boostBtn","clanBtn"]') }); await pg.reload(); await pg.waitForTimeout(1200);
    await pg.click('#shopBtn'); await pg.waitForTimeout(300);
    for (const c of ['coupe', 'durian', 'planche', 'durian', 'coupe', 'mine', 'planche']) { const r = await pg.evaluate(c => { const e = document.querySelector(`[data-cat=${c}]`); e.scrollIntoView({ block: 'nearest' }); const bx = e.getBoundingClientRect(); return { x: bx.x + bx.width / 2, y: bx.y + bx.height / 2 } }, c);
      if (how === 'tap') await pg.touchscreen.tap(r.x, r.y); else await pg.mouse.click(r.x, r.y); await pg.waitForTimeout(250);
      assert.strictEqual(await pg.evaluate(() => document.querySelector('[data-cat][aria-pressed=true]').dataset.cat), c, `${how} ${c} at ${w}px`) }
    assert.deepStrictEqual(errs, []); await pg.close() }
  console.log('v7.7 boutique OK'); await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
