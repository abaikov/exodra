// @vitest-environment jsdom
//
// A CHILDREN PORT STANDING AMONG STATIC SIBLINGS — the shape every conditional block in a
// real component has, and the one the first cut of this core could not express.
//
// The card in this repo's benchmark app is exactly it: a heading, a button, a details block
// that appears and disappears, a tag list, another button. Making the whole child list
// dynamic instead was measured in this project at 23.7% of mount, because the card then
// costs five clones and five inserts rather than one of each — so the port has to be able to
// sit BETWEEN static siblings, not replace them.
//
// The child list needs no marker in the markup: its neighbours are real elements that always
// exist, so "insert before the next static sibling" is a boundary the walk already knows.
// TWO ADJACENT PORTS are where that reasoning runs out — two conditionals in a row is a
// common shape, and when both are empty there is no node between them at all. These tests
// are written before the implementation because that is the case that fails silently: the
// markup looks right, and one child list's rows quietly land on the wrong side of the other.
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type {
    TExoMachineNode,
    TExoSchemaCursor,
    TExoAttrPort,
    TExoChildrenPort,
    TExoChildrenWiring,
    TExoEventHandler,
    TExoEventPort,
    TExoNode,
    TExoTextPort,
    TExoMachineInitialState,
} from '@exodra/core';
import { reconcileExoOrder } from '@exodra/list-reconcile';
import type { TExoPlacedChildren } from '@exodra/list-reconcile';
import { describe, expect, it } from 'vitest';

import { exoNodeDom } from '../dom/exoNodeDom';

import type { TExoDomMark } from '../dom/types/TExoDomMark';
import { host, source, createExoTestMachine } from '@exodra/test-utils';
import type { TExoTestSource } from '@exodra/test-utils';
import { ExoDomBackend, withExoHydration, withExoCompiler, withExoChildList } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

const EXO_BACKEND = withExoHydration(withExoChildList(withExoCompiler(new ExoDomBackend())));
const EXO_STR = new ExoStrBackend();

/**
 * WHAT THE WIRES BELOW ASSUME ABOUT AN EXONODE — core's own children surface, and nothing a
 * backend added, so ONE component drives the server backend, the DOM one and an adopting pass.
 * That is the point of the byte-identity cases: they are not two programs that happen to agree.
 */
type TPortable = TExoChildrenWiring<Event, Element>;

/**
 * AND WHAT A WIRE THAT PLACES CHILDREN BY HAND ASSUMES. The placement door hands out positions
 * inside an element, which `@exodra/core` has no word for, so it is each backend's own: these
 * wires run on this backend and on `@exodra/term`, and never on the server.
 */
type TPlacing = TPortable & {
    childList(port: TExoChildrenPort): TExoPlacedChildren<TExoNode>;
};

/** What a row's wire needs of an exonode: its label, and a listener where the case has one. */
type TRowSurface = {
    text(port: TExoTextPort, value: unknown): void;
    on(port: TExoEventPort, handler: TExoEventHandler<Event, Element>, subject?: unknown): void;
};

/**
 * WHAT GOES INTO A CHILD LIST: one `<i>` carrying its own label. A wire is handed its POSITION and
 * nothing else, so what a row shows is the caller's to put where the row can reach it by index.
 */
const itemOf = (labelAt: (i: number) => string) =>
    createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let label!: TExoTextPort;
            b.el('i', null, (i) => {
                label = i.textPort();
            });
            return { label };
        },
        (P): TExoMachineInitialState<TRowSurface> =>
            (c, i) => {
                c.text(P.label, labelAt(i));
            }
    );

/** One child list following one source: what it follows, and the draw that reconciles it. */
type TFollowing = {
    readonly src: { onChange(cb: () => void): () => void };
    draw(): void;
};

/**
 * A CHILD LIST THAT FOLLOWS A SOURCE, composed from the doors it is made of: the placement door and
 * the identity reconciler, opened in the initial state and drawn by `followingCard`'s effect.
 */
const following =
    <TItem>(
        src: TExoTestSource<readonly TItem[]>,
        build: (c: TPlacing, item: TItem, i: number) => TExoNode
    ) =>
    (c: TPlacing, port: TExoChildrenPort): TFollowing => {
        const kids = c.childList(port);
        let shown: TItem[] = [];
        return {
            src,
            draw: () => {
                const want = src.getValue();
                shown = reconcileExoOrder(kids, shown, want, want, (item, i) => build(c, item, i));
            },
        };
    };

/** The rows read their label out of the very source that drives the list, so a row built at
 *  position `i` shows what position `i` holds now. */
const rowsFrom = (src: TExoTestSource<readonly string[]>) => {
    const ROW = itemOf((i) => src.getValue()[i]);
    return following(src, (c, _item, i) => c.build(ROW, i));
};

/** A component whose initial state opens its child lists, and whose effect draws each and follows
 *  each one's source. */
const followingCard = <TPorts>(
    build: (b: TExoSchemaCursor) => TPorts,
    open: (c: TPlacing, ports: TPorts) => readonly TFollowing[]
) => {
    const schema = createExoSchema(build);
    const m = createExoMachineBuilder<TExoMachineNode & TPlacing, unknown, readonly TFollowing[]>(
        schema
    );
    m.createInitialState((c) => open(c, schema.ports));
    const draw = m.transition<TFollowing>((_c, followed) => {
        followed.draw();
    });
    m.effect((c) => {
        const all = c.state;
        for (const followed of all) draw(c, followed);
        const offs = all.map((followed) => followed.src.onChange(() => draw(c, followed)));
        return () => {
            for (const off of offs) off();
        };
    });
    return m.done();
};

/** The labels the hook cases' children show. `item(label)` files one and builds a child for it. */
const HOOK_LABELS: string[] = [];
const HOOK_ITEM = itemOf((i) => HOOK_LABELS[i]);

/** One port with a static sibling on each side. */
function buildOne(b: TExoSchemaCursor) {
    let mid!: TExoChildrenPort;
    b.el('div', { class: 'card' }, (card) => {
        card.el('h3', null, (h) => h.text('headline'));
        mid = card.childrenPort();
        card.el('footer', null, (f) => f.text('footnote'));
    });
    return { mid };
}

/** TWO ports side by side, statics on the outside — two conditionals in a row. */
function buildTwo(b: TExoSchemaCursor) {
    let a!: TExoChildrenPort;
    let c!: TExoChildrenPort;
    b.el('div', { class: 'card' }, (card) => {
        card.el('h3', null, (h) => h.text('headline'));
        a = card.childrenPort();
        c = card.childrenPort();
        card.el('footer', null, (f) => f.text('footnote'));
    });
    return { a, c };
}

/** The shapes alone, for the numbering case that has no wiring to speak of. */
const ONE_PORTS = createExoTestMachine(buildOne, () => () => undefined);
const TWO_PORTS = createExoTestMachine(buildTwo, () => () => undefined);

describe('a children port among static siblings', () => {
    it('is numbered in document order, between the statics around it', () => {
        expect(ONE_PORTS.declaration.ports.mid.index).toBe(0);
        expect(TWO_PORTS.declaration.ports.a.index).toBe(0);
        expect(TWO_PORTS.declaration.ports.c.index).toBe(1);
    });

    it('renders its rows between the statics on the server', () => {
        const ITEM = itemOf((i) => ['A', 'B'][i]);
        const CARD = createExoTestMachine(
            buildOne,
            (P): TExoMachineInitialState<TPortable> =>
                (c) => {
                    c.list(P.mid, ITEM, 2);
                }
        );
        expect(EXO_STR.render(CARD)).toBe(
            '<div class="card"><h3>headline</h3><i>A</i><i>B</i><footer>footnote</footer></div>'
        );
    });

    it('renders an EMPTY child list as nothing at all, leaving the statics adjacent', () => {
        const ITEM = itemOf((i) => ['A', 'B'][i]);
        const CARD = createExoTestMachine(
            buildOne,
            (P): TExoMachineInitialState<TPortable> =>
                (c) => {
                    c.list(P.mid, ITEM, 0);
                }
        );
        expect(EXO_STR.render(CARD)).toBe(
            '<div class="card"><h3>headline</h3><footer>footnote</footer></div>'
        );
    });

    it('produces the same bytes on both backends, full and empty', () => {
        for (const labels of [['A', 'B'], []]) {
            const ITEM = itemOf((i) => labels[i]);
            const CARD = createExoTestMachine(
                buildOne,
                (P): TExoMachineInitialState<TPortable> =>
                    (c) => {
                        c.list(P.mid, ITEM, labels.length);
                    }
            );
            const parent = host();
            EXO_BACKEND.render(CARD, parent);
            expect(parent.innerHTML).toBe(EXO_STR.render(CARD));
        }
    });

    it('inserts into a child list without disturbing the statics around it', () => {
        const src = source<readonly string[]>([]);
        const fill = rowsFrom(src);
        const CARD = followingCard(buildOne, (c, P) => [fill(c, P.mid)]);
        const parent = host();
        EXO_BACKEND.render(CARD, parent);
        const card = parent.querySelector('.card') as HTMLElement;
        expect(card.innerHTML).toBe('<h3>headline</h3><footer>footnote</footer>');
        src.setValue(['A']);
        expect(card.innerHTML).toBe('<h3>headline</h3><i>A</i><footer>footnote</footer>');
        src.setValue([]);
        expect(card.innerHTML).toBe('<h3>headline</h3><footer>footnote</footer>');
    });
});

describe('two children ports side by side', () => {
    /** Mount TWO following two sources, and hand back the card and the sources. */
    const mount = () => {
        const first = source<readonly string[]>([]);
        const second = source<readonly string[]>([]);
        const fillFirst = rowsFrom(first);
        const fillSecond = rowsFrom(second);
        const CARD = followingCard(buildTwo, (c, P) => [fillFirst(c, P.a), fillSecond(c, P.c)]);
        const parent = host();
        EXO_BACKEND.render(CARD, parent);
        return { first, second, card: parent.querySelector('.card') as HTMLElement };
    };

    it('both empty: the statics are adjacent and nothing marks the seam', () => {
        const { card } = mount();
        expect(card.innerHTML).toBe('<h3>headline</h3><footer>footnote</footer>');
    });

    it('the FIRST fills while the second is empty — its rows go before the seam', () => {
        const { first, card } = mount();
        first.setValue(['A']);
        expect(card.innerHTML).toBe('<h3>headline</h3><i>A</i><footer>footnote</footer>');
    });

    it('the SECOND fills while the first is empty — its rows go after the seam', () => {
        const { second, card } = mount();
        second.setValue(['B']);
        expect(card.innerHTML).toBe('<h3>headline</h3><i>B</i><footer>footnote</footer>');
    });

    it('both fill: the first child list stays first', () => {
        // The case the whole file exists for. With no node between two empty child lists, an
        // insertion that anchors on "the end of the parent" or on "whatever is there now"
        // puts the second child list's rows in front of the first's, and the markup is
        // plausible enough that only an ordering assertion catches it.
        const { first, second, card } = mount();
        second.setValue(['B']);
        first.setValue(['A']);
        expect(card.innerHTML).toBe('<h3>headline</h3><i>A</i><i>B</i><footer>footnote</footer>');
    });

    it('a FIXED list in the second child list is still a child list the first must anchor on', () => {
        // THE CASE `list()` USED TO BE INVISIBLE IN. The child list chain answers "where does this
        // child list end" by asking the NEXT child list for its first node, and a child list only
        // has an answer if it published its children into the instance's child list table. A list
        // that follows a source publishes through `openChildList`; `list` — a fixed, never-changing
        // run of instances — did not, so its neighbour saw an EMPTY child list, walked past it and
        // anchored on the footer. The first child list's rows then landed AFTER the fixed list's,
        // which is a wrong tree that renders without an error.
        const first = source<readonly string[]>([]);
        const fillFirst = rowsFrom(first);
        const FIXED = itemOf((i) => ['X', 'Y'][i]);
        const CARD = followingCard(buildTwo, (c, P) => {
            const followed = [fillFirst(c, P.a)];
            c.list(P.c, FIXED, 2);
            return followed;
        });
        const parent = host();
        EXO_BACKEND.render(CARD, parent);
        const card = parent.querySelector('.card') as HTMLElement;
        expect(card.innerHTML).toBe('<h3>headline</h3><i>X</i><i>Y</i><footer>footnote</footer>');
        first.setValue(['A']);
        expect(card.innerHTML).toBe(
            '<h3>headline</h3><i>A</i><i>X</i><i>Y</i><footer>footnote</footer>'
        );
    });

    it('filling the first while the second already has rows keeps them apart', () => {
        const { first, second, card } = mount();
        second.setValue(['B', 'C']);
        first.setValue(['A']);
        expect(card.innerHTML).toBe(
            '<h3>headline</h3><i>A</i><i>B</i><i>C</i><footer>footnote</footer>'
        );
    });

    it('emptying one child list leaves the other exactly where it was', () => {
        const { first, second, card } = mount();
        first.setValue(['A']);
        second.setValue(['B']);
        first.setValue([]);
        expect(card.innerHTML).toBe('<h3>headline</h3><i>B</i><footer>footnote</footer>');
        second.setValue([]);
        expect(card.innerHTML).toBe('<h3>headline</h3><footer>footnote</footer>');
    });
});

/**
 * THE NEIGHBOUR FILLS *DURING* THE INSERTION — the case the child list anchor is a FUNCTION for.
 *
 * Every case above changes one child list while the other is standing still, so a snapshot of
 * "where does my child list end" taken before the loop would have been right in all of them. This
 * is where it is not: a child's `mount` hook is arbitrary user code, it runs INSIDE the insertion
 * loop, and one of the things it may do is fill the child list after this one — which moves this
 * child list's end between one inserted child and the next.
 *
 * The anchor is therefore resolved PER INSERT, and the two cases below are the two answers it has
 * to give. Appending, the end of the child list is the chain, and the neighbour may have moved it
 * since the previous child went in. Splicing into the middle, the anchor is a child of THIS child
 * list, which no hook in the neighbouring one can displace — written out anyway, because "the loop
 * calls user code" and "this anchor cannot move" is exactly the pair that reads like a bug.
 *
 * They place CHILDREN rather than items, because the hook belongs to a child and a child is what
 * `exoNodeDom(child).mount = …` states a policy on.
 */
describe('a child list whose neighbour fills from a `mount` hook', () => {
    /** TWO adjacent ports, both following a source of built CHILDREN. */
    const mountTwo = () => {
        const first = source<readonly TExoNode<TExoDomMark>[]>([]);
        const second = source<readonly TExoNode<TExoDomMark>[]>([]);
        let exonode!: TPlacing;
        const placeChild = (_c: TPlacing, child: TExoNode<TExoDomMark>): TExoNode => child;
        const CARD = followingCard(buildTwo, (c, P) => {
            // Kept so the cases can build more children later. Legal for `build` alone,
            // and for the reason that method documents.
            exonode = c;
            return [following(first, placeChild)(c, P.a), following(second, placeChild)(c, P.c)];
        });
        const parent = host();
        EXO_BACKEND.render(CARD, parent);
        return {
            first,
            second,
            card: parent.querySelector('.card') as HTMLElement,
            item: (label: string): TExoNode<TExoDomMark> =>
                exonode.build(HOOK_ITEM, HOOK_LABELS.push(label) - 1) as TExoNode<TExoDomMark>,
        };
    };

    it('APPENDING: a child added after the hook fired still lands in front of the neighbour', () => {
        const { first, second, card, item } = mountTwo();
        const p = item('P');
        const q = item('Q');
        const x = item('X');
        // P's own policy, stated on the child: when it goes in, the child list AFTER this one fills.
        exoNodeDom(p).mount = (): void => {
            second.setValue([x]);
        };
        // Both child lists are empty, so both of these go in at the end of this one — and Q is
        // placed AFTER the hook has put X in the parent. With the anchor resolved once, ahead of
        // the loop, Q would be inserted before the footer and land BEHIND X.
        first.setValue([p, q]);
        expect(card.innerHTML).toBe(
            '<h3>headline</h3><i>P</i><i>Q</i><i>X</i><footer>footnote</footer>'
        );
    });

    it('SPLICING IN: the run goes in front of the child it anchored on, hook or no hook', () => {
        const { first, second, card, item } = mountTwo();
        const a = item('A');
        const d = item('D');
        first.setValue([a, d]);
        const b = item('B');
        const c = item('C');
        const x = item('X');
        exoNodeDom(b).mount = (): void => {
            second.setValue([x]);
        };
        // A middle splice: A and D survive, so B and C go in before D — a node of this child list,
        // which the hook's insertion into the next child list cannot displace. C is inserted after
        // the hook has run and must still land before D, not after X.
        first.setValue([a, b, c, d]);
        expect(card.innerHTML).toBe(
            '<h3>headline</h3><i>A</i><i>B</i><i>C</i><i>D</i><i>X</i><footer>footnote</footer>'
        );
    });
});

/**
 * THE SAME SHAPES, HYDRATED — and the half of a child list the compiler did not record until now.
 *
 * `elem[port]` is the slot of the element the child list lives IN, which for
 * `<div><h3/>{childList}<footer/></div>` is the `<div>`. A client render never notices, because
 * inserting only ever needs to know what to insert BEFORE (`childListEndSlot`); adoption needs the
 * opposite and had nothing to ask, so it started at the parent's `firstElementChild` — the HEADING.
 * Every row then shifted by one, and every value a hydrated row writes is silenced by design, so
 * the page came out permanently wrong with no error in it, on the commonest shape a component has.
 *
 * The mirror the schema was missing is `childListStartSlot` — the slot of the last static element
 * in FRONT of the port — and adoption begins at its `nextElementSibling`.
 *
 * THE ASSERTIONS ARE ON NODE IDENTITY, not on markup, and that is the whole point of hydration: a
 * rebuild that produced the same bytes passes every string compare while having thrown away the
 * listeners, the focus and anything the user had typed. The rows carry a LISTENER for the same
 * reason — markup cannot carry one, so a click is the only thing that says which element the wire
 * actually landed on.
 */

/** Where a click lands, so "the listener went on the SERVER's element" is testable. */
let clicked = '';

/**
 * A CHILD LIST ROW WITH A LISTENER. Its markup is `itemOf`'s to the byte — an event port prints
 * nothing on either backend — so every expectation above stays readable while adoption becomes
 * observable.
 */
const clickableOf = (labelAt: (i: number) => string) =>
    createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let label!: TExoTextPort;
            let click!: TExoEventPort;
            b.el('i', null, (i) => {
                click = i.eventPort('click');
                label = i.textPort();
            });
            return { label, click };
        },
        (P): TExoMachineInitialState<TRowSurface> =>
            (c, i) => {
                c.text(P.label, labelAt(i));
                c.on(P.click, () => {
                    clicked += labelAt(i);
                });
            }
    );

/** THREE child lists in one element, separated by two statics — the chain, one link longer. */
function buildTriple(b: TExoSchemaCursor) {
    let head!: TExoChildrenPort;
    let mid!: TExoChildrenPort;
    let tail!: TExoChildrenPort;
    b.el('div', { class: 'card' }, (card) => {
        card.el('h3', null, (h) => h.text('headline'));
        head = card.childrenPort();
        card.el('hr');
        mid = card.childrenPort();
        card.el('hr');
        tail = card.childrenPort();
        card.el('footer', null, (f) => f.text('footnote'));
    });
    return { head, mid, tail };
}

/** A child list with a static in front of it AND ANOTHER CHILD LIST after it, separated by a static. */
function buildSeparated(b: TExoSchemaCursor) {
    let head!: TExoChildrenPort;
    let tail!: TExoChildrenPort;
    b.el('div', { class: 'card' }, (card) => {
        card.el('h3', null, (h) => h.text('headline'));
        head = card.childrenPort();
        card.el('hr');
        tail = card.childrenPort();
        card.el('footer', null, (f) => f.text('footnote'));
    });
    return { head, tail };
}

describe('a child list between two statics, hydrated', () => {
    /** Serve the shape and then adopt it, handing back everything the cases assert on. */
    const serveThenHydrate = (labels: readonly string[]) => {
        const ROW = clickableOf((i) => labels[i]);
        const CARD = createExoTestMachine(
            buildOne,
            (P): TExoMachineInitialState<TPortable> =>
                (c) => {
                    c.list(P.mid, ROW, labels.length);
                }
        );
        const parent = host();
        parent.innerHTML = EXO_STR.render(CARD);
        const card = parent.querySelector('.card') as HTMLElement;
        const before = {
            heading: card.querySelector('h3') as HTMLElement,
            footer: card.querySelector('footer') as HTMLElement,
            rows: Array.from(card.querySelectorAll('i')),
            html: card.innerHTML,
        };
        EXO_BACKEND.hydrate(CARD, parent);
        return { card, before };
    };

    it('the server, a client render and a hydration all produce the same tree', () => {
        const ROW = clickableOf((i) => ['A', 'B'][i]);
        const CARD = createExoTestMachine(
            buildOne,
            (P): TExoMachineInitialState<TPortable> =>
                (c) => {
                    c.list(P.mid, ROW, 2);
                }
        );
        const served = EXO_STR.render(CARD);
        expect(served).toBe(
            '<div class="card"><h3>headline</h3><i>A</i><i>B</i><footer>footnote</footer></div>'
        );

        const rendered = host();
        EXO_BACKEND.render(CARD, rendered);
        expect(rendered.innerHTML).toBe(served);

        const adopted = host();
        adopted.innerHTML = served;
        EXO_BACKEND.hydrate(CARD, adopted);
        expect(adopted.innerHTML).toBe(served);
    });

    it('ADOPTS THE ROWS THEMSELVES — no node moves, and the statics are untouched', () => {
        const { card, before } = serveThenHydrate(['A', 'B']);

        expect(card.innerHTML).toBe(before.html);
        expect(card.querySelector('h3')).toBe(before.heading);
        expect(card.querySelector('footer')).toBe(before.footer);
        const rows = card.querySelectorAll('i');
        expect(rows).toHaveLength(2);
        expect(rows[0]).toBe(before.rows[0]);
        expect(rows[1]).toBe(before.rows[1]);

        // AND THE WIRE LANDED ON THOSE ROWS AND NOT ON THE HEADING. Adoption that started at the
        // parent's first element wired `<h3>` as row 0 and `<i>A</i>` as row 1, which no markup
        // assertion can see — every value a hydrated row writes is silenced by design. A listener
        // is not silenced, so a click is what tells the two apart.
        clicked = '';
        before.rows[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        before.rows[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(clicked).toBe('AB');

        clicked = '';
        before.heading.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(clicked).toBe('');
    });

    it('claims every row the server sent, the LAST one included', () => {
        // The second half of the same defect. Adoption that consumed the heading as row 0 ran out
        // of rows one element early: the last real row was never claimed, so it was left with no
        // listener on it while a static carried one — and three rows of identical markup is the
        // shape where nothing else can tell.
        const { card, before } = serveThenHydrate(['A', 'B', 'C']);
        const rows = card.querySelectorAll('i');
        expect(rows).toHaveLength(3);
        expect(rows[2]).toBe(before.rows[2]);
        expect(Array.from(rows).map((n) => n.textContent)).toEqual(['A', 'B', 'C']);

        clicked = '';
        before.rows[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        before.rows[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        before.rows[2].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(clicked).toBe('ABC');
    });

    it('adopts a child list the server rendered EMPTY without inserting beside the statics', () => {
        // `list()` adopts without `findExoRowDisagreement`, because every row is the same schema
        // and the check would ask one question n times — so with no rows to take there is nothing
        // at all to refuse an adoption that began on the heading. What has to hold is that the
        // pass creates NOTHING: a second set of rows beside markup the server already printed is
        // the failure this shape produces, and it produces it silently.
        const { card, before } = serveThenHydrate([]);
        expect(card.innerHTML).toBe('<h3>headline</h3><footer>footnote</footer>');
        expect(card.querySelectorAll('i')).toHaveLength(0);
        expect(card.querySelector('h3')).toBe(before.heading);
        expect(card.querySelector('footer')).toBe(before.footer);
    });
});

describe('one() in a children port among static siblings', () => {
    const SINGLE = clickableOf(() => 'A');
    const CARD = createExoTestMachine(
        buildOne,
        (P): TExoMachineInitialState<TPortable> =>
            (c) => {
                c.one(P.mid, SINGLE);
            }
    );
    const MARKUP = '<div class="card"><h3>headline</h3><i>A</i><footer>footnote</footer></div>';

    it('prints the instance between the statics on the server', () => {
        expect(EXO_STR.render(CARD)).toBe(MARKUP);
    });

    it('MOUNTS it between the statics on a client render, not after the footer', () => {
        // THE DEFECT. `one` called `mountExoInstance` with no anchor, and `mountExoInstance` turns a
        // null `before` into `appendChild` — so the instance landed at the END of the shared
        // element. The server printed it before the footer and the browser put it after: one
        // program, two trees, and nothing to say so.
        const parent = host();
        EXO_BACKEND.render(CARD, parent);
        expect(parent.innerHTML).toBe(MARKUP);
    });

    it('ADOPTS it through hydration without moving a node', () => {
        const parent = host();
        parent.innerHTML = MARKUP;
        const served = parent.querySelector('i') as HTMLElement;
        const heading = parent.querySelector('h3') as HTMLElement;

        EXO_BACKEND.hydrate(CARD, parent);

        expect(parent.innerHTML).toBe(MARKUP);
        expect(parent.querySelector('i')).toBe(served);
        // The wire went on the instance and not on the heading — `one` adopted the parent's first
        // element child before this, which in this shape is the `<h3>`.
        clicked = '';
        served.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(clicked).toBe('A');
        clicked = '';
        heading.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(clicked).toBe('');
    });

    it('is a child list the neighbour in front of it must anchor on', () => {
        // THE SECOND HALF OF THE SAME DEFECT, and the exact hole `list()` was found in: the chain
        // answers "where does my child list end" by asking the next child list for its first node,
        // and a child list that never published looks EMPTY. `one` published nothing, so the
        // neighbour walked past it and anchored on the footer — putting its rows BEHIND an instance
        // that was already standing there.
        const first = source<readonly string[]>([]);
        const fillFirst = rowsFrom(first);
        const ONLY = clickableOf(() => 'X');
        const PAIR = followingCard(buildTwo, (c, P) => {
            const followed = [fillFirst(c, P.a)];
            c.one(P.c, ONLY);
            return followed;
        });
        const parent = host();
        EXO_BACKEND.render(PAIR, parent);
        const card = parent.querySelector('.card') as HTMLElement;
        expect(card.innerHTML).toBe('<h3>headline</h3><i>X</i><footer>footnote</footer>');
        first.setValue(['A']);
        expect(card.innerHTML).toBe('<h3>headline</h3><i>A</i><i>X</i><footer>footnote</footer>');
    });
});

describe('a child list with a static before it AND another child list after it', () => {
    /** One component over two fixed runs of rows — the form a served page and its adoption share. */
    const cardOf = (head: readonly string[], tail: readonly string[]) => {
        const HEAD_ROW = clickableOf((i) => head[i]);
        const TAIL_ROW = clickableOf((i) => tail[i]);
        return createExoTestMachine(
            buildSeparated,
            (P): TExoMachineInitialState<TPortable> =>
                (c) => {
                    c.list(P.head, HEAD_ROW, head.length);
                    c.list(P.tail, TAIL_ROW, tail.length);
                }
        );
    };

    it('the server, a client render and a hydration all produce the same tree', () => {
        const CARD = cardOf(['A'], ['B']);
        const served = EXO_STR.render(CARD);
        expect(served).toBe(
            '<div class="card"><h3>headline</h3><i>A</i><hr><i>B</i>' +
                '<footer>footnote</footer></div>'
        );

        const rendered = host();
        EXO_BACKEND.render(CARD, rendered);
        expect(rendered.innerHTML).toBe(served);

        const adopted = host();
        adopted.innerHTML = served;
        EXO_BACKEND.hydrate(CARD, adopted);
        expect(adopted.innerHTML).toBe(served);
    });

    it('adopts each child list on its own side of the separator', () => {
        // BOTH CHILD LISTS HAVE A STATIC IN FRONT OF THEM HERE — the heading for one, the separator
        // for the other — so both are found through `childListStartSlot` and neither is found
        // through the parent's first element.
        const CARD = cardOf(['A'], ['B']);
        const parent = host();
        parent.innerHTML = EXO_STR.render(CARD);
        const card = parent.querySelector('.card') as HTMLElement;
        const rows = Array.from(card.querySelectorAll('i'));

        EXO_BACKEND.hydrate(CARD, parent);

        expect(card.querySelectorAll('i')[0]).toBe(rows[0]);
        expect(card.querySelectorAll('i')[1]).toBe(rows[1]);
        clicked = '';
        rows[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        rows[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(clicked).toBe('AB');
    });

    it('grows each child list on its OWN side of the separator', () => {
        // THE OTHER HALF OF THE SHAPE, asked of the pass that can answer it: a child list whose end
        // is a static grows in front of that static, and the one behind it grows in front of the
        // footer. Adoption cannot be asked this — a hydrated page holds rows the placement door was
        // never handed — so it is the client render that says where an insertion lands.
        const first = source<readonly string[]>([]);
        const second = source<readonly string[]>([]);
        const fillFirst = rowsFrom(first);
        const fillSecond = rowsFrom(second);
        const CARD = followingCard(buildSeparated, (c, P) => [
            fillFirst(c, P.head),
            fillSecond(c, P.tail),
        ]);
        const parent = host();
        EXO_BACKEND.render(CARD, parent);
        const card = parent.querySelector('.card') as HTMLElement;
        expect(card.innerHTML).toBe('<h3>headline</h3><hr><footer>footnote</footer>');

        second.setValue(['B']);
        expect(card.innerHTML).toBe('<h3>headline</h3><hr><i>B</i><footer>footnote</footer>');
        first.setValue(['A', 'A2']);
        second.setValue(['B', 'B2']);
        expect(card.innerHTML).toBe(
            '<h3>headline</h3><i>A</i><i>A2</i><hr><i>B</i><i>B2</i><footer>footnote</footer>'
        );
    });

    it('adopts the second child list when the server rendered the FIRST one empty', () => {
        // THE CASE WHERE "THE CHILD LIST IN FRONT'S END" IS NOT A ROW AT ALL. The separator is the
        // first element the head child list did not take — which, with nothing taken, is the element
        // its own adoption started on. The publication is that node either way, so the tail
        // child list begins one element later.
        const CARD = cardOf([], ['B']);
        const parent = host();
        parent.innerHTML = EXO_STR.render(CARD);
        expect(parent.innerHTML).toBe(
            '<div class="card"><h3>headline</h3><hr><i>B</i><footer>footnote</footer></div>'
        );
        const card = parent.querySelector('.card') as HTMLElement;
        const row = card.querySelector('i') as HTMLElement;

        EXO_BACKEND.hydrate(CARD, parent);

        // The tail's row is the SERVER'S row — not a rebuild beside it, and not the separator.
        expect(card.querySelectorAll('i')).toHaveLength(1);
        expect(card.querySelector('i')).toBe(row);
        clicked = '';
        row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(clicked).toBe('B');
        // And the separator kept no listener of its own — it was offered to the tail as row 0
        // before the publication existed.
        clicked = '';
        (card.querySelector('hr') as HTMLElement).dispatchEvent(
            new MouseEvent('click', { bubbles: true })
        );
        expect(clicked).toBe('');
    });

    it('refuses a wiring that fills the two child lists out of document order', () => {
        // THE ONE THING THE PUBLICATION REQUIRES, and it is a requirement rather than an
        // assumption: `TExoDomNode`'s own header says a wire may fill the last port first,
        // and nothing in the design orders these calls. The MARKUP is identical either way —
        // the server fills a value array indexed by port, not a stream — so the only way to
        // notice is at adoption, and the only honest thing to do is say so by name.
        const HEAD_ROW = clickableOf(() => 'A');
        const TAIL_ROW = clickableOf(() => 'B');
        const CARD = createExoTestMachine(
            buildSeparated,
            (P): TExoMachineInitialState<TPortable> =>
                (c) => {
                    c.list(P.tail, TAIL_ROW, 1);
                    c.list(P.head, HEAD_ROW, 1);
                }
        );
        const parent = host();
        parent.innerHTML = EXO_STR.render(CARD);
        expect(parent.innerHTML).toBe(
            '<div class="card"><h3>headline</h3><i>A</i><hr><i>B</i>' +
                '<footer>footnote</footer></div>'
        );
        // A client render of the very same wiring is unaffected: it inserts, and an insertion
        // resolves its anchor when it happens rather than from what a neighbour claimed.
        const rendered = host();
        EXO_BACKEND.render(CARD, rendered);
        expect(rendered.innerHTML).toBe(parent.innerHTML);

        expect(() => EXO_BACKEND.hydrate(CARD, parent)).toThrow(/DOCUMENT ORDER/);
    });
});

describe('THREE child lists in one element, separated by two statics', () => {
    const cardOf = (head: readonly string[], mid: readonly string[], tail: readonly string[]) => {
        const HEAD_ROW = clickableOf((i) => head[i]);
        const MID_ROW = clickableOf((i) => mid[i]);
        const TAIL_ROW = clickableOf((i) => tail[i]);
        return createExoTestMachine(
            buildTriple,
            (P): TExoMachineInitialState<TPortable> =>
                (c) => {
                    c.list(P.head, HEAD_ROW, head.length);
                    c.list(P.mid, MID_ROW, mid.length);
                    c.list(P.tail, TAIL_ROW, tail.length);
                }
        );
    };

    it('the server, a client render and a hydration all produce the same tree', () => {
        const CARD = cardOf(['A'], ['B'], ['C']);
        const served = EXO_STR.render(CARD);
        expect(served).toBe(
            '<div class="card"><h3>headline</h3><i>A</i><hr><i>B</i><hr><i>C</i>' +
                '<footer>footnote</footer></div>'
        );

        const rendered = host();
        EXO_BACKEND.render(CARD, rendered);
        expect(rendered.innerHTML).toBe(served);

        const adopted = host();
        adopted.innerHTML = served;
        EXO_BACKEND.hydrate(CARD, adopted);
        expect(adopted.innerHTML).toBe(served);
    });

    it('every child list adopts its own rows, and no separator is wired as one', () => {
        // THE CHAIN, ONE LINK LONGER. Each child list's beginning comes from the one in front of it,
        // so the middle child list is BOTH a consumer of a publication and the publisher for the
        // last one — which is the part a single separator cannot exercise.
        const CARD = cardOf(['A'], ['B'], ['C']);
        const parent = host();
        parent.innerHTML = EXO_STR.render(CARD);
        const card = parent.querySelector('.card') as HTMLElement;
        const rows = Array.from(card.querySelectorAll('i'));

        EXO_BACKEND.hydrate(CARD, parent);

        const after = card.querySelectorAll('i');
        expect(after).toHaveLength(3);
        expect(after[0]).toBe(rows[0]);
        expect(after[1]).toBe(rows[1]);
        expect(after[2]).toBe(rows[2]);
        // NODE IDENTITY IS NOT ENOUGH — the markup was right the whole time. A listener is what
        // says which element each wire actually landed on.
        clicked = '';
        rows[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        rows[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        rows[2].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(clicked).toBe('ABC');
        // And neither separator was wired as anybody's row.
        clicked = '';
        for (const hr of Array.from(card.querySelectorAll('hr'))) {
            hr.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
        expect(clicked).toBe('');
    });

    it('grows each child list in its OWN gap between the separators', () => {
        // THE MIDDLE GAP IS THE ONE A SINGLE SEPARATOR CANNOT ASK ABOUT: a child list bounded by a
        // static on BOTH sides must fill between them and not beside them, and it must do so while
        // the lists on either side are still empty.
        const first = source<readonly string[]>([]);
        const second = source<readonly string[]>([]);
        const third = source<readonly string[]>([]);
        const fillFirst = rowsFrom(first);
        const fillSecond = rowsFrom(second);
        const fillThird = rowsFrom(third);
        const CARD = followingCard(buildTriple, (c, P) => [
            fillFirst(c, P.head),
            fillSecond(c, P.mid),
            fillThird(c, P.tail),
        ]);
        const parent = host();
        EXO_BACKEND.render(CARD, parent);
        const card = parent.querySelector('.card') as HTMLElement;
        expect(card.innerHTML).toBe('<h3>headline</h3><hr><hr><footer>footnote</footer>');

        second.setValue(['B']);
        expect(card.innerHTML).toBe('<h3>headline</h3><hr><i>B</i><hr><footer>footnote</footer>');

        first.setValue(['A', 'A2']);
        second.setValue(['B', 'B2']);
        third.setValue(['C', 'C2']);
        expect(card.innerHTML).toBe(
            '<h3>headline</h3><i>A</i><i>A2</i><hr><i>B</i><i>B2</i><hr>' +
                '<i>C</i><i>C2</i><footer>footnote</footer>'
        );
    });

    it('adopts when the MIDDLE child list is the one the server rendered empty', () => {
        // An empty child list publishes the separator it is standing on, so the last child list is
        // still found — and the two separators end up adjacent in the markup, which is the shape
        // where a walk counting elements forward or back is wrong by the same amount either way.
        const CARD = cardOf(['A'], [], ['C']);
        const parent = host();
        parent.innerHTML = EXO_STR.render(CARD);
        expect(parent.innerHTML).toBe(
            '<div class="card"><h3>headline</h3><i>A</i><hr><hr><i>C</i>' +
                '<footer>footnote</footer></div>'
        );
        const card = parent.querySelector('.card') as HTMLElement;
        const rows = Array.from(card.querySelectorAll('i'));

        EXO_BACKEND.hydrate(CARD, parent);

        expect(card.querySelectorAll('i')).toHaveLength(2);
        expect(card.querySelectorAll('i')[0]).toBe(rows[0]);
        expect(card.querySelectorAll('i')[1]).toBe(rows[1]);
        clicked = '';
        rows[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        rows[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(clicked).toBe('AC');
    });
});

/**
 * A PORT ON EACH STATIC AROUND THE CHILD LIST — the shape that made the walk's own defect visible.
 *
 * Every case above puts its ports INSIDE the child list and leaves the statics as plain markup, and
 * that is exactly why the defect below survived: the walk resolved the `<footer>`'s slot, landed
 * it on ROW 0, and nothing ever read that slot. A port on the footer reads it.
 *
 * WHY IT LANDED THERE. The walk is compiled against a tree where a children port contributes NO
 * nodes — a clone of the prototype — so the element after a child list is the previous static's
 * `nextSibling`. The server's markup has the child list's rows standing in that gap. Same hop, same
 * schema, different tree: the `<footer>`'s listener went onto `<i>A</i>`, its bound text overwrote
 * `<i>A</i>`'s, and both backends had printed byte-identical markup, so nothing could see it.
 * Hydration now replays a walk that counts such a landing back from the parent's LAST child,
 * which the rows in front of it cannot shift (`TExoDomSchema.hydrateWalk`).
 *
 * THE ASSERTIONS ARE NODE IDENTITY AND WHERE A WRITE LANDED, never markup: the markup was right
 * the whole time.
 */
function buildPortedStatics(b: TExoSchemaCursor) {
    let heading!: TExoTextPort;
    let mid!: TExoChildrenPort;
    let footer!: TExoTextPort;
    let footerClick!: TExoEventPort;
    b.el('div', { class: 'card' }, (card) => {
        card.el('h3', null, (h) => {
            heading = h.textPort();
        });
        mid = card.childrenPort();
        card.el('footer', null, (f) => {
            footerClick = f.eventPort('click');
            footer = f.textPort();
        });
    });
    return { heading, mid, footer, footerClick };
}

describe('ports on the statics AROUND a child list, hydrated', () => {
    /** One component over one source and one fixed run of rows — served, then adopted. */
    const card = (labels: readonly string[], foot: string) => {
        const label = source(foot);
        const ROW = clickableOf((i) => labels[i]);
        const schema = createExoSchema(buildPortedStatics);
        const m = createExoMachineBuilder<TExoMachineNode & TPortable>(schema);
        m.createInitialState((c) => {
            c.text(schema.ports.heading, 'headline');
            c.list(schema.ports.mid, ROW, labels.length);
            c.on(schema.ports.footerClick, () => {
                clicked += 'F';
            });
        });
        const showFooter = m.transition((c) => {
            c.text(schema.ports.footer, label.getValue());
        });
        m.effect((c) => {
            showFooter(c);
            return label.onChange(() => showFooter(c));
        });
        const CARD = m.done();
        return { label, CARD };
    };

    /** Serve it and remember every node the server made — the cases adopt it themselves. */
    const serve = (labels: readonly string[], foot: string) => {
        const made = card(labels, foot);
        const parent = host();
        parent.innerHTML = EXO_STR.render(made.CARD);
        const el = parent.querySelector('.card') as HTMLElement;
        const before = {
            heading: el.querySelector('h3') as HTMLElement,
            footer: el.querySelector('footer') as HTMLElement,
            rows: Array.from(el.querySelectorAll('i')),
        };
        return { ...made, parent, el, before };
    };

    it('the server, a client render and a hydration all produce the same tree', () => {
        const { CARD } = card(['A', 'B'], 'footnote');
        const served = EXO_STR.render(CARD);
        expect(served).toBe(
            '<div class="card"><h3>headline</h3><i>A</i><i>B</i>' +
                '<footer>footnote</footer></div>'
        );

        const rendered = host();
        EXO_BACKEND.render(CARD, rendered);
        expect(rendered.innerHTML).toBe(served);

        const adopted = host();
        adopted.innerHTML = served;
        EXO_BACKEND.hydrate(CARD, adopted);
        expect(adopted.innerHTML).toBe(served);
    });

    it('wires each port onto its own element — listener, bound text and rows', () => {
        const { CARD, parent, el, before, label } = serve(['A', 'B'], 'footnote');

        EXO_BACKEND.hydrate(CARD, parent);

        // NOTHING WAS REBUILT. Node identity, because a rebuild produces the same bytes.
        expect(el.querySelector('h3')).toBe(before.heading);
        expect(el.querySelector('footer')).toBe(before.footer);
        const rows = Array.from(el.querySelectorAll('i'));
        expect(rows).toHaveLength(before.rows.length);
        for (let i = 0; i < rows.length; i++) expect(rows[i]).toBe(before.rows[i]);

        // THE LISTENER IS ON THE FOOTER. It used to be on `<i>A</i>`, so this click did
        // nothing at all and clicking row 0 fired the footer's handler as well as the row's.
        clicked = '';
        before.footer.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(clicked).toBe('F');

        // AND THE ROWS STILL HAVE THEIR OWN, exactly theirs: 'AF' here was the old behaviour.
        clicked = '';
        before.rows[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        before.rows[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(clicked).toBe('AB');

        // AND A BOUND VALUE UPDATES THE FOOTER, not the row the walk used to land on.
        label.setValue('updated');
        expect(before.footer.textContent).toBe('updated');
        expect(before.rows[0].textContent).toBe('A');
        expect(el.innerHTML).toBe('<h3>headline</h3><i>A</i><i>B</i><footer>updated</footer>');
    });

    it("repairs the footer's text when the value moved, and leaves the rows alone", () => {
        // The hydration-time repair, which is a WRITE and therefore the loudest form of the
        // defect: the value changed while the bundle was downloading, the effect writes through
        // the fill door, the adopting fill compares what the markup shows against what the source
        // says now, and writes. It wrote into row 0.
        const { CARD, parent, el, before, label } = serve(['A', 'B'], 'footnote');
        label.setValue('fresh footnote');

        EXO_BACKEND.hydrate(CARD, parent);

        expect(before.footer.textContent).toBe('fresh footnote');
        expect(before.rows[0].textContent).toBe('A');
        expect(before.rows[1].textContent).toBe('B');
        expect(el.innerHTML).toBe(
            '<h3>headline</h3><i>A</i><i>B</i><footer>fresh footnote</footer>'
        );
    });

    it('lands on the footer for EVERY row count, including none at all', () => {
        // The count is what the forward hop was wrong by, so the case that used to pass — an
        // empty child list, where the two walks agree — is asserted beside the ones that did not.
        for (const labels of [[], ['A'], ['A', 'B', 'C']]) {
            const { CARD, parent, el, before } = serve(labels, 'footnote');
            EXO_BACKEND.hydrate(CARD, parent);
            clicked = '';
            before.footer.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            expect(clicked).toBe('F');
            expect(el.querySelector('footer')).toBe(before.footer);
        }
    });
});

/**
 * A PORT ON THE SEPARATOR ITSELF — the half of that shape publication cannot answer for, and the
 * one thing this backend now refuses outright.
 *
 * A CHILD LIST reached through the child list in front of it is exact, because adoption is eager: by
 * the time the second one runs, the first has claimed its rows and published the first element it
 * did not take. A PORT has no such moment. A wiring function fills its ports in whatever order its
 * author wrote — `TExoDomNode`'s header says so in as many words — so `c.attr(P.seam, …)` may
 * run before the child list in front has adopted anything, and by then the value or the listener is
 * on a list row, with the markup looking right either way.
 *
 * So the refusal is at COMPILE time, and only for the hydrate schema: a client render resolves
 * that landing perfectly, because its child lists are empty and the forward chain is exact. The
 * shape stays legal; only adopting it is refused.
 */
function buildPortedSeparator(b: TExoSchemaCursor) {
    let head!: TExoChildrenPort;
    let tail!: TExoChildrenPort;
    let seam!: TExoAttrPort;
    b.el('div', { class: 'card' }, (card) => {
        card.el('h3', null, (h) => h.text('headline'));
        head = card.childrenPort();
        card.el('hr', null, (hr) => {
            seam = hr.port('class');
        });
        tail = card.childrenPort();
        card.el('footer', null, (f) => f.text('footnote'));
    });
    return { head, tail, seam };
}

describe('a PORT on the static between two child lists', () => {
    const HEAD_ROW = clickableOf(() => 'A');
    const TAIL_ROW = clickableOf(() => 'B');
    const CARD = createExoTestMachine(
        buildPortedSeparator,
        (P): TExoMachineInitialState<TPortable> =>
            (c) => {
                c.attr(P.seam, 'seam');
                c.list(P.head, HEAD_ROW, 1);
                c.list(P.tail, TAIL_ROW, 1);
            }
    );
    const MARKUP =
        '<div class="card"><h3>headline</h3><i>A</i><hr class="seam"><i>B</i>' +
        '<footer>footnote</footer></div>';

    it('renders on both backends — the shape is legal, and identical', () => {
        expect(EXO_STR.render(CARD)).toBe(MARKUP);
        const parent = host();
        EXO_BACKEND.render(CARD, parent);
        expect(parent.innerHTML).toBe(MARKUP);
    });

    it('refuses to HYDRATE it, naming the port instead of wiring it onto a row', () => {
        const parent = host();
        parent.innerHTML = MARKUP;
        expect(() => EXO_BACKEND.hydrate(CARD, parent)).toThrow(
            /attribute port "class".*BETWEEN two children ports/s
        );
    });
});
