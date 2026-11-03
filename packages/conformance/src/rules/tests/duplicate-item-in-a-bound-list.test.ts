// @vitest-environment jsdom
//
// Exodra reconciles by IDENTITY, not keys, so two identical items are two array entries and ONE
// identity — "the second one" is a position with no owner. A key-based renderer never meets this.
// Asked twice, at MOUNT and at UPDATE, because a backend can accept a duplicate silently on mount
// and throw on the next data change.
//
// MEASURED ANSWER: a ROW PER POSITION, and the three live-tree backends agree. The old four-way fork
// — one collapsing to a single row, one printing two, one queueing — belonged to the deleted
// `c.bindList` and its registry keyed by the item object. `reconcileExoOrder` keeps its order as
// an array and never looks a row up by identity, so the second position gets its own row and the
// duplicate is not silently dropped.
import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoEffects,
    createExoSchema,
} from '@exodra/core';
import type {
    TExoMachineNode,
    TExoSchemaCursor,
    TExoChildrenPort,
    TExoChildrenWiring,
    TExoNode,
    TExoTextPort,
} from '@exodra/core';
import { reconcileExoOrder } from '@exodra/list-reconcile';
import type { TExoPlacedChildren } from '@exodra/list-reconcile';
import { source, createExoTestMachine } from '@exodra/test-utils';
import { describe, it } from 'vitest';
import { EXO_CAP_UPDATE, cannotExpress, assertExoConformanceRule, renders } from '../../index';

type TItem = { readonly label: string };

// The outer wire reconciles, so it names the placement door on top of the children surface; the row
// wire names neither, because claiming a leaf can reconcile a list narrows what can run the leaf.
type TReconciling = TExoChildrenWiring &
    TExoMachineNode & {
        childList(port: TExoChildrenPort): TExoPlacedChildren<TExoNode>;
    };

type TListState = { readonly rows: TExoPlacedChildren<TExoNode>; shown: TItem[] };

const ROW = createExoTestMachine(
    (b: TExoSchemaCursor) => {
        let text!: TExoTextPort;
        b.el('li', null, (li) => {
            text = li.textPort();
        });
        return { text };
    },
    (P) =>
        (c: TExoChildrenWiring, item: unknown): void => {
            c.text(P.text, (item as TItem).label);
        }
);

const SAME: TItem = { label: 'a' };
const OTHER: TItem = { label: 'b' };

// Built FRESH per backend: four renders sharing one cell are three reading somebody's leftovers.
const boundList = (initial: readonly TItem[]) => {
    const items = source<readonly TItem[]>(initial);
    const schema = createExoSchema((b: TExoSchemaCursor) => {
        let rows!: TExoChildrenPort;
        b.el('ul', null, (ul) => {
            rows = ul.childrenPort();
        });
        return { rows };
    });
    const m = createExoMachine<TReconciling, unknown, TListState>(schema, {
        createInitialState: (c) => ({ rows: c.childList(schema.ports.rows), shown: [] as TItem[] }),
    });
    const component = composeExoMachine(
        m,
        (m) =>
            withExoTransitions(m, {
                showRows: (c) => {
                    const want = items.getValue();
                    c.state.shown = reconcileExoOrder(
                        c.state.rows,
                        c.state.shown,
                        want,
                        want,
                        (item) => c.build(ROW, item)
                    );
                },
            }),
        (m) => {
            const { showRows } = m.transitions;
            return withExoEffects(m, (effect) => {
                effect((c) => {
                    showRows(c);
                    return items.onChange(() => showRows(c));
                });
            });
        }
    );
    return { component, items };
};

describe('the same item at two positions in a bound list', () => {
    it('MOUNT — the fork the shipped pair already pins, asked of all four', () => {
        assertExoConformanceRule({
            name: 'a bound list whose FIRST value already holds the same item twice',
            subject: () => ({ component: boundList([SAME, SAME, OTHER]).component }),
            expect: {
                // THREE ROWS on all three: the reconciler's order is an array, so a second entry
                // holding the same item is a second position and gets a row of its own.
                dom: renders(),
                string: renders(),
                term: renders(),
                // ADOPTS, where it used to refuse: a reconciled list on a served page hands its
                // rows to `build`, which takes the served element instead of making one. The
                // duplicate is a POSITION, so the third served row is adopted like the other two.
                hydrate: renders(),
            },
            agreement: [['dom', 'string', 'term', 'hydrate']],
        });
    });

    it('UPDATE — where the duplicate arrives on a later value', () => {
        assertExoConformanceRule({
            name: 'a bound list that acquires a duplicate on a LATER value',
            // The `update` below is what makes this rule need `EXO_CAP_UPDATE`; a rule cannot say so.
            subject: () => {
                const built = boundList([OTHER]);
                return {
                    component: built.component,
                    update: () => built.items.setValue([SAME, SAME, OTHER]),
                };
            },
            expect: {
                dom: renders(),
                // An absence, not a skip: "does not do this" and "was not asked" differ.
                string: cannotExpress(EXO_CAP_UPDATE),
                term: renders(),
                // ADOPTS, where it used to refuse: a reconciled list on a served page hands its
                // rows to `build`, which takes the served element instead of making one. The
                // duplicate is a POSITION, so the third served row is adopted like the other two.
                hydrate: renders(),
            },
            agreement: [['dom', 'term', 'hydrate']],
        });
    });
});
