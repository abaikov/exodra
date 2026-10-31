#!/usr/bin/env node
// Isolate ONE axis with a tiny round count and forward every browser console line, to tell
// "slow" from "hung".
//
//   npm run probe --workspace=@exodra/benchmarks -- <axis> [rounds]
//   node scripts/probe-svelte.js <axis> [rounds]
//
// The file name is historical — it was written while chasing a Svelte hang and now covers
// whichever axis is misbehaving.
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const url = 'http://localhost:3001';

const AXES = {
    'list-update': ['./src/benchmarks/axes/list/list-reconcile.tsx', 'benchmarkListReconcile'],
    reconcile: ['./src/benchmarks/axes/list/reconcile.tsx', 'benchmarkReconcile'],
    'reactive-update': ['./src/benchmarks/axes/list/reactive-update.tsx', 'benchmarkReactiveUpdate'],
    toggle: ['./src/benchmarks/axes/list/toggle.tsx', 'benchmarkToggle'],
};
const axis = process.argv[2] || 'list-update';
const rounds = Number(process.argv[3] || 2);

let vite;
const startVite = () =>
    new Promise((res, rej) => {
        vite = spawn('npm', ['run', 'dev'], { cwd: rootDir, shell: true, stdio: 'pipe', env: { ...process.env, BROWSER: 'none' } });
        let ready = false;
        vite.stdout.on('data', d => {
            if (!ready && /Local:|http:\/\/localhost/.test(d.toString())) { ready = true; setTimeout(res, 2000); }
        });
        vite.on('error', rej);
        setTimeout(() => !ready && rej(new Error('vite timeout')), 30000);
    });

const browser = await (async () => { await startVite(); return chromium.launch({ headless: true, args: ['--js-flags=--expose-gc'] }); })();
const page = await browser.newPage();
page.on('console', m => console.log('[b]', m.text()));
page.on('pageerror', e => console.error('[pageerror]', e.message));
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

const [path, fn] = AXES[axis];
console.log(`probing ${axis} with rounds=${rounds}…`);
try {
    await page.evaluate(async ([p, f, r]) => {
        const mod = await import(p);
        await mod[f](r, 1);
    }, [path, fn, rounds], { timeout: 60000 });
    console.log('completed — not hung');
} catch (e) {
    console.error('TIMED OUT or threw:', e.message.slice(0, 300));
}
await browser.close();
vite?.kill('SIGTERM');
setTimeout(() => process.exit(0), 300);
