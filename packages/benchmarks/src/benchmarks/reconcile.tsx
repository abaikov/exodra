// DIAGNOSTIC — DECLARATIVE LIST RECONCILE: isolates Exodra's keyed-reconcile path
// (`bindables.children` + `updateChildren`) against Solid <For> / Svelte {#each} /
// React keyed map. A list of N keyed rows is REPLACED with a shuffled array M times
// — no imperative move/insert; every framework gets "here is the new order,
// reconcile it". Rows are IDENTITY-STABLE per id (Exodra reconciles by schema-object
// identity, the others by key) so reuse is possible for all — this measures the
// reconcile itself, not a rebuild.
import { createSignal, For } from 'solid-js';
import { createElement as rc, useState } from 'react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { flush as svelteFlush } from 'svelte/internal';
import { abBench, type Scenario } from '../harness';

const N = 200;
const OPS = 30; // shuffle-and-replace this many times per measured batch

// Deterministic shuffles (no Math.random — that's banned in this env anyway; and a
// fixed sequence keeps runs comparable). Each op rotates + swaps a few pairs.
function shuffled(order: number[], seed: number): number[] {
    const a = order.slice();
    const rot = seed % a.length;
    const b = a.slice(rot).concat(a.slice(0, rot)); // rotate
    for (let k = 0; k < a.length; k += 7) {
        const j = (k + seed) % a.length;
        const t = b[k]; b[k] = b[j]; b[j] = t; // scatter swaps
    }
    return b;
}
const IDS = Array.from({ length: N }, (_, i) => i);

export async function benchmarkReconcile(rounds = 100, batch = 3): Promise<void> {
    const { h } = await import('../exodra/schema');
    const { bindable } = await import('@exodra/reactivity');
    const { mount } = await import('@exodra/dom');
    const { render } = await import('solid-js/web');
    const { createRoot } = await import('react-dom/client');
    const { flushSync } = await import('react-dom');
    const SvReconcile = (await import('./svelte/SvReconcile.svelte')).default;

    const el = (): HTMLElement => {
        const c = document.createElement('div');
        document.body.appendChild(c);
        return c;
    };

    // --- Exodra: stable schema per id; bindables.children reconciles the new order --
    const exoPrep = (): Scenario => {
        const c = el();
        const pool = IDS.map(id => h('li', { static: { class: 'row', textContent: `#${id}` } }));
        const rows = bindable(pool.slice());
        const n = mount(h('ul', { bindables: { children: rows } }) as never, c);
        let seed = 1;
        return {
            measure: () => { for (let o = 0; o < OPS; o++) rows.setValue(shuffled(IDS, seed++).map(id => pool[id])); },
            cleanup: () => { n.dispose(); c.remove(); },
        };
    };

    // --- Solid: <For each={signal}> keyed by identity ---------------------------
    const SolidList = (props: { rows: () => number[] }) => (
        <ul><For each={props.rows()}>{id => <li class="row">{`#${id}`}</li>}</For></ul>
    );
    const solidPrep = (): Scenario => {
        const c = el();
        const [rows, setRows] = createSignal(IDS.slice());
        const d = render(() => SolidList({ rows }) as never, c);
        let seed = 1;
        return {
            measure: () => { for (let o = 0; o < OPS; o++) setRows(shuffled(IDS, seed++)); },
            cleanup: () => { d(); c.remove(); },
        };
    };

    // --- React: keyed .map(), setState per op (flushSync) -----------------------
    const ReactList = ({ rows }: { rows: number[] }) =>
        rc('ul', null, rows.map(id => rc('li', { key: id, className: 'row' }, `#${id}`)));
    const reactPrep = (): Scenario => {
        const c = el();
        const r = createRoot(c);
        let setRows: (v: number[]) => void = () => {};
        const App = () => { const [rows, s] = useState(IDS.slice()); setRows = s; return rc(ReactList, { rows }); };
        flushSync(() => r.render(rc(App)));
        let seed = 1;
        return {
            measure: () => { for (let o = 0; o < OPS; o++) flushSync(() => setRows(shuffled(IDS, seed++))); },
            cleanup: () => { r.unmount(); c.remove(); },
        };
    };

    // --- Svelte: keyed {#each}; $set the rows prop per op + flush ----------------
    const sveltePrep = (): Scenario => {
        const c = el();
        const inst = new SvReconcile({ target: c, props: { rows: IDS.slice() } });
        let seed = 1;
        return {
            measure: () => { for (let o = 0; o < OPS; o++) { inst.$set({ rows: shuffled(IDS, seed++) }); svelteFlush(); } },
            cleanup: () => { inst.$destroy(); c.remove(); },
        };
    };

    await abBench(
        `RECONCILE — declarative replace of a ${N}-row keyed list, shuffled ×${OPS}`,
        `ms/${OPS} reconciles`,
        { exodra: exoPrep, solid: solidPrep, svelte: sveltePrep, react: reactPrep },
        { rounds, batch },
    );
}

// DIAGNOSTIC: count what ExoNodeDom actually does during 30 reconciles of the
// 200-row list — is it REUSING (buildTree≈0) or secretly rebuilding, and how many
// DOM moves (domInsert)? Hard data before blaming allocations.
export async function diagnoseReconcile(): Promise<void> {
    const { h } = await import('../exodra/schema');
    const { bindable } = await import('@exodra/reactivity');
    const dom = await import('@exodra/dom');
    const mount = dom.mount;
    const el = (): HTMLElement => { const c = document.createElement('div'); document.body.appendChild(c); return c; };
    const Proto = (dom as unknown as { ExoNodeDom: { prototype: Record<string, (...a: unknown[]) => unknown> } }).ExoNodeDom.prototype;

    const methods = ['updateChildren', 'buildTree', 'reattach', 'domInsert', 'domRemove', 'normalizeChildren', 'disposeSchema', 'setupBindings'];
    const counts: Record<string, number> = {};
    const orig: Record<string, (...a: unknown[]) => unknown> = {};
    for (const m of methods) {
        if (typeof Proto[m] !== 'function') { counts[m] = -1; continue; }
        orig[m] = Proto[m];
        counts[m] = 0;
        Proto[m] = function (this: unknown, ...args: unknown[]) { counts[m]++; return orig[m].apply(this, args); };
    }

    const c = el();
    const pool = IDS.map(id => h('li', { static: { class: 'row', textContent: `#${id}` } }));
    const rows = bindable(pool.slice());
    const n = mount(h('ul', { bindables: { children: rows } }) as never, c);
    const mountCounts = { ...counts };
    for (const m of methods) counts[m] = 0; // isolate the reconciles

    let seed = 1;
    for (let o = 0; o < OPS; o++) rows.setValue(shuffled(IDS, seed++).map(id => pool[id]));

    for (const m of methods) if (orig[m]) Proto[m] = orig[m];
    n.dispose(); c.remove();

    // eslint-disable-next-line no-console
    console.log(`✅ DIAGNOSE reconcile (N=${N}, ${OPS} reconciles) — MOUNT: ${JSON.stringify(mountCounts)}`);
    // eslint-disable-next-line no-console
    console.log(`✅ DIAGNOSE reconcile — ${OPS} RECONCILES: ${JSON.stringify(counts)} (per reconcile: buildTree=${(counts.buildTree / OPS).toFixed(1)}, domInsert=${(counts.domInsert / OPS).toFixed(1)}, domRemove=${(counts.domRemove / OPS).toFixed(1)})`);
}
