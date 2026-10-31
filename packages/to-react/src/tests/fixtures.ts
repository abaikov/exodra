export const COUNTER_SOURCE = `
import { exoJsx } from '@exodra/jsx';
import { createExoMachineBuilder } from '@exodra/core';
import type { TExoAttrPort, TExoEventPort, TExoTextPort } from '@exodra/core';

const COUNTER_SCHEMA = exoJsx<{ count: TExoTextPort; increment: TExoEventPort; tone: TExoAttrPort }>(($) => (
    <div class="counter" data-tone={$.tone}>
        <b>{$.count}</b>
        <button type="button" onClick={$.increment}>+</button>
    </div>
));
const P = COUNTER_SCHEMA.ports;
const m = createExoMachineBuilder<never, unknown, { n: number }>(COUNTER_SCHEMA);
m.createInitialState((c) => {
    c.text(P.count, 0);
    c.attr(P.tone, 'calm');
    return { n: 0 };
});
const show = m.transition((c) => {
    c.text(P.count, c.state.n);
    c.attr(P.tone, c.state.n > 2 ? 'loud' : 'calm');
});
m.on(P.increment, (c) => {
    c.state.n++;
    show(c);
});
export const COUNTER = m.done();
`;

export const LIST_SOURCE = `
import { exoJsx } from '@exodra/jsx';
import { createExoMachineBuilder, wireExoNode } from '@exodra/core';
import type { TExoChildrenPort, TExoEventPort, TExoTextPort, TExoAttrPort } from '@exodra/core';
import { reconcileExoOrder } from '@exodra/list-reconcile';

type TRowParams = { label: string; done: boolean };

const ROW_SCHEMA = exoJsx<{ label: TExoTextPort; state: TExoAttrPort }>(($) => (
    <li data-state={$.state}>{$.label}</li>
));
const R = ROW_SCHEMA.ports;
const mRow = createExoMachineBuilder<never, TRowParams>(ROW_SCHEMA);
mRow.wire((c, params) => {
    c.text(R.label, params.label);
    c.attr(R.state, params.done ? 'done' : 'open');
});
const ROW = mRow.done();

const LIST_SCHEMA = exoJsx<{ rows: TExoChildrenPort; add: TExoEventPort; reverse: TExoEventPort; finish: TExoEventPort }>(($) => (
    <section>
        <ul><$.rows /></ul>
        <button class="add" onClick={$.add}>add</button>
        <button class="reverse" onClick={$.reverse}>reverse</button>
        <button class="finish" onClick={$.finish}>finish</button>
    </section>
));
const L = LIST_SCHEMA.ports;
type TListState = { items: string[]; shown: string[]; rows: never; byItem: Map<string, never>; next: number };
const mList = createExoMachineBuilder<never, unknown, TListState>(LIST_SCHEMA);
mList.createInitialState((c) => {
    return { items: ['a', 'b'], shown: [], rows: c.childList(L.rows), byItem: new Map(), next: 0 };
});
const show = mList.transition((c) => {
    const state = c.state;
    state.shown = reconcileExoOrder(state.rows, state.shown, state.items, state.items, (item, at) => {
        const row = c.build(ROW, at, { label: item, done: false });
        state.byItem.set(item, row);
        return row;
    });
});
mList.wire((c) => {
    show(c);
});
mList.on(L.add, (c) => {
    c.state.items = [...c.state.items, 'n' + c.state.next++];
    show(c);
});
mList.on(L.reverse, (c) => {
    c.state.items = [...c.state.items].reverse();
    show(c);
});
mList.on(L.finish, (c) => {
    const first = c.state.items[0];
    wireExoNode(c.state.byItem.get(first), ROW, { label: first + '!', done: true });
});
export const LIST = mList.done();
`;
