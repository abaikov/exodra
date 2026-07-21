// Bundle-size tripwire: fails if any package's built ESM entry exceeds its
// budget. Small bundle is a core selling point — this catches accidental bloat
// (e.g. a runtime dep sneaking into core, or sugar leaking out of its own pkg).
// Run after building: node scripts/check-bundle-size.mjs
import { readFileSync, existsSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// raw bytes of dist/index.js. Budgets are a tripwire with headroom, not a target
// — bump deliberately when a real feature lands, never to silence a regression.
const BUDGETS = {
    core: 13000,
    reactivity: 8500,
    string: 9500,
    jsx: 2500,
    forms: 2500,
    dom: 26000,
    router: 35000,
};

let failed = 0;
console.log('pkg          raw     gzip    budget   status');
for (const [pkg, budget] of Object.entries(BUDGETS)) {
    const file = resolve(root, 'packages', pkg, 'dist/index.js');
    if (!existsSync(file)) {
        console.log(`${pkg.padEnd(12)} (not built — run the package build first)`);
        continue;
    }
    const raw = statSync(file).size;
    const gz = gzipSync(readFileSync(file)).length;
    const ok = raw <= budget;
    if (!ok) failed++;
    console.log(
        `${pkg.padEnd(12)} ${String(raw).padStart(6)}  ${String(gz).padStart(6)}  ${String(budget).padStart(6)}   ${ok ? 'ok' : 'OVER BUDGET'}`
    );
}

if (failed > 0) {
    console.error(`\n${failed} package(s) over budget.`);
    process.exit(1);
}
console.log('\nall within budget');
