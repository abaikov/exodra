import { h, text } from '@exodra/core';
import { bindable } from '@exodra/reactivity';

// Reactive state lives in bindables; the same App() renders on the server
// (to HTML) and hydrates on the client (wiring events + reactivity).
export function App() {
    const count = bindable(0);
    return h('div', {
        static: {
            id: 'app',
            children: [
                h('h1', { static: { children: text('Welcome to _ssr-test') } }),
                h('p', {
                    static: {
                        children: text(
                            'Server-rendered with @exodra/ssr, hydrated on the client.'
                        ),
                    },
                }),
                h('button', {
                    static: {
                        type: 'button',
                        onClick: () => count.setValue(count.getValue() + 1),
                        children: [
                            text('Clicked '),
                            h('strong', { bindables: { textContent: count } }),
                            text(' times'),
                        ],
                    },
                }),
            ],
        },
    });
}
