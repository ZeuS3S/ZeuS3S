// Exporte chaque visuel de visuels.html en PNG 1080×1080 dans visuels/
const {chromium}=require('/opt/node-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1200,height:1200}});
await p.goto('file://'+__dirname+'/visuels.html');await p.evaluate(()=>document.fonts.ready);
const ok=await p.evaluate(()=>document.fonts.check('700 40px "Roboto Condensed"'));if(!ok)throw new Error('police Roboto Condensed non chargée');
require('fs').mkdirSync(__dirname+'/visuels',{recursive:true});
for(const i of[1,2,3,4,5,6,7,8,9,10])await p.locator('#v'+i).screenshot({path:`${__dirname}/visuels/sno-${i}.png`});
console.log('ok');await b.close()})().catch(e=>{console.error(e);process.exit(1)});
