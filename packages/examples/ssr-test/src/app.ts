import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoWire,
    withExoHandlers,
    createExoSchema,
} from '@exodra/core';
import type { TExoEventPort, TExoMachineNode, TExoTextPort } from '@exodra/core';

const APP_SCHEMA = createExoSchema((b) => {
    let count!: TExoTextPort;
    let click!: TExoEventPort;
    b.el('div', { class: 'app' }, (div) => {
        div.el('h1', null, (h1) => {
            h1.text('Welcome to _ssr-test');
        });
        div.el('p', null, (p) => {
            p.text('Server-rendered with @exodra/ssr, hydrated on the client.');
        });
        div.el('button', { type: 'button' }, (button) => {
            click = button.eventPort('click');
            button.text('Clicked ');
            button.el('strong', null, (strong) => {
                count = strong.textPort();
            });
            button.text(' times');
        });
    });
    return { count, click };
});
const P = APP_SCHEMA.ports;

const mApp = createExoMachine<TExoMachineNode, unknown, { clicks: number }>(APP_SCHEMA, {
    createInitialState: () => ({ clicks: 0 }),
});

export const APP = composeExoMachine(
    mApp,
    (m) =>
        withExoTransitions(m, {
            showCount: (c) => {
                c.text(P.count, c.state.clicks);
            },
        }),
    (m) => {
        const { showCount } = m.transitions;
        return withExoWire(m, (c) => {
            showCount(c);
        });
    },
    (m) => {
        const { showCount } = m.transitions;
        return withExoHandlers(m, (on) => {
            on(P.click, (c) => {
                c.state.clicks++;
                showCount(c);
            });
        });
    }
);
