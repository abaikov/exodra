// @vitest-environment jsdom
//
// A RECONCILED CHILD LIST WHOSE DATA IS LONGER THAN THE MARKUP THE SERVER SENT.
//
// This is the case a backlog entry called a HOLE — "a child list cannot grow on a hydrated page,
// SSR and a reactive list disagree" — and nothing in the suite answered it either way. The claim
// was read off four documentation pages that all said hydration REFUSES a reconciled list. They
// were describing a guard that is gone: `openChildList` answers `[]` and opens an adoption cursor
// over the served rows, and `build` takes from that cursor while it has rows and builds the client
// way once it does not.
//
// So the behaviour is written down in a comment. A comment is not a run, and the three facts below
// are the ones a comment cannot establish:
//
//   · the rows the server printed are ADOPTED — the same node objects, not rebuilt lookalikes;
//   · the extra rows are BUILT and land in the right order after them;
//   · a shorter client list DROPS the surplus rather than leaving the server's spare rows on screen.
//
// The middle one is the item's subject. The other two are here because a list that grew correctly
// while quietly rebuilding its first rows, or while leaving a stale row behind, is not a list that
// works — and both failures produce markup that looks right.
import type {
    TExoChildrenPort,
    TExoNode,
    TExoTextPort,
    TExoMachineInitialState,
} from '@exodra/core';
import { wireExoNode } from '@exodra/core';
import { reconcileExoOrder } from '@exodra/list-reconcile';
import type { TExoPlacedChildren } from '@exodra/list-reconcile';
import { describe, expect, it } from 'vitest';

import { host, createExoTestMachine } from '@exodra/test-utils';
import { ExoDomBackend, withExoHydration, withExoCompiler } from '@exodra/dom';
import type { TExoDomMachine } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

const EXO_BACKEND = withExoHydration(withExoCompiler(new ExoDomBackend()));
const EXO_STR = new ExoStrBackend();

/** The rows BOTH renders read. The server renders what it holds at request time and the client
 *  what it holds when the bundle finishes; this test moves it between the two on purpose. */
let rows: readonly string[] = [];

/** What the wires below assume of an exonode — methods only, so the server's and the adopting one
 *  both satisfy it and ONE wiring function drives both. */
type TRowSurface = { text(port: TExoTextPort, value: unknown): void };
type TListSurface = {
    portChildList(port: TExoChildrenPort): TExoPlacedChildren<TExoNode>;
    createExoNode(component: TExoDomMachine): TExoNode;
};

const ROW = createExoTestMachine(
    (b) => {
        let label!: TExoTextPort;
        b.el('li', { class: 'row' }, (li) => {
            label = li.textPort();
        });
        return { label };
    },
    (P): TExoMachineInitialState<TRowSurface> =>
        (c, row) => {
            c.text(P.label, row);
        }
);

const LIST = createExoTestMachine(
    (b) => {
        let kids!: TExoChildrenPort;
        b.el('ul', { class: 'list' }, (ul) => {
            kids = ul.childrenPort();
        });
        return { kids };
    },
    (P): TExoMachineInitialState<TListSurface> =>
        (c) => {
            reconcileExoOrder(c.portChildList(P.kids), [], rows, rows, (row) =>
                wireExoNode(c.createExoNode(ROW), row)
            );
        }
);

/** Render on the server with one set of rows, then hand the client another. */
const serveThenHold = (served: readonly string[], held: readonly string[]): HTMLElement => {
    rows = served;
    const parent = host();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parent.innerHTML = EXO_STR.render(LIST as any);
    rows = held;
    return parent;
};

const liveRows = (parent: Element): Element[] => Array.from(parent.querySelectorAll('li.row'));

describe('a reconciled child list on a hydrated page', () => {
    it('GROWS past the markup: the served rows are adopted and the extra ones are built', () => {
        const parent = serveThenHold(['a', 'b'], ['a', 'b', 'c', 'd']);
        const served = liveRows(parent);
        expect(served).toHaveLength(2);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        EXO_BACKEND.hydrate(LIST as any, parent);

        const now = liveRows(parent);
        expect(now).toHaveLength(4);
        // NODE IDENTITY, not markup: two identical trees compare equal as strings, so "we rebuilt
        // row 0 and it happened to look the same" is exactly what this has to rule out.
        expect(now[0]).toBe(served[0]);
        expect(now[1]).toBe(served[1]);
        expect(now[2]).not.toBe(served[0]);
        expect(now.map((r) => r.textContent)).toEqual(['a', 'b', 'c', 'd']);
    });

    it('SHRINKS: a shorter client list drops the rows the server sent and keeps no spare', () => {
        const parent = serveThenHold(['a', 'b', 'c'], ['a']);
        const served = liveRows(parent);
        expect(served).toHaveLength(3);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        EXO_BACKEND.hydrate(LIST as any, parent);

        const now = liveRows(parent);
        expect(now).toHaveLength(1);
        expect(now[0]).toBe(served[0]);
        expect(now[0].textContent).toBe('a');
    });

    it('AGREES: equal lengths adopt every row and build none', () => {
        const parent = serveThenHold(['a', 'b', 'c'], ['a', 'b', 'c']);
        const served = liveRows(parent);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        EXO_BACKEND.hydrate(LIST as any, parent);

        const now = liveRows(parent);
        expect(now).toHaveLength(3);
        expect(now[0]).toBe(served[0]);
        expect(now[1]).toBe(served[1]);
        expect(now[2]).toBe(served[2]);
    });
});
