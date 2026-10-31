import { chromium } from 'playwright'; import { createServer } from 'http';
import { readFileSync, existsSync, statSync, writeFileSync } from 'fs'; import { join, extname, resolve } from 'path'; import { pathToFileURL } from 'url';
const DIST=resolve('ssr/dist');
const MIME={'.js':'text/javascript','.html':'text/html','.json':'application/json'};
const mk=(root,port)=>{const s=createServer((q,res)=>{let p=join(root,decodeURIComponent(q.url.split('?')[0]));if(existsSync(p)&&statSync(p).isDirectory())p=join(p,'index.html');if(!existsSync(p)){res.writeHead(404);return res.end('x');}res.writeHead(200,{'content-type':MIME[extname(p)]||'text/plain'});res.end(readFileSync(p));});return new Promise(r=>s.listen(port,()=>r(s)));};
// render N=1000 for uniform + todo
const N=1000; globalThis.__N__=N;
// Exodra's participant is the schema core, built by `node ssr/build/build-exodra.mjs`.
const uexo=await import(pathToFileURL(join(DIST,'exodra/_server.mjs')).href);
const usolid=await import(pathToFileURL(join(DIST,'solid/_server.mjs')).href);
const uqwik=await import(pathToFileURL(join(DIST,'qwik/server/entry.ssr.js')).href);
const uqman=JSON.parse(readFileSync(join(DIST,'qwik/manifest.json'),'utf8'));
const tsolid=await import(pathToFileURL(join(DIST,'solid-todo/_server.mjs')).href);
const tqwik=await import(pathToFileURL(join(DIST,'qwik-todo/server/entry.ssr-todo.js')).href);
const tqman=JSON.parse(readFileSync(join(DIST,'qwik-todo/manifest.json'),'utf8'));
function wr(dir,html){writeFileSync(join(DIST,dir,'index.html'),html);}
const shell=(head,body)=>`<!doctype html><html><head><meta charset=utf-8><script>window.__N__=${N}</script>${head}</head><body><div id=app>${body}</div><script type=module src=./client.js></script></body></html>`;
globalThis.__N__=N;
wr('exodra',shell('',uexo.renderBody()));
let s=usolid.render(); wr('solid',shell(s.head,s.body));
wr('qwik',(await uqwik.default({manifest:uqman,base:'/build/'})).html);
s=tsolid.render(); wr('solid-todo',shell(s.head,s.body));
wr('qwik-todo',(await tqwik.default({manifest:tqman,base:'/build/'})).html);
// NOTE: the TODO half has NO Exodra participant. The only Exodra SSR app that exists is the
// uniform list (`ssr/apps/exodra/`); the todo app belonged to the deleted renderer, and no
// schema-core replacement has been written for it.
const dirs={U:['exodra','solid','qwik'],T:['solid-todo','qwik-todo']};
const ports={}; let pp=9200; const sv=[];
for(const k of ['U','T']) for(const d of dirs[k]){ports[d]=pp; sv.push(await mk(join(DIST,d),pp)); pp++;}
const BROADBAND={offline:false,downloadThroughput:(30*1024*1024)/8,uploadThroughput:(15*1024*1024)/8,latency:20};
const b=await chromium.launch({headless:true});
async function meas(url){const ts=[];for(let r=0;r<5;r++){const ctx=await b.newContext();const pg=await ctx.newPage();const cl=await ctx.newCDPSession(pg);await cl.send('Network.enable');await cl.send('Network.emulateNetworkConditions',BROADBAND);await cl.send('Emulation.setCPUThrottlingRate',{rate:1});const t0=Date.now();await pg.goto(url,{waitUntil:'commit'});let tti=null;while(Date.now()-t0<20000){await pg.click('button[data-b=\"0\"]',{force:true,timeout:150}).catch(()=>{});const t=await pg.evaluate(()=>{const x=document.querySelector('button[data-b=\"0\"]');return x?x.textContent.trim():null;}).catch(()=>null);if(t&&t!=='0'){tti=Date.now()-t0;break;}}ts.push(tti??NaN);await ctx.close();}const md=a=>a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)];return Math.round(md(ts));}
console.log('\n=== FAST INTERNET (Broadband 30Mbit, 20ms, CPU 1x) — TTI ms, N=1000, median 5 ===');
console.log("app              Exodra  Solid   Qwik    (Exodra's todo participant is not implemented — see the note above)");
const LABEL={exodra:'Exodra','solid':'Solid','qwik':'Qwik','solid-todo':'Solid','qwik-todo':'Qwik'};
for(const [name,k] of [['Uniform list','U'],['Todo (cards)','T']]){
  const cells={Exodra:'  n/a',Solid:'  n/a',Qwik:'  n/a'};
  for(const d of dirs[k]) cells[LABEL[d]]=String(await meas(`http://localhost:${ports[d]}/`));
  console.log(name.padEnd(16),cells.Exodra.padStart(6),cells.Solid.padStart(6),cells.Qwik.padStart(6));
}
await b.close(); for(const x of sv)x.close();
