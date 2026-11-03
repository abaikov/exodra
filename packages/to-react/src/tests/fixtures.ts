export const COUNTER_SOURCE = `
import { exoJsx } from '@exodra/jsx';
import { composeExoMachine, createExoMachine, withExoHandlers, withExoTransitions } from '@exodra/core';
import type { TExoAttrPort, TExoEventPort, TExoTextPort } from '@exodra/core';

const COUNTER_SCHEMA = exoJsx<{ count: TExoTextPort; increment: TExoEventPort; tone: TExoAttrPort }>(($) => (
    <div class="counter" data-tone={$.tone}>
        <b>{$.count}</b>
        <button type="button" onClick={$.increment}>+</button>
    </div>
));
const P = COUNTER_SCHEMA.ports;
const counterBase = createExoMachine<never, unknown, { n: number }>(COUNTER_SCHEMA, {
    createInitialState: (c) => {
        c.text(P.count, 0);
        c.attr(P.tone, 'calm');
        return { n: 0 };
    },
});
export const COUNTER = composeExoMachine(
    counterBase,
    (m) =>
        withExoTransitions(m, {
            show: (c) => {
                c.text(P.count, c.state.n);
                c.attr(P.tone, c.state.n > 2 ? 'loud' : 'calm');
            },
        }),
    (m) => {
        const { show } = m.transitions;
        return withExoHandlers(m, (on) => {
            on(P.increment, (c) => {
                c.state.n++;
                show(c);
            });
        });
    }
);
`;

export const LIST_SOURCE = `
import { exoJsx } from '@exodra/jsx';
import { composeExoMachine, createExoMachine, withExoHandlers, withExoTransitions, withExoWire, wireExoNode } from '@exodra/core';
import type { TExoChildrenPort, TExoEventPort, TExoTextPort, TExoAttrPort } from '@exodra/core';
import { reconcileExoOrder } from '@exodra/list-reconcile';

type TRowParams = { label: string; done: boolean };

const ROW_SCHEMA = exoJsx<{ label: TExoTextPort; state: TExoAttrPort }>(($) => (
    <li data-state={$.state}>{$.label}</li>
));
const R = ROW_SCHEMA.ports;
const ROW = composeExoMachine(createExoMachine<never, TRowParams>(ROW_SCHEMA), (m) =>
    withExoWire(m, (c, params) => {
        c.text(R.label, params.label);
        c.attr(R.state, params.done ? 'done' : 'open');
    })
);

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
const listBase = createExoMachine<never, unknown, TListState>(LIST_SCHEMA, {
    createInitialState: (c) => {
        return { items: ['a', 'b'], shown: [], rows: c.childList(L.rows), byItem: new Map(), next: 0 };
    },
});
export const LIST = composeExoMachine(
    listBase,
    (m) =>
        withExoTransitions(m, {
            show: (c) => {
                const state = c.state;
                state.shown = reconcileExoOrder(state.rows, state.shown, state.items, state.items, (item) => {
                    const row = c.build(ROW, { label: item, done: false });
                    state.byItem.set(item, row);
                    return row;
                });
            },
        }),
    (m) => {
        const { show } = m.transitions;
        return withExoWire(m, (c) => {
            show(c);
        });
    },
    (m) => {
        const { show } = m.transitions;
        return withExoHandlers(m, (on) => {
            on(L.add, (c) => {
                c.state.items = [...c.state.items, 'n' + c.state.next++];
                show(c);
            });
            on(L.reverse, (c) => {
                c.state.items = [...c.state.items].reverse();
                show(c);
            });
            on(L.finish, (c) => {
                const first = c.state.items[0];
                wireExoNode(c.state.byItem.get(first), ROW, { label: first + '!', done: true });
            });
        });
    }
);
`;

export const FIXED_SOURCE = `
import { exoJsx } from '@exodra/jsx';
import { createExoMachine } from '@exodra/core';
import type { TExoChildrenPort, TExoTextPort } from '@exodra/core';

type TItemParams = { label: string };

const ITEM_SCHEMA = exoJsx<{ label: TExoTextPort }>(($) => <li>{$.label}</li>);
const I = ITEM_SCHEMA.ports;
const ITEM = createExoMachine<never, TItemParams>(ITEM_SCHEMA, {
    createInitialState: (c, params) => {
        c.text(I.label, params.label);
        return {};
    },
});

const FIXED_SCHEMA = exoJsx<{ head: TExoChildrenPort; rows: TExoChildrenPort }>(($) => (
    <div>
        <ul class="head"><$.head /></ul>
        <ul class="rows"><$.rows /></ul>
    </div>
));
const F = FIXED_SCHEMA.ports;
export const FIXED = createExoMachine<never, unknown>(FIXED_SCHEMA, {
    createInitialState(c) {
        c.one(F.head, ITEM, { label: 'head' });
        c.list(F.rows, ITEM, [{ label: 'x' }, { label: 'y' }, { label: 'z' }]);
        return {};
    },
});
`;
