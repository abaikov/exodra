// @vitest-environment jsdom
// A HAND-ASSEMBLED PROGRAM DRIVING A REAL COMPONENT'S PORTS ON A REAL BACKEND — no cursor, no
// decoration, and every table written out. It is what a benchmark or a plugin holds.
//
// THE EXONODE IS THE INSTANCE, and that is the whole of the shape this file is written against.
// There is no second per-instance object beside `c`: the state is ONE array the wire hangs on
// `c.managedState`, the pending word is a ROW of that array named by the program, and every value the
// program produces leaves through the exonode's own `set` — the one write that makes a FILL RECORD,
// so a port filled during the wire survives the sweep that restores the ports the wire skipped.
//
// TWO THINGS A CURSOR WOULD HAVE DONE AND THIS FILE THEREFORE DOES ITSELF: the disposer array
// (`c.effectStops`, plus the single `c.onTeardown(() => c.stopEffects())` that ends it with the element),
// and the re-establishment — a BODY slot of the program runs `c.restartEffect` against an effect
// handle declared beside it.
import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoEffects,
    createExoSchema,
} from '@exodra/core';
import { reconcileExoOrder } from '@exodra/list-reconcile';
import type {
    TExoSchemaCursor,
    TExoMachine,
    TExoEffectOwner,
    TExoPort,
    TExoMachineEffect,
    TExoPortTable,
    TExoPortNodeWriter,
    TExoAttrPort,
    TExoTextPort,
    TExoChildrenPort,
    TExoMachineInitialState,
} from '@exodra/core';
import {
    compileExoMachine,
    exoComputed,
    exoBody,
    exoMachineField,
    fillExoMachineDerivations,
    runExoMachineSlots,
    exoTransition,
} from '@exodra/computed';
import type { TExoMachineProgram } from '@exodra/computed';
import { describe, expect, it } from 'vitest';
import { host, source, createExoTestMachine } from '@exodra/test-utils';
import type { TExoTestSource } from '@exodra/test-utils';
import { ExoDomBackend, withExoCompiler, withExoChildList } from '@exodra/dom';
import type { TExoDomMachine } from '../types/TExoDomMachine';
import type { TExoDomNode } from '../EXO_DOM_NODE_VOCABULARY';
import type { TExoChildList } from '../types/TExoChildList';

const EXO_BACKEND = withExoChildList(withExoCompiler(new ExoDomBackend()));

/**
 * EXACTLY WHAT THE WIRES BELOW TOUCH ON THE EXONODE THEY ARE HANDED, and nothing else — the point of
 * a hand-assembled driver is that the surface it needs is small enough to write out.
 *
 * `state` AND `effectStops` ARE DATA THE WIRE FILLS. Every node literal seats both; a component that
 * declares nothing leaves them at the shared empty array and `null`, and a wire that runs a program
 * puts its own arrays there.
 */
type TMachineDriving = {
    managedState: unknown[];
    effectStops: ((() => void) | null)[] | null;
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
    onTeardown(off: () => void): void;
    restartEffect<TOf extends TExoEffectOwner>(this: TOf, effect: TExoMachineEffect<TOf>): void;
    stopEffects(this: TExoEffectOwner): void;
    portTable(): TExoPortTable;
    portNodeWriter(): TExoPortNodeWriter;
};

/** WHERE EVERY PROGRAM IN THIS FILE KEEPS ITS PENDING WORD. */
const PENDING = 0;

const mark = (enode: TMachineDriving, bits: number): void => {
    enode.managedState[PENDING] = (enode.managedState[PENDING] as number) | bits;
};

function buildCard(b: TExoSchemaCursor) {
    let first!: TExoPort;
    let second!: TExoPort;
    let third!: TExoPort;
    b.el('div', null, (d) => {
        first = d.port('data-a');
        second = d.port('data-b');
        third = d.port('data-c');
    });
    return { first, second, third };
}

/** The row of `state` this component's one field lives in, beside the pending word. */
const LABEL_ROW = 1;

// THE FIELD'S INDEX IS NOT ITS ROW, and the two are written apart on purpose: the INDEX (`0`) is
// what `fieldMarks` is subscripted by and what its bit is cut from, the ROW is where this particular
// hand-assembled instance chose to keep the value.
const LABEL = exoMachineField<TMachineDriving, string>(
    0,
    (s) => s.managedState[LABEL_ROW] as string
);

function makeCard(): {
    component: TExoMachine<TMachineDriving>;
    setLabel: (enode: TMachineDriving, label: string) => void;
    instances: TMachineDriving[];
    tables: TExoPortTable[];
    writes: TExoPortNodeWriter[];
} {
    const instances: TMachineDriving[] = [];
    const tables: TExoPortTable[] = [];
    const writes: TExoPortNodeWriter[] = [];
    let setLabel!: (enode: TMachineDriving, label: string) => void;
    const component = createExoTestMachine(
        buildCard,
        (P): TExoMachineInitialState<TMachineDriving> => {
            const program = compileExoMachine<TMachineDriving>({
                fields: 1,
                pendingRow: PENDING,
                derivations: [
                    exoComputed({
                        label: 'a',
                        reads: [LABEL],
                        into: P.first,
                        compute: (label) => label,
                    }),
                ],
            });
            const MARK = program.fieldMarks[0];
            setLabel = exoTransition<TMachineDriving, string>(program, (s, label) => {
                s.managedState[LABEL_ROW] = label;
                mark(s, MARK);
            });
            return (c, at) => {
                c.managedState = [0, `row-${at}`];
                instances.push(c);
                tables.push(c.portTable());
                writes.push(c.portNodeWriter());
                fillExoMachineDerivations(program, c);
            };
        }
    );
    return { component, setLabel, instances, tables, writes };
}

const makeShell = (row: TExoMachine<TMachineDriving>): TExoDomMachine =>
    createExoTestMachine(
        (b) => {
            let rows!: TExoChildrenPort;
            b.el('section', null, (s) => {
                rows = s.childrenPort();
            });
            return { rows };
        },
        (P): TExoMachineInitialState<TExoDomNode> =>
            (c) => {
                c.list(P.rows, row, [0, 1]);
            }
    );

describe('a machine driving a component`s ports', () => {
    it('fills at the mount, and the fill is not swept back over', () => {
        const card = makeCard();
        const parent = host();
        EXO_BACKEND.render(card.component, parent, 0);
        const el = parent.firstElementChild as Element;
        expect(el.getAttribute('data-a')).toBe('row-0');
        expect(el.hasAttribute('data-b')).toBe(false);
        expect(el.hasAttribute('data-c')).toBe(false);
    });

    it('updates through the schema`s write after the wire has returned', () => {
        const card = makeCard();
        const parent = host();
        EXO_BACKEND.render(card.component, parent, 0);
        const el = parent.firstElementChild as Element;
        card.setLabel(card.instances[0], 'later');
        expect(el.getAttribute('data-a')).toBe('later');
        expect(el.hasAttribute('data-b')).toBe(false);
    });

    /**
     * ONE WRITE, TWO STATES — the pair the machine used to copy onto an object of its own and now
     * ASKS THE EXONODE FOR. `portNodeWriter()` is the schema's, cached on it, so every instance
     * of the component is handed the same function; `portTable()` is this instance's node array.
     * The machine reaches neither on its update path — it writes through `set` — and they are
     * asserted here because they are what "shared schema, own instance" means on this backend.
     */
    it('keeps each instance its own table while sharing one write', () => {
        const card = makeCard();
        const parent = host();
        EXO_BACKEND.render(makeShell(card.component), parent);
        const section = parent.firstElementChild as Element;
        const rowZero = section.children[0];
        const rowOne = section.children[1];
        expect(card.instances).toHaveLength(2);
        expect(rowZero.getAttribute('data-a')).toBe('row-0');
        expect(rowOne.getAttribute('data-a')).toBe('row-1');
        expect(card.writes[0]).toBe(card.writes[1]);
        expect(card.tables[0]).not.toBe(card.tables[1]);
        expect(card.instances[0]).not.toBe(card.instances[1]);
        expect(card.instances[0].managedState).not.toBe(card.instances[1].managedState);
        card.setLabel(card.instances[0], 'zero-again');
        expect(rowZero.getAttribute('data-a')).toBe('zero-again');
        expect(rowOne.getAttribute('data-a')).toBe('row-1');
    });
});

class SyncStore {
    readonly log: string[] = [];
    readonly rows = new Map<string, string>();

    subscribe(id: string, on: (value: string) => void): () => void {
        this.log.push(`subscribe ${id}`);
        const held = this.rows.get(id);
        if (held !== undefined) on(held);
        return (): void => {
            this.log.push(`dispose ${id}`);
        };
    }
}

/**
 * AN EFFECT OWNS A DISPOSER, AND OWNERSHIP IS THE EXONODE'S — so this half hangs the disposer array
 * on `c.effectStops`, files ONE `c.onTeardown(() => c.stopEffects())` before the first subscription is
 * made, and re-runs the effect through `c.restartEffect`. Its two fields are ROWS of the same `state`
 * array the pending word sits in.
 */
const ID_ROW = 1;
const TITLE_ROW = 2;

type TItem = { readonly id: string };

const R_ID = exoMachineField<TMachineDriving, string>(0, (s) => s.managedState[ID_ROW] as string);
const R_TITLE = exoMachineField<TMachineDriving, string>(
    1,
    (s) => s.managedState[TITLE_ROW] as string
);

function makeStoreRow(store: SyncStore): {
    component: TExoMachine<TMachineDriving>;
    instances: TMachineDriving[];
    setId: (enode: TMachineDriving, id: string) => void;
} {
    const instances: TMachineDriving[] = [];
    let setId!: (enode: TMachineDriving, id: string) => void;
    const component = createExoTestMachine(
        buildCard,
        (P): TExoMachineInitialState<TMachineDriving> => {
            // THE HANDLE IS THE ENGINE'S HALF: what the body slot below runs is the RE-RUN, and what
            // owns the disposer is `effectStops`, indexed by `at`.
            const subscription: TExoMachineEffect<TMachineDriving> = {
                at: 0,
                start: (s) => store.subscribe(R_ID.read(s), (value) => setTitle(s, value)),
            };
            const program: TExoMachineProgram<TMachineDriving> = compileExoMachine<TMachineDriving>(
                {
                    fields: 2,
                    pendingRow: PENDING,
                    derivations: [
                        exoComputed({
                            label: 'a',
                            reads: [R_TITLE],
                            into: P.first,
                            compute: (title) => title,
                        }),
                    ],
                    bodies: [
                        exoBody<TMachineDriving>({
                            label: 'row',
                            reads: [R_ID],
                            start: (s) => {
                                s.restartEffect(subscription);
                            },
                        }),
                    ],
                }
            );
            // Declared HERE and not above `subscription`: `start` names it from inside a closure that
            // runs no earlier than `runExoMachineSlots` below, so the capture is live by then.
            const setTitle = exoTransition<TMachineDriving, string>(program, (s, title) => {
                s.managedState[TITLE_ROW] = title;
                mark(s, program.fieldMarks[1]);
            });
            setId = exoTransition<TMachineDriving, string>(program, (s, id) => {
                s.managedState[ID_ROW] = id;
                mark(s, program.fieldMarks[0]);
            });
            return (c, item) => {
                c.managedState = [0, (item as TItem).id, 'unset'];
                c.effectStops = new Array<(() => void) | null>(1).fill(null);
                instances.push(c);
                // BEFORE THE FIRST SUBSCRIPTION EXISTS, so a `start` that throws still leaves what it
                // had already established owned by the instance.
                c.onTeardown((): void => {
                    c.stopEffects();
                });
                fillExoMachineDerivations(program, c);
                c.managedState[PENDING] = program.bodyMask;
                runExoMachineSlots(program, c);
            };
        }
    );
    return { component, instances, setId };
}

const ROW_LIST_SCHEMA = createExoSchema((b) => {
    let rows!: TExoChildrenPort;
    b.el('ul', null, (ul) => {
        rows = ul.childrenPort();
    });
    return { rows };
});

const makeRowList = (
    row: TExoMachine<TMachineDriving>,
    src: TExoTestSource<readonly TItem[]>
): TExoDomMachine => {
    const m = createExoMachine<TExoDomNode, unknown, { rows: TExoChildList; shown: TItem[] }>(
        ROW_LIST_SCHEMA,
        {
            createInitialState: (c) => ({
                rows: c.childList(ROW_LIST_SCHEMA.ports.rows),
                shown: [],
            }),
        }
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
                        (item) => c.build(row, item)
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

describe('an effect whose store answers from inside subscribe', () => {
    it('leaves the store`s value on the element, past the sweep of skipped ports', () => {
        const store = new SyncStore();
        store.rows.set('a', 'from the store');
        const row = makeStoreRow(store);
        const src = source<readonly TItem[]>([{ id: 'a' }]);
        const parent = host();
        EXO_BACKEND.render(makeRowList(row.component, src), parent);
        const el = parent.querySelector('div') as Element;
        expect(store.log).toEqual(['subscribe a']);
        // THE VALUE THE STORE ANSWERED WITH FROM INSIDE `subscribe`, not the `'unset'` the wire
        // seeded and not the placeholder the sweep would have put back.
        expect(el.getAttribute('data-a')).toBe('from the store');
        expect(el.hasAttribute('data-b')).toBe(false);
        expect(R_TITLE.read(row.instances[0])).toBe('from the store');
    });

    it('re-subscribes to the new key and shows what the store says for it', () => {
        const store = new SyncStore();
        store.rows.set('a', 'row a');
        store.rows.set('b', 'row b');
        const row = makeStoreRow(store);
        const src = source<readonly TItem[]>([{ id: 'a' }]);
        const parent = host();
        EXO_BACKEND.render(makeRowList(row.component, src), parent);
        const el = parent.querySelector('div') as Element;
        expect(el.getAttribute('data-a')).toBe('row a');
        store.log.length = 0;
        row.setId(row.instances[0], 'b');
        expect(store.log).toEqual(['dispose a', 'subscribe b']);
        expect(el.getAttribute('data-a')).toBe('row b');
        expect(parent.querySelector('div')).toBe(el);
    });

    it('disposes the subscription when the row leaves the document', () => {
        const store = new SyncStore();
        store.rows.set('a', 'row a');
        store.rows.set('b', 'row b');
        const row = makeStoreRow(store);
        const itemA: TItem = { id: 'a' };
        const itemB: TItem = { id: 'b' };
        const src = source<readonly TItem[]>([itemA, itemB]);
        const parent = host();
        EXO_BACKEND.render(makeRowList(row.component, src), parent);
        expect(store.log).toEqual(['subscribe a', 'subscribe b']);
        store.log.length = 0;
        src.setValue([itemB]);
        expect(store.log).toEqual(['dispose a']);
        expect(parent.querySelectorAll('[data-a]')).toHaveLength(1);
    });
});
