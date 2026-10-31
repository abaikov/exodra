import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, statSync, writeFileSync } from 'fs';
import { join, extname, resolve } from 'path'; import { pathToFileURL } from 'url';
const DIST = resolve('ssr/dist');
const solid = await import(pathToFileURL(join(DIST,'solid/_server.mjs')).href);
// Marko 6. Its `__HYDMS__` is the cost of `initEmbedded` — walking the resume
// comments and attaching state/listeners. It is NOT the same work as Solid's:
// Solid rebuilds the app and matches it against the DOM, Marko deserialises scopes
// it never rebuilds. Both are "time until the SSR tree is wired", which is what this
// column measures; the HTML each paid for that is in `measure.mjs`'s HTMLgz column
// and is where the difference is bought.
const mko = await import(pathToFileURL(join(DIST,'marko/_server.mjs')).href);
// Exodra (the schema core): the same wiring function rendered here and ADOPTED there. Its
// `__HYDMS__` is the purest reading in this table of what hydration costs when nothing is
// rebuilt — no clone, no parse, no comparison against the DOM, just the walk plan replayed
// over the server's nodes plus the listeners and subscriptions markup cannot carry.
const sch = await import(pathToFileURL(join(DIST,'exodra/_server.mjs')).href);
// Mikado 0.8.400. Its `__HYDMS__` covers the WHOLE of what
// its page does before it can react: compile the template in the browser (Mikado's runtime
// compiler — this participant has no build step), adopt `<ul>`'s children as the view's
// instances, derive the factory from a clone of the first row (which is also what registers
// the one delegated click listener), and allocate the store. What it does NOT cover is a
// row's address table: Mikado builds that on the row's FIRST click and memoises it, so part
// of this column's work has been moved into the click for every row but the one clicked.
const mik = await import(pathToFileURL(join(DIST,'mikado/_server.mjs')).href);
const MIME={'.js':'text/javascript','.html':'text/html'};
const mk=(root,port)=>{const s=createServer((q,res)=>{let p=join(root,decodeURIComponent(q.url.split('?')[0]));if(existsSync(p)&&statSync(p).isDirectory())p=join(p,'index.html');if(!existsSync(p)){res.writeHead(404);return res.end('x');}res.writeHead(200,{'content-type':MIME[extname(p)]||'text/plain'});res.end(readFileSync(p));});return new Promise(r=>s.listen(port,()=>r(s)));};
const ss=await mk(join(DIST,'solid'),6192), sm=await mk(join(DIST,'marko'),6194), ssch=await mk(join(DIST,'exodra'),6195), smik=await mk(join(DIST,'mikado'),6196);
const b=await chromium.launch({headless:true});
async function hyd(url){ const ms=[]; for(let r=0;r<3;r++){ const pg=await (await b.newContext()).newPage(); await pg.goto(url,{waitUntil:'load'}); await pg.waitForFunction('window.__HYDMS__!==undefined',{timeout:60000}); ms.push(await pg.evaluate('window.__HYDMS__')); await pg.context().close(); } ms.sort((a,c)=>a-c); return Math.round(ms[1]); }
console.log('\n=== HYDRATION CPU (ms, no throttle, median of 3) — time to wire the SSR tree ===\n  N   | Exodra  Solid  Qwik  Marko  Mikado');
for(const N of [1000,5000,15000,30000]){
  globalThis.__N__=N;
  const sr=solid.render();
  writeFileSync(join(DIST,'solid/index.html'),`<!doctype html><html><head><meta charset=utf-8><script>window.__N__=${N}</script>${sr.head}</head><body><div id=app>${sr.body}</div><script type=module src=./client.js></script></body></html>`);
  writeFileSync(join(DIST,'marko/index.html'),`<!doctype html><html><head><meta charset=utf-8><script>window.__N__=${N}</script></head><body><div id=app>${mko.renderBody()}</div><script type=module src=./client.js></script></body></html>`);
  writeFileSync(join(DIST,'exodra/index.html'),`<!doctype html><html><head><meta charset=utf-8><script>window.__N__=${N}</script></head><body><div id=app>${sch.renderBody()}</div><script type=module src=./client.js></script></body></html>`);
  // The same shell for everyone, `__N__` inline script included even though Mikado's client
  // never reads it — it counts the rows the server actually sent (`view.length` after mount).
  writeFileSync(join(DIST,'mikado/index.html'),`<!doctype html><html><head><meta charset=utf-8><script>window.__N__=${N}</script></head><body><div id=app>${mik.renderBody()}</div><script type=module src=./client.js></script></body></html>`);
  const s2=await hyd('http://localhost:6192/'), m=await hyd('http://localhost:6194/'), k=await hyd('http://localhost:6195/'), mk2=await hyd('http://localhost:6196/');
  console.log(String(N).padStart(6),'|',String(k).padStart(6),String(s2).padStart(6),'    0 (resume)',String(m).padStart(6),String(mk2).padStart(6));
}
await b.close(); ss.close(); sm.close(); ssch.close(); smik.close();
