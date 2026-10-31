import { chromium } from 'playwright'; import { createServer } from 'http';
import { readFileSync, existsSync, statSync, writeFileSync } from 'fs'; import { join, extname, resolve } from 'path'; import { pathToFileURL } from 'url'; import { gzipSync } from 'zlib';
// NO EXODRA PARTICIPANT HERE. The landing app existed only for the deleted three-props
// renderer (`ssr/apps/exodra/land.mjs`); no schema-core replacement has been written, so this
// comparison is Solid vs Qwik until one is.
const DIST=resolve('ssr/dist'); const gz=s=>gzipSync(Buffer.from(s)).length;
const solid=await import(pathToFileURL(join(DIST,'solid-land/_server.mjs')).href);
const qmod=await import(pathToFileURL(join(DIST,'qwik-land/server/entry.ssr-land.js')).href);
const qman=JSON.parse(readFileSync(join(DIST,'qwik-land/manifest.json'),'utf8'));
const sr=solid.render(); const sH=`<!doctype html><html><head><meta charset=utf-8>${sr.head}</head><body><div id=app>${sr.body}</div><script type=module src=./client.js></script></body></html>`; writeFileSync(join(DIST,'solid-land/index.html'),sH);
const qr=await qmod.default({manifest:qman,base:'/build/'}); writeFileSync(join(DIST,'qwik-land/index.html'),qr.html);
const MIME={'.js':'text/javascript','.html':'text/html','.json':'application/json'};
const mk=(root,port)=>{const s=createServer((q,res)=>{let p=join(root,decodeURIComponent(q.url.split('?')[0]));if(existsSync(p)&&statSync(p).isDirectory())p=join(p,'index.html');if(!existsSync(p)){res.writeHead(404);return res.end('x');}res.writeHead(200,{'content-type':MIME[extname(p)]||'text/plain'});res.end(readFileSync(p));});return new Promise(r=>s.listen(port,()=>r(s)));};
const P={S:8292,Q:8293}; const sv={S:await mk(join(DIST,'solid-land'),P.S),Q:await mk(join(DIST,'qwik-land'),P.Q)};
const FAST_3G={offline:false,downloadThroughput:(1.6*1024*1024)/8,uploadThroughput:(750*1024)/8,latency:150};
const b=await chromium.launch({headless:true});
async function meas(url){const ts=[],fs=[];for(let r=0;r<5;r++){const ctx=await b.newContext();const pg=await ctx.newPage();const cl=await ctx.newCDPSession(pg);await cl.send('Network.enable');await cl.send('Network.emulateNetworkConditions',FAST_3G);await cl.send('Emulation.setCPUThrottlingRate',{rate:4});const t0=Date.now();await pg.goto(url,{waitUntil:'commit'});const fcp=await pg.evaluate(()=>new Promise(res=>{const s=performance.getEntriesByName('first-contentful-paint')[0];if(s)return res(s.startTime);new PerformanceObserver((l,o)=>{for(const e of l.getEntries())if(e.name==='first-contentful-paint'){o.disconnect();res(e.startTime);}}).observe({type:'paint',buffered:true});}));let tti=null;while(Date.now()-t0<40000){await pg.click('button[data-b=\"0\"]',{force:true,timeout:250}).catch(()=>{});const t=await pg.evaluate(()=>{const x=document.querySelector('button[data-b=\"0\"]');return x?x.textContent.trim():null;}).catch(()=>null);if(t&&t!=='0'){tti=Date.now()-t0;break;}}ts.push(tti??NaN);fs.push(Math.round(fcp));await ctx.close();}const md=a=>a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)];return {tti:Math.round(md(ts)),fcp:md(fs)};}
console.log('\n=== LANDING (50 static sections + 3 carousels — Qwik sweet spot) Fast 3G + CPU 4x, med 5 ===');
console.log('HTMLgz — Solid:',gz(sH),' Qwik:',gz(qr.html));
console.log('fw       FCP(ms)  TTI(ms)');
const s=await meas(`http://localhost:${P.S}/`),q=await meas(`http://localhost:${P.Q}/`);
console.log('Solid  ',String(s.fcp).padStart(6),String(s.tti).padStart(8));
console.log('Qwik   ',String(q.fcp).padStart(6),String(q.tti).padStart(8));
await b.close(); for(const x of Object.values(sv))x.close();
