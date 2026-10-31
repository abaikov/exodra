// SSR/hydration end-to-end verdict harness.
// Assembles each framework's SSR page, serves it statically, then drives a real
// throttled Chromium (CPU 4x + Fast 3G) and measures, from navigation start:
//   FCP  — first contentful paint ("appeared on screen")
//   TTI  — time until the FIRST click on a row's button actually takes effect
//          ("interactive"; fair across hydration AND Qwik's resumability, since
//           it just asks: when does clicking do something?)
// Plus the static lab numbers (SSR render ms, HTML + initial-JS gzip bytes).
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { gzipSync } from 'zlib';
import { join, extname, resolve } from 'path';
import { pathToFileURL } from 'url';

const DIST = resolve(process.cwd(), 'ssr/dist');
const gz = (b) => gzipSync(b).length;

// ONE shell for every participant, because the shell is the part of the page that is not theirs:
// a difference in it is a difference in the comparison rather than in the renderer.
const exoShell = (head, body) =>
    `<!doctype html><html><head><meta charset="utf-8">${head}</head>` +
    `<body><div id="app">${body}</div><script type="module" src="./client.js"></script></body></html>`;

// ---- assemble the three SSR pages + collect lab numbers --------------------
const lab = {};

// Exodra (the schema core): a schema declared once at module load and ONE wiring
// function, run here by the string backend and in the browser by `hydrateExoRows`. Timed by
// the same seven-render loop as everybody else, and wrapped in the same shell, so the only
// difference between this page and the next is the renderer that wrote the rows.
{
    const { renderBody } = await import(pathToFileURL(join(DIST, 'exodra/_server.mjs')).href);
    const t = []; let body;
    for (let k = 0; k < 7; k++) { const s = performance.now(); body = renderBody(); t.push(performance.now() - s); }
    t.sort((a, b) => a - b);
    const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app">${body}</div><script type="module" src="./client.js"></script></body></html>`;
    const { writeFileSync } = await import('fs');
    writeFileSync(join(DIST, 'exodra/index.html'), html);
    lab.exodra = { ssrMs: +t[3].toFixed(1), htmlGz: gz(Buffer.from(html)), jsGz: gz(readFileSync(join(DIST, 'exodra/client.js'))) };
}
// Marko 6: `template.render(...).toString()`, timed by the same loop. Its
// `_server.mjs` reports no time of its own, on purpose — every synchronous
// participant here is stopwatched by this harness on one clock rather than trusted
// to report its own.
{
    const { renderBody } = await import(pathToFileURL(join(DIST, 'marko/_server.mjs')).href);
    const t = []; let body;
    for (let k = 0; k < 7; k++) { const s = performance.now(); body = renderBody(); t.push(performance.now() - s); }
    t.sort((a, b) => a - b);
    // Byte-for-byte the same shell everyone else gets. Marko's own resume script
    // rides inside `body`, which is where it belongs: it is Marko's cost of doing
    // business and it is paid for in the HTML-bytes column.
    const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app">${body}</div><script type="module" src="./client.js"></script></body></html>`;
    const { writeFileSync } = await import('fs');
    writeFileSync(join(DIST, 'marko/index.html'), html);
    lab.marko = { ssrMs: +t[3].toFixed(1), htmlGz: gz(Buffer.from(html)), jsGz: gz(readFileSync(join(DIST, 'marko/client.js'))) };
}
// Mikado 0.8.400: `mikado/ssr`'s string renderer over the SAME `row.html` the client
// bundle compiles at run time, timed by the same seven-render loop. Its HTML carries one
// thing nobody else's does — the `click="inc"` route attribute per row, which is how a
// delegated listener finds the handler without wiring the row — and that is charged for in
// the HTMLgz column, not stripped.
{
    const { renderBody } = await import(pathToFileURL(join(DIST, 'mikado/_server.mjs')).href);
    const t = []; let body;
    for (let k = 0; k < 7; k++) { const s = performance.now(); body = renderBody(); t.push(performance.now() - s); }
    t.sort((a, b) => a - b);
    const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app">${body}</div><script type="module" src="./client.js"></script></body></html>`;
    const { writeFileSync } = await import('fs');
    writeFileSync(join(DIST, 'mikado/index.html'), html);
    lab.mikado = { ssrMs: +t[3].toFixed(1), htmlGz: gz(Buffer.from(html)), jsGz: gz(readFileSync(join(DIST, 'mikado/client.js'))) };
}
// Qwik: SSR render with a rooted base so chunks resolve under /qwik/.
{
    const mod = await import(pathToFileURL(join(DIST, 'qwik/server/entry.ssr.js')).href);
    const manifest = JSON.parse(readFileSync(join(DIST, 'qwik/manifest.json'), 'utf8'));
    const t = []; let r;
    for (let k = 0; k < 7; k++) { const s = performance.now(); r = await mod.default({ manifest, base: '/build/' }); t.push(performance.now() - s); }
    t.sort((a, b) => a - b);
    const { writeFileSync } = await import('fs');
    writeFileSync(join(DIST, 'qwik/index.html'), r.html);
    // initial JS for Qwik = the inlined qwikloader only (the rest is lazy). We
    // report total lazy JS separately for context.
    let lazyJs = 0;
    const walk = (d) => { for (const f of require('fs').readdirSync(d, { withFileTypes: true })) { const p = join(d, f.name); if (f.isDirectory()) walk(p); else if (f.name.endsWith('.js')) lazyJs += gz(readFileSync(p)); } };
    const { readdirSync } = await import('fs');
    (function w(d){ for (const f of readdirSync(d,{withFileTypes:true})){ const p=join(d,f.name); if(f.isDirectory()) w(p); else if(f.name.endsWith('.js')) lazyJs += gz(readFileSync(p)); } })(join(DIST,'qwik/build'));
    lab.qwik = { ssrMs: +t[3].toFixed(1), htmlGz: gz(Buffer.from(r.html)), jsGz: 0, lazyJsGz: lazyJs };
}
// Solid: rendered and timed HERE, by the same seven-render loop every other
// participant goes through.
//
// It used to be a literal `2.2`, typed in from some past run — the one number in this
// table that did not track the code, in a suite whose entire value is that its numbers
// are comparable. A hardcoded figure for a competitor is the worst direction for that
// error to point, so it is measured now: `build-solid.mjs` already emits `_server.mjs`
// exactly as the other server builds do, so there was nothing to invent.
{
    const { render } = await import(pathToFileURL(join(DIST, 'solid/_server.mjs')).href);
    const t = []; let out;
    for (let k = 0; k < 7; k++) { const s = performance.now(); out = render(); t.push(performance.now() - s); }
    t.sort((a, b) => a - b);
    // WRITTEN, not read. This block used to gz whatever `index.html` was lying in the dist and
    // leave it standing, so Solid ran the row count of the last script to write that file —
    // `hyd.mjs` ends its sweep at 30 000 — while the other four got this file's own N. One table,
    // two row counts, reported by the gate as Solid rendering more rows than everybody else.
    const html = exoShell(out.head, out.body);
    const { writeFileSync } = await import('fs');
    writeFileSync(join(DIST, 'solid/index.html'), html);
    lab.solid = { ssrMs: +t[3].toFixed(1), htmlGz: gz(Buffer.from(html)), jsGz: gz(readFileSync(join(DIST, 'solid/client.js'))) };
}

// ---- one static server PER framework, each rooted at its own dir so every
// absolute asset path (Qwik's /build/ + /assets/) resolves like a real deploy.
const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.css': 'text/css' };
function serve(rootDir, port) {
    const s = createServer((req, res) => {
        let p = join(rootDir, decodeURIComponent(req.url.split('?')[0]));
        if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
        if (!existsSync(p)) { res.writeHead(404); return res.end('404 ' + req.url); }
        res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
        res.end(readFileSync(p));
    });
    return new Promise((r) => s.listen(port, () => r(s)));
}
const servers = {
    Solid: await serve(join(DIST, 'solid'), 4192),
    Qwik: await serve(join(DIST, 'qwik'), 4193),
    Marko: await serve(join(DIST, 'marko'), 4195),
    Exodra: await serve(join(DIST, 'exodra'), 4196),
    Mikado: await serve(join(DIST, 'mikado'), 4197),
};
const ports = { Solid: 4192, Qwik: 4193, Marko: 4195, Exodra: 4196, Mikado: 4197 };

// ---- throttled browser measurement ----------------------------------------
const FAST_3G = { offline: false, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8, latency: 150 };
const CPU = 4;
const RUNS = 5;

async function measure(browser, url) {
    const fcps = [], ttis = [], bytes = [];
    for (let r = 0; r < RUNS; r++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        const client = await context.newCDPSession(page);
        await client.send('Network.enable');
        await client.send('Network.emulateNetworkConditions', FAST_3G);
        await client.send('Emulation.setCPUThrottlingRate', { rate: CPU });
        let transferred = 0;
        client.on('Network.loadingFinished', (e) => { transferred += e.encodedDataLength || 0; });

        const t0 = Date.now();
        await page.goto(url, { waitUntil: 'commit' });
        // FCP from the page's own paint timeline
        const fcp = await page.evaluate(() => new Promise((res) => {
            const seen = performance.getEntriesByName('first-contentful-paint')[0];
            if (seen) return res(seen.startTime);
            new PerformanceObserver((l, o) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') { o.disconnect(); res(e.startTime); } }).observe({ type: 'paint', buffered: true });
        }));
        // TTI: poll clicking row 0's button until its text actually changes off "0"
        //
        // ON BATCHED FRAMEWORKS. Marko does not write the DOM inside the click
        // handler; it queues the row's re-render and drains the queue from a
        // MICROTASK (marko/dom `schedule()` → `queueMicrotask`). The client
        // benchmark suite has to call `run()` by hand for exactly this reason,
        // because there the whole measured region is one synchronous block.
        // Here it is not needed and would not even be reachable: the click and the
        // read below are two separate CDP round-trips, so the page has drained its
        // microtask queue and committed before the read's task begins. The probe
        // therefore asks every participant the same question — "has the DOM the
        // user is looking at changed yet?" — and neither credits Marko for work it
        // has not committed nor penalises it for batching.
        let tti = null;
        while (Date.now() - t0 < 30000) {
            await page.click('button[data-b="0"]', { force: true, timeout: 200 }).catch(() => {});
            const txt = await page.evaluate(() => { const b = document.querySelector('button[data-b="0"]'); return b ? b.textContent.trim() : null; }).catch(() => null);
            if (txt && txt !== '0') { tti = Date.now() - t0; break; }
        }
        fcps.push(fcp); ttis.push(tti ?? NaN); bytes.push(transferred);
        await context.close();
    }
    const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
    return { fcp: Math.round(med(fcps)), tti: Math.round(med(ttis)), transferKB: +(med(bytes) / 1024).toFixed(1) };
}

const browser = await chromium.launch({ headless: true });
const rows = [];
for (const name of ['Exodra', 'Solid', 'Qwik', 'Marko', 'Mikado']) {
    const m = await measure(browser, `http://localhost:${ports[name]}/`);
    const key = name.toLowerCase();
    rows.push({ fw: name, ...m, ssrMs: lab[key].ssrMs, htmlGz: lab[key].htmlGz, jsGz: lab[key].jsGz, lazyJsGz: lab[key].lazyJsGz ?? lab[key].jsGz });
}
await browser.close();
for (const s of Object.values(servers)) s.close();

console.log('\n=== SSR/HYDRATION — throttled Chromium (CPU 4x + Fast 3G, ' + RUNS + ' runs, median) ===\n');
console.log('fw       FCP(ms)  TTI(ms)  transfer(KB)  |  SSR(ms)  HTMLgz(B)  JSgz(B)');
for (const r of rows)
    console.log(
        r.fw.padEnd(8),
        String(r.fcp).padStart(6), String(r.tti).padStart(8), String(r.transferKB).padStart(12),
        '  | ', String(r.ssrMs).padStart(6), String(r.htmlGz).padStart(9), String(r.jsGz).padStart(8),
        r.fw === 'Qwik' ? `(lazy JS total ${r.lazyJsGz}B)` : ''
    );
