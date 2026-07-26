// AXIS 5 — APP UPDATE ("fat update"): a BATCH of real interactions on the mounted
// todo app (THE app in `todo-app.tsx`, the same one initial-render mounts). Per
// round the batch toggles every card's details AND advances every card's dynamic
// tag list; ×5 rounds. See todo-app.tsx for the fairness notes (declarative tag
// reconcile with node reuse, no imperative list, React flushSync).
import { loadMounts, el, type Mounts } from './todo-app';
import { abBench, type Scenario } from '../harness';

const ROUNDS = 5;

export async function benchmarkAppUpdate(rounds = 100, batch = 5): Promise<void> {
    const mounts = await loadMounts();

    // Honesty guard: prove ONE flip mutates the DOM two ways for EVERY framework —
    // card0's details toggle (starts open: 1 .details → 0) AND its tag count (starts
    // with 1 tag → 2), and that the kept tag node is REUSED (same element), not
    // rebuilt. A framework that silently no-ops fails here instead of "winning".
    for (const name of ['exodra', 'solid', 'svelte', 'react'] as const) {
        const c = el();
        const app = mounts[name](c);
        const card0 = () => c.querySelector('.card')!;
        const det = () => card0().querySelectorAll('.details').length;
        const tags = () => card0().querySelectorAll('.tag');
        const d0 = det();
        const n0 = tags().length;
        const firstBefore = tags()[0];
        app.flip();
        const okd = det() === d0 - 1;
        const okt = tags().length === n0 + 1;
        const reused = tags()[0] === firstBefore;
        app.teardown();
        c.remove();
        if (!(d0 === 1 && n0 === 1 && okd && okt && reused)) {
            throw new Error(
                `app-update: ${name} did not mutate the DOM as expected ` +
                    `(details toggled=${okd}, tags grew=${okt}, kept-tag reused=${reused}) ` +
                    `— its measured batch is a no-op / rebuild, results would be dishonest`
            );
        }
    }

    const prep = (make: Mounts[keyof Mounts]) => (): Scenario => {
        const c = el();
        const app = make(c);
        return {
            measure: () => { for (let r = 0; r < ROUNDS; r++) app.flip(); },
            cleanup: () => { app.teardown(); c.remove(); },
        };
    };
    await abBench(
        `APP UPDATE — 80 cards: details toggle + dynamic tag list ×${ROUNDS} (fat real-app batch)`,
        `ms/${ROUNDS} rounds`,
        { exodra: prep(mounts.exodra), solid: prep(mounts.solid), svelte: prep(mounts.svelte), react: prep(mounts.react) },
        { rounds, batch },
    );
}

export async function verifyAppUpdate(): Promise<void> {
    const mounts = await loadMounts();
    for (const name of ['exodra', 'solid', 'svelte', 'react'] as const) {
        const c = el();
        const app = mounts[name](c);
        const card0 = () => c.querySelector('.card')!;
        const det = () => card0().querySelectorAll('.details').length;
        const tags = () => card0().querySelectorAll('.tag');
        const d0 = det();
        const n0 = tags().length;
        const firstBefore = tags()[0];
        app.flip();
        const reused = tags()[0] === firstBefore;
        const ok = d0 === 1 && n0 === 1 && det() === 0 && tags().length === 2 && reused;
        // eslint-disable-next-line no-console
        console.log(
            `${ok ? '✅' : '❌'} [${name}]: details ${d0}->${det()} (want 1->0), ` +
                `tags ${n0}->${tags().length} (want 1->2), kept-tag REUSED=${reused}`
        );
        app.teardown();
        c.remove();
    }
}
