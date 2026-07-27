// N-sweep: same 3 SSR apps, N rows swept, throttled Chromium. Finds the crossover
// where Qwik's resumability (flat client JS, fat HTML) overtakes Solid/Exodra's
// hydration (small JS, HTML+CPU that grow with N). Client bundles are built once
// (N-agnostic via globalThis.__N__); only the SSR HTML is re-rendered per N.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, statSync, writeFileSync } from 'fs';
import { join, extname, resolve } from 'path';
import { pathToFileURL } from 'url';
import { gzipSync } from 'zlib';
import { ExoNodeSsr } from '@exodra/ssr';
import { solidPlugin, bundle } from './build/lib.mjs';

const DIST = resolve(process.cwd(), 'ssr/dist');
const NS = [200, 1000, 5000, 15000];
const RUNS = 3;
const gz = (b) => gzipSync(Buffer.from(b)).length;

// rebuild solid server module (App changed to read the global) once
await bundle({ entryPoints: ['ssr/apps/solid/server.jsx'], outfile: 'ssr/dist/solid/_server.mjs',
    platform: 'node', plugins: [solidPlugin('ssr')], minify: false, external: ['solid-js', 'solid-js/web'] });

const exo = await import(pathToFileURL(join(DIST, '../apps/exodra/app.mjs')).href);
const solid = await import(pathToFileURL(join(DIST, 'solid/_server.mjs')).href);
const qwikMod = await import(pathToFileURL(join(DIST, 'qwik/server/entry.ssr.js')).href);
const qwikManifest = JSON.parse(readFileSync(join(DIST, 'qwik/manifest.json'), 'utf8'));

function renderAll(N) {
    globalThis.__N__ = N;
    // Exodra
    const exoBody = new ExoNodeSsr(exo.makeApp()).renderBody();
    const exoHtml = `<!doctype html><html><head><meta charset="utf-8"><script>window.__N__=${N}</script></head><body><div id="app">${exoBody}</div><script type="module" src="./client.js"></script></body></html>`;
    writeFileSync(join(DIST, 'exodra/index.html'), exoHtml);
    // Solid
    const sr = solid.render();
    const solidHtml = `<!doctype html><html><head><meta charset="utf-8"><script>window.__N__=${N}</script>${sr.head}</head><body><div id="app">${sr.body}</div><script type="module" src="./client.js"></script></body></html>`;
    writeFileSync(join(DIST, 'solid/index.html'), solidHtml);
    return { exoGz: gz(exoHtml), solidGz: gz(solidHtml) };
}
async function renderQwik(N) {
    globalThis.__N__ = N;
    const r = await qwikMod.default({ manifest: qwikManifest, base: '/build/' });
    writeFileSync(join(DIST, 'qwik/index.html'), r.html);
    return { qwikGz: gz(r.html) };
}

const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.css': 'text/css' };
function serve(rootDir, port) {
    const s = createServer((req, res) => {
        let p = join(rootDir, decodeURIComponent(req.url.split('?')[0]));
        if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
        if (!existsSync(p)) { res.writeHead(404); return res.end('404'); }
        res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
        res.end(readFileSync(p));
    });
    return new Promise((r) => s.listen(port, () => r(s)));
}
const FAST_3G = { offline: false, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8, latency: 150 };

async function measure(browser, url) {
    const ttis = [], fcps = [];
    for (let r = 0; r < RUNS; r++) {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        const client = await ctx.newCDPSession(page);
        await client.send('Network.enable');
        await client.send('Network.emulateNetworkConditions', FAST_3G);
        await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        const t0 = Date.now();
        await page.goto(url, { waitUntil: 'commit' });
        const fcp = await page.evaluate(() => new Promise((res) => {
            const s = performance.getEntriesByName('first-contentful-paint')[0];
            if (s) return res(s.startTime);
            new PerformanceObserver((l, o) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') { o.disconnect(); res(e.startTime); } }).observe({ type: 'paint', buffered: true });
        }));
        let tti = null;
        while (Date.now() - t0 < 60000) {
            await page.click('button[data-b="0"]', { force: true, timeout: 250 }).catch(() => {});
            const txt = await page.evaluate(() => { const b = document.querySelector('button[data-b="0"]'); return b ? b.textContent.trim() : null; }).catch(() => null);
            if (txt && txt !== '0') { tti = Date.now() - t0; break; }
        }
        ttis.push(tti ?? NaN); fcps.push(Math.round(fcp));
        await ctx.close();
    }
    const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
    return { tti: Math.round(med(ttis)), fcp: med(fcps) };
}

const ports = { exodra: 5191, solid: 5192, qwik: 5193 };
const servers = {
    exodra: await serve(join(DIST, 'exodra'), ports.exodra),
    solid: await serve(join(DIST, 'solid'), ports.solid),
    qwik: await serve(join(DIST, 'qwik'), ports.qwik),
};
const browser = await chromium.launch({ headless: true });

console.log('\n=== N-SWEEP — TTI (ms) to first working click, Fast 3G + CPU 4x, median of ' + RUNS + ' ===\n');
console.log('     N  | Exodra  Solid   Qwik  | HTMLgz: Exo   Solid    Qwik   | winner');
const table = [];
for (const N of NS) {
    const s1 = renderAll(N); const s2 = await renderQwik(N);
    const e = await measure(browser, `http://localhost:${ports.exodra}/`);
    const s = await measure(browser, `http://localhost:${ports.solid}/`);
    const q = await measure(browser, `http://localhost:${ports.qwik}/`);
    const best = [['Exodra', e.tti], ['Solid', s.tti], ['Qwik', q.tti]].filter(x => !isNaN(x[1])).sort((a, b) => a[1] - b[1])[0];
    table.push({ N, e: e.tti, s: s.tti, q: q.tti });
    console.log(
        String(N).padStart(6), ' |',
        String(e.tti).padStart(6), String(s.tti).padStart(6), String(q.tti).padStart(6), ' |',
        String(s1.exoGz).padStart(7), String(s1.solidGz).padStart(7), String(s2.qwikGz).padStart(8), '  |', best[0]
    );
}
await browser.close();
for (const sv of Object.values(servers)) sv.close();
console.log('\nCrossover: the N where Qwik TTI first ≤ Exodra/Solid TTI = where resumability starts to pay off.');
