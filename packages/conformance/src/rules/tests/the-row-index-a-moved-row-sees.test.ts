// @vitest-environment jsdom
//
// `index` is the position AT BUILD TIME and nothing more: a row keeps the number it was built with
// after the rows around it move, because the reconciler moves nodes and does not re-run wiring. A
// reconciler that recomputes a position from a `Map` does so inside its CREATE path, and a pure
// reorder creates nothing, so every backend lands on the same numbers however it addresses a row.
//
// The artefact cannot see that a row was REUSED rather than rebuilt, so what is asserted is the
// only observable consequence: the number the row was wired with, written into an attribute.
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type {
    TExoMachineNode,
    TExoSchemaCursor,
    TExoAttrPort,
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

// WHAT A ROW READS, BY INDEX, written by the build callback an instant before `c.build` runs the
// wire — a row is handed its position and nothing else, so the item it stands for arrives this way
// and is the row's for life.
const BUILDING: TItem[] = [];

const ROW = createExoTestMachine(
    (b: TExoSchemaCursor) => {
        let at!: TExoAttrPort;
        let text!: TExoTextPort;
        b.el('li', null, (li) => {
            at = li.port('data-at');
            text = li.textPort();
        });
        return { at, text };
    },
    (P) =>
        (c: TExoChildrenWiring, index: number): void => {
            c.attr(P.at, String(index));
            c.text(P.text, BUILDING[index].label);
        }
);

const A: TItem = { label: 'a' };
const B: TItem = { label: 'b' };
const C: TItem = { label: 'c' };

const rotatingList = () => {
    const items = source<readonly TItem[]>([A, B, C]);
    const schema = createExoSchema((b: TExoSchemaCursor) => {
        let rows!: TExoChildrenPort;
        b.el('ul', null, (ul) => {
            rows = ul.childrenPort();
        });
        return { rows };
    });
    const m = createExoMachineBuilder<TReconciling, unknown, TListState>(schema);
    m.createInitialState((c) => ({ rows: c.childList(schema.ports.rows), shown: [] as TItem[] }));
    const showRows = m.transition((c) => {
        const want = items.getValue();
        c.state.shown = reconcileExoOrder(c.state.rows, c.state.shown, want, want, (item, i) => {
            BUILDING[i] = item;
            return c.build(ROW, i);
        });
    });
    m.effect((c) => {
        showRows(c);
        return items.onChange(() => showRows(c));
    });
    const component = m.done();
    return { component, items };
};

describe('the index a row that only MOVED was wired with', () => {
    it('is the build-time one, and the question is whether all three say so', () => {
        assertExoConformanceRule({
            name: 'a bound list rotated so that every row survives and none is created',
            // The `update` below is what makes this rule need `EXO_CAP_UPDATE`; a rule cannot.
            subject: () => {
                const built = rotatingList();
                // A ROTATION and not a reshuffle: every item survives, so no backend calls a build
                // function and a difference in the numbers is a difference in what "index" MEANS.
                return {
                    component: built.component,
                    update: () => built.items.setValue([C, A, B]),
                };
            },
            expect: {
                dom: renders(),
                // No second render, so no second answer: here the index IS the array position.
                string: cannotExpress(EXO_CAP_UPDATE),
                term: renders(),
                // ADOPTS: a reconciled list on a served page takes the rows the server printed.
                hydrate: renders(),
            },
            agreement: [['dom', 'term', 'hydrate']],
        });
    });
});
