import {
    composeExoMachine,
    createExoMachine,
    createExoSchema,
    withExoTransitions,
    withExoWire,
} from '@exodra/core';
import type { TExoChildrenPort, TExoMachineNode, TExoTextPort } from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';

const SCHEMA = createExoSchema((b) => {
    let label!: TExoTextPort;
    b.el('p', null, (p) => {
        label = p.textPort();
    });
    return { label };
});

type TRowParams = { readonly title: string };
const mRow = createExoMachine<TExoMachineNode, TRowParams, { count: number }>(SCHEMA, {
    createInitialState: () => ({ count: 0 }),
});
const ROW = composeExoMachine(
    mRow,
    (m) =>
        withExoWire(m, (c, params) => {
            c.text(SCHEMA.ports.label, params.title);
        }),
    (m) =>
        withExoTransitions(m, {
            add: (c, by: number) => {
                c.state.count += by;
            },
        })
);
ROW.overrides({ add: (c: TExoMachineNode, by: number) => void c.text(SCHEMA.ports.label, by) });
// @ts-expect-error — the replacement takes a string where the transition hands a number
ROW.overrides({ add: (c: TExoMachineNode, by: string) => void c.text(SCHEMA.ports.label, by) });
// @ts-expect-error — state is typed by the machine, so a wrong field is caught
withExoTransitions(mRow, { probe: (c) => void c.state.missing });

const HOST = createExoSchema((b) => {
    let rows!: TExoChildrenPort;
    b.el('div', null, (div) => {
        rows = div.childrenPort();
    });
    return { rows };
});
createExoMachine<TExoDomNode>(HOST, {
    createInitialState: (c) => {
        c.one(HOST.ports.rows, ROW, { title: 'ok' });
        // @ts-expect-error — the params do not match the wire's TRowParams
        c.one(HOST.ports.rows, ROW, { title: 42 });
    },
});
