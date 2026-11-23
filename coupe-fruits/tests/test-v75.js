// Tout ce que le joueur voit en anglais est traduit (le robot crawl2 parcourt les écrans, en octobre, novembre et aujourd'hui).
const { execFileSync } = require('child_process'); const fs = require('fs'); const assert = require('assert');
try { for (const m of ['', '2026-10-20T15:00:00', '2026-11-12T15:00:00']) { for (const f of fs.readdirSync(__dirname).filter(f => /^missing/.test(f))) fs.unlinkSync(__dirname + '/' + f); execFileSync('node', [__dirname + '/crawl2.js', ...(m ? [m] : [])], { timeout: 380000, stdio: 'pipe' });
    const xs = fs.readdirSync(__dirname).filter(f => /^missing/.test(f)).flatMap(f => fs.readFileSync(__dirname + '/' + f, 'utf8').split('\n')).filter(Boolean);
    const fr = /[àâçéèêëîïôûùüœ«»]|\b(le|la|les|de|du|des|une?|et|ton|ta|tes|pour|avec|sans|au|aux|est|sur|dans|pas|vies?|pièces?|membres?|niveau|palier|jours?|tous|plus|moins|qui|que|tu|à|chef|monde)\b/i;
    const left = [...new Set(xs)].filter(x => fr.test(x) && x !== '🌍 Français'); assert.deepStrictEqual(left, [], 'untranslated ' + (m || 'today')) }
  console.log('v7.5 traduction OK') } catch (e) { console.error('FAIL', e.message.slice(0, 600)); process.exit(1) }
