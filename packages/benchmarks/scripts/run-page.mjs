// Serve a directory over http and run one page in headless Chromium, printing whatever the
// page put in `window.__RESULT__`.
//
// WHY A SERVER AND NOT `file://`: a page that loads ES modules fetches them, and a fetch
// from a `file://` origin is refused by the same-origin policy. The page then never
// finishes and prints nothing, which reads exactly like a hung benchmark. This cost an
// evening once; the server is four lines and removes the whole class.
//
// WHY THE PAGE TIMES ITSELF AND NOT THIS SCRIPT: Chromium deliberately coarsens
// `performance.now()` to 100 microseconds, so anything measured here through the driver is
// quantised to a grain the size of the answer. A page that batches its own rounds gets a
// grain a fraction of a percent wide.
//
//   node scripts/run-page.mjs <dir> <page.html>
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, extname, resolve } from 'path';

const dir = resolve(process.argv[2] ?? '.');
const page = process.argv[3] ?? 'index.html';
const TYPES = {
    '.html': 'text/html',
    '.mjs': 'text/javascript',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
};

const server = createServer(async (req, res) => {
    try {
        const path = join(dir, decodeURIComponent(req.url.split('?')[0]));
        const body = await readFile(path);
        res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
        res.end(body);
    } catch {
        res.writeHead(404);
        res.end('not found');
    }
});
await new Promise((r) => server.listen(0, r));
const { port } = server.address();

const browser = await chromium.launch();
const tab = await browser.newPage();
const errors = [];
tab.on('pageerror', (e) => errors.push(String(e)));
tab.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
});
await tab.goto(`http://127.0.0.1:${port}/${page}`);
try {
    await tab.waitForFunction('window.__RESULT__ !== undefined', null, { timeout: 180000 });
} catch {
    console.error('the page did not finish measuring — see the errors below');
}
console.log(await tab.evaluate('window.__RESULT__ ?? "(no result)"'));
if (errors.length > 0) console.error('PAGE ERRORS:\n' + errors.join('\n'));
await browser.close();
server.close();
