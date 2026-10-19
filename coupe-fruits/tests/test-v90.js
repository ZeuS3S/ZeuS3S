const assert = require('assert');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => { const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 390, height: 844 } }); pg.on('pageerror', e => console.log('ERR', e.message));
  await pg.goto('file://' + __dirname + '/coupe.html'); await pg.evaluate(() => { localStorage.setItem('coupe.tuto', '1'); localStorage.setItem('coupe.seen', VERSION) }); await pg.reload(); await pg.waitForTimeout(1000);
  const cutEv = () => pg.evaluate(() => { const it = spawn(curEv().fruit, 200, 300, 0, 0); it.vy = 0; strokeId++; sliceSeg(100, 300, 300, 300) });
  await pg.evaluate(() => startCareer(1)); await pg.waitForTimeout(300); await cutEv(); await cutEv();
  const o = await pg.evaluate(() => S.carO.o); for (const [e, n] of Object.entries(o)) for (let i = 0; i < n; i++) await pg.evaluate(e => { const k = FRUITS.find(f => f.e === e); const it = spawn(k, 200, 300, 0, 0); it.vy = 0; strokeId++; sliceSeg(100, 300, 300, 300) }, e);
  await pg.waitForTimeout(1500); assert.strictEqual(await pg.textContent('#overTitle'), 'Commande livrée !'); if (await pg.evaluate(() => !!curEv())) assert.strictEqual(await pg.evaluate(() => pumpkins()), 2, 'event fruits count in Career'); assert.ok(await pg.evaluate(() => loadPass().xp) > 0, 'pass xp'); console.log('v90 OK');
  await b.close() })();
