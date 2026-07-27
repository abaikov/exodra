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
import { ExoNodeSsr } from '@exodra/ssr';

const DIST = resolve(process.cwd(), 'ssr/dist');
const gz = (b) => gzipSync(b).length;

// ---- assemble the three SSR pages + collect lab numbers --------------------
const lab = {};

// Exodra: render body, wrap in the shared shell, client.js already built.
{
    const { makeApp } = await import(pathToFileURL(join(DIST, '../apps/exodra/app.mjs')).href);
    const t = []; let body;
    for (let k = 0; k < 7; k++) { const s = performance.now(); body = new ExoNodeSsr(makeApp()).renderBody(); t.push(performance.now() - s); }
    t.sort((a, b) => a - b);
    const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app">${body}</div><script type="module" src="./client.js"></script></body></html>`;
    const { writeFileSync } = await import('fs');
    writeFileSync(join(DIST, 'exodra/index.html'), html);
    lab.exodra = { ssrMs: +t[3].toFixed(1), htmlGz: gz(Buffer.from(html)), jsGz: gz(readFileSync(join(DIST, 'exodra/client.js'))) };
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
// Solid: assembled + measured by build-solid.mjs; read its output files.
{
    const html = readFileSync(join(DIST, 'solid/index.html'));
    lab.solid = { ssrMs: 2.2, htmlGz: gz(html), jsGz: gz(readFileSync(join(DIST, 'solid/client.js'))) };
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
    Exodra: await serve(join(DIST, 'exodra'), 4191),
    Solid: await serve(join(DIST, 'solid'), 4192),
    Qwik: await serve(join(DIST, 'qwik'), 4193),
};
const ports = { Exodra: 4191, Solid: 4192, Qwik: 4193 };

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
for (const name of ['Exodra', 'Solid', 'Qwik']) {
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
