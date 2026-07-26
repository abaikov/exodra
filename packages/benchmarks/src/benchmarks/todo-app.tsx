// THE one realistic todo app both axes measure — initial-render mounts it,
// app-update mounts it and fires the fat update batch. Defined ONCE here so the two
// axes can never diverge. 80 cards, each with a details TOGGLE (conditional
// mount/unmount) and a DYNAMIC tag list whose length cycles 1→2→3→4→1.
//
// Fairness baked in: the tag list is reconciled DECLARATIVELY in every framework —
// "here is the new tag array, reconcile it". For Exodra that is `bindables.children`
// (set a new array → keyed reconcile), NOT the imperative `list().push/remove`, so
// there is no imperative-list advantage. Tag schemas are STABLE per (card, tag) so
// Exodra reconciles by object identity and REUSES kept nodes; the others key by the
// tag string. React needs `flushSync` for native-dispatched clicks to commit.
import { createSignal, For, Show } from 'solid-js';
import { createElement as rc, useState } from 'react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - svelte internal flush (batches updates; force them synchronously)
import { flush as svelteFlush } from 'svelte/internal';

export const CARDS = 80;
export const IDX = Array.from({ length: CARDS }, (_, i) => i);
export const POOL = ['ui', 'api', 'bug', 'perf'];
export const startsOpen = (i: number): boolean => i % 2 === 0;
export const startCount = (i: number): number => (i % POOL.length) + 1;
export const nextCount = (c: number): number => (c % POOL.length) + 1;

// --- Solid / React apps (module scope — static imports only) -----------------
const SolidApp = () => {
    const [items] = createSignal(IDX);
    return (
        <div class="app">
            <For each={items()}>
                {i => {
                    const [open, setOpen] = createSignal(startsOpen(i));
                    const [count, setCount] = createSignal(startCount(i));
                    const tags = () => POOL.slice(0, count());
                    return (
                        <div class="card" data-i={i}>
                            <h3>Task {i}</h3>
                            <button class="tog" onClick={() => setOpen(o => !o)}>details</button>
                            <Show when={open()}><div class="details">details…</div></Show>
                            <div class="tags">
                                <For each={tags()}>{t => <span class="tag">{t}</span>}</For>
                            </div>
                            <button class="addtag" onClick={() => setCount(nextCount)}>+</button>
                        </div>
                    );
                }}
            </For>
        </div>
    );
};

const ReactCard = ({ i }: { i: number }) => {
    const [open, setOpen] = useState(startsOpen(i));
    const [count, setCount] = useState(startCount(i));
    const tags = POOL.slice(0, count);
    const kids: unknown[] = [
        rc('h3', { key: 'h' }, `Task ${i}`),
        rc('button', { key: 'tg', className: 'tog', onClick: () => setOpen(o => !o) }, 'details'),
        open ? rc('div', { key: 'd', className: 'details' }, 'details…') : null,
        rc('div', { key: 'ts', className: 'tags' },
            tags.map(t => rc('span', { key: t, className: 'tag' }, t))),
        rc('button', { key: 'at', className: 'addtag', onClick: () => setCount(nextCount) }, '+'),
    ];
    return rc('div', { className: 'card', 'data-i': i }, ...kids);
};
const ReactApp = () => {
    const [items] = useState(IDX);
    return rc('div', { className: 'app' }, items.map(i => rc(ReactCard, { key: i, i })));
};

export const el = (): HTMLElement => {
    const c = document.createElement('div');
    document.body.appendChild(c);
    return c;
};
export const clickAll = (c: HTMLElement, sel: string): void => {
    const btns = c.querySelectorAll(sel);
    for (let i = 0; i < btns.length; i++) {
        btns[i].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
};

export interface AppHandle {
    flip: () => void; // one update round: toggle every details + advance every tag list
    teardown: () => void;
}
export type Mounts = Record<'exodra' | 'solid' | 'svelte' | 'react', (c: HTMLElement) => AppHandle>;

// Dynamically import the runtimes and return per-framework `mount(container)` →
// { flip, teardown }. Both benches build their scenarios from this SAME map.
export async function loadMounts(): Promise<Mounts> {
    const { h } = await import('../exodra/schema');
    const { bindable } = await import('@exodra/reactivity');
    const { mount } = await import('@exodra/dom');
    const { render } = await import('solid-js/web');
    const { createRoot } = await import('react-dom/client');
    const { flushSync } = await import('react-dom');
    const CardsDyn = (await import('./svelte/CardsDyn.svelte')).default;

    const details = () => h('div', { static: { class: 'details', textContent: 'details…' } });
    const exoApp = () => {
        const cards = IDX.map(i => {
            const open = bindable(startsOpen(i) ? [details()] : null);
            // Stable per-card tag schemas: the rendered set is a SLICE of these, so
            // reconcile reuses the kept ones by identity and only adds/removes the tail.
            const pool = POOL.map(t => h('span', { static: { class: 'tag', textContent: t } }));
            let count = startCount(i);
            const tags = bindable(pool.slice(0, count) as unknown[]);
            return h('div', { static: { class: 'card', 'data-i': String(i), children: [
                h('h3', { static: { textContent: `Task ${i}` } }),
                h('button', { static: { class: 'tog', textContent: 'details' },
                    handlers: { onClick: () => open.setValue(open.getValue() ? null : [details()]) } }),
                h('#fragment', { bindables: { children: open } }),
                h('div', { static: { class: 'tags' }, bindables: { children: tags } }),
                h('button', { static: { class: 'addtag', textContent: '+' },
                    handlers: { onClick: () => { count = nextCount(count); tags.setValue(pool.slice(0, count)); } } }),
            ] } });
        });
        return h('div', { static: { class: 'app', children: cards } });
    };

    return {
        exodra: (c: HTMLElement) => {
            const n = mount(exoApp() as never, c);
            return { flip: () => { clickAll(c, '.tog'); clickAll(c, '.addtag'); }, teardown: () => n.dispose() };
        },
        solid: (c: HTMLElement) => {
            const d = render(() => SolidApp() as never, c);
            return { flip: () => { clickAll(c, '.tog'); clickAll(c, '.addtag'); }, teardown: () => d() };
        },
        svelte: (c: HTMLElement) => {
            const inst = new CardsDyn({ target: c, props: { cards: CARDS } });
            return { flip: () => { clickAll(c, '.tog'); clickAll(c, '.addtag'); svelteFlush(); }, teardown: () => inst.$destroy() };
        },
        react: (c: HTMLElement) => {
            const r = createRoot(c);
            flushSync(() => r.render(rc(ReactApp)));
            return { flip: () => flushSync(() => { clickAll(c, '.tog'); clickAll(c, '.addtag'); }), teardown: () => r.unmount() };
        },
    };
}
