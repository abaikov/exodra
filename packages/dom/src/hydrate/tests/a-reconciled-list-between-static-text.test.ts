// @vitest-environment jsdom
//
// A reconciled child list with static text after it, and with text on both sides, on a hydrated
// page: the served rows are adopted, the rows the client adds land before the trailing text, and an
// empty served region (where only the comment keeps the two runs apart) still grows.
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

let rows: readonly string[] = [];

type TRowSurface = { text(port: TExoTextPort, value: unknown): void };
type TListSurface = {
    portChildList(port: TExoChildrenPort): TExoPlacedChildren<TExoNode>;
    createExoNode(component: TExoDomMachine): TExoNode;
};

const ROW = createExoTestMachine(
    (b) => {
        let label!: TExoTextPort;
        b.el('b', null, (el) => {
            label = el.textPort();
        });
        return { label };
    },
    (P): TExoMachineInitialState<TRowSurface> =>
        (c, row) => {
            c.text(P.label, row);
        }
);

const listBetween = (head: string, tail: string) =>
    createExoTestMachine(
        (b) => {
            let kids!: TExoChildrenPort;
            b.el('p', null, (p) => {
                if (head !== '') p.text(head);
                kids = p.childrenPort();
                p.text(tail);
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

const serveThenHydrate = (
    list: ReturnType<typeof listBetween>,
    served: readonly string[],
    held: readonly string[]
): { parent: HTMLElement; servedRows: Element[] } => {
    rows = served;
    const parent = host();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parent.innerHTML = EXO_STR.render(list as any);
    const servedRows = Array.from(parent.querySelectorAll('b'));
    rows = held;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    EXO_BACKEND.hydrate(list as any, parent);
    return { parent, servedRows };
};

describe('a reconciled child list followed by static text, on a hydrated page', () => {
    it('adopts the served rows and puts the added ones before the text', () => {
        const { parent, servedRows } = serveThenHydrate(
            listBetween('', ' left'),
            ['a'],
            ['a', 'b']
        );
        const now = Array.from(parent.querySelectorAll('b'));
        expect(now[0]).toBe(servedRows[0]);
        expect(parent.innerHTML).toBe('<p><b>a</b><b>b</b> left</p>');
    });

    it('grows an empty served region between two runs of text, before the trailing one', () => {
        const { parent } = serveThenHydrate(listBetween('items:', ' left'), [], ['a', 'b']);
        expect(parent.innerHTML).toBe('<p>items:<b>a</b><b>b</b><!----> left</p>');
    });

    it('shrinks a served region between two runs of text and keeps both runs', () => {
        const { parent, servedRows } = serveThenHydrate(
            listBetween('items:', ' left'),
            ['a', 'b'],
            ['a']
        );
        expect(parent.querySelector('b')).toBe(servedRows[0]);
        expect(parent.innerHTML).toBe('<p>items:<b>a</b><!----> left</p>');
    });
});
