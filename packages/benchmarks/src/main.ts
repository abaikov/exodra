// Browser UI for the curated benchmark suite (6 axes). Each bench prints its A/B
// table (Exodra vs Solid, median + spread) to the console via the shared harness —
// open devtools to read them. The headless runner (scripts/run-benchmarks-headless.js)
// drives the same benches directly.
//
// THE AXES ARE IMPORTED LAZILY, and that is a correctness requirement rather than a load-time
// nicety. `vite-plugin-solid` compiles a JSX `onClick` into a `delegateEvents(["click"])` call
// AT MODULE SCOPE, so a static import of any axis that contains Solid JSX installs a
// document-level click listener the moment this page loads — before a benchmark has been chosen,
// and for every axis afterwards. Every synthetic click the harness dispatches then walks that
// listener, in apps Solid did not render.
//
// Measured, before this change: 46 ms of a 275 ms floor run — 16.9% of the time attributed to
// EVERY participant on every clicked axis — was spent inside `eventHandler @ solid-js_web`
// with no Solid app on the page. See `scripts/profile-app.mjs … floor update`.
//
// Importing inside the runner confines each framework's module-scope side effects to the axis
// that actually measures it.
const statusEl = document.getElementById('status')!;
const runAllBtn = document.getElementById('runAll') as HTMLButtonElement;
const runInitialBtn = document.getElementById('runInitialRender') as HTMLButtonElement;

type Axis = readonly [name: string, run: () => Promise<void>];

const AXES: readonly Axis[] = [
    [
        'initial-render',
        async () => (await import('./benchmarks/axes/app/initial-render')).benchmarkInitialRender(),
    ],
    [
        'app-update',
        async () => (await import('./benchmarks/axes/app/app-update')).benchmarkAppUpdate(),
    ],
    // imperative move/insert/remove
    [
        'list-update',
        async () =>
            (await import('./benchmarks/axes/list/list-reconcile')).benchmarkListReconcile(),
    ],
    // declarative replace (keyed diff)
    [
        'reconcile',
        async () => (await import('./benchmarks/axes/list/reconcile')).benchmarkReconcile(),
    ],
    // full replace, same ids as fresh objects — an extracted key still matches, identity does not
    [
        'refetch',
        async () => (await import('./benchmarks/axes/list/list-replace')).benchmarkRefetch(),
    ],
    // full replace, different ids — only a positional strategy keeps its nodes
    [
        'pagination',
        async () => (await import('./benchmarks/axes/list/list-replace')).benchmarkPagination(),
    ],
    // where re-wiring every position overtakes diffing — five tables, k ∈ {1, 5, 25, 100, 500}
    ['rewire', async () => (await import('./benchmarks/axes/list/list-replace')).benchmarkRewire()],
    [
        'reactive-update',
        async () =>
            (await import('./benchmarks/axes/list/reactive-update')).benchmarkReactiveUpdate(),
    ],
    // repeat show: tear a 200-panel block out of the document and build a different one, ×20
    ['toggle', async () => (await import('./benchmarks/axes/list/toggle')).benchmarkToggle()],
    // Not a framework comparison: two construction strategies for the SAME renderer, at six
    // template sizes, to find where cloning a prototype starts to beat building it.
    [
        'clone-threshold',
        async () =>
            (await import('./benchmarks/axes/phases/clone-threshold')).benchmarkCloneThreshold(),
    ],
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
