import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, statSync, writeFileSync } from 'fs';
import { join, extname, resolve } from 'path'; import { pathToFileURL } from 'url'; import { gzipSync } from 'zlib';
import { ExoNodeSsr } from '@exodra/ssr';
const DIST=resolve('ssr/dist'); const gz=s=>gzipSync(Buffer.from(s)).length;
const exo=await import(pathToFileURL(join(DIST,'../apps/exodra/todo.mjs')).href);
const solid=await import(pathToFileURL(join(DIST,'solid-todo/_server.mjs')).href);
const qmod=await import(pathToFileURL(join(DIST,'qwik-todo/server/entry.ssr-todo.js')).href);
const qman=JSON.parse(readFileSync(join(DIST,'qwik-todo/manifest.json'),'utf8'));
const MIME={'.js':'text/javascript','.html':'text/html','.json':'application/json'};
const mk=(root,port)=>{const s=createServer((q,res)=>{let p=join(root,decodeURIComponent(q.url.split('?')[0]));if(existsSync(p)&&statSync(p).isDirectory())p=join(p,'index.html');if(!existsSync(p)){res.writeHead(404);return res.end('x');}res.writeHead(200,{'content-type':MIME[extname(p)]||'text/plain'});res.end(readFileSync(p));});return new Promise(r=>s.listen(port,()=>r(s)));};
const P={E:8191,S:8192,Q:8193};
const sv={E:await mk(join(DIST,'exodra-todo'),P.E),S:await mk(join(DIST,'solid-todo'),P.S),Q:await mk(join(DIST,'qwik-todo'),P.Q)};
const FAST_3G={offline:false,downloadThroughput:(1.6*1024*1024)/8,uploadThroughput:(750*1024)/8,latency:150};
const b=await chromium.launch({headless:true});
async function meas(url){const ts=[],fs=[];for(let r=0;r<5;r++){const ctx=await b.newContext();const pg=await ctx.newPage();const cl=await ctx.newCDPSession(pg);await cl.send('Network.enable');await cl.send('Network.emulateNetworkConditions',FAST_3G);await cl.send('Emulation.setCPUThrottlingRate',{rate:4});const t0=Date.now();await pg.goto(url,{waitUntil:'commit'});const fcp=await pg.evaluate(()=>new Promise(res=>{const s=performance.getEntriesByName('first-contentful-paint')[0];if(s)return res(s.startTime);new PerformanceObserver((l,o)=>{for(const e of l.getEntries())if(e.name==='first-contentful-paint'){o.disconnect();res(e.startTime);}}).observe({type:'paint',buffered:true});}));let tti=null;while(Date.now()-t0<45000){await pg.click('button[data-b=\"0\"]',{force:true,timeout:250}).catch(()=>{});const t=await pg.evaluate(()=>{const x=document.querySelector('button[data-b=\"0\"]');return x?x.textContent.trim():null;}).catch(()=>null);if(t&&t!=='0'){tti=Date.now()-t0;break;}}ts.push(tti??NaN);fs.push(Math.round(fcp));await ctx.close();}const md=a=>a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)];return {tti:Math.round(md(ts)),fcp:md(fs)};}
console.log('\n=== REALISTIC TODO (cards+tags+nested comments+authors) — Fast 3G + CPU 4x, med 5 ===');
console.log('  N   | TTI: Exo   Solid   Qwik  | HTMLgz: Exo    Solid    Qwik');
for(const N of [200,1000]){
  globalThis.__N__=N;
  const eb=new ExoNodeSsr(exo.makeApp()).renderBody();
  const eH=`<!doctype html><html><head><meta charset=utf-8><script>window.__N__=${N}</script></head><body><div id=app>${eb}</div><script type=module src=./client.js></script></body></html>`; writeFileSync(join(DIST,'exodra-todo/index.html'),eH);
  const sr=solid.render();
  const sH=`<!doctype html><html><head><meta charset=utf-8><script>window.__N__=${N}</script>${sr.head}</head><body><div id=app>${sr.body}</div><script type=module src=./client.js></script></body></html>`; writeFileSync(join(DIST,'solid-todo/index.html'),sH);
  const qr=await qmod.default({manifest:qman,base:'/build/'}); writeFileSync(join(DIST,'qwik-todo/index.html'),qr.html);
  const e=await meas(`http://localhost:${P.E}/`), s=await meas(`http://localhost:${P.S}/`), q=await meas(`http://localhost:${P.Q}/`);
  console.log(String(N).padStart(5),'|',String(e.tti).padStart(6),String(s.tti).padStart(6),String(q.tti).padStart(6),' |',String(gz(eH)).padStart(7),String(gz(sH)).padStart(8),String(gz(qr.html)).padStart(8));
}
await b.close(); for(const s of Object.values(sv))s.close();
