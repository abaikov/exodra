// AXIS 3 — REACTIVE UPDATE: reflect 1000 value changes to the DOM, 3 times. Each
// framework does it idiomatically: Exodra and Solid are FINE‑GRAINED (write each of
// 1000 signals → 1000 targeted DOM writes per sweep); Svelte and React are COARSE
// (reassign / setState one array of 1000 → one keyed reconcile per sweep). Same
// visual outcome, two models — that's the comparison.
import { createSignal } from 'solid-js';
import { createElement as rc, useState } from 'react';
import { abBench, type Scenario } from '../harness';

const NODES = 1000;
const SWEEPS = 3;

export async function benchmarkReactiveUpdate(rounds = 100, batch = 1): Promise<void> {
    const { h } = await import('../exodra/schema');
    const { bindable } = await import('@exodra/reactivity');
    const { mount } = await import('@exodra/dom');
    const { render } = await import('solid-js/web');
    const { createRoot } = await import('react-dom/client');
    const { flushSync } = await import('react-dom');
    const SvReactive = (await import('./svelte/SvReactive.svelte')).default;
    const { flush } = await import('svelte/internal'); // Svelte batches async — flush per sweep to time it

    const el = (): HTMLElement => { const c = document.createElement('div'); document.body.appendChild(c); return c; };
    const sweepValues = (s: number): string[] => Array.from({ length: NODES }, (_, i) => `s${s}-${i}`);

    const exoPrep = (): Scenario => {
        const sigs = Array.from({ length: NODES }, (_, i) => bindable(`v${i}`));
        const c = el();
        const node = mount(h('div', { static: { children: sigs.map(b => h('span', { bindables: { textContent: b } })) } }) as never, c);
        return {
            measure: () => { for (let s = 0; s < SWEEPS; s++) for (let i = 0; i < NODES; i++) sigs[i].setValue(`s${s}-${i}`); },
            cleanup: () => { node.dispose(); c.remove(); },
        };
    };

    const solidPrep = (): Scenario => {
        const setters: Array<(v: string) => void> = [];
        const c = el();
        const App = () => (<div>{Array.from({ length: NODES }, (_, i) => { const [t, set] = createSignal(`v${i}`); setters.push(set); return <span>{t()}</span>; })}</div>);
        const dispose = render(() => App() as never, c);
        return {
            measure: () => { for (let s = 0; s < SWEEPS; s++) for (let i = 0; i < NODES; i++) setters[i](`s${s}-${i}`); },
            cleanup: () => { dispose(); c.remove(); },
        };
    };

    const sveltePrep = (): Scenario => {
        const c = el();
        const inst = new SvReactive({ target: c, props: { values: Array.from({ length: NODES }, (_, i) => `v${i}`) } });
        return { measure: () => { for (let s = 0; s < SWEEPS; s++) { inst.setValues(sweepValues(s)); flush(); } }, cleanup: () => { inst.$destroy(); c.remove(); } };
    };

    const reactPrep = (): Scenario => {
        const c = el();
        let setValues: (v: string[]) => void = () => {};
        const App = (): unknown => { const [vals, set] = useState(() => Array.from({ length: NODES }, (_, i) => `v${i}`)); setValues = set; return rc('div', null, vals.map((v, i) => rc('span', { key: i }, v))); };
        const root = createRoot(c);
        flushSync(() => root.render(rc(App as never)));
        return { measure: () => { for (let s = 0; s < SWEEPS; s++) flushSync(() => setValues(sweepValues(s))); }, cleanup: () => { root.unmount(); c.remove(); } };
    };

    await abBench(
        `REACTIVE UPDATE — ${NODES} nodes × ${SWEEPS} sweeps`,
        `ms/${NODES * SWEEPS} value changes`,
        { exodra: exoPrep, solid: solidPrep, svelte: sveltePrep, react: reactPrep },
        { rounds, batch }
    );
}
