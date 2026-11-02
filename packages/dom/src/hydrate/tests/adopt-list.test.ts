// @vitest-environment jsdom
//
// WHERE A FIXED LIST'S ROWS BEGIN AND END ON A PAGE THE SERVER PRINTED.
//
// `c.list(port, component, count)` is the one children call that adopts several rows of one schema:
// no registry, no diff, no subscription of its own. Hydration creates nothing, so the whole of it
// is a walk — start at the first element this port's markup produced, take `count` of them, and
// stop. Both ends of that walk are questions the markup cannot answer by looking:
//
//   · WHERE IT BEGINS. A children port may stand behind a static, and `parent.firstElementChild` is
//     then the HEADING and not row 0. The schema records the slot of the last static in front
//     of the port (`childListStartSlot`) and adoption starts at that element's next element sibling.
//   · WHERE IT ENDS. A static behind the child list may walk and compare exactly like a row — a
//     promo card under a feed, an "add another" button under a list — and a SHAPE match is a
//     resemblance, not a boundary. The schema records the end as a NODE (`adoptStopSlot`, resolved
//     from the END of the parent so rows cannot shift it), and the row loop refuses rather than
//     stepping over it.
//   · AND WHERE A CHILD LIST STANDS BEHIND ANOTHER ONE, no table can hold the landing between them,
//     so it is answered by ORDER: the one in front publishes the first element it did NOT take.
//     That makes filling the ports of one element in DOCUMENT ORDER a requirement of adoption and
//     of nothing else, which is why it is refused by name rather than left to produce a wrong page.
//
// The counts a case serves and the count it adopts with are deliberately different where it asks
// for that: the server renders from the data it had when the request arrived, the client from the
// data it has when the bundle finishes, and a fixed list is the form that says those two are the
// same number. When they are not, this is what happens.
import type {
    TExoSchemaCursor,
    TExoAttrPort,
    TExoChildrenPort,
    TExoChildrenWiring,
    TExoEventHandler,
    TExoEventPort,
    TExoTextPort,
    TExoMachineInitialState,
} from '@exodra/core';
import { describe, expect, it } from 'vitest';

import { host, createExoTestMachine } from '@exodra/test-utils';
import { ExoDomBackend, withExoHydration, withExoCompiler } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

const EXO_BACKEND = withExoHydration(withExoCompiler(new ExoDomBackend()));
const EXO_STR = new ExoStrBackend();

/** What a row's wire needs of an exonode — the same three on the server and while adopting. */
type TRowSurface = {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    on(port: TExoEventPort, handler: TExoEventHandler<Event, Element>, subject?: unknown): void;
};

/** Where a click landed, so "the listener is on the SERVER's element" is testable. */
let clicked: number[] = [];

/**
 * ONE ROW — `<section data-id><span>row N</span></section>`, with a listener markup cannot carry.
 *
 * The container is a `<div>` and the row a `<section>` throughout this file, so that the one case
 * whose static SHARES the row's tag is the only place the two coincide.
 */
const ROW = createExoTestMachine(
    (b: TExoSchemaCursor) => {
        let id!: TExoAttrPort;
        let label!: TExoTextPort;
        let click!: TExoEventPort;
        b.el('section', null, (s) => {
            id = s.port('data-id');
            click = s.eventPort('click');
            s.el('span', null, (span) => {
                label = span.textPort();
            });
        });
        return { id, label, click };
    },
    (P): TExoMachineInitialState<TRowSurface> =>
        (c, at) => {
            c.attr(P.id, at);
            c.text(P.label, 'row ' + at);
            c.on(P.click, () => {
                clicked.push(at as number);
            });
        }
);

/** A port that OWNS its element — the child list's end is the end of the parent. */
function buildOwned(b: TExoSchemaCursor) {
    let rows!: TExoChildrenPort;
    b.el('div', { class: 'card' }, (card) => {
        rows = card.childrenPort();
    });
    return { rows, next: null as TExoChildrenPort | null };
}

/** THE SAME PORT WITH A STATIC AFTER IT — the child list shape with a locatable end. */
function buildTrailing(b: TExoSchemaCursor) {
    let rows!: TExoChildrenPort;
    b.el('div', { class: 'card' }, (card) => {
        rows = card.childrenPort();
        card.el('footer', null, (f) => f.text('footnote'));
    });
    return { rows, next: null as TExoChildrenPort | null };
}

/** AND WITH A STATIC ON BOTH SIDES — the shape adoption cannot start at the parent's first child. */
function buildLeading(b: TExoSchemaCursor) {
    let rows!: TExoChildrenPort;
    b.el('div', { class: 'card' }, (card) => {
        card.el('h3', null, (h) => h.text('headline'));
        rows = card.childrenPort();
        card.el('footer', null, (f) => f.text('footnote'));
    });
    return { rows, next: null as TExoChildrenPort | null };
}

/**
 * THE STATIC BEHIND THE CHILD LIST SHARES THE ROW'S TAG — `<div>{rows}<section class="add"/></div>`.
 *
 * An "add another" row under a list, a total row under a table's rows: the shape is ordinary, and it
 * is the one a boundary decided by RESEMBLANCE cannot survive. `<section class="add"><span/></section>`
 * walks and compares exactly like a `ROW` — same tags at every landing, and neither classes nor text
 * are compared, on purpose.
 */
function buildTwinTail(b: TExoSchemaCursor) {
    let rows!: TExoChildrenPort;
    b.el('div', { class: 'card' }, (card) => {
        rows = card.childrenPort();
        card.el('section', { class: 'add' }, (s) => {
            s.el('span', null, (span) => span.text('add'));
        });
    });
    return { rows, next: null as TExoChildrenPort | null };
}

/**
 * TWO CHILD LISTS WITH A SEPARATOR BETWEEN THEM — the shape whose FIRST end no table can hold.
 *
 * Counting forward from the `<h3>` is short by however many rows the first child list printed, and
 * counting back from the `<footer>` is short by the second's. So the first is told `undefined` for
 * its end and the second begins one element after whatever the first publishes.
 */
function buildSeparated(b: TExoSchemaCursor) {
    let rows!: TExoChildrenPort;
    let next!: TExoChildrenPort;
    b.el('div', { class: 'card' }, (card) => {
        card.el('h3', null, (h) => h.text('headline'));
        rows = card.childrenPort();
        card.el('hr', null);
        next = card.childrenPort();
        card.el('footer', null, (f) => f.text('footnote'));
    });
    return { rows, next };
}

type TBuild = typeof buildOwned;

/**
 * A SHELL WHOSE ROW COUNT IS BAKED IN, built per call.
 *
 * Two shells over the same `build` print byte-identical markup and ask for different numbers of
 * rows, which is how a case serves one count and adopts with another. They are separate
 * DECLARATIONS, so each carries its own schema — deliberately, since a shared declaration would
 * make the schema cache carry one case's history into the next.
 */
const shellOf = (build: TBuild, count: number, behind = 0) =>
    createExoTestMachine(
        build,
        (P): TExoMachineInitialState<TExoChildrenWiring<Event, Element>> =>
            (c) => {
                c.list(
                    P.rows,
                    ROW,
                    Array.from({ length: count }, (_, at) => at)
                );
                // DOCUMENT ORDER: `exoChildListStartAfter` refuses by name when a child list behind
                // another one is filled first, and an empty list is still a fill.
                if (P.next !== null)
                    c.list(
                        P.next,
                        ROW,
                        Array.from({ length: behind }, (_, at) => at)
                    );
            }
    );

/** The served page, as far as an adopting pass can tell: bytes in a fresh host, no listeners. */
const serve = (component: ReturnType<typeof shellOf>): HTMLElement => {
    const parent = host();
    parent.innerHTML = EXO_STR.render(component);
    return parent;
};

/** The ids standing in the card, in document order. */
const shown = (parent: HTMLElement): string =>
    Array.from(parent.querySelectorAll('section[data-id]'))
        .map((el) => el.getAttribute('data-id'))
        .join(',');

const rowsIn = (parent: HTMLElement): HTMLElement[] =>
    Array.from(parent.querySelectorAll('section[data-id]')) as HTMLElement[];

const mutationsDuring = (parent: Element, run: () => void): number => {
    let seen = 0;
    const observer = new MutationObserver((records) => {
        seen += records.length;
    });
    observer.observe(parent, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
    });
    run();
    seen += observer.takeRecords().length;
    observer.disconnect();
    return seen;
};

describe('a fixed list adopting the markup it was served', () => {
    it('takes the rows without moving a node, and attaches the listeners', () => {
        const LIST = shellOf(buildOwned, 3);
        const parent = serve(LIST);
        const before = parent.innerHTML;
        const served = rowsIn(parent);

        expect(mutationsDuring(parent, () => EXO_BACKEND.hydrate(LIST, parent))).toBe(0);

        expect(parent.innerHTML).toBe(before);
        // NODE IDENTITY, not markup: two identical trees compare equal as strings, so "we rebuilt
        // them and they happened to look the same" is exactly what this has to rule out.
        const now = rowsIn(parent);
        expect(now[0]).toBe(served[0]);
        expect(now[1]).toBe(served[1]);
        expect(now[2]).toBe(served[2]);

        clicked = [];
        served[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(clicked).toEqual([1]);
    });

    it('starts after the element in FRONT of the child list and leaves the statics alone', () => {
        // Without `childListStartSlot` the walk begins at the parent's first element, which in this
        // shape is the HEADING: row 0's schema is replayed over an `<h3>`, its listener goes onto
        // the heading, and every row after it is off by one — with nothing in the markup to see.
        const LIST = shellOf(buildLeading, 2);
        const parent = serve(LIST);
        const before = parent.innerHTML;
        const heading = parent.querySelector('h3') as HTMLElement;
        const footer = parent.querySelector('footer') as HTMLElement;
        const served = rowsIn(parent);

        EXO_BACKEND.hydrate(LIST, parent);

        expect(parent.innerHTML).toBe(before);
        expect(parent.querySelector('h3')).toBe(heading);
        expect(parent.querySelector('footer')).toBe(footer);
        expect(shown(parent)).toBe('0,1');

        clicked = [];
        heading.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        served[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        // The heading is not a row, so it carries no listener; row 0 does.
        expect(clicked).toEqual([0]);
    });

    it('adopts through a static that comes AFTER it', () => {
        const LIST = shellOf(buildTrailing, 2);
        const parent = serve(LIST);
        const footer = parent.querySelector('footer') as HTMLElement;
        const served = rowsIn(parent);

        expect(mutationsDuring(parent, () => EXO_BACKEND.hydrate(LIST, parent))).toBe(0);

        expect(rowsIn(parent)[1]).toBe(served[1]);
        const card = parent.querySelector('.card') as HTMLElement;
        expect(card.lastElementChild).toBe(footer);
        expect(footer.textContent).toBe('footnote');
    });
});

describe('a fixed list whose count and whose markup disagree', () => {
    it('refuses when the markup has FEWER rows than the list asks for', () => {
        // Hydration creates nothing, so carrying on would replay row 2's schema over whatever
        // followed the last row — `null` here — and the next setter would call `addEventListener`
        // on it. The refusal names what it was looking for.
        const parent = serve(shellOf(buildOwned, 2));
        const LONGER = shellOf(buildOwned, 3);

        expect(() => EXO_BACKEND.hydrate(LONGER, parent)).toThrow(/a fixed list row/);
    });

    it('refuses the static behind the child list rather than wiring it as a row', () => {
        // THE DEFECT A BOUNDARY DECIDED BY RESEMBLANCE WOULD MAKE. `<section class="add">` walks
        // and compares identically to a row, so a loop that stopped only on "this does not look
        // like a row" would take the button as row 1: its schema replayed over a live static, the
        // listener attached to it, and — because every value fill is silenced while adopting — the
        // button LOOKING untouched. The child list's end is a node, so the loop stops at it.
        const parent = serve(shellOf(buildTwinTail, 1));
        const add = parent.querySelector('section.add') as HTMLElement;
        expect(add.textContent).toBe('add');
        const LONGER = shellOf(buildTwinTail, 2);

        expect(() => EXO_BACKEND.hydrate(LONGER, parent)).toThrow(/a fixed list row/);

        // IDENTITY, not markup: the static that was refused is the same node, still in place.
        expect(parent.querySelector('section.add')).toBe(add);
        expect(add.textContent).toBe('add');
    });

    it('takes exactly the rows it asked for and wires nothing beyond them', () => {
        // The other direction, and the one a fixed list has no opinion about: it was told a number,
        // it takes that many, and it creates and removes nothing — which is hydration's rule and
        // not a repair policy. What has to hold is the COUNT: a loop that ran to the end of the
        // child list instead would wire rows nobody asked for and hold live elements the list does
        // not know it has.
        const parent = serve(shellOf(buildOwned, 3));
        const served = rowsIn(parent);
        const SHORTER = shellOf(buildOwned, 1);

        expect(mutationsDuring(parent, () => EXO_BACKEND.hydrate(SHORTER, parent))).toBe(0);

        expect(shown(parent)).toBe('0,1,2');
        clicked = [];
        served[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        served[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        served[2].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        // Only the row the list claimed is listening. The two beyond it are markup and nothing
        // more — the listener is the one thing adoption really attaches, so it is the only thing
        // that can tell a claimed element from an unclaimed one.
        expect(clicked).toEqual([0]);
    });
});

describe('two child lists with a static between them', () => {
    it('gives each child list its own rows, the second starting from what the first published', () => {
        // The landing between them is answered by ORDER and not by a table: the first child list
        // publishes the first element it did NOT take, and the second begins one static after it.
        // Get that wrong and the second child list's walk starts inside the first child list's rows.
        const CARD = shellOf(buildSeparated, 2, 1);
        const parent = serve(CARD);
        const before = parent.innerHTML;
        const served = rowsIn(parent);
        const hr = parent.querySelector('hr') as HTMLElement;

        expect(mutationsDuring(parent, () => EXO_BACKEND.hydrate(CARD, parent))).toBe(0);

        expect(parent.innerHTML).toBe(before);
        expect(parent.querySelector('hr')).toBe(hr);
        // Three rows in document order: two in front of the separator, one behind it — and the one
        // behind it is position 0 of its OWN child list, which is what says the two were adopted
        // separately rather than as one run of five.
        expect(shown(parent)).toBe('0,1,0');
        const card = parent.querySelector('.card') as HTMLElement;
        expect(Array.from(card.children).map((el) => el.tagName.toLowerCase())).toEqual([
            'h3',
            'section',
            'section',
            'hr',
            'section',
            'footer',
        ]);

        clicked = [];
        served[2].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(clicked).toEqual([0]);
    });

    it('refuses a child list filled before the one in FRONT of it', () => {
        // THE ONE ORDERING RULE ADOPTION HAS, and it is refused by name because the alternative is
        // a page that wires the wrong elements. A client render and the server accept any order —
        // which is why the server render below succeeds and only the adoption objects.
        const BACKWARDS = createExoTestMachine(
            buildSeparated,
            (P): TExoMachineInitialState<TExoChildrenWiring<Event, Element>> =>
                (c) => {
                    c.list(P.next, ROW, [0]);
                    c.list(P.rows, ROW, [0, 1]);
                }
        );
        const parent = serve(BACKWARDS);
        expect(shown(parent)).toBe('0,1,0');

        expect(() => EXO_BACKEND.hydrate(BACKWARDS, parent)).toThrow(/cannot be adopted yet/);
    });
});
