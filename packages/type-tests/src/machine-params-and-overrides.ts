import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoMachineNode, TExoTextPort } from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';

const SCHEMA = createExoSchema((b) => {
    let label!: TExoTextPort;
    b.el('p', null, (p) => {
        label = p.textPort();
    });
    return { label };
});

type TRowParams = { readonly title: string };
const mRow = createExoMachineBuilder<TExoMachineNode, TRowParams, { count: number }>(SCHEMA);
mRow.createInitialState(() => ({ count: 0 }));
mRow.wire((c, params) => {
    c.text(SCHEMA.ports.label, params.title);
});
const add = mRow.transition<number>((c, by) => {
    c.state.count += by;
});
mRow.overrides([[add, (c: TExoMachineNode, by: number) => void c.text(SCHEMA.ports.label, by)]]);
// @ts-expect-error — the replacement takes a string where the transition hands a number
mRow.overrides([[add, (c: TExoMachineNode, by: string) => void c.text(SCHEMA.ports.label, by)]]);
// @ts-expect-error — state is typed by the builder, so a wrong field is caught
mRow.transition((c) => void c.state.missing);
const ROW = mRow.done();

const HOST = createExoSchema((b) => {
    b.el('div');
    return {};
});
const mHost = createExoMachineBuilder<TExoDomNode>(HOST);
mHost.createInitialState((c) => {
    c.build(ROW, 0, { title: 'ok' });
    // @ts-expect-error — the params do not match the wire's TRowParams
    c.build(ROW, 0, { title: 42 });
});
