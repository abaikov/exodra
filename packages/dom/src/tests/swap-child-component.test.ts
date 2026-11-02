// @vitest-environment jsdom
//
// ONE POSITION, AND WHICH COMPONENT STANDS IN IT OVER TIME — a tab, a modal, a route.
//
// THERE IS NO DOOR FOR THIS, and the absence is the design. A position is not typed by a component:
// `c.childList(port)` holds whatever `c.build(component, params)` hands it, so "show B where A
// stood" is `slot.remove(0)` followed by `slot.insert(c.build(B, params))` — two commands over the two
// doors a fixed list already uses, with no reconciler, no registry and no component-keyed table
// anywhere in the engine. `swappingShell` below is the whole of what a renderer-side call would have
// been: the two commands, an identity compare so an unrelated notification changes nothing, and one
// effect that follows the source.
//
// PROPS ARE GONE, so "which component" is only half of what a position needs. An instance is handed
// its params once, when it is built, so what a source publishes here is a component and the params
// its instance should be built with — `standing(PAGE_A, 'title')` and not a props value.
//
// WHAT THIS FILE CANNOT ASSERT, said here rather than found later. `childList` is a door on
// `@exodra/dom` and `@exodra/term` only; `@exodra/string` has no placement command at all, so a
// swap has NO server expression, one component cannot drive both backends through one, and the
// byte-identity that makes an SSR'd router page adoptable is unmeasurable from here until the
// server gets a placement door.
import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoEffects,
    createExoSchema,
} from '@exodra/core';
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

/** WHICH COMPONENT STANDS THERE, AND THE TEXT ITS INSTANCE IS HANDED AS PARAMS. */
type TStanding = {
    readonly component: TExoMachine<TExoChildrenWiring>;
    readonly text: string;
};

const standing = (component: TExoMachine<TExoChildrenWiring>, text = ''): TStanding => ({
    component,
    text,
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
    const m = createExoMachine<
        TExoMachineNode & TExoPlacing,
        unknown,
        { slot: TExoPlacedChildren<TExoNode>; shown: TStanding | null }
    >(schema, {
        createInitialState: (c) => {
            const slot = c.childList(slotOf(schema.ports));
            if (openRest !== undefined) openRest(c, schema.ports);
            return { slot, shown: null };
        },
    });
    const machine = composeExoMachine(
        m,
        (m) =>
            withExoTransitions(m, {
                swap: (c) => {
                    const state = c.state;
                    const want = src.getValue();
                    if (want === state.shown) return;
                    if (state.shown !== null) state.slot.remove(0);
                    state.shown = want;
                    if (want !== null) state.slot.insert(c.build(want.component, want.text));
                },
            }),
        (m) =>
            withExoEffects(m, (effect) => {
                effect((c) => {
                    swap(c);
                    return src.onChange(() => swap(c));
                });
            })
    );
    const { swap } = machine.transitions;
    return machine;
};

/** Every params value `PAGE_A` was handed, in build order. */
const A_WIRED: unknown[] = [];

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
        (c, title) => {
            A_WIRED.push(title);
            c.text(P.title, title);
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
        (c, body) => {
            c.text(P.body, body);
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
const PAGE_BOUND_MACHINE = composeExoMachine(
    createExoMachine<TExoMachineNode>(PAGE_BOUND_SCHEMA),
    (m) =>
        withExoTransitions(m, {
            showPageBound: (c) => {
                c.text(PAGE_BOUND_SCHEMA.ports.text, BOUND.getValue());
            },
        }),
    (m) =>
        withExoEffects(m, (effect) => {
            effect((c) => {
                showPageBound(c);
                return BOUND.onChange(() => showPageBound(c));
            });
        })
);
const { showPageBound } = PAGE_BOUND_MACHINE.transitions;
const PAGE_BOUND = PAGE_BOUND_MACHINE as unknown as TExoMachine<TExoChildrenWiring>;

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
        (c, label) => {
            c.text(P.label, label);
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
        const src = source<TStanding | null>(standing(PAGE_A, 'first'));
        const parent = host();
        EXO_BACKEND.render(shellWith(src), parent);
        expect(parent.innerHTML).toBe(`<main>${A('first')}</main>`);

        src.setValue(standing(PAGE_B, 'second'));
        expect(parent.innerHTML).toBe(`<main>${B('second')}</main>`);

        src.setValue(standing(PAGE_A, 'again'));
        expect(parent.innerHTML).toBe(`<main>${A('again')}</main>`);
    });

    it('empties the position on null, and fills it again afterwards', () => {
        const src = source<TStanding | null>(standing(PAGE_A, 'present'));
        const parent = host();
        EXO_BACKEND.render(shellWith(src), parent);

        src.setValue(null);
        expect(parent.innerHTML).toBe('<main></main>');

        src.setValue(standing(PAGE_B, 'again'));
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
        const held = standing(PAGE_A, 'same');
        const src = source<TStanding | null>(held);
        const parent = host();
        EXO_BACKEND.render(shellWith(src), parent);
        const first = parent.querySelector('section');

        src.setValue(held);
        expect(parent.querySelector('section')).toBe(first);
    });

    it('rebuilds when the PARAMS change under the same component', () => {
        // An initial state runs ONCE, when its instance is built, and reads the params it was
        // handed. So a position that must show other data of the same component is a new
        // instance — and the params the new instance is handed are the ones the caller named.
        A_WIRED.length = 0;
        const src = source<TStanding | null>(standing(PAGE_A, 'primary'));
        const parent = host();
        EXO_BACKEND.render(shellWith(src), parent);
        const first = parent.querySelector('section');

        src.setValue(standing(PAGE_A, 'secondary'));
        expect(parent.querySelector('section')).not.toBe(first);
        expect(parent.innerHTML).toBe(`<main>${A('secondary')}</main>`);
        expect(A_WIRED).toEqual(['primary', 'secondary']);
    });

    it('DISPOSES the outgoing instance — its subscriptions end when it leaves', () => {
        // WHAT REPLACING MEANS, asserted rather than described. `remove` runs the child's `unmount`,
        // which is what ends its subscriptions. Miss this and every tab a user has ever opened keeps
        // its bindings alive, holding the detached elements they write to — a leak nothing reports
        // until the page has been used a while.
        const src = source<TStanding | null>(standing(PAGE_BOUND));
        const parent = host();
        EXO_BACKEND.render(shellWith(src), parent);
        expect(BOUND.subscribers()).toBe(1);

        src.setValue(standing(PAGE_A, 'another'));
        expect(BOUND.subscribers()).toBe(0);

        src.setValue(standing(PAGE_BOUND));
        expect(BOUND.subscribers()).toBe(1);

        src.setValue(null);
        expect(BOUND.subscribers()).toBe(0);
    });

    it("ends the swap's OWN subscription when the render is disposed, and unmounts the survivor", () => {
        // TWO DISPOSERS. The subscription is the composition's effect, stopped with the instance;
        // the instance still standing is nobody's survivor to drop — the swap was
        // never told anything happened — so it is `openChildList`'s own teardown that unmounts it.
        const src = source<TStanding | null>(standing(PAGE_BOUND));
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
        const src = source<TStanding | null>(null);
        const parent = host();
        EXO_BACKEND.render(shellWith(src, buildCard), parent);
        const card = parent.querySelector('.card') as HTMLElement;
        expect(card.innerHTML).toBe('<h3>headline</h3><footer>footnote</footer>');

        src.setValue(standing(PAGE_A, 'between'));
        expect(card.innerHTML).toBe(`<h3>headline</h3>${A('between')}<footer>footnote</footer>`);

        src.setValue(standing(PAGE_B, 'more'));
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
        const { swap, node, rows, card } = mountTwo();
        swap.setValue(standing(PAGE_A, 'first'));
        rows.insert(node.build(ITEM, 'A'));
        expect(card.innerHTML).toBe(
            `<h3>headline</h3>${A('first')}<i>A</i><footer>footnote</footer>`
        );
    });

    it('the ROWS fill first and the swap after them — the swap still lands in front of them', () => {
        // The direction that fails when the swap does not consult the chain: with rows already
        // there, "insert before the footer" puts the page behind them.
        const { swap, node, rows, card } = mountTwo();
        rows.insert(node.build(ITEM, 'A'));
        rows.insert(node.build(ITEM, 'B'));
        swap.setValue(standing(PAGE_A, 'first'));
        expect(card.innerHTML).toBe(
            `<h3>headline</h3>${A('first')}<i>A</i><i>B</i><footer>footnote</footer>`
        );
    });

    it('emptying the swap leaves the rows exactly where they were, and they can still grow', () => {
        const { swap, node, rows, card } = mountTwo();
        swap.setValue(standing(PAGE_A, 'first'));
        rows.insert(node.build(ITEM, 'A'));
        swap.setValue(null);
        expect(card.innerHTML).toBe('<h3>headline</h3><i>A</i><footer>footnote</footer>');
        // The swap's published order is emptied IN PLACE and never replaced, so the rows' own
        // anchoring still reads the live array rather than a wiring-time snapshot.
        rows.insert(node.build(ITEM, 'B'));
        expect(card.innerHTML).toBe('<h3>headline</h3><i>A</i><i>B</i><footer>footnote</footer>');
    });

    it("a swap in front of a FIXED list anchors on the fixed list's first row", () => {
        // `c.list` publishes one entry for its first row and nothing else; a swap in front of it has
        // to end there rather than at the footer.
        const swap = source<TStanding | null>(null);
        const CARD = swappingShell(
            buildTwo,
            (P) => P.swap,
            swap,
            (c, P) => {
                c.list(P.rows, ITEM, ['X', 'Y']);
            }
        );
        const parent = host();
        EXO_BACKEND.render(CARD, parent);
        const card = parent.querySelector('.card') as HTMLElement;
        expect(card.innerHTML).toBe('<h3>headline</h3><i>X</i><i>Y</i><footer>footnote</footer>');

        swap.setValue(standing(PAGE_A, 'first'));
        expect(card.innerHTML).toBe(
            `<h3>headline</h3>${A('first')}<i>X</i><i>Y</i><footer>footnote</footer>`
        );
    });
});
