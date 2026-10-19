const {chromium}=require('/opt/node-tools/node_modules/playwright');const assert=require('assert');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:800}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+process.argv[2]);assert.match(await p.textContent('#msg'),/Aucune liste/);
await p.fill('#paste','pas du json');await p.click('#go');assert.match(await p.textContent('#impMsg'),/copie toute/);
const T=(id,n,tr,k)=>({id,name:n,kappaRequired:k,minPlayerLevel:1,trader:{name:tr,imageLink:null},map:null,taskRequirements:[]});
await p.fill('#paste',JSON.stringify({data:{tasks:[T('a','Débuts','Prapor',true),T('b','X','Prapor',false)]}}));await p.click('#go');
assert.match(await p.textContent('#impMsg'),/1 quêtes/);await p.reload();assert.equal(await p.locator('#list li').count(),1);
assert.deepEqual(errs,[]);console.log('ok');await b.close()})().catch(e=>{console.error(e);process.exit(1)});
