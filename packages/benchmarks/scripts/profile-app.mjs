#!/usr/bin/env node
// WHERE THE 80-CARD APP'S TIME GOES, PER PARTICIPANT — a V8 CPU profile aggregated by SELF time
// per function, for the two axes the schema core does not lead.
//
//     node scripts/profile-app.mjs [times] <who> [mount|update|clicked]
//
// `who` is one of `TWho` in `src/benchmarks/profilers/profile-app.tsx`, where the list is kept and
// where it is checked: exodra · mikado · marko · solid · floor · stage0 · direct · machine ·
// machineDirect. Nothing validates it at run time: `mounterFor` falls through to `loadMounts()` for
// any name it does not recognise, so a typo comes back as `undefined` and fails at the call.
//
// `update` PROFILES THE JOB `app-update` MEASURES, which since that axis stopped dispatching events
// means each card's own handlers CALLED DIRECTLY — no `MouseEvent`, no `dispatchEvent`. `clicked` is
// the old behaviour under a name that says what it is: the job `exodra-app-update` still runs and
// the job every `.gate/app-update.*.json` on disk was recorded on. The two differ by ~61% of the
// round (this script's own output, quoted at the top of `app-update.tsx`), so choosing the wrong one
// means spending most of a profile's samples in work the axis under investigation never performs.
//
// It samples; nothing is instrumented and no hot path is touched. Same shape as
// `profile-list-ops.mjs`.
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const url = 'http://localhost:3001';
const TIMES = Number(process.argv[2] || 300);
const WHO = process.argv[3] || 'exodra';
const MODE =
    process.argv[4] === 'update' ? 'update' : process.argv[4] === 'clicked' ? 'clicked' : 'mount';
const FN =
    MODE === 'update'
        ? 'profileAppUpdate'
        : MODE === 'clicked'
        ? 'profileAppUpdateClicked'
        : 'profileAppMount';
const MODULE = './src/benchmarks/profilers/profile-app.tsx';

let vite;
const startVite = () =>
    new Promise((res, rej) => {
        vite = spawn('npm', ['run', 'dev'], {
            cwd: rootDir,
            shell: true,
            stdio: 'pipe',
            env: { ...process.env, BROWSER: 'none' },
        });
        let ready = false;
        vite.stdout.on('data', d => {
            if (!ready && /Local:|http:\/\/localhost/.test(d.toString())) {
                ready = true;
                setTimeout(res, 2000);
            }
        });
        vite.on('error', rej);
        setTimeout(() => !ready && rej(new Error('vite timeout')), 30000);
    });

await startVite();
const browser = await chromium.launch({ headless: true, args: ['--js-flags=--expose-gc'] });
const page = await browser.newPage();
page.on('pageerror', e => console.error('[pageerror]', e.message));
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

const cdp = await page.context().newCDPSession(page);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 50 }); // µs

// Warm up first, so what is profiled is optimised code rather than the interpreter — the
// difference being attributed here is a couple of microseconds per operation, which is exactly
// the size of a tier-up artefact.
await page.evaluate(async ([n, f, mod, who]) => {
    const m = await import(mod);
    await m[f](who, n);
}, [20, FN, MODULE, WHO]);

await cdp.send('Profiler.start');
await page.evaluate(async ([n, f, mod, who]) => {
    const m = await import(mod);
    await m[f](who, n);
}, [TIMES, FN, MODULE, WHO]);
const { profile } = await cdp.send('Profiler.stop');

const byId = new Map(profile.nodes.map(n => [n.id, n]));
const selfTicks = new Map();
for (const n of profile.nodes) selfTicks.set(n.id, 0);
for (const id of profile.samples ?? []) selfTicks.set(id, (selfTicks.get(id) ?? 0) + 1);

const totalTicks = (profile.samples ?? []).length;
const wallMs = (profile.endTime - profile.startTime) / 1000;
const msPerTick = totalTicks > 0 ? wallMs / totalTicks : 0;

const agg = new Map();
for (const [id, ticks] of selfTicks) {
    if (!ticks) continue;
    const f = byId.get(id)?.callFrame ?? {};
    const file = (f.url || '').split('/').slice(-1)[0].split('?')[0];
    const key = `${f.functionName || '(anonymous)'} @ ${file || 'native'}`;
    agg.set(key, (agg.get(key) ?? 0) + ticks);
}

const rows = [...agg.entries()].sort((a, b) => b[1] - a[1]);
const shown = rows.slice(0, 20);
console.log(`\n=== APP PROFILE — ${WHO}, ${MODE} × ${TIMES} ===`);
console.log(`total sampled ${wallMs.toFixed(0)} ms over ${totalTicks} samples\n`);
console.log('  self%    self ms   function');
for (const [key, ticks] of shown) {
    console.log(
        `  ${((ticks / totalTicks) * 100).toFixed(1).padStart(5)}%  ` +
            `${(ticks * msPerTick).toFixed(0).padStart(7)}   ${key}`
    );
}
const rest = rows.slice(20).reduce((s, [, t]) => s + t, 0);
console.log(
    `  ${((rest / totalTicks) * 100).toFixed(1).padStart(5)}%  ${(rest * msPerTick).toFixed(0).padStart(7)}` +
        `   (everything else, ${Math.max(0, rows.length - 20)} entries)\n`
);

await browser.close();
vite?.kill('SIGTERM');
setTimeout(() => process.exit(0), 300);
