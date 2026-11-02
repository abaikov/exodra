// @vitest-environment jsdom
//
// `reconcileExoOrder` DRIVING A REAL `<ul>` — the reconciler of `@exodra/list-reconcile` composed
// over this backend's two doors, `c.build` and `c.childList(port)`, from a transition an effect runs
// on every change of the source. It reconciles by the IDENTITY of the item object and never by a key.
//
// IT IS A DOM-ONLY FILE ON PURPOSE. `childList` is a door `@exodra/dom` and `@exodra/term` have and
// `@exodra/string` does not, so a cross-backend list case belongs on `c.list(port, C, count)`
// instead — see `src/tests/duplicate-item-parity.test.ts`. What is asserted here is the composition
// against a document: element identity across a reorder, disposal on the way out, and the climb
// that survives another program reparenting a row.
import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoWire,
    withExoEffects,
    createExoSchema,
} from '@exodra/core';
import type {
    TExoAttrPort,
    TExoChildrenPort,
    TExoTextPort,
    TExoMachineInitialState,
    TExoSchemaCursor,
} from '@exodra/core';
import { reconcileExoOrder } from '@exodra/list-reconcile';
import { describe, expect, it } from 'vitest';

import { host, source, createExoTestMachine } from '@exodra/test-utils';
import type { TExoTestSource } from '@exodra/test-utils';
import { ExoDomBackend, withExoCompiler, withExoChildList } from '@exodra/dom';
import type { TExoDomMachine } from '../types/TExoDomMachine';
import type { TExoDomNode } from '../EXO_DOM_NODE_VOCABULARY';
import type { TExoChildList } from '../types/TExoChildList';

const EXO_BACKEND = withExoChildList(withExoCompiler(new ExoDomBackend()));

type TItem = { readonly id: string };
const items = (n: number): TItem[] => Array.from({ length: n }, (_, i) => ({ id: 'i' + i }));

/**
 * A row is built with its item as params and keeps that id for life, which is the point: the row
 * belongs to that ITEM, and nothing re-wires a row the reconciler merely moved.
 */
/** How many times a row was WIRED — the evidence that a survivor was not rebuilt. */
let built = 0;

const ROW = createExoTestMachine(
    (b) => {
        let id!: TExoAttrPort;
        b.el('li', null, (li) => {
            id = li.port('data-id');
        });
        return { id };
    },
    (P): TExoMachineInitialState<TExoDomNode> =>
        (c, item) => {
            built++;
            c.attr(P.id, (item as TItem).id);
        }
);

const BOUND_ROW_SCHEMA = createExoSchema((b) => {
    let id!: TExoAttrPort;
    let label!: TExoTextPort;
    b.el('li', null, (li) => {
        id = li.port('data-id');
        label = li.textPort();
    });
    return { id, label };
});

/** The same row, SUBSCRIBED — the leak cases need a live subscription to count. The subscription is
 *  on the TEXT so `data-id` stays the row's own and an order is still readable. */
const boundRow = (value: TExoTestSource<string>): TExoDomMachine => {
    const m = createExoMachine<TExoDomNode, unknown, { id: string }>(BOUND_ROW_SCHEMA, {
        createInitialState: (_c, item) => {
            built++;
            return { id: (item as TItem).id };
        },
    });
    const machine = composeExoMachine(
        m,
        (m) =>
            withExoTransitions(m, {
                show: (c) => {
                    c.text(BOUND_ROW_SCHEMA.ports.label, value.getValue());
                },
            }),
        (m) =>
            withExoWire(m, (c) => {
                c.attr(BOUND_ROW_SCHEMA.ports.id, c.state.id);
            }),
        (m) =>
            withExoEffects(m, (effect) => {
                effect((c) => {
                    show(c);
                    return value.onChange(() => show(c));
                });
            })
    );
    const { show } = machine.transitions;
    return machine;
};

const buildList = (b: TExoSchemaCursor): { rows: TExoChildrenPort } => {
    let rows!: TExoChildrenPort;
    b.el('ul', null, (ul) => {
        rows = ul.childrenPort();
    });
    return { rows };
};

/**
 * A `<ul>` whose children port follows `src`.
 *
 * The effect hands back the source's unsubscribe, and stopping the effect is what ends it: without
 * that the source goes on calling into a child list whose render has been torn down.
 */
const listOf = (
    rowComponent: TExoDomMachine,
    src: { getValue(): readonly TItem[]; onChange(cb: () => void): () => void },
    build: (b: TExoSchemaCursor) => { rows: TExoChildrenPort } = buildList
): TExoDomMachine => {
    const schema = createExoSchema(build);
    const m = createExoMachine<TExoDomNode, unknown, { rows: TExoChildList; shown: TItem[] }>(
        schema,
        { createInitialState: (c) => ({ rows: c.childList(schema.ports.rows), shown: [] }) }
    );
    const machine = composeExoMachine(
        m,
        (m) =>
            withExoTransitions(m, {
                showRows: (c) => {
                    const want = src.getValue();
                    c.state.shown = reconcileExoOrder(
                        c.state.rows,
                        c.state.shown,
                        want,
                        want,
                        (item) => c.build(rowComponent, item)
                    );
                },
            }),
        (m) =>
            withExoEffects(m, (effect) => {
                effect((c) => {
                    showRows(c);
                    return src.onChange(() => showRows(c));
                });
            })
    );
    const { showRows } = machine.transitions;
    return machine;
};

/** Mount a list over `src`, and hand back the tools every case below needs. */
const mountList = (src: TExoTestSource<readonly TItem[]>) => {
    const parent = host();
    const dispose = EXO_BACKEND.render(listOf(ROW, src), parent);
    const ul = parent.querySelector('ul') as HTMLElement;
    return {
        dispose,
        ul,
        shown: (): string =>
            Array.from(ul.children)
                .map((el) => el.getAttribute('data-id'))
                .join(','),
        wanted: (): string =>
            src
                .getValue()
                .map((it) => it.id)
                .join(','),
    };
};

describe('reconcileExoOrder — reconcile by object identity', () => {
    // Every case checks TWO things, and the second is the one that matters. Order alone is
    // satisfied by throwing the list away and rebuilding it, which is exactly the mistake the
    // algorithm exists to avoid — so each case also demands that a row which survived is the SAME
    // ELEMENT it was, not a new one with the same contents.
    const shapes: [string, (pool: TItem[]) => TItem[]][] = [
        ['nothing changed', (p) => p.slice()],
        ['appended to the tail', (p) => [...p, { id: 'new' }]],
        ['removed from the tail', (p) => p.slice(0, -2)],
        ['inserted in the middle', (p) => [p[0], { id: 'mid' }, ...p.slice(1)]],
        ['removed a middle run', (p) => [p[0], ...p.slice(3)]],
        ['swapped two', (p) => [p[1], p[0], ...p.slice(2)]],
        ['reversed', (p) => [...p].reverse()],
        ['shuffled', (p) => [p[2], p[0], p[4], p[1], p[3]].filter(Boolean)],
        ['cleared', () => []],
    ];

    for (const [name, change] of shapes) {
        it(`keeps order and element identity after: ${name}`, () => {
            const pool = items(6);
            const src = source<readonly TItem[]>(pool);
            const list = mountList(src);

            const before = new Map(
                Array.from(list.ul.children).map((el) => [el.getAttribute('data-id'), el])
            );
            src.setValue(change(pool));

            expect(list.shown()).toBe(list.wanted());
            for (const el of Array.from(list.ul.children)) {
                const was = before.get(el.getAttribute('data-id'));
                if (was !== undefined) expect(el).toBe(was);
            }
        });
    }

    it('refills after being cleared', () => {
        const src = source<readonly TItem[]>(items(3));
        const list = mountList(src);
        src.setValue([]);
        expect(list.ul.children).toHaveLength(0);
        src.setValue(items(4));
        expect(list.shown()).toBe(list.wanted());
    });

    it('builds a row for a new item only, and rebuilds one that left and came back', () => {
        // THE WHOLE OF WHAT THE RECONCILER KEEPS AND THE WHOLE OF WHAT IT FORGETS. There is no
        // registry under it: an item's row survives for as long as the item stays in the array, and
        // the moment the item leaves, the row is removed and disposed. Coming back is a REBUILD.
        const pool = items(3);
        const src = source<readonly TItem[]>(pool.slice(0, 2));
        const list = mountList(src);
        const first = list.ul.children[0];

        built = 0;
        src.setValue(pool);
        expect(built).toBe(1);
        expect(list.ul.children[0]).toBe(first);

        built = 0;
        src.setValue(pool.slice(1));
        expect(built).toBe(0);

        built = 0;
        src.setValue(pool);
        expect(built).toBe(1);
        expect(list.shown()).toBe(list.wanted());
    });

    it("drops a removed row's subscriptions, or every list is a leak", () => {
        const rowValue = source('x');
        const pool = items(3);
        const src = source<readonly TItem[]>(pool);
        EXO_BACKEND.render(listOf(boundRow(rowValue), src), host());
        expect(rowValue.subscribers()).toBe(3);
        src.setValue(pool.slice(0, 1));
        expect(rowValue.subscribers()).toBe(1);
    });

    it("ends every surviving row's subscriptions when the whole list is disposed", () => {
        // A dropped row disposes itself during reconcile. The rows that were never dropped are the
        // leak: without this, tearing a render down leaves every visible row still subscribed to
        // whatever it was bound to.
        const rowValue = source('x');
        const src = source<readonly TItem[]>(items(3));
        const dispose = EXO_BACKEND.render(listOf(boundRow(rowValue), src), host());
        expect(rowValue.subscribers()).toBe(3);
        dispose();
        expect(rowValue.subscribers()).toBe(0);
    });

    it('stops following the source once the render is disposed', () => {
        // The effect returns the source's unsubscribe and nothing else files it. Drop that return
        // and the source keeps a callback that keeps the child list, which keeps every element it
        // ever showed — and the next write walks a torn-down list.
        const src = source<readonly TItem[]>(items(3));
        const list = mountList(src);
        expect(src.subscribers()).toBe(1);

        list.dispose();
        expect(src.subscribers()).toBe(0);
        expect(() => src.setValue(items(5))).not.toThrow();
        expect(list.ul.children).toHaveLength(3);
    });
});

describe('reconcileExoOrder — a long run of random changes', () => {
    // WHAT A TABLE OF SHAPES CANNOT REACH. The cases above each apply ONE change to a freshly
    // mounted list, which is the only way to name what broke. A real page applies thousands of
    // changes to the SAME list, and the failures that survive a shape table are the ones where an
    // index or a scratch field left over from update N is read as meaning something in update N+1.
    //
    // DETERMINISTIC ON PURPOSE. A seeded generator means a failure is reproducible from the seed
    // alone; a random one means a red build nobody can repeat.
    it('keeps the DOM equal to the source at every single step', () => {
        let seed = 20260811;
        /** A tiny LCG — reproducible, and nothing here needs statistical quality. */
        const rnd = (n: number): number => {
            seed = (seed * 1103515245 + 12345) % 2147483648;
            return seed % n;
        };

        // Items are drawn from a fixed pool and never duplicated inside one array: this reconciles
        // by object IDENTITY, so the same object twice is not a list with a repeated row, it is a
        // question `c.list(port, C, count)` answers and this one does not.
        const pool = items(12);
        const src = source<readonly TItem[]>(pool.slice(0, 6));
        const list = mountList(src);

        for (let step = 0; step < 400; step++) {
            const next = src.getValue().slice();
            switch (rnd(5)) {
                case 0: {
                    const spare = pool.filter((p) => !next.includes(p));
                    if (spare.length > 0) {
                        next.splice(rnd(next.length + 1), 0, spare[rnd(spare.length)]);
                    }
                    break;
                }
                case 1:
                    if (next.length > 0) next.splice(rnd(next.length), 1);
                    break;
                case 2:
                    if (next.length > 1) {
                        const [moved] = next.splice(rnd(next.length), 1);
                        next.splice(rnd(next.length + 1), 0, moved);
                    }
                    break;
                case 3:
                    next.reverse();
                    break;
                case 4:
                    // Emptying and refilling is where leftover state shows: every row's index goes
                    // to -1, the whole-clear path runs instead of the per-child one, and the next
                    // update has to treat the list as if it had never held anything.
                    next.length = 0;
                    break;
            }
            src.setValue(next);

            // Asserted INSIDE the loop, so a failure names the step it happened on rather than the
            // end state it left behind.
            expect(`step ${step}: ${list.shown()}`).toBe(`step ${step}: ${list.wanted()}`);
        }
    });
});

describe('a list whose rows a third party has moved', () => {
    // WHY THIS IS NOT DEFENSIVE PROGRAMMING. Page translators — Chrome's built-in one, Google
    // Translate, and a long tail of extensions — REPARENT the nodes of a live page: a row ends up
    // inside a `<font>` the extension inserted, still on screen, no longer a child of the element
    // the child list holds. `dropExoChild`, which `TExoChildList.remove` calls, is written for
    // exactly that: it CLIMBS from the row's node to whatever child of the list's parent now
    // contains it, and removes that.
    //
    // A removal guarded by `node.parentNode === parent` instead is FALSE once a wrapper is in the
    // way, so the row would be disposed and left on screen — the child list and the DOM silently
    // diverge, and every later index-based command targets the wrong row. The climb is the fix, and
    // it is precisely the kind of line that looks redundant to somebody tightening a hot path.

    /** What a translator does: our element goes on living, one level deeper. */
    const wrapRow = (row: Element): void => {
        const parent = row.parentNode as Element;
        const font = document.createElement('font');
        parent.replaceChild(font, row);
        font.appendChild(row);
    };

    it('still takes a WRAPPED row out of the document when it leaves the list', () => {
        const pool = items(3);
        const src = source<readonly TItem[]>(pool);
        const list = mountList(src);

        wrapRow(list.ul.children[0]);
        expect(list.ul.querySelectorAll('font')).toHaveLength(1);

        src.setValue(pool.slice(1));

        // The wrapper goes with the row it swallowed. A leftover `<font>` here would be the removed
        // row still showing its text.
        expect(list.ul.querySelectorAll('font')).toHaveLength(0);
        expect(list.shown()).toBe(list.wanted());
    });

    it('does not throw when a row was deleted outright by somebody else', () => {
        // The other half of the same climb: if nothing links our node to the list's parent any
        // more, the loop walks off the top and removes nothing. `removeChild` on a foreign node
        // throws, and a list that throws while reconciling leaves the page half-updated with no way
        // back — so "do nothing" is the required behaviour, not a fallback.
        const pool = items(3);
        const src = source<readonly TItem[]>(pool);
        const list = mountList(src);

        list.ul.removeChild(list.ul.children[0]);

        expect(() => src.setValue(pool.slice(1))).not.toThrow();
        expect(list.shown()).toBe(list.wanted());
    });

    it('still clears a WRAPPED row on the whole-list path', () => {
        // The clear takes the other body — `removeAll`, reached when the source goes empty — and on
        // a port that owns its element that body is one assignment on the parent. A wrapper is
        // inside the parent, so it goes with everything else; the row inside it must be out of the
        // document all the same.
        const pool = items(3);
        const src = source<readonly TItem[]>(pool);
        const list = mountList(src);
        const row = list.ul.children[0];
        wrapRow(row);

        src.setValue([]);

        expect(list.ul.childNodes).toHaveLength(0);
        expect(row.isConnected).toBe(false);
    });

    const rowOrder = (ul: Element): string =>
        Array.from(ul.querySelectorAll('li'))
            .map((li) => li.getAttribute('data-id') ?? li.className)
            .join(',');

    it('inserts in front of a WRAPPED row without throwing', () => {
        const pool = items(3);
        const src = source<readonly TItem[]>(pool);
        const list = mountList(src);
        wrapRow(list.ul.children[0]);

        const fresh: TItem = { id: 'new' };
        expect(() => src.setValue([fresh, ...pool])).not.toThrow();

        expect(rowOrder(list.ul)).toBe('new,i0,i1,i2');
    });

    it('moves a WRAPPED row together with its wrapper', () => {
        const pool = items(3);
        const src = source<readonly TItem[]>(pool);
        const list = mountList(src);
        const first = list.ul.children[0];
        wrapRow(first);

        expect(() => src.setValue([pool[1], pool[2], pool[0]])).not.toThrow();

        expect(rowOrder(list.ul)).toBe('i1,i2,i0');
        const font = list.ul.querySelector('font') as Element;
        expect(font.firstChild).toBe(first);
        expect(list.ul.lastChild).toBe(font);
    });

    it('appends in front of a WRAPPED static tail without throwing', () => {
        const pool = items(2);
        const src = source<readonly TItem[]>(pool);
        const withTail = listOf(ROW, src, (b) => {
            let rows!: TExoChildrenPort;
            b.el('ul', null, (ul) => {
                rows = ul.childrenPort();
                ul.el('li', { class: 'tail' }, (li) => li.text('tail'));
            });
            return { rows };
        });
        const parent = host();
        EXO_BACKEND.render(withTail, parent);
        const ul = parent.querySelector('ul') as HTMLElement;
        wrapRow(ul.querySelector('.tail') as Element);

        expect(() => src.setValue([...pool, { id: 'i2' }])).not.toThrow();

        expect(rowOrder(ul)).toBe('i0,i1,i2,tail');
    });
});
