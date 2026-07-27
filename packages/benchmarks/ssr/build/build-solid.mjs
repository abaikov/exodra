import { solidPlugin, sizes, writeIndex, bundle } from './lib.mjs';
import { readFileSync } from 'fs';
import { pathToFileURL } from 'url';

// 1) server render (ssr compile) — bundle to a node module, import, run
await bundle({ entryPoints:['ssr/apps/solid/server.jsx'], outfile:'ssr/dist/solid/_server.mjs',
  platform:'node', plugins:[solidPlugin('ssr')], minify:false, external:['solid-js','solid-js/web'] });
const { render } = await import(pathToFileURL(process.cwd()+'/ssr/dist/solid/_server.mjs').href);
const times = []; let r;
for (let k=0;k<7;k++) r = render(), times.push(r.ms);
times.sort((a,b)=>a-b);
const ssrMs = times[3];

// 2) client (dom compile, hydratable) — the shipped bundle
const js = await bundle({ entryPoints:['ssr/apps/solid/client.jsx'], outfile:'ssr/dist/solid/client.js', plugins:[solidPlugin('dom')] });

// 3) assemble index.html
const html = writeIndex('ssr/dist/solid', { head: r.head, body: r.body });

console.log(JSON.stringify({ fw:'solid', ssrMs:+ssrMs.toFixed(2), html, js }, null, 0));
