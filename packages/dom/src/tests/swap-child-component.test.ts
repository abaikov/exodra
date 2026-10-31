// @vitest-environment jsdom
//
// ONE POSITION, AND WHICH COMPONENT STANDS IN IT OVER TIME — a tab, a modal, a route.
//
// THERE IS NO DOOR FOR THIS, and the absence is the design. A position is not typed by a component:
// `c.childList(port)` holds whatever `c.build(component, index)` hands it, so "show B where A
// stood" is `slot.remove(0)` followed by `slot.insert(c.build(B, 0))` — two commands over the two
// doors a fixed list already uses, with no reconciler, no registry and no component-keyed table
// anywhere in the engine. `swappingShell` below is the whole of what a renderer-side call would have
// been: the two commands, an identity compare so an unrelated notification changes nothing, and one
// effect that follows the source.
//
// PROPS ARE GONE, so "which component" is only half of what a position needs. A wire is handed a
// NUMBER and reads its data by it, so what a source publishes here is a component and the row of
// that component's data its instance should read — `standing(PAGE_A, 1)` and not a props value.
//
// WHAT THIS FILE CANNOT ASSERT, said here rather than found later. `childList` is a door on
// `@exodra/dom` and `@exodra/term` only; `@exodra/string` has no placement command at all, so a
// swap has NO server expression, one component cannot drive both backends through one, and the
// byte-identity that makes an SSR'd router page adoptable is unmeasurable from here until the
// server gets a placement door.
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type {
    TExoSchemaCursor,
    TExoChildrenPort,
    TExoChildrenWiring,
    TExoMachine,
    TExoMachineNode,
    TExoNode,
    TExoTextPort,
    TExoWiring,
    TExoMachineInitialState,
} from '@exodra/core';
import type { TExoPlacedChildren } from '@exodra/list-reconcile';
import { describe, expect, it } from 'vitest';

import { host, source, createExoTestMachine } from '@exodra/test-utils';
import { ExoDomBackend, withExoCompiler, withExoChildList } from '@exodra/dom';

const EXO_BACKEND = withExoChildList(withExoCompiler(new ExoDomBackend()));

/**
 * WHAT THE WIRES BELOW ASSUME ABOUT AN EXONODE. `childList` is each backend's own door — it hands
 * out element positions, which `@exodra/core` has no word for — so the commands are named over
 * core's opaque `TExoNode` and no backend's node type.
 */
type TExoPlacing = TExoChildrenWiring & {
    childList(port: TExoChildrenPort): TExoPlacedChildren<TExoNode>;
};

/** WHICH COMPONENT STANDS THERE, AND WHICH ROW OF ITS DATA ITS INSTANCE READS. */
type TStanding = {
    readonly component: TExoMachine<TExoChildrenWiring>;
    readonly index: number;
};

const standing = (component: TExoMachine<TExoChildrenWiring>, index = 0): TStanding => ({
    component,
    index,
});

type TStandingSource = {
    getValue(): TStanding | null;
    onChange(cb: () => void): () => void;
};

/**
 * THE SWAP, COMPOSED FROM THE DOORS IT IS MADE OF: one position in a child list, an identity
 * compare, and `remove` rather than `detach` — the outgoing instance must be TOLD it left, because
 * that is what ends its subscriptions. `openRest` opens whatever else the instance holds, after the
 * swap's child list.
 */
const swappingShell = <TPorts>(
    build: (b: TExoSchemaCursor) => TPorts,
    slotOf: (ports: TPorts) => TExoChildrenPort,
    src: TStandingSource,
    openRest?: (c: TExoPlacing, ports: TPorts) => void
) => {
    const schema = createExoSchema(build);
    const m = createExoMachineBuilder<
        TExoMachineNode & TExoPlacing,
        unknown,
        { slot: TExoPlacedChildren<TExoNode>; shown: TStanding | null }
    >(schema);
    m.createInitialState((c) => {
        const slot = c.childList(slotOf(schema.ports));
        if (openRest !== undefined) openRest(c, schema.ports);
        return { slot, shown: null };
    });
    const swap = m.transition((c) => {
        const state = c.state;
        const want = src.getValue();
        if (want === state.shown) return;
        if (state.shown !== null) state.slot.remove(0);
        state.shown = want;
        if (want !== null) state.slot.insert(c.build(want.component, want.index));
    });
    m.effect((c) => {
        swap(c);
        return src.onChange(() => swap(c));
    });
    return m.done();
};

/** What the two pages read, BY INDEX: a wire is handed its position and nothing else, so the text a
 *  page shows is the caller's to put where the page can reach it. */
const A_TITLES: string[] = [];
const B_BODIES: string[] = [];
/** Every number `PAGE_A`'s wire was handed, in build order. */
const A_WIRED: number[] = [];
/** What a row in the neighbouring child list reads, by the same rule. */
const ROW_LABELS: string[] = [];

/** ONE PAGE — `<section class="a"><h1>…</h1></section>`. */
const PAGE_A = createExoTestMachine(
    (b) => {
        let title!: TExoTextPort;
        b.el('section', { class: 'a' }, (s) => {
            s.el('h1', null, (h) => {
                title = h.textPort();
            });
        });
        return { title };
    },
    (P): TExoMachineInitialState<TExoWiring> =>
        (c, i) => {
            A_WIRED.push(i);
            c.text(P.title, A_TITLES[i]);
        }
);

/** ANOTHER PAGE, a different shape as well as a different wire — `<article class="b"><p>…</p>`. */
const PAGE_B = createExoTestMachine(
    (b) => {
        let body!: TExoTextPort;
        b.el('article', { class: 'b' }, (s) => {
            s.el('p', null, (p) => {
                body = p.textPort();
            });
        });
        return { body };
    },
    (P): TExoMachineInitialState<TExoWiring> =>
        (c, i) => {
            c.text(P.body, B_BODIES[i]);
        }
);

/** A page that SUBSCRIBES, so that "the outgoing instance was disposed" is observable. */
const BOUND = source('alive');
const PAGE_BOUND_SCHEMA = createExoSchema((b) => {
    let text!: TExoTextPort;
    b.el('aside', { class: 'bound' }, (s) => {
        text = s.textPort();
    });
    return { text };
});
const mPageBound = createExoMachineBuilder<TExoMachineNode>(PAGE_BOUND_SCHEMA);
const showPageBound = mPageBound.transition((c) => {
    c.text(PAGE_BOUND_SCHEMA.ports.text, BOUND.getValue());
});
mPageBound.effect((c) => {
    showPageBound(c);
    return BOUND.onChange(() => showPageBound(c));
});
const PAGE_BOUND = mPageBound.done() as unknown as TExoMachine<TExoChildrenWiring>;

/** What goes into the child list BESIDE a swap: one element carrying its own label. */
const ITEM = createExoTestMachine(
    (b) => {
        let label!: TExoTextPort;
        b.el('i', null, (i) => {
            label = i.textPort();
        });
        return { label };
    },
    (P): TExoMachineInitialState<TExoWiring> =>
        (c, i) => {
            c.text(P.label, ROW_LABELS[i]);
        }
);

/** A port that OWNS its element — a router outlet, a modal host. */
function buildShell(b: TExoSchemaCursor) {
    let slot!: TExoChildrenPort;
    b.el('main', null, (m) => {
        slot = m.childrenPort();
    });
    return { slot };
}

/** THE SAME PORT AMONG STATICS: a sibling on each side of it. */
function buildCard(b: TExoSchemaCursor) {
    let slot!: TExoChildrenPort;
    b.el('div', { class: 'card' }, (card) => {
        card.el('h3', null, (h) => h.text('headline'));
        slot = card.childrenPort();
        card.el('footer', null, (f) => f.text('footnote'));
    });
    return { slot };
}

/** TWO child lists side by side — a swap next to a list of rows, statics outside them. */
function buildTwo(b: TExoSchemaCursor) {
    let swap!: TExoChildrenPort;
    let rows!: TExoChildrenPort;
    b.el('div', { class: 'card' }, (card) => {
        card.el('h3', null, (h) => h.text('headline'));
        swap = card.childrenPort();
        rows = card.childrenPort();
        card.el('footer', null, (f) => f.text('footnote'));
    });
    return { swap, rows };
}

/** The component under test: one port, one source saying what stands in it. */
const shellWith = (src: TStandingSource, build = buildShell) =>
    swappingShell(build, (P) => P.slot, src);

/** The markup of the two pages, written once so the cases read as assertions. */
const A = (title: string): string => `<section class="a"><h1>${title}</h1></section>`;
const B = (body: string): string => `<article class="b"><p>${body}</p></article>`;

describe('one position, and which component stands in it', () => {
    it('renders the component the source holds, and SWAPS to a different one', () => {
        // THE CASE THE WHOLE SHAPE EXISTS FOR. Two components, two schemas, one position.
        A_TITLES[0] = 'first';
        A_TITLES[1] = 'again';
        B_BODIES[0] = 'second';
        const src = source<TStanding | null>(standing(PAGE_A, 0));
        const parent = host();
        EXO_BACKEND.render(shellWith(src), parent);
        expect(parent.innerHTML).toBe(`<main>${A('first')}</main>`);

        src.setValue(standing(PAGE_B, 0));
        expect(parent.innerHTML).toBe(`<main>${B('second')}</main>`);

        src.setValue(standing(PAGE_A, 1));
        expect(parent.innerHTML).toBe(`<main>${A('again')}</main>`);
    });

    it('empties the position on null, and fills it again afterwards', () => {
        A_TITLES[0] = 'present';
        B_BODIES[0] = 'again';
        const src = source<TStanding | null>(standing(PAGE_A, 0));
        const parent = host();
        EXO_BACKEND.render(shellWith(src), parent);

        src.setValue(null);
        expect(parent.innerHTML).toBe('<main></main>');

        src.setValue(standing(PAGE_B, 0));
        expect(parent.innerHTML).toBe(`<main>${B('again')}</main>`);
    });

    it('starts empty when the source starts null', () => {
        const src = source<TStanding | null>(null);
        const parent = host();
        EXO_BACKEND.render(shellWith(src), parent);
        expect(parent.innerHTML).toBe('<main></main>');
    });

    it('leaves the very same element standing when the source republishes the same value', () => {
        // WHAT A NOTIFICATION THAT CHANGES NOTHING MAY COST, which is nothing. The compare is the
        // COMPOSITION'S and it is by object identity: a router that re-derives its value per read
        // allocates a fresh one every time and must hand the same object back while the route holds,
        // or the page is thrown away — DOM, listeners and whatever is focused inside it — on every
        // unrelated notification. Nothing in the engine keys a position by component or by value.
        A_TITLES[0] = 'same';
        const held = standing(PAGE_A, 0);
        const src = source<TStanding | null>(held);
        const parent = host();
        EXO_BACKEND.render(shellWith(src), parent);
        const first = parent.querySelector('section');

        src.setValue(held);
        expect(parent.querySelector('section')).toBe(first);
    });

    it('rebuilds when the DATA INDEX moves under the same component', () => {
        // A wire runs ONCE, when its instance is built, and reads its data by the number it was
        // handed. So a position that must show another row of the same component's data is a new
        // instance — and the number the new wire is handed is the one the caller named.
        A_TITLES[0] = 'primary';
        A_TITLES[1] = 'secondary';
        A_WIRED.length = 0;
        const src = source<TStanding | null>(standing(PAGE_A, 0));
        const parent = host();
        EXO_BACKEND.render(shellWith(src), parent);
        const first = parent.querySelector('section');

        src.setValue(standing(PAGE_A, 1));
        expect(parent.querySelector('section')).not.toBe(first);
        expect(parent.innerHTML).toBe(`<main>${A('secondary')}</main>`);
        expect(A_WIRED).toEqual([0, 1]);
    });

    it('DISPOSES the outgoing instance — its subscriptions end when it leaves', () => {
        // WHAT REPLACING MEANS, asserted rather than described. `remove` runs the child's `unmount`,
        // which is what ends its subscriptions. Miss this and every tab a user has ever opened keeps
        // its bindings alive, holding the detached elements they write to — a leak nothing reports
        // until the page has been used a while.
        A_TITLES[0] = 'another';
        const src = source<TStanding | null>(standing(PAGE_BOUND, 0));
        const parent = host();
        EXO_BACKEND.render(shellWith(src), parent);
        expect(BOUND.subscribers()).toBe(1);

        src.setValue(standing(PAGE_A, 0));
        expect(BOUND.subscribers()).toBe(0);

        src.setValue(standing(PAGE_BOUND, 0));
        expect(BOUND.subscribers()).toBe(1);

        src.setValue(null);
        expect(BOUND.subscribers()).toBe(0);
    });

    it("ends the swap's OWN subscription when the render is disposed, and unmounts the survivor", () => {
        // TWO DISPOSERS. The subscription is the composition's effect, stopped with the instance;
        // the instance still standing is nobody's survivor to drop — the swap was
        // never told anything happened — so it is `openChildList`'s own teardown that unmounts it.
        const src = source<TStanding | null>(standing(PAGE_BOUND, 0));
        const parent = host();
        const dispose = EXO_BACKEND.render(shellWith(src), parent);
        expect(src.subscribers()).toBe(1);
        expect(BOUND.subscribers()).toBe(1);

        dispose();
        expect(src.subscribers()).toBe(0);
        expect(BOUND.subscribers()).toBe(0);
    });
});

describe('a swapped position among static siblings', () => {
    it('puts its component BETWEEN the statics, and takes it back out without disturbing them', () => {
        // A children port may stand between a heading and a footer, so an `insert` that appended
        // would put the page after the footer. Plausible enough in the markup that only an ordering
        // assertion catches it.
        A_TITLES[0] = 'between';
        B_BODIES[0] = 'more';
        const src = source<TStanding | null>(null);
        const parent = host();
        EXO_BACKEND.render(shellWith(src, buildCard), parent);
        const card = parent.querySelector('.card') as HTMLElement;
        expect(card.innerHTML).toBe('<h3>headline</h3><footer>footnote</footer>');

        src.setValue(standing(PAGE_A, 0));
        expect(card.innerHTML).toBe(`<h3>headline</h3>${A('between')}<footer>footnote</footer>`);

        src.setValue(standing(PAGE_B, 0));
        expect(card.innerHTML).toBe(`<h3>headline</h3>${B('more')}<footer>footnote</footer>`);

        src.setValue(null);
        expect(card.innerHTML).toBe('<h3>headline</h3><footer>footnote</footer>');
    });
});

describe('a swapped position next to another child list', () => {
    /** A swap and a commanded list of rows side by side, statics outside them, both starting empty. */
    const mountTwo = () => {
        const swap = source<TStanding | null>(null);
        let node!: TExoPlacing;
        let rows!: TExoPlacedChildren<TExoNode>;
        const CARD = swappingShell(
            buildTwo,
            (P) => P.swap,
            swap,
            (c, P) => {
                node = c;
                rows = c.childList(P.rows);
            }
        );
        const parent = host();
        EXO_BACKEND.render(CARD, parent);
        return { swap, node, rows, card: parent.querySelector('.card') as HTMLElement };
    };

    it('the swap fills FIRST and the rows after it — the swap stays in front', () => {
        // THE CASE THIS DESCRIBE EXISTS FOR. Two empty child lists have NO node between them, so a
        // child list resolves its end by asking the next one for its first node — and a child list
        // that never PUBLISHED looks empty, so the walk steps over it and anchors on the footer. A
        // swap found in that hole renders without an error and shows a wrong tree.
        A_TITLES[0] = 'first';
        ROW_LABELS[0] = 'A';
        const { swap, node, rows, card } = mountTwo();
        swap.setValue(standing(PAGE_A, 0));
        rows.insert(node.build(ITEM, 0));
        expect(card.innerHTML).toBe(
            `<h3>headline</h3>${A('first')}<i>A</i><footer>footnote</footer>`
        );
    });

    it('the ROWS fill first and the swap after them — the swap still lands in front of them', () => {
        // The direction that fails when the swap does not consult the chain: with rows already
        // there, "insert before the footer" puts the page behind them.
        A_TITLES[0] = 'first';
        ROW_LABELS[0] = 'A';
        ROW_LABELS[1] = 'B';
        const { swap, node, rows, card } = mountTwo();
        rows.insert(node.build(ITEM, 0));
        rows.insert(node.build(ITEM, 1));
        swap.setValue(standing(PAGE_A, 0));
        expect(card.innerHTML).toBe(
            `<h3>headline</h3>${A('first')}<i>A</i><i>B</i><footer>footnote</footer>`
        );
    });

    it('emptying the swap leaves the rows exactly where they were, and they can still grow', () => {
        A_TITLES[0] = 'first';
        ROW_LABELS[0] = 'A';
        ROW_LABELS[1] = 'B';
        const { swap, node, rows, card } = mountTwo();
        swap.setValue(standing(PAGE_A, 0));
        rows.insert(node.build(ITEM, 0));
        swap.setValue(null);
        expect(card.innerHTML).toBe('<h3>headline</h3><i>A</i><footer>footnote</footer>');
        // The swap's published order is emptied IN PLACE and never replaced, so the rows' own
        // anchoring still reads the live array rather than a wiring-time snapshot.
        rows.insert(node.build(ITEM, 1));
        expect(card.innerHTML).toBe('<h3>headline</h3><i>A</i><i>B</i><footer>footnote</footer>');
    });

    it("a swap in front of a FIXED list anchors on the fixed list's first row", () => {
        // `c.list` publishes one entry for its first row and nothing else; a swap in front of it has
        // to end there rather than at the footer.
        A_TITLES[0] = 'first';
        ROW_LABELS[0] = 'X';
        ROW_LABELS[1] = 'Y';
        const swap = source<TStanding | null>(null);
        const CARD = swappingShell(
            buildTwo,
            (P) => P.swap,
            swap,
            (c, P) => {
                c.list(P.rows, ITEM, 2);
            }
        );
        const parent = host();
        EXO_BACKEND.render(CARD, parent);
        const card = parent.querySelector('.card') as HTMLElement;
        expect(card.innerHTML).toBe('<h3>headline</h3><i>X</i><i>Y</i><footer>footnote</footer>');

        swap.setValue(standing(PAGE_A, 0));
        expect(card.innerHTML).toBe(
            `<h3>headline</h3>${A('first')}<i>X</i><i>Y</i><footer>footnote</footer>`
        );
    });
});
