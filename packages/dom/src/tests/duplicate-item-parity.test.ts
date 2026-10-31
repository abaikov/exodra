// @vitest-environment jsdom
//
// WHAT A LIST MEANS WHEN THE SAME ITEM IS IN IT TWICE, asked of both shipped backends.
//
// THE FORK THIS FILE USED TO PIN IS GONE, and that is the finding. It existed because `bindList`
// was a DOOR: every backend carried its own reconciler, and an audit found three answers to one
// question — `@exodra/dom` collapsed the duplicate to one child, `@exodra/string` printed two,
// `@exodra/term` gave each occurrence a row. A server sending three `<li>` to a client that builds
// two is not a rendering difference; it is a page whose markup and whose hydration disagree about
// how many children a parent has.
//
// WHAT CLOSED IT. A backend now has exactly one list call — `c.list(port, component, count)` —
// which builds a row per POSITION and consults no identity at all, so the two backends answer the
// same way by construction rather than by agreement. Following a source is a reconciler layered
// over `build` and the placement door from OUTSIDE the backends, with one body serving every
// backend that has those doors, so there is no per-backend answer left to fork.
//
// THE QUESTION ITSELF IS STILL REAL and has moved: what a reconciler does with two entries and one
// identity is `@exodra/list-reconcile`'s to answer, once, for everybody.
import type {
    TExoSchemaCursor,
    TExoChildrenPort,
    TExoChildrenWiring,
    TExoTextPort,
    TExoMachineInitialState,
} from '@exodra/core';
import { describe, expect, it } from 'vitest';

import { host, createExoTestMachine } from '@exodra/test-utils';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomMachine } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

const EXO_BACKEND = withExoCompiler(new ExoDomBackend());
const EXO_STR = new ExoStrBackend();

type TItem = { label: string };

/** What the rows read, BY INDEX: a wire is handed its position and nothing else, so the labels a
 *  list shows are the caller's to put where its rows can reach them. */
const SHOWN: TItem[] = [];

const ROW = createExoTestMachine(
    (b: TExoSchemaCursor) => {
        let text!: TExoTextPort;
        b.el('li', null, (li) => {
            text = li.textPort();
        });
        return { text };
    },
    (P): TExoMachineInitialState<{ text(port: TExoTextPort, value: unknown): void }> =>
        (c, i) => {
            c.text(P.text, SHOWN[i].label);
        }
);

const listOf = (items: readonly TItem[]) => {
    SHOWN.length = 0;
    SHOWN.push(...items);
    return createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let rows!: TExoChildrenPort;
            b.el('ul', null, (ul) => {
                rows = ul.childrenPort();
            });
            return { rows };
        },
        (P): TExoMachineInitialState<TExoChildrenWiring> =>
            (c) => {
                c.list(P.rows, ROW, items.length);
            }
    );
};

const markupOfDom = (component: TExoDomMachine): string => {
    const parent = host();
    EXO_BACKEND.render(component, parent);
    return parent.innerHTML;
};

const SAME: TItem = { label: 'a' };
const OTHER: TItem = { label: 'b' };

describe('the same item twice, in the only list a backend has', () => {
    it('renders it twice on BOTH backends — a position is a row, and identity is not consulted', () => {
        const LIST = listOf([SAME, SAME, OTHER]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(markupOfDom(LIST as any)).toBe('<ul><li>a</li><li>a</li><li>b</li></ul>');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(EXO_STR.render(LIST as any)).toBe('<ul><li>a</li><li>a</li><li>b</li></ul>');
    });

    it('agrees between the server and the client, which is what the fork used to break', () => {
        // THE ASSERTION THAT REPLACED THE PINNED DISAGREEMENT. It is the shape every other parity
        // file in this package has, and the day a backend grows a list call of its own with an
        // answer of its own, this is the line that fails.
        const LIST = listOf([SAME, SAME, OTHER]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const served = EXO_STR.render(LIST as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const client = markupOfDom(LIST as any);

        expect(served).toBe(client);
        expect(served.split('<li>').length - 1).toBe(3);
    });

    it('counts POSITIONS and not distinct items, including when every entry is the same', () => {
        const LIST = listOf([SAME, SAME, SAME]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(markupOfDom(LIST as any)).toBe('<ul><li>a</li><li>a</li><li>a</li></ul>');
    });
});
