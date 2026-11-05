// @vitest-environment jsdom
import type {
    TExoChildrenPort,
    TExoNode,
    TExoTextPort,
    TExoMachineInitialState,
    TExoSchemaCursor,
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

let first: readonly string[] = [];
let second: readonly string[] = [];

type TRowSurface = { text(port: TExoTextPort, value: unknown): void };
type TPageSurface = {
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
        (c, label) => {
            c.text(P.label, label);
        }
);

const BADGE = createExoTestMachine(
    (b) => {
        let label!: TExoTextPort;
        b.el('p', { class: 'badge' }, (p) => {
            label = p.textPort();
        });
        return { label };
    },
    (P): TExoMachineInitialState<TRowSurface> =>
        (c, label) => {
            c.text(P.label, label);
        }
);

function buildTwoLists(b: TExoSchemaCursor) {
    let a!: TExoChildrenPort;
    let z!: TExoChildrenPort;
    b.el('div', { class: 'page' }, (page) => {
        page.el('ul', { class: 'first' }, (ul) => {
            a = ul.childrenPort();
        });
        page.el('ol', { class: 'second' }, (ol) => {
            z = ol.childrenPort();
        });
    });
    return { a, z };
}

const fill = (c: TPageSurface, kids: TExoPlacedChildren<TExoNode>, rows: readonly string[]) =>
    reconcileExoOrder(kids, [], rows, rows, (row) =>
        wireExoNode(c.createExoNode(ROW as TExoDomMachine), row)
    );

const FILL_EACH_BEFORE_THE_NEXT = createExoTestMachine(
    buildTwoLists,
    (P): TExoMachineInitialState<TPageSurface> =>
        (c) => {
            fill(c, c.portChildList(P.a), first);
            fill(c, c.portChildList(P.z), second);
        }
);

const OPEN_BOTH_THEN_FILL = createExoTestMachine(
    buildTwoLists,
    (P): TExoMachineInitialState<TPageSurface> =>
        (c) => {
            const a = c.portChildList(P.a);
            const z = c.portChildList(P.z);
            fill(c, a, first);
            fill(c, z, second);
        }
);

const BUILD_ASIDE_WHILE_OPEN = createExoTestMachine(
    buildTwoLists,
    (P): TExoMachineInitialState<TPageSurface> =>
        (c) => {
            const a = c.portChildList(P.a);
            wireExoNode(c.createExoNode(BADGE as TExoDomMachine), 'aside');
            fill(c, a, first);
            fill(c, c.portChildList(P.z), second);
        }
);

const serve = (
    page: typeof FILL_EACH_BEFORE_THE_NEXT,
    served: [readonly string[], readonly string[]],
    held: [readonly string[], readonly string[]]
): HTMLElement => {
    [first, second] = served;
    const parent = host();
    parent.innerHTML = EXO_STR.render(page as never);
    [first, second] = held;
    return parent;
};

const rowsOf = (parent: Element, list: string): Element[] =>
    Array.from(parent.querySelectorAll(list + ' > li.row'));

describe('two reconciled child lists in one hydrated instance', () => {
    it('gives each list its own served rows when each is filled before the next opens', () => {
        const parent = serve(
            FILL_EACH_BEFORE_THE_NEXT,
            [
                ['a', 'b'],
                ['x', 'y'],
            ],
            [
                ['a', 'b'],
                ['x', 'y'],
            ]
        );
        const servedFirst = rowsOf(parent, 'ul');
        const servedSecond = rowsOf(parent, 'ol');

        EXO_BACKEND.hydrate(FILL_EACH_BEFORE_THE_NEXT as never, parent);

        expect(rowsOf(parent, 'ul')).toEqual(servedFirst);
        expect(rowsOf(parent, 'ol')).toEqual(servedSecond);
        expect(rowsOf(parent, 'ul')[0]).toBe(servedFirst[0]);
        expect(rowsOf(parent, 'ol')[0]).toBe(servedSecond[0]);
        expect(rowsOf(parent, 'ul').map((r) => r.textContent)).toEqual(['a', 'b']);
        expect(rowsOf(parent, 'ol').map((r) => r.textContent)).toEqual(['x', 'y']);
    });

    it('drops the first list surplus and leaves the second list rows alone', () => {
        const parent = serve(
            FILL_EACH_BEFORE_THE_NEXT,
            [
                ['a', 'b', 'c'],
                ['x', 'y'],
            ],
            [['a'], ['x', 'y']]
        );
        const servedFirst = rowsOf(parent, 'ul');
        const servedSecond = rowsOf(parent, 'ol');

        EXO_BACKEND.hydrate(FILL_EACH_BEFORE_THE_NEXT as never, parent);

        expect(rowsOf(parent, 'ul')).toEqual([servedFirst[0]]);
        expect(rowsOf(parent, 'ol')).toEqual(servedSecond);
    });
    it('gives each list its own served rows when both are opened before either fills', () => {
        const parent = serve(
            OPEN_BOTH_THEN_FILL,
            [
                ['a', 'b'],
                ['x', 'y'],
            ],
            [
                ['a', 'b'],
                ['x', 'y'],
            ]
        );
        const servedFirst = rowsOf(parent, 'ul');
        const servedSecond = rowsOf(parent, 'ol');

        EXO_BACKEND.hydrate(OPEN_BOTH_THEN_FILL as never, parent);

        expect(rowsOf(parent, 'ul')).toEqual(servedFirst);
        expect(rowsOf(parent, 'ol')).toEqual(servedSecond);
    });

    it('leaves the served rows to their list when something else is built while it is open', () => {
        const parent = serve(BUILD_ASIDE_WHILE_OPEN, [['a', 'b'], ['x']], [['a', 'b'], ['x']]);
        const servedFirst = rowsOf(parent, 'ul');
        const servedSecond = rowsOf(parent, 'ol');

        EXO_BACKEND.hydrate(BUILD_ASIDE_WHILE_OPEN as never, parent);

        expect(rowsOf(parent, 'ul')).toEqual(servedFirst);
        expect(rowsOf(parent, 'ol')).toEqual(servedSecond);
    });
});
