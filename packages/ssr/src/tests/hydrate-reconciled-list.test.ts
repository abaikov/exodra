// @vitest-environment jsdom
//
// A REACTIVE LIST ON A PAGE THE SERVER PRINTED.
//
// `c.list(port, C, count)` adopts because it is told the count. A reconciled list is not told one:
// `reconcileExoOrder(rows, shown, items, items, build)` reads the count off the ITEMS an effect hands
// it, after `createInitialState` has opened the child list. So adoption cannot happen when the list opens — it happens inside
// `build`, once per item the source names, and the served rows are handed out in document order.
//
// WHAT FAILS SILENTLY IF THAT IS WRONG. An opening pass that builds instead of adopting inserts a
// SECOND set of rows beside the ones the server printed: every row on the page twice, listeners on
// the copies only, and nothing thrown. That is what this file's first case is for, and why it asserts
// ELEMENT IDENTITY rather than a row count — a count of six passes whether the six are the served
// rows or six fresh ones.
//
// THREE COUNTS, because the server renders from the data it had and the client from the data it has:
// equal, the client wanting fewer, and the client wanting more. The surplus direction is the one
// that leaves bytes on the page with nothing holding them, so it is swept; the deficit direction
// builds, and those rows have to land in front of the static tail rather than at the end of the
// parent.
//
// AND ONE SHAPE THAT IS REFUSED BY NAME: a child list standing behind another with only a separator
// between them. There the first row of the list behind is indistinguishable from a surplus of the
// one in front, and a count is the only thing that could tell them apart — which a reconciled list
// does not have when it opens.
import { describe, expect, it } from 'vitest';
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type {
    TExoMachineNode,
    TExoSchemaCursor,
    TExoAttrPort,
    TExoChildrenPort,
    TExoTextPort,
    TExoNode,
    TExoMachineInitialState,
} from '@exodra/core';
import { reconcileExoOrder } from '@exodra/list-reconcile';
import type { TExoPlacedChildren } from '@exodra/list-reconcile';
import { ExoDomBackend, withExoHydration, withExoCompiler, withExoChildList } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';
import { createExoTestMachine, source } from '@exodra/test-utils';
import type { TExoTestSource } from '@exodra/test-utils';

const EXO_BACKEND = withExoHydration(withExoChildList(withExoCompiler(new ExoDomBackend())));
const EXO_STR = new ExoStrBackend();

type TItem = { readonly label: string };

/** NO PROPS: a row reads its item out of here, written an instant before `c.build` is called. */
const ROW_ITEMS: TItem[] = [];

type TRowSurface = {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
};

const ROW = createExoTestMachine(
    (b: TExoSchemaCursor) => {
        let id!: TExoAttrPort;
        let label!: TExoTextPort;
        b.el('section', null, (s) => {
            id = s.port('data-id');
            s.el('span', null, (span) => {
                label = span.textPort();
            });
        });
        return { id, label };
    },
    (P): TExoMachineInitialState<TRowSurface> =>
        (c, i) => {
            c.attr(P.id, i);
            c.text(P.label, ROW_ITEMS[i].label);
        }
);

type TShellSurface = TExoMachineNode & {
    childList(port: TExoChildrenPort): TExoPlacedChildren<TExoNode<unknown>>;
    build(component: typeof ROW, index: number): TExoNode<unknown>;
};

type TShellState = {
    readonly rows: TExoPlacedChildren<TExoNode<unknown>>;
    shown: TItem[];
};

/** `{rows}` with nothing behind it — the child list runs to the end of its parent. */
function buildOwned(b: TExoSchemaCursor) {
    let rows!: TExoChildrenPort;
    b.el('div', { class: 'card' }, (card) => {
        rows = card.childrenPort();
    });
    return { rows, next: null as TExoChildrenPort | null };
}

/** `{rows}<footer/>` — the shape whose end a walk can find, and whose inserts have somewhere to go. */
function buildTrailing(b: TExoSchemaCursor) {
    let rows!: TExoChildrenPort;
    b.el('div', { class: 'card' }, (card) => {
        rows = card.childrenPort();
        card.el('footer', null, (f) => f.text('tail'));
    });
    return { rows, next: null as TExoChildrenPort | null };
}

/** `<h3/>{rows}<hr/>{next}<footer/>` — the first list's end is the one no table can hold. */
function buildSeparated(b: TExoSchemaCursor) {
    let rows!: TExoChildrenPort;
    let next!: TExoChildrenPort;
    b.el('div', { class: 'card' }, (card) => {
        card.el('h3', null, (h) => h.text('head'));
        rows = card.childrenPort();
        card.el('hr', null);
        next = card.childrenPort();
        card.el('footer', null, (f) => f.text('tail'));
    });
    return { rows, next };
}

type TBuild = typeof buildOwned;

const shellOver = (build: TBuild, items: TExoTestSource<readonly TItem[]>) => {
    const schema = createExoSchema(build);
    const P = schema.ports;
    const m = createExoMachineBuilder<TShellSurface, unknown, TShellState>(schema);
    m.createInitialState((c) => ({ rows: c.childList(P.rows), shown: [] as TItem[] }));
    const showRows = m.transition((c) => {
        const want = items.getValue();
        c.state.shown = reconcileExoOrder(
            c.state.rows,
            c.state.shown,
            want,
            want,
            (item, index) => {
                ROW_ITEMS[index] = item;
                return c.build(ROW, index);
            }
        );
    });
    m.effect((c) => {
        showRows(c);
        return items.onChange(() => showRows(c));
    });
    return m.done();
};

const itemsOf = (...labels: string[]): TItem[] => labels.map((label) => ({ label }));

/** The served page as an adopting pass meets it: bytes in a fresh host, no listeners, no records. */
const serve = (component: ReturnType<typeof shellOver>): HTMLElement => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    parent.innerHTML = EXO_STR.render(component);
    return parent;
};

const rowsIn = (parent: HTMLElement): HTMLElement[] =>
    Array.from(parent.querySelectorAll('section[data-id]')) as HTMLElement[];

const labelsIn = (parent: HTMLElement): string =>
    rowsIn(parent)
        .map((el) => el.textContent)
        .join(',');

describe('a reconciled list adopting the markup it was served', () => {
    it('ADOPTS the served rows — the same elements, not a second set beside them', () => {
        const served = itemsOf('a', 'b', 'c');
        const items = source<readonly TItem[]>(served);
        const SHELL = shellOver(buildOwned, items);

        const parent = serve(SHELL);
        const before = rowsIn(parent);
        expect(before).toHaveLength(3);

        const dispose = EXO_BACKEND.hydrate(SHELL, parent);
        const after = rowsIn(parent);

        // IDENTITY AND NOT COUNT: three fresh rows beside three served ones would also leave three
        // in the document if the served ones had been removed, and six if they had not.
        expect(after).toHaveLength(3);
        expect(after[0]).toBe(before[0]);
        expect(after[1]).toBe(before[1]);
        expect(after[2]).toBe(before[2]);
        expect(labelsIn(parent)).toBe('a,b,c');
        dispose();
    });

    it('keeps adopting when the list sits in front of a static', () => {
        const items = source<readonly TItem[]>(itemsOf('a', 'b'));
        const SHELL = shellOver(buildTrailing, items);
        const parent = serve(SHELL);
        const before = rowsIn(parent);

        const dispose = EXO_BACKEND.hydrate(SHELL, parent);
        const after = rowsIn(parent);
        expect(after).toHaveLength(2);
        expect(after[0]).toBe(before[0]);
        expect(after[1]).toBe(before[1]);
        // The static is still the LAST child: adoption inserted nothing behind it.
        expect((parent.firstElementChild as Element).lastElementChild!.tagName).toBe('FOOTER');
        dispose();
    });

    it('SWEEPS the rows the server printed and the client no longer wants', () => {
        // Served three, and by the time the bundle ran the source holds two.
        const SERVED = shellOver(buildTrailing, source<readonly TItem[]>(itemsOf('a', 'b', 'c')));
        const parent = serve(SERVED);
        expect(rowsIn(parent)).toHaveLength(3);
        const kept = rowsIn(parent).slice(0, 2);

        const WANTED = shellOver(buildTrailing, source<readonly TItem[]>(itemsOf('a', 'b')));
        const dispose = EXO_BACKEND.hydrate(WANTED, parent);

        const after = rowsIn(parent);
        expect(after).toHaveLength(2);
        expect(after[0]).toBe(kept[0]);
        expect(after[1]).toBe(kept[1]);
        expect((parent.firstElementChild as Element).lastElementChild!.tagName).toBe('FOOTER');
        dispose();
    });

    it('BUILDS the rows the client wants past the ones served, in front of the static', () => {
        const SERVED = shellOver(buildTrailing, source<readonly TItem[]>(itemsOf('a', 'b')));
        const parent = serve(SERVED);
        const kept = rowsIn(parent);

        const WANTED = shellOver(buildTrailing, source<readonly TItem[]>(itemsOf('a', 'b', 'c')));
        const dispose = EXO_BACKEND.hydrate(WANTED, parent);

        const after = rowsIn(parent);
        expect(after).toHaveLength(3);
        expect(after[0]).toBe(kept[0]);
        expect(after[1]).toBe(kept[1]);
        expect(after[2]).not.toBe(kept[0]);
        expect(labelsIn(parent)).toBe('a,b,c');
        // THE BUILT ROW LANDED IN FRONT OF THE STATIC and not at the end of the parent.
        expect((parent.firstElementChild as Element).lastElementChild!.tagName).toBe('FOOTER');
        dispose();
    });

    it('REFUSES the shape where no walk can find the list end — a child list behind another', () => {
        const items = source<readonly TItem[]>(itemsOf('a'));
        const SHELL = shellOver(buildSeparated, items);
        const parent = serve(SHELL);
        expect(() => EXO_BACKEND.hydrate(SHELL, parent)).toThrow(/child list|EXO0035/);
    });
});
