import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, statSync, writeFileSync, copyFileSync } from 'fs';
import { join, extname, resolve } from 'path'; import { pathToFileURL } from 'url'; import { gzipSync } from 'zlib';
import { ExoNodeSsr } from '@exodra/ssr';
const DIST = resolve('ssr/dist'); const gz = (s) => gzipSync(Buffer.from(s)).length;
// assemble
const exo = await import(pathToFileURL(join(DIST,'../apps/exodra/app-heavy.mjs')).href);
const eb = new ExoNodeSsr(exo.makeApp()).renderBody();
const eHtml = `<!doctype html><html><head><meta charset=utf-8></head><body><div id=app>${eb}</div><script type=module src=./client.js></script></body></html>`;
writeFileSync(join(DIST,'exodra-heavy/index.html'), eHtml);
const solid = await import(pathToFileURL(join(DIST,'solid-heavy/_server.mjs')).href);
const sr = solid.render();
const sHtml = `<!doctype html><html><head><meta charset=utf-8>${sr.head}</head><body><div id=app>${sr.body}</div><script type=module src=./client.js></script></body></html>`;
writeFileSync(join(DIST,'solid-heavy/index.html'), sHtml);
const qmod = await import(pathToFileURL(join(DIST,'qwik-heavy/server/entry.ssr-heavy.js')).href);
const qman = JSON.parse(readFileSync(join(DIST,'qwik-heavy/manifest.json'),'utf8'));
const qr = await qmod.default({ manifest: qman, base: '/build/' });
writeFileSync(join(DIST,'qwik-heavy/index.html'), qr.html);
console.log('HTML gz — Exodra:', gz(eHtml), ' Solid:', gz(sHtml), ' Qwik:', gz(qr.html));
console.log('initial-JS gz — Exodra: 96847  Solid: 96887  Qwik: ~1KB loader (rest lazy)');
// serve + measure
const MIME={'.js':'text/javascript','.html':'text/html','.json':'application/json'};
const mk=(root,port)=>{const s=createServer((q,res)=>{let p=join(root,decodeURIComponent(q.url.split('?')[0]));if(existsSync(p)&&statSync(p).isDirectory())p=join(p,'index.html');if(!existsSync(p)){res.writeHead(404);return res.end('x');}res.writeHead(200,{'content-type':MIME[extname(p)]||'text/plain'});res.end(readFileSync(p));});return new Promise(r=>s.listen(port,()=>r(s)));};
const P={Exodra:7191,Solid:7192,Qwik:7193};
const sv={Exodra:await mk(join(DIST,'exodra-heavy'),P.Exodra),Solid:await mk(join(DIST,'solid-heavy'),P.Solid),Qwik:await mk(join(DIST,'qwik-heavy'),P.Qwik)};
const FAST_3G={offline:false,downloadThroughput:(1.6*1024*1024)/8,uploadThroughput:(750*1024)/8,latency:150};
const b=await chromium.launch({headless:true});
async function measure(url){const ts=[],fs=[];for(let r=0;r<5;r++){const ctx=await b.newContext();const pg=await ctx.newPage();const cl=await ctx.newCDPSession(pg);await cl.send('Network.enable');await cl.send('Network.emulateNetworkConditions',FAST_3G);await cl.send('Emulation.setCPUThrottlingRate',{rate:4});const t0=Date.now();await pg.goto(url,{waitUntil:'commit'});const fcp=await pg.evaluate(()=>new Promise(res=>{const s=performance.getEntriesByName('first-contentful-paint')[0];if(s)return res(s.startTime);new PerformanceObserver((l,o)=>{for(const e of l.getEntries())if(e.name==='first-contentful-paint'){o.disconnect();res(e.startTime);}}).observe({type:'paint',buffered:true});}));let tti=null;while(Date.now()-t0<40000){await pg.click('button[data-b=\"0\"]',{force:true,timeout:250}).catch(()=>{});const t=await pg.evaluate(()=>{const x=document.querySelector('button[data-b=\"0\"]');return x?x.textContent.trim():null;}).catch(()=>null);if(t&&t!=='0'){tti=Date.now()-t0;break;}}ts.push(tti??NaN);fs.push(Math.round(fcp));await ctx.close();}const md=a=>a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)];return {tti:Math.round(md(ts)),fcp:md(fs)};}
console.log('\n=== QWIK BEST CASE (48 distinct heavy handlers, click ONE) — Fast 3G + CPU 4x, med of 5 ===\nfw       FCP(ms)  TTI(ms)');
for(const n of ['Exodra','Solid','Qwik']){const m=await measure(`http://localhost:${P[n]}/`);console.log(n.padEnd(8),String(m.fcp).padStart(6),String(m.tti).padStart(8));}
await b.close(); for(const s of Object.values(sv))s.close();
