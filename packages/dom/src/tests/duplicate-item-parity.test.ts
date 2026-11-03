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

const ROW = createExoTestMachine(
    (b: TExoSchemaCursor) => {
        let text!: TExoTextPort;
        b.el('li', null, (li) => {
            text = li.textPort();
        });
        return { text };
    },
    (P): TExoMachineInitialState<{ text(port: TExoTextPort, value: unknown): void }> =>
        (c, item) => {
            c.text(P.text, (item as TItem).label);
        }
);

const listOf = (items: readonly TItem[]) => {
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
                c.list(P.rows, ROW, items);
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

const CASES: ReadonlyArray<{
    readonly what: string;
    readonly items: readonly TItem[];
    readonly markup: string;
}> = [
    {
        what: 'renders a repeated item once per position',
        items: [SAME, SAME, OTHER],
        markup: '<ul><li>a</li><li>a</li><li>b</li></ul>',
    },
    {
        what: 'counts POSITIONS and not distinct items, including when every entry is the same',
        items: [SAME, SAME, SAME],
        markup: '<ul><li>a</li><li>a</li><li>a</li></ul>',
    },
];

describe('the same item twice, in the only list a backend has', () => {
    for (const c of CASES) {
        it(`${c.what} — on BOTH backends, and identity is not consulted`, () => {
            const LIST = listOf(c.items);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect(markupOfDom(LIST as any)).toBe(c.markup);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect(EXO_STR.render(LIST as any)).toBe(c.markup);
        });
    }
});
