// Everything between the two markers is COPIED, character for character, out of `README.md` — the
// "A component is one value" block — and `readme-verbatim.test.ts` compares them. Exactly two lines
// of the block are absent, and both are the ENTRY POINT, which is a backend's by definition.
// NOTHING ELSE IS ADAPTED: no cast, no wrapper, no shim, no local type.
// >>> BEGIN VERBATIM — README.md, "A component is one value"
import { EXO_PORT_EVENT, EXO_PORT_TEXT, composeExoMachine, createExoMachine, createExoSchema, exoPorts, withExoHandlers, withExoWire } from '@exodra/core';
import type { TExoMachineNode } from '@exodra/core';

const CounterPorts = exoPorts({ text: EXO_PORT_TEXT, click: EXO_PORT_EVENT });

const counterSchema = createExoSchema(CounterPorts, (b) => {
    b.el('div', { class: 'counter' }, (div) => {
        div.el('span', null, (span) => {
            span.textPort(CounterPorts.text);
        });
        div.el('button', { class: 'btn', type: 'button' }, (btn) => {
            btn.eventPort(CounterPorts.click, 'click');
            btn.text('Increment');
        });
    });
});

const counterBase = createExoMachine<TExoMachineNode, unknown, { count: number }>(counterSchema, {
    createInitialState: () => ({ count: 0 }),
});
const Counter = composeExoMachine(
    counterBase,
    (m) =>
        withExoWire(m, (c) => {
            c.text(CounterPorts.text, `Count: ${c.state.count}`);
        }),
    (m) =>
        withExoHandlers(m, (on) => {
            on(CounterPorts.click, (c) => {
                c.state.count += 1;
                c.text(CounterPorts.text, `Count: ${c.state.count}`);
            });
        })
);
// <<< END VERBATIM

export { Counter };
