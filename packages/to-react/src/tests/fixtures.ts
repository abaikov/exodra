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
import { createExoChildrenReconciler } from '@exodra/list-reconcile';

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
type TListState = { items: string[]; byItem: Map<string, never>; next: number };
const showRows = createExoChildrenReconciler((c: never, item: string) => {
    const row = c.createExoNode(ROW);
    wireExoNode(row, { label: item, done: false });
    c.state.byItem.set(item, row);
    return row;
});
const listBase = createExoMachine<never, unknown, TListState>(LIST_SCHEMA, {
    createInitialState: () => ({ items: ['a', 'b'], byItem: new Map(), next: 0 }),
});
export const LIST = composeExoMachine(
    listBase,
    (m) =>
        withExoTransitions(m, {
            show: (c) => showRows(c, L.rows, c.state.items),
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
                wireExoNode(c.state.byItem.get(first), { label: first + '!', done: true });
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

export const STYLED_SOURCE = `
import { exoJsx } from '@exodra/jsx';
import { createExoMachine } from '@exodra/core';

const ZONE = 'color: red; border-radius: 8px';
const STYLED_SCHEMA = exoJsx(() => (
    <div class="styled" style={\`padding: 2px; \${ZONE}\`} title={ZONE}>
        <b style={'margin: 1px'}>x</b>
    </div>
));
export const STYLED = createExoMachine<never, unknown>(STYLED_SCHEMA, {
    createInitialState: () => ({}),
});
`;

export const HELPER_SOURCE = `
import { exoJsx } from '@exodra/jsx';
import { composeExoMachine, createExoMachine, withExoHandlers, withExoTransitions, withExoWire } from '@exodra/core';
import type { TExoAttrPort, TExoEventPort, TExoMachineNodeOf, TExoTextPort } from '@exodra/core';
import { showPill } from './pill';

const PILL_SCHEMA = exoJsx<{ tone: TExoAttrPort; label: TExoTextPort; count: TExoTextPort; bump: TExoEventPort }>(($) => (
    <p class="pill" data-tone={$.tone}>
        <span>{$.label}</span>
        <b>{$.count}</b>
        <button type="button" onClick={$.bump}>bump</button>
    </p>
));
const P = PILL_SCHEMA.ports;
const pillBase = createExoMachine(PILL_SCHEMA, { createInitialState: (_c: never, start?: number) => ({ n: start ?? 1 }) });

function showCount(c: TExoMachineNodeOf<typeof pillBase>): void {
    c.text(P.count, c.state.n);
    showPill(c, P, c.state.n > 2 ? 'hot' : 'cold');
}

export const PILL = composeExoMachine(
    pillBase,
    (m) => withExoTransitions(m, { bump: (c) => { c.state.n++; showCount(c); } }),
    (m) => {
        const { bump } = m.transitions;
        return withExoHandlers(m, (on) => on(P.bump, (c) => bump(c)));
    },
    (m) => withExoWire(m, (c) => showCount(c)),
);
`;

export const KEYED_SOURCE = `
import { exoJsx } from '@exodra/jsx';
import { composeExoMachine, createExoMachine, withExoHandlers, withExoTransitions, withExoWire } from '@exodra/core';
import type { TExoChildrenPort, TExoEventPort, TExoTextPort } from '@exodra/core';
import { createExoChildrenReconciler } from '@exodra/list-reconcile';

type TItem = { id: string; label: string };

const ITEM_SCHEMA = exoJsx<{ label: TExoTextPort }>(($) => <li>{$.label}</li>);
const I = ITEM_SCHEMA.ports;
const ITEM = composeExoMachine(
    createExoMachine(ITEM_SCHEMA, { createInitialState: (_c: never, item: TItem) => ({ item }) }),
    (m) => withExoTransitions(m, { setItem: (c, item: TItem) => { c.state.item = item; c.text(I.label, c.greeting + ' ' + item.label); } }),
    (m) => {
        const { setItem } = m.transitions;
        return withExoWire(m, (c, item: TItem) => setItem(c, item));
    },
);
export const { setItem } = ITEM.transitions;

const KEYED_SCHEMA = exoJsx<{ rows: TExoChildrenPort; swap: TExoEventPort; rename: TExoEventPort; drop: TExoEventPort }>(($) => (
    <section>
        <ul><$.rows /></ul>
        <button class="swap" onClick={$.swap}>swap</button>
        <button class="rename" onClick={$.rename}>rename</button>
        <button class="drop" onClick={$.drop}>drop</button>
    </section>
));
const K = KEYED_SCHEMA.ports;
const showRows = createExoChildrenReconciler(ITEM, { key: (item: TItem) => item.id });
export const KEYED = composeExoMachine(
    createExoMachine(KEYED_SCHEMA, {
        createInitialState: (c) => ({
            items: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
        }),
    }),
    (m) => withExoWire(m, (c) => showRows(c, K.rows, c.state.items)),
    (m) =>
        withExoHandlers(m, (on) => {
            on(K.swap, (c) => { c.state.items = [...c.state.items].reverse(); showRows(c, K.rows, c.state.items); });
            on(K.rename, (c) => { c.state.items = c.state.items.map((item) => (item.id === 'b' ? { id: 'b', label: 'Bee' } : item)); showRows(c, K.rows, c.state.items); });
            on(K.drop, (c) => { c.state.items = c.state.items.slice(1); showRows(c, K.rows, c.state.items); });
        }),
);
`;

export const FOREIGN_SOURCE = `
import { exoJsx } from '@exodra/jsx';
import { composeExoMachine, createExoMachine } from '@exodra/core';
import type { TExoEventPort, TExoTextPort } from '@exodra/core';
import { withPings } from 'foreign';

const PING_SCHEMA = exoJsx<{ said: TExoTextPort; seen: TExoTextPort; ping: TExoEventPort }>(($) => (
    <div class="ping">
        <i>{$.said}</i>
        <em>{$.seen}</em>
        <button type="button" onClick={$.ping}>ping</button>
    </div>
));
const G = PING_SCHEMA.ports;
export const PING = composeExoMachine(
    createExoMachine(PING_SCHEMA, { createInitialState: () => ({ pings: 0 }) }),
    (m) => withPings(m, G.ping, G.said, G.seen),
);
`;

export const FIELD_SOURCE = `
import { exoJsx } from '@exodra/jsx';
import { composeExoMachine, createExoMachine, withExoHandlers } from '@exodra/core';
import type { TExoAttrPort, TExoEventPort, TExoRefPort, TExoTextPort } from '@exodra/core';

const FIELD_SCHEMA = exoJsx<{ draft: TExoAttrPort; field: TExoRefPort; keydown: TExoEventPort<KeyboardEvent>; out: TExoTextPort; empty: TExoAttrPort }>(($) => (
    <form>
        <input class="field" value={$.draft} ref={$.field} on:keydown={$.keydown} />
        <output hidden={$.empty}>{$.out}</output>
    </form>
));
const F = FIELD_SCHEMA.ports;
export const FIELD = composeExoMachine(
    createExoMachine(FIELD_SCHEMA, { createInitialState: (c) => { c.attr(F.empty, true); return {}; } }),
    (m) =>
        withExoHandlers(m, (on) =>
            on(F.keydown, (c, event) => {
                if (event.key !== 'Enter') return;
                const input = c.portNode(F.field) as HTMLInputElement;
                c.text(F.out, input.value);
                c.attr(F.empty, false);
                c.attr(F.draft, '');
            })
        ),
);
`;

export const CHILDREN_SOURCE = `
import { exoJsx } from '@exodra/jsx';
import { composeExoMachine, createExoMachine, destroyExoNode, wireExoNode, withExoHandlers, withExoWire } from '@exodra/core';
import type { TExoChildrenPort, TExoEventPort, TExoTextPort } from '@exodra/core';

type TTodo = { id: number; title: string };

const TODO_SCHEMA = exoJsx<{ title: TExoTextPort }>(($) => <li>{$.title}</li>);
const T = TODO_SCHEMA.ports;
const TODO = composeExoMachine(
    createExoMachine<never, TTodo, { todo: TTodo }>(TODO_SCHEMA, { createInitialState: (_c, todo) => ({ todo }) }),
    (m) =>
        withExoWire(m, (c, todo) => {
            c.state.todo = todo;
            c.text(T.title, todo.title);
        })
);

const BOARD_SCHEMA = exoJsx<{ open: TExoChildrenPort; archive: TExoChildrenPort; archiveFirst: TExoEventPort; rewire: TExoEventPort; reorder: TExoEventPort; takeOut: TExoEventPort; putBack: TExoEventPort; destroy: TExoEventPort; clear: TExoEventPort }>(($) => (
    <section>
        <ul class="open"><$.open /></ul>
        <ul class="archive"><$.archive /></ul>
        <button class="archive-first" onClick={$.archiveFirst}>archive</button>
        <button class="rewire" onClick={$.rewire}>rewire</button>
        <button class="reorder" onClick={$.reorder}>reorder</button>
        <button class="take-out" onClick={$.takeOut}>take out</button>
        <button class="put-back" onClick={$.putBack}>put back</button>
        <button class="destroy" onClick={$.destroy}>destroy</button>
        <button class="clear" onClick={$.clear}>clear</button>
    </section>
));
const B = BOARD_SCHEMA.ports;
export const BOARD = composeExoMachine(
    createExoMachine<never, unknown, { taken: never }>(BOARD_SCHEMA, {
        createInitialState: (c) => {
            for (const todo of [{ id: 1, title: 'write' }, { id: 2, title: 'ship' }, { id: 3, title: 'rest' }]) {
                const node = c.createExoNode(TODO);
                wireExoNode(node, todo);
                c.appendChild(B.open, node);
            }
            const late = c.createExoNode(TODO);
            c.insertChild(B.open, late, 0);
            wireExoNode(late, { id: 0, title: 'late' });
            return { taken: undefined };
        },
    }),
    (m) =>
        withExoHandlers(m, (on) => {
            on(B.archiveFirst, (c) => {
                const first = c.childAt(B.open, 0);
                if (first !== undefined) c.moveChild(first, B.archive, 0);
            });
            on(B.rewire, (c) => {
                const node = c.childAt(B.archive, 0);
                if (node !== undefined) wireExoNode(node, { id: 9, title: 'done of ' + c.childCount(B.open) });
            });
            on(B.reorder, (c) => {
                const last = c.childAt(B.open, c.childCount(B.open) - 1);
                if (last !== undefined) c.moveChild(last, 0);
            });
            on(B.takeOut, (c) => {
                const node = c.childAt(B.open, 0);
                if (node === undefined) return;
                c.removeChild(node);
                c.state.taken = node;
            });
            on(B.putBack, (c) => {
                if (c.state.taken === undefined) return;
                c.appendChild(B.open, c.state.taken);
                c.state.taken = undefined;
            });
            on(B.destroy, (c) => {
                const node = c.childAt(B.archive, 0);
                if (node !== undefined) destroyExoNode(node);
            });
            on(B.clear, (c) => c.replaceChildren(B.open));
        })
);
`;

export const RECONCILER_SOURCE = `
import { exoJsx } from '@exodra/jsx';
import { composeExoMachine, createExoMachine, wireExoNode, withExoHandlers, withExoWire } from '@exodra/core';
import type { TExoChildrenPort, TExoEventPort, TExoTextPort } from '@exodra/core';
import { createExoChildrenReconciler } from '@exodra/list-reconcile';

type TItem = { id: number; name: string };

const ROW_SCHEMA = exoJsx<{ label: TExoTextPort }>(($) => <li>{$.label}</li>);
const R = ROW_SCHEMA.ports;
const ROW = composeExoMachine(createExoMachine<never, TItem>(ROW_SCHEMA), (m) =>
    withExoWire(m, (c, item) => c.text(R.label, item.id + ':' + item.name))
);

const showRows = createExoChildrenReconciler(ROW, { key: (item: TItem) => item.id, skipFirst: 1, skipLast: 1 });

const LIST_SCHEMA = exoJsx<{ rows: TExoChildrenPort; reverse: TExoEventPort; rename: TExoEventPort; drop: TExoEventPort; add: TExoEventPort }>(($) => (
    <section>
        <ul><$.rows /></ul>
        <button class="reverse" onClick={$.reverse}>reverse</button>
        <button class="rename" onClick={$.rename}>rename</button>
        <button class="drop" onClick={$.drop}>drop</button>
        <button class="add" onClick={$.add}>add</button>
    </section>
));
const L = LIST_SCHEMA.ports;
export const RECONCILED = composeExoMachine(
    createExoMachine<never, unknown, { items: TItem[] }>(LIST_SCHEMA, {
        createInitialState: (c) => {
            for (const edge of [{ id: 0, name: 'head' }, { id: 99, name: 'foot' }]) {
                const node = c.createExoNode(ROW);
                wireExoNode(node, edge);
                c.appendChild(L.rows, node);
            }
            return { items: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }, { id: 3, name: 'c' }] };
        },
    }),
    (m) => withExoWire(m, (c) => showRows(c, L.rows, c.state.items)),
    (m) =>
        withExoHandlers(m, (on) => {
            on(L.reverse, (c) => {
                c.state.items = [...c.state.items].reverse();
                showRows(c, L.rows, c.state.items);
            });
            on(L.rename, (c) => {
                c.state.items = c.state.items.map((item) => (item.id === 2 ? { id: 2, name: 'bee' } : item));
                showRows(c, L.rows, c.state.items);
            });
            on(L.drop, (c) => {
                c.state.items = c.state.items.slice(1);
                showRows(c, L.rows, c.state.items);
            });
            on(L.add, (c) => {
                c.state.items = [...c.state.items, { id: c.state.items.length + 10, name: 'n' }];
                showRows(c, L.rows, c.state.items);
            });
        })
);
`;
