import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
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

const mApp = createExoMachineBuilder<TExoMachineNode, unknown, { clicks: number }>(APP_SCHEMA);
mApp.createInitialState(() => ({ clicks: 0 }));

const showCount = mApp.transition((c) => {
    c.text(P.count, c.state.clicks);
});

mApp.wire((c) => {
    showCount(c);
});

mApp.on(P.click, (c) => {
    c.state.clicks++;
    showCount(c);
});

export const APP = mApp.done();
