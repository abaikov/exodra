// Shared SSR-bench app — Exodra flavour. The SAME spec is implemented in Solid
// and Qwik: a list of N interactive rows, each a counter button whose click
// increments its own number. Non-trivial on purpose so hydration/resume cost is
// visible (N event listeners to wire vs. wire-on-demand).
import { h } from '@exodra/core';
import { bindable } from '@exodra/reactivity';

export const DEFAULT_N = 1000;

// Build the schema fresh (server renders it to HTML; client rebuilds + hydrates
// against that HTML). N is a runtime value (server sets globalThis.__N__ before
// render; the client reads window.__N__ from an inline script) so ONE client
// bundle serves every N in the sweep. Reactive per-row count = a bindable.
export function makeApp(n = globalThis.__N__ ?? DEFAULT_N) {
    const rows = new Array(n);
    for (let i = 0; i < n; i++) {
        const count = bindable(0);
        rows[i] = h('li', {
            static: {
                class: 'row',
                'data-id': String(i),
                children: [
                    h('span', { static: { class: 'row__label', children: `Item ${i}` } }),
                    h('button', {
                        static: { class: 'row__btn', 'data-b': String(i) },
                        bindables: { textContent: count },
                        handlers: { onClick: () => count.setValue(count.getValue() + 1) },
                    }),
                ],
            },
        });
    }
    return h('ul', { static: { class: 'list', children: rows } });
}
