// AXIS 4 — TOGGLE (mount/unmount): conditional rendering churn. Mount a host
// (untimed), then TIME 50 toggles that alternately build and dispose a small panel
// subtree — the cost of `{cond && <Panel/>}`, tabs, modals, route switches. Each
// framework uses its idiomatic conditional (Exodra bindable child list, Solid
// <Show>, Svelte {#if}, React conditional render).
import { Show, createSignal } from 'solid-js';
import { createElement as rc, useState } from 'react';
import { abBench, type Scenario } from '../harness';

const TOGGLES = 50;
const noop = (): void => {};

export async function benchmarkToggle(rounds = 100, batch = 1): Promise<void> {
    const { h } = await import('../exodra/schema');
    const { list } = await import('@exodra/reactivity');
    const { mount } = await import('@exodra/dom');
    const { render } = await import('solid-js/web');
    const { createRoot } = await import('react-dom/client');
    const { flushSync } = await import('react-dom');
    const SvToggle = (await import('./svelte/SvToggle.svelte')).default;
    const { flush } = await import('svelte/internal'); // Svelte batches async — flush per toggle to time it

    const el = (): HTMLElement => { const c = document.createElement('div'); document.body.appendChild(c); return c; };

    const exoPanel = () =>
        h('div', { static: { class: 'panel', children: [
            h('h4', { static: { textContent: 'Panel' } }),
            h('p', { static: { textContent: 'body' } }),
            h('button', { static: { textContent: 'x' }, handlers: { onClick: noop } }),
        ] } });

    const exoPrep = (): Scenario => {
        const lst = list([] as unknown[]);
        const c = el();
        const node = mount(h('div', { bindableLists: { children: lst } }) as never, c);
        return { measure: () => { for (let k = 1; k <= TOGGLES; k++) lst.reset(k % 2 === 1 ? [exoPanel()] : []); }, cleanup: () => { node.dispose(); c.remove(); } };
    };

    const solidPrep = (): Scenario => {
        const [on, setOn] = createSignal(false);
        const c = el();
        const App = () => (<div><Show when={on()}><div class="panel"><h4>Panel</h4><p>body</p><button onClick={noop}>x</button></div></Show></div>);
        const dispose = render(() => App() as never, c);
        return { measure: () => { for (let k = 1; k <= TOGGLES; k++) setOn(k % 2 === 1); }, cleanup: () => { dispose(); c.remove(); } };
    };

    const sveltePrep = (): Scenario => {
        const c = el();
        const inst = new SvToggle({ target: c, props: { on: false } });
        return { measure: () => { for (let k = 1; k <= TOGGLES; k++) { inst.setOn(k % 2 === 1); flush(); } }, cleanup: () => { inst.$destroy(); c.remove(); } };
    };

    const reactPrep = (): Scenario => {
        const c = el();
        let setOn: (v: boolean) => void = () => {};
        const Panel = (): unknown => rc('div', { className: 'panel' }, rc('h4', null, 'Panel'), rc('p', null, 'body'), rc('button', { onClick: noop }, 'x'));
        const App = (): unknown => { const [on, set] = useState(false); setOn = set; return rc('div', null, on ? rc(Panel as never) : null); };
        const root = createRoot(c);
        flushSync(() => root.render(rc(App as never)));
        return { measure: () => { for (let k = 1; k <= TOGGLES; k++) flushSync(() => setOn(k % 2 === 1)); }, cleanup: () => { root.unmount(); c.remove(); } };
    };

    await abBench(
        `TOGGLE — ${TOGGLES} mount/unmount of a panel`,
        `ms/${TOGGLES} toggles`,
        { exodra: exoPrep, solid: solidPrep, svelte: sveltePrep, react: reactPrep },
        { rounds, batch }
    );
}
