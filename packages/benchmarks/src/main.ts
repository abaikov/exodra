// Browser UI for the curated benchmark suite (6 axes). Each bench prints its A/B
// table (Exodra vs Solid, median + spread) to the console via the shared harness —
// open devtools to read them. The headless runner (scripts/run-benchmarks-headless.js)
// drives the same benches directly.
import { benchmarkInitialRender } from './benchmarks/initial-render';
import { benchmarkListReconcile } from './benchmarks/list-reconcile';
import { benchmarkReconcile } from './benchmarks/reconcile';
import { benchmarkReactiveUpdate } from './benchmarks/reactive-update';
import { benchmarkToggle } from './benchmarks/toggle';
import { benchmarkAppUpdate } from './benchmarks/app-update';

const statusEl = document.getElementById('status')!;
const runAllBtn = document.getElementById('runAll') as HTMLButtonElement;
const runInitialBtn = document.getElementById(
    'runInitialRender'
) as HTMLButtonElement;

type Axis = readonly [name: string, run: () => Promise<void>];

const AXES: readonly Axis[] = [
    ['initial-render', () => benchmarkInitialRender()],
    ['app-update', () => benchmarkAppUpdate()],
    ['list-update', () => benchmarkListReconcile()], // imperative move/insert/remove
    ['reconcile', () => benchmarkReconcile()], // declarative replace (keyed diff)
    ['reactive-update', () => benchmarkReactiveUpdate()],
    ['toggle', () => benchmarkToggle()],
];

function setStatus(s: string): void {
    statusEl.textContent = s;
}

async function run(axes: readonly Axis[]): Promise<void> {
    runAllBtn.disabled = true;
    runInitialBtn.disabled = true;
    for (const [name, fn] of axes) {
        setStatus(`Running ${name}… (results print to the console)`);
        try {
            await fn();
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(`❌ ${name} failed:`, error);
        }
    }
    setStatus('Done — open the console for the A/B tables.');
    runAllBtn.disabled = false;
    runInitialBtn.disabled = false;
}

runAllBtn.addEventListener('click', () => void run(AXES));
runInitialBtn.addEventListener('click', () => void run([AXES[0]]));
setStatus('Ready. Click a button — the A/B tables print to the console.');
