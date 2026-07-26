// AXIS 2 — LIST UPDATE: targeted list mutations, each framework using its OWN
// idiomatic API. Exodra's list engine is IMPERATIVE — move/insert/remove/push
// directly mutate the DOM for a known change, NO diff. Solid / Svelte / React have
// no imperative list API, so the same mutation is a state-set their keyed list block
// must diff. Mount 300 rows (untimed), then TIME 20 rounds of {move, insert, remove,
// append} = 80 operations.
import { For, createSignal } from 'solid-js';
import { createElement as rc, useState } from 'react';
import { abBench, type Scenario } from '../harness';

const ROWS = 300;
const OP_ROUNDS = 20;
type Row = { id: number; text: string };

export async function benchmarkListReconcile(rounds = 100, batch = 1): Promise<void> {
    const { h } = await import('../exodra/schema');
    const { list } = await import('@exodra/reactivity');
    const { mount } = await import('@exodra/dom');
    const { render } = await import('solid-js/web');
    const { createRoot } = await import('react-dom/client');
    const { flushSync } = await import('react-dom');
    const SvList = (await import('./svelte/SvList.svelte')).default;
    const { flush } = await import('svelte/internal'); // Svelte batches async — flush per op to time it

    let uid = 0;
    const seed = (): Row[] => Array.from({ length: ROWS }, (_, i) => ({ id: i, text: `row ${i}` }));
    // Apply the four mutations to a plain array (source of truth for the diffing
    // frameworks). Returns after each op via the supplied `commit`.
    const runOps = (data: Row[], commit: () => void): void => {
        for (let r = 0; r < OP_ROUNDS; r++) {
            data.splice(150, 0, data.splice(0, 1)[0]); commit();          // move
            data.splice(75, 0, { id: 1e6 + uid, text: `ins ${uid++}` }); commit(); // insert
            data.splice(200, 1); commit();                               // remove
            data.push({ id: 1e6 + uid, text: `add ${uid++}` }); commit(); // append
        }
    };
    const el = (): HTMLElement => { const c = document.createElement('div'); document.body.appendChild(c); return c; };

    const exoPrep = (): Scenario => {
        const lst = list(Array.from({ length: ROWS }, (_, i) => h('li', { static: { textContent: `row ${i}` } })));
        const c = el();
        const node = mount(h('ul', { bindableLists: { children: lst } }) as never, c);
        return {
            measure: () => { // IMPERATIVE — direct DOM ops, no diff
                for (let r = 0; r < OP_ROUNDS; r++) {
                    lst.move(0, 150);
                    lst.insert(75, h('li', { static: { textContent: `ins ${uid++}` } }));
                    lst.remove(200);
                    lst.push(h('li', { static: { textContent: `add ${uid++}` } }));
                }
            },
            cleanup: () => { node.dispose(); c.remove(); },
        };
    };

    const solidPrep = (): Scenario => {
        const data = seed();
        const [rows, setRows] = createSignal(data.slice());
        const c = el();
        const dispose = render(() => (<ul><For each={rows()}>{(it: Row) => <li>{it.text}</li>}</For></ul>) as never, c);
        return { measure: () => runOps(data, () => setRows([...data])), cleanup: () => { dispose(); c.remove(); } };
    };

    const sveltePrep = (): Scenario => {
        const data = seed();
        const c = el();
        const inst = new SvList({ target: c, props: { rows: data.slice() } });
        return { measure: () => runOps(data, () => { inst.setRows([...data]); flush(); }), cleanup: () => { inst.$destroy(); c.remove(); } };
    };

    const reactPrep = (): Scenario => {
        const data = seed();
        const c = el();
        let setRows: (r: Row[]) => void = () => {};
        const List = (): unknown => { const [rows, set] = useState(data.slice()); setRows = set; return rc('ul', null, rows.map(r => rc('li', { key: r.id }, r.text))); };
        const root = createRoot(c);
        flushSync(() => root.render(rc(List as never)));
        return { measure: () => runOps(data, () => flushSync(() => setRows([...data]))), cleanup: () => { root.unmount(); c.remove(); } };
    };

    await abBench(
        `LIST UPDATE — ${OP_ROUNDS}×{move,insert,remove,append} (Exodra imperative vs keyed-diff)`,
        `ms/${OP_ROUNDS * 4} ops`,
        { exodra: exoPrep, solid: solidPrep, svelte: sveltePrep, react: reactPrep },
        { rounds, batch }
    );
}
