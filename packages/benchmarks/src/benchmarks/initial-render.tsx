// AXIS 1 — INITIAL RENDER: cost of MOUNTING the todo app from scratch — THE app in
// `todo-app.tsx`, the exact same one the app-update axis then updates (so mount cost
// and update cost are measured on ONE app, not two). 80 cards, each with a details
// toggle + a dynamic tag list; the list is genuine reactive state in every framework.
// Each framework mounts via its own API; the timed region is the mount. Reports heap.
import { loadMounts, el, type Mounts } from './todo-app';
import { abBench, type Scenario } from '../harness';

export async function benchmarkInitialRender(rounds = 100, batch = 5): Promise<void> {
    const mounts = await loadMounts();

    const prep = (make: Mounts[keyof Mounts]) => (): Scenario => {
        const c = el();
        let app: { teardown(): void };
        return {
            measure: () => { app = make(c); }, // the timed op: build + mount the app
            cleanup: () => { app.teardown(); c.remove(); },
        };
    };
    const heap = (make: Mounts[keyof Mounts]) => (): (() => void) => {
        const c = el();
        const app = make(c);
        return () => { app.teardown(); c.remove(); };
    };

    await abBench(
        'INITIAL RENDER — mount the 80-card todo app (details toggle + dynamic tag lists)',
        'ms/mount',
        { exodra: prep(mounts.exodra), solid: prep(mounts.solid), svelte: prep(mounts.svelte), react: prep(mounts.react) },
        {
            rounds,
            batch,
            heap: {
                exodra: heap(mounts.exodra), solid: heap(mounts.solid),
                svelte: heap(mounts.svelte), react: heap(mounts.react),
            },
        },
    );
}
