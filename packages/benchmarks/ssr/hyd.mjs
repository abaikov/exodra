import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, statSync, writeFileSync } from 'fs';
import { join, extname, resolve } from 'path'; import { pathToFileURL } from 'url';
import { ExoNodeSsr } from '@exodra/ssr';
const DIST = resolve('ssr/dist');
const solid = await import(pathToFileURL(join(DIST,'solid/_server.mjs')).href);
const exo = await import(pathToFileURL(join(DIST,'../apps/exodra/app.mjs')).href);
const MIME={'.js':'text/javascript','.html':'text/html'};
const mk=(root,port)=>{const s=createServer((q,res)=>{let p=join(root,decodeURIComponent(q.url.split('?')[0]));if(existsSync(p)&&statSync(p).isDirectory())p=join(p,'index.html');if(!existsSync(p)){res.writeHead(404);return res.end('x');}res.writeHead(200,{'content-type':MIME[extname(p)]||'text/plain'});res.end(readFileSync(p));});return new Promise(r=>s.listen(port,()=>r(s)));};
const se=await mk(join(DIST,'exodra'),6191), ss=await mk(join(DIST,'solid'),6192);
const b=await chromium.launch({headless:true});
async function hyd(url){ const ms=[]; for(let r=0;r<3;r++){ const pg=await (await b.newContext()).newPage(); await pg.goto(url,{waitUntil:'load'}); await pg.waitForFunction('window.__HYDMS__!==undefined',{timeout:60000}); ms.push(await pg.evaluate('window.__HYDMS__')); await pg.context().close(); } ms.sort((a,c)=>a-c); return Math.round(ms[1]); }
console.log('\n=== HYDRATION CPU (ms, no throttle, median of 3) — time to wire the SSR tree ===\n  N   | Exodra  Solid  Qwik');
for(const N of [1000,5000,15000,30000]){
  globalThis.__N__=N;
  const eb=new ExoNodeSsr(exo.makeApp()).renderBody();
  writeFileSync(join(DIST,'exodra/index.html'),`<!doctype html><html><head><meta charset=utf-8><script>window.__N__=${N}</script></head><body><div id=app>${eb}</div><script type=module src=./client.js></script></body></html>`);
  const sr=solid.render();
  writeFileSync(join(DIST,'solid/index.html'),`<!doctype html><html><head><meta charset=utf-8><script>window.__N__=${N}</script>${sr.head}</head><body><div id=app>${sr.body}</div><script type=module src=./client.js></script></body></html>`);
  const e=await hyd('http://localhost:6191/'), s=await hyd('http://localhost:6192/');
  console.log(String(N).padStart(6),'|',String(e).padStart(6),String(s).padStart(6),'    0 (resume)');
}
await b.close(); se.close(); ss.close();
