const { chromium } = require('/opt/node-tools/node_modules/playwright');const fs=require('fs');
const only=[];const assert=require('assert');
(async()=>{try{const b=await chromium.launch();const pg=await b.newPage();await pg.goto('file://'+__dirname+'/coupe.html');await pg.waitForTimeout(800);
const out=await pg.evaluate(async(only)=>{const r={},keep=ac,kg=mus.gain,kn=mus.noise;
 for(const id of Object.keys(THEMES)){if(only.length&&!only.includes(id))continue;const th=THEMES[id],SEC=8,off=new OfflineAudioContext(1,44100*SEC,44100);ac=off;mus.gain=off.createGain();mus.gain.gain.value=musVol();mus.gain.connect(off.destination);
  const nb=off.createBuffer(1,off.sampleRate,off.sampleRate),d0=nb.getChannelData(0);for(let i=0;i<d0.length;i++)d0[i]=Math.random()*2-1;mus.noise=nb;
  const sp=60/th.bpm/4;let lo=1e9,hi=0;for(let st=0,t=.05;t<SEC-1.2;st=(st+1)%64,t+=sp){const tr0=th.prog[Math.floor(st/16)%th.prog.length],deg=th.mel[(st>>1)%16],sc=th.scale;
    if(st%2===0&&deg>=0){const f=mf(th.root+12+tr0+sc[deg%sc.length]+12*Math.floor(deg/sc.length));hi=Math.max(hi,f);tone(f,t,th.bell?1.1:sp*1.8,th.wave,th.wave==='square'?.035:.07)}
    if(st%8===0){const f=mf(th.root-12+tr0);lo=Math.min(lo,f);tone(f,t,sp*(th.kick?3:7),th.bass,th.bass==='sawtooth'?.05:.11)}
    if(th.kick&&st%4===0){const o=off.createOscillator(),gn=off.createGain();o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(40,t+.15);gn.gain.setValueAtTime(.35,t);gn.gain.exponentialRampToValueAtTime(.0001,t+.2);o.connect(gn).connect(mus.gain);o.start(t);o.stop(t+.25)}
    if(th.hat&&st%4===2)hiss(t,.05,.04,'highpass',7000);if(th.sea&&st%32===0)hiss(t,sp*28,.06,'lowpass',600)}
  const buf=await off.startRendering(),d=buf.getChannelData(0);let pk=0,ss=0,clip=0,sil=0,run=0;for(let i=0;i<d.length;i++){const a=Math.abs(d[i]);pk=Math.max(pk,a);ss+=d[i]*d[i];if(a>=1)clip++;if(a<.002){run++;if(run===22050)sil++}else run=0}
  r[id]={pk:+pk.toFixed(3),rms:+Math.sqrt(ss/d.length).toFixed(4),clip,longSilences:sil,bassHz:Math.round(lo),topHz:Math.round(hi),data:only.length?Array.from(d):null}}
 ac=keep;mus.gain=kg;mus.noise=kn;return r},only);
 const old=['erable','bambou','ardoise','marbre','plage','nuit','neon','orage','automne','aquarium','chiptune','samba','epopee'].map(k=>out[k].rms),lo=Math.min(...old),hi=Math.max(...old);
 for(const k of Object.keys(out)){const v=out[k];assert.strictEqual(v.clip,0,k+' clips');assert.ok(v.pk<.6,k+' peak');assert.ok(v.longSilences<=4,k+' silent')}
 for(const k of ['disco','orgue']){const v=out[k];assert.ok(v.rms>=lo*.8&&v.rms<=hi*1.2,k+' loudness '+v.rms+' vs '+lo+'..'+hi);assert.ok(v.topHz>=300,k+' melody audible on a phone')}
 console.log('musiques OK'); await b.close()}catch(e){console.error('FAIL',e.message);process.exit(1)}})();
