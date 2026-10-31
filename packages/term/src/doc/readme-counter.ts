// Everything between the two markers is COPIED, character for character, out of `README.md` — the
// "A component is one value" block — and `readme-verbatim.test.ts` compares them. Exactly two lines
// of the block are absent, and both are the ENTRY POINT, which is a backend's by definition.
// NOTHING ELSE IS ADAPTED: no cast, no wrapper, no shim, no local type.
// >>> BEGIN VERBATIM — README.md, "A component is one value"
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoEventPort, TExoMachineNode, TExoTextPort } from '@exodra/core';

const COUNTER_SCHEMA = createExoSchema((b) => {
    let text!: TExoTextPort;
    let click!: TExoEventPort;
    b.el('div', { class: 'counter' }, (div) => {
        div.el('span', null, (span) => {
            text = span.textPort();
        });
        div.el('button', { class: 'btn', type: 'button' }, (btn) => {
            click = btn.eventPort('click');
            btn.text('Increment');
        });
    });
    return { text, click };
});
const P = COUNTER_SCHEMA.ports;

const mCounter = createExoMachineBuilder<TExoMachineNode, unknown, { count: number }>(
    COUNTER_SCHEMA
);
mCounter.createInitialState(() => ({ count: 0 }));
const show = mCounter.transition((c) => {
    c.text(P.text, `Count: ${c.state.count}`);
});
mCounter.wire((c) => show(c));
const increment = mCounter.transition((c) => {
    c.state.count += 1;
    show(c);
});
mCounter.on(P.click, (c) => increment(c));
const COUNTER = mCounter.done();
// <<< END VERBATIM

export { COUNTER, increment };
