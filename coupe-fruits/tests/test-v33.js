const { chromium } = require('/opt/node-tools/node_modules/playwright');
const assert = require('assert'); const { spawn } = require('child_process');
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', '8733', '-d', '/home/user/ZeuS3S/coupe-fruits'], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 800));
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 760 } });
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://localhost:8733/'); await pg.evaluate(() => navigator.serviceWorker.ready);
  const man = await (await pg.request.get('http://localhost:8733/manifest.webmanifest')).json(); assert.strictEqual(man.icons.length, 2);
  for (const i of man.icons) assert.strictEqual((await pg.request.get('http://localhost:8733/' + i.src)).status(), 200);
  await pg.reload(); await pg.waitForTimeout(1500); // second chargement : le service worker remplit le cache
  // chargement court pour un habitué
  await pg.evaluate(() => localStorage.setItem('coupe.tuto', '1')); const t0 = Date.now(); await pg.reload();
  await pg.waitForFunction(() => document.querySelector('#splash').classList.contains('gone')); console.log('splash habitué ms', Date.now() - t0);
  // hors ligne : le jeu se recharge et se lance
  await ctx.setOffline(true); await pg.reload(); await pg.waitForTimeout(1200);
  assert.ok(await pg.locator('#go').isVisible(), 'jeu hors ligne'); await pg.click('#go'); await pg.waitForTimeout(500);
  assert.ok(await pg.evaluate(() => __coupe.state().running));
  console.log('errs', errs.filter(e => !/supabase|fetch|network/i.test(e)));
  await b.close(); srv.kill(); console.log('v3.3 site OK');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
