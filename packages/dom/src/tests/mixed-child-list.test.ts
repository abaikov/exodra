// @vitest-environment jsdom
//
// MANY COMPONENTS IN ONE PORT, EACH POSITION NAMING ITS OWN — a page assembled out of blocks, a
// feed of mixed card types, a form generated from a schema, a route with a variable number of
// panels.
//
// THIS IS THE ROW THAT COMPLETES THE CHILDREN TABLE, and it is worth stating what the other rows
// cannot do. `c.one` fixes one component for the life of the page. `c.list` fixes one component and
// a count when the wire runs: n instances of the SAME schema, which is what a table is and what a
// page of blocks is not. Neither can hold two different schemas side by side, and neither can be
// told later.
//
// AND IT IS NOT A CALL. `c.childList(port)` holds whatever `c.build(component, index)` hands it, so
// a position is not typed by a component and a port full of different schemas needs nothing the
// engine does not already have. What makes it a LIST is `reconcileExoOrder` from
// `@exodra/list-reconcile`, a layer over `build` and the placement door that reconciles by the
// IDENTITY OF THE ITEM OBJECT — so the item is where "which component stands here" lives, and the
// whole of this file's composition is one transition and one effect, `placingShell` below.
//
// IDENTITY, NOT FIELDS. The item object IS the row's identity: the same object published again is
// the same instance with its subscriptions still live, and a new object is a new instance. Nothing
// compares components, and nothing compares data — so two positions may hold the SAME component and
// be two instances, which is asserted below because the pair-shaped value this file used to publish
// could not express it at all.
//
// WHAT THIS FILE CANNOT ASSERT, said here rather than found later. `childList` is a door on
// `@exodra/dom` and `@exodra/term` only; `@exodra/string` has no placement command at all, so a
// heterogeneous child list has NO server expression, one component cannot drive both backends
// through one, and the byte-identity that makes an SSR'd page of blocks adoptable is unmeasurable
// from here until the server gets a placement door.
import { createExoMachineBuilder, createExoSchema, createExoStatic } from '@exodra/core';
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
import { reconcileExoOrder } from '@exodra/list-reconcile';
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

/** ONE POSITION'S WORTH OF A MIXED LIST: which component stands there, and which row of that
 *  component's data its instance reads. Props are gone — a wire is handed a NUMBER. */
type TStanding = {
    readonly component: TExoMachine<TExoChildrenWiring>;
    readonly index: number;
};

const standing = (component: TExoMachine<TExoChildrenWiring>, index = 0): TStanding => ({
    component,
    index,
});

type TBlockSource = {
    getValue(): readonly TStanding[];
    onChange(cb: () => void): () => void;
};

/** THE MIXED LIST, COMPOSED FROM THE DOORS IT IS MADE OF: the identity reconciler over a child
 *  list, with each item saying which component its position holds. `openRest` opens whatever else
 *  the instance holds, after the blocks' child list. */
const placingShell = <TPorts>(
    build: (b: TExoSchemaCursor) => TPorts,
    blocksOf: (ports: TPorts) => TExoChildrenPort,
    src: TBlockSource,
    openRest?: (c: TExoPlacing, ports: TPorts) => void
) => {
    const schema = createExoSchema(build);
    const m = createExoMachineBuilder<
        TExoMachineNode & TExoPlacing,
        unknown,
        { blocks: TExoPlacedChildren<TExoNode>; shown: TStanding[] }
    >(schema);
    m.createInitialState((c) => {
        const blocks = c.childList(blocksOf(schema.ports));
        if (openRest !== undefined) openRest(c, schema.ports);
        return { blocks, shown: [] };
    });
    const placeBlocks = m.transition((c) => {
        const want = src.getValue();
        c.state.shown = reconcileExoOrder(c.state.blocks, c.state.shown, want, want, (item) =>
            c.build(item.component, item.index)
        );
    });
    m.effect((c) => {
        placeBlocks(c);
        return src.onChange(() => placeBlocks(c));
    });
    return m.done();
};

/** What each block reads, BY INDEX: a wire is handed its position and nothing else, so the text a
 *  block shows is the caller's to put where the block can reach it. */
const A_TITLES: string[] = [];
const B_BODIES: string[] = [];
/** What a row in the neighbouring child list reads, by the same rule. */
const ROW_LABELS: string[] = [];

/** ONE BLOCK — `<section class="a"><h1>…</h1></section>`. */
const BLOCK_A = createExoTestMachine(
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
            c.text(P.title, A_TITLES[i]);
        }
);

/** ANOTHER BLOCK, a different shape as well as a different wire. */
const BLOCK_B = createExoTestMachine(
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

/**
 * A BLOCK WITH NO PORTS AT ALL — a separator, an icon, an empty state.
 *
 * It is in these cases on purpose and not for coverage. A static component has NOTHING to fill, so
 * its wire is the one shared `EXO_NO_WIRE` constant and its schema has zero ports; mixed into a
 * list beside components that do have ports, it is the position most likely to be mishandled by
 * anything that assumes every child has a wire to run or a slot to write.
 */
const BLOCK_C = createExoStatic((b) => {
    b.el('div', { class: 'c' }, (d) => d.text('divider'));
});

/** A block that SUBSCRIBES, so that "the position that left was disposed" is observable. */
const BOUND = source('alive');
const BLOCK_BOUND_SCHEMA = createExoSchema((b) => {
    let text!: TExoTextPort;
    b.el('aside', { class: 'bound' }, (s) => {
        text = s.textPort();
    });
    return { text };
});
const mBlockBound = createExoMachineBuilder<TExoMachineNode>(BLOCK_BOUND_SCHEMA);
const showBlockBound = mBlockBound.transition((c) => {
    c.text(BLOCK_BOUND_SCHEMA.ports.text, BOUND.getValue());
});
mBlockBound.effect((c) => {
    showBlockBound(c);
    return BOUND.onChange(() => showBlockBound(c));
});
const BLOCK_BOUND = mBlockBound.done() as unknown as TExoMachine<TExoChildrenWiring>;

/** What goes into the child list BESIDE a mixed list: one element carrying its own label. */
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

/** A port that OWNS its element — a page body, a feed container. */
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

/** TWO child lists side by side — a mixed list next to a homogeneous one. */
function buildTwo(b: TExoSchemaCursor) {
    let blocks!: TExoChildrenPort;
    let rows!: TExoChildrenPort;
    b.el('div', { class: 'card' }, (card) => {
        card.el('h3', null, (h) => h.text('headline'));
        blocks = card.childrenPort();
        rows = card.childrenPort();
        card.el('footer', null, (f) => f.text('footnote'));
    });
    return { blocks, rows };
}

/** The component under test: one children port, reconciled against one source of items. */
const shellWith = (src: TBlockSource, build = buildShell) =>
    placingShell(build, (P) => P.slot, src);

/** The markup of the three blocks, written once so the cases read as assertions. */
const A = (title: string): string => `<section class="a"><h1>${title}</h1></section>`;
const B = (body: string): string => `<article class="b"><p>${body}</p></article>`;
const C = '<div class="c">divider</div>';

describe('a mixed child list', () => {
    it('renders THREE DIFFERENT COMPONENTS in one port, in order', () => {
        // THE CASE THE WHOLE SHAPE EXISTS FOR. Three schemas, three wires, one port — and one of
        // them has no ports at all.
        A_TITLES[0] = 'primary';
        B_BODIES[0] = 'secondary';
        const src = source<readonly TStanding[]>([
            standing(BLOCK_A, 0),
            standing(BLOCK_B, 0),
            standing(BLOCK_C),
        ]);
        const parent = host();
        EXO_BACKEND.render(shellWith(src), parent);
        expect(parent.innerHTML).toBe(`<main>${A('primary')}${B('secondary')}${C}</main>`);
    });

    it('starts empty when the source starts empty, and fills afterwards', () => {
        // A list says "nothing here" by being EMPTY — there is no absent value to publish.
        B_BODIES[0] = 'later';
        const src = source<readonly TStanding[]>([]);
        const parent = host();
        EXO_BACKEND.render(shellWith(src), parent);
        expect(parent.innerHTML).toBe('<main></main>');

        src.setValue([standing(BLOCK_B, 0)]);
        expect(parent.innerHTML).toBe(`<main>${B('later')}</main>`);
    });

    it('holds the SAME component in two positions, as two instances with their own data', () => {
        // NOTHING KEYS A POSITION BY COMPONENT, so a page may show two separators, or two cards of
        // one kind, and each is its own instance reading its own row of the component's data. A
        // value keyed on the component-and-data pair made two identical positions one entry in an
        // index — two places asking for one child, which no engine can honour.
        A_TITLES[0] = 'left';
        A_TITLES[1] = 'right';
        const src = source<readonly TStanding[]>([
            standing(BLOCK_A, 0),
            standing(BLOCK_C),
            standing(BLOCK_A, 1),
            standing(BLOCK_C),
        ]);
        const parent = host();
        EXO_BACKEND.render(shellWith(src), parent);
        expect(parent.innerHTML).toBe(`<main>${A('left')}${C}${A('right')}${C}</main>`);
        expect(parent.querySelectorAll('section')).toHaveLength(2);
        expect(parent.querySelectorAll('.c')).toHaveLength(2);
    });

    it('KEEPS every child when the same items are published again in a fresh array', () => {
        // THE IDENTITY RULE, ASSERTED. The array is rebuilt on every read by any source that derives
        // it, so it cannot be the identity; the ITEMS are, and a survivor keeps its DOM, its
        // listeners and anything focused inside it. Nothing compares a component or a number here.
        A_TITLES[0] = 'primary';
        B_BODIES[0] = 'secondary';
        const first = standing(BLOCK_A, 0);
        const second = standing(BLOCK_B, 0);
        const src = source<readonly TStanding[]>([first, second]);
        const parent = host();
        EXO_BACKEND.render(shellWith(src), parent);
        const a = parent.querySelector('section');
        const b = parent.querySelector('article');

        src.setValue([first, second]);
        expect(parent.querySelector('section')).toBe(a);
        expect(parent.querySelector('article')).toBe(b);
    });

    it('REBUILDS one position when a new item takes it, and leaves its neighbours alone', () => {
        // The other half of the identity rule. A wire runs ONCE, when its instance is built, and
        // reads its data by the number it was handed — so a position showing another row of the same
        // component's data is a new instance, and only that position is touched.
        A_TITLES[0] = 'primary';
        B_BODIES[0] = 'secondary';
        B_BODIES[1] = 'other';
        const first = standing(BLOCK_A, 0);
        const src = source<readonly TStanding[]>([first, standing(BLOCK_B, 0)]);
        const parent = host();
        EXO_BACKEND.render(shellWith(src), parent);
        const a = parent.querySelector('section');
        const b = parent.querySelector('article');

        src.setValue([first, standing(BLOCK_B, 1)]);
        expect(parent.innerHTML).toBe(`<main>${A('primary')}${B('other')}</main>`);
        expect(parent.querySelector('section')).toBe(a);
        expect(parent.querySelector('article')).not.toBe(b);
    });

    it('lets ONE POSITION change which component it holds, and touches no other', () => {
        // THE CASE THAT ONLY EXISTS IN A MIXED LIST, and the one a list keyed on the DATA alone gets
        // wrong: the outgoing and incoming positions show the identical string, so nothing but the
        // component tells them apart, and a reconciler that called the position unchanged would
        // leave a `<section>` standing where an `<article>` belongs — a page that renders without an
        // error and shows the wrong block.
        A_TITLES[0] = 'shared';
        B_BODIES[0] = 'shared';
        B_BODIES[1] = 'neighbour';
        const neighbour = standing(BLOCK_B, 1);
        const src = source<readonly TStanding[]>([standing(BLOCK_A, 0), neighbour]);
        const parent = host();
        EXO_BACKEND.render(shellWith(src), parent);
        expect(parent.innerHTML).toBe(`<main>${A('shared')}${B('neighbour')}</main>`);
        const kept = parent.querySelector('article');

        src.setValue([standing(BLOCK_B, 0), neighbour]);
        expect(parent.innerHTML).toBe(`<main>${B('shared')}${B('neighbour')}</main>`);
        expect(parent.querySelectorAll('section')).toHaveLength(0);
        // The position that did not change kept its child, which is what says the rebuild was scoped
        // to the position whose component moved.
        expect(parent.querySelectorAll('article')[1]).toBe(kept);
    });

    it('REORDERING moves the very same children rather than rebuilding them', () => {
        // POSITION IS NOT PART OF THE IDENTITY, which is the whole reason a reorder is cheap: an
        // item that moves keeps the child it had and the child list moves one node. Asserted by node
        // IDENTITY, because a rebuilt list looks identical as markup and is not the same page —
        // every listener would be on a different element.
        A_TITLES[0] = 'one';
        A_TITLES[1] = 'three';
        B_BODIES[0] = 'two';
        const one = standing(BLOCK_A, 0);
        const two = standing(BLOCK_B, 0);
        const three = standing(BLOCK_A, 1);
        const src = source<readonly TStanding[]>([one, two, three]);
        const parent = host();
        EXO_BACKEND.render(shellWith(src), parent);
        expect(parent.innerHTML).toBe(`<main>${A('one')}${B('two')}${A('three')}</main>`);
        const nodes = Array.from(parent.querySelectorAll('main > *'));

        src.setValue([three, one, two]);
        expect(parent.innerHTML).toBe(`<main>${A('three')}${A('one')}${B('two')}</main>`);
        // `toBe` per position and never `toEqual` on the array: two distinct elements with the same
        // structure compare EQUAL structurally, so a rebuilt list would pass a deep comparison —
        // which is exactly the outcome this case exists to catch.
        const after = parent.querySelectorAll('main > *');
        expect(after[0]).toBe(nodes[2]);
        expect(after[1]).toBe(nodes[0]);
        expect(after[2]).toBe(nodes[1]);
    });

    it('DISPOSES a position that leaves — its subscriptions end', () => {
        // WHAT LEAVING MEANS, asserted rather than described. `remove` runs the child's `unmount`,
        // which is what ends its subscriptions. Miss this and every block a page has ever shown
        // keeps its bindings alive, holding the detached elements they write to — a leak nothing
        // reports until the page has been used a while.
        A_TITLES[0] = 'primary';
        const kept = standing(BLOCK_A, 0);
        const src = source<readonly TStanding[]>([kept, standing(BLOCK_BOUND, 0)]);
        const parent = host();
        EXO_BACKEND.render(shellWith(src), parent);
        expect(BOUND.subscribers()).toBe(1);

        src.setValue([kept]);
        expect(BOUND.subscribers()).toBe(0);
        expect(parent.querySelector('aside')).toBe(null);
    });

    it("ends the list's OWN subscription, and unmounts the survivors, when the render is disposed", () => {
        // A survivor is never dropped by the reconciler — nothing happened to it — so the blocks
        // still standing when the render goes away are ended by `openChildList`'s own teardown, and
        // the subscription the composition's effect took goes with them.
        const src = source<readonly TStanding[]>([standing(BLOCK_BOUND, 0)]);
        const parent = host();
        const dispose = EXO_BACKEND.render(shellWith(src), parent);
        expect(src.subscribers()).toBe(1);
        expect(BOUND.subscribers()).toBe(1);

        dispose();
        expect(src.subscribers()).toBe(0);
        expect(BOUND.subscribers()).toBe(0);
    });
});

describe('a mixed child list among static siblings', () => {
    it('puts its blocks BETWEEN the statics, and takes them out without disturbing them', () => {
        // A children port may stand between a heading and a footer, so a list that appended would
        // put its blocks after the footer. Plausible enough in the markup that only an ordering
        // assertion catches it. The emptying is the other path: a port among statics may not reach
        // for the parent's contents, so it takes out exactly the children it holds.
        A_TITLES[0] = 'between';
        const src = source<readonly TStanding[]>([]);
        const parent = host();
        EXO_BACKEND.render(shellWith(src, buildCard), parent);
        const card = parent.querySelector('.card') as HTMLElement;
        expect(card.innerHTML).toBe('<h3>headline</h3><footer>footnote</footer>');

        src.setValue([standing(BLOCK_A, 0), standing(BLOCK_C)]);
        expect(card.innerHTML).toBe(
            `<h3>headline</h3>${A('between')}${C}<footer>footnote</footer>`
        );

        src.setValue([standing(BLOCK_C)]);
        expect(card.innerHTML).toBe(`<h3>headline</h3>${C}<footer>footnote</footer>`);

        src.setValue([]);
        expect(card.innerHTML).toBe('<h3>headline</h3><footer>footnote</footer>');
    });
});

describe('a mixed child list next to another child list', () => {
    /** A mixed list and a commanded list of rows side by side, statics outside them. */
    const mountTwo = () => {
        const blocks = source<readonly TStanding[]>([]);
        let node!: TExoPlacing;
        let rows!: TExoPlacedChildren<TExoNode>;
        const CARD = placingShell(
            buildTwo,
            (P) => P.blocks,
            blocks,
            (c, P) => {
                node = c;
                rows = c.childList(P.rows);
            }
        );
        const parent = host();
        EXO_BACKEND.render(CARD, parent);
        return { blocks, node, rows, card: parent.querySelector('.card') as HTMLElement };
    };

    it('the blocks fill FIRST and the rows after them — the blocks stay in front', () => {
        // THE CASE THIS DESCRIBE EXISTS FOR. Two empty child lists have NO node between them, so a
        // child list resolves its end by asking the next one for its first node — and a child list
        // that never PUBLISHED looks empty, so the walk steps over it and anchors on the footer. A
        // mixed list found in that hole renders without an error and shows a wrong tree.
        A_TITLES[0] = 'primary';
        ROW_LABELS[0] = 'A';
        const { blocks, node, rows, card } = mountTwo();
        blocks.setValue([standing(BLOCK_A, 0)]);
        rows.insert(node.build(ITEM, 0));
        expect(card.innerHTML).toBe(
            `<h3>headline</h3>${A('primary')}<i>A</i><footer>footnote</footer>`
        );
    });

    it('the ROWS fill first and the blocks after them — the blocks still land in front', () => {
        // The direction that fails when the mixed list does not consult the chain: with rows already
        // there, "insert before the footer" puts the blocks behind them.
        A_TITLES[0] = 'primary';
        ROW_LABELS[0] = 'A';
        ROW_LABELS[1] = 'B';
        const { blocks, node, rows, card } = mountTwo();
        rows.insert(node.build(ITEM, 0));
        rows.insert(node.build(ITEM, 1));
        blocks.setValue([standing(BLOCK_A, 0), standing(BLOCK_C)]);
        expect(card.innerHTML).toBe(
            `<h3>headline</h3>${A('primary')}${C}<i>A</i><i>B</i><footer>footnote</footer>`
        );
    });

    it('emptying the blocks leaves the rows exactly where they were, and they can still grow', () => {
        A_TITLES[0] = 'primary';
        ROW_LABELS[0] = 'A';
        ROW_LABELS[1] = 'B';
        const { blocks, node, rows, card } = mountTwo();
        blocks.setValue([standing(BLOCK_A, 0)]);
        rows.insert(node.build(ITEM, 0));
        blocks.setValue([]);
        expect(card.innerHTML).toBe('<h3>headline</h3><i>A</i><footer>footnote</footer>');
        // The blocks' published order is emptied IN PLACE and never replaced, so the rows' own
        // anchoring still reads the live array rather than a wiring-time snapshot.
        rows.insert(node.build(ITEM, 1));
        expect(card.innerHTML).toBe('<h3>headline</h3><i>A</i><i>B</i><footer>footnote</footer>');
    });

    it("a mixed list in front of a FIXED list anchors on the fixed list's first row", () => {
        // `c.list` publishes one entry for its first row and nothing else; the child list in front of
        // it has to end there rather than at the footer.
        A_TITLES[0] = 'primary';
        ROW_LABELS[0] = 'X';
        ROW_LABELS[1] = 'Y';
        const blocks = source<readonly TStanding[]>([]);
        const CARD = placingShell(
            buildTwo,
            (P) => P.blocks,
            blocks,
            (c, P) => {
                c.list(P.rows, ITEM, 2);
            }
        );
        const parent = host();
        EXO_BACKEND.render(CARD, parent);
        const card = parent.querySelector('.card') as HTMLElement;
        expect(card.innerHTML).toBe('<h3>headline</h3><i>X</i><i>Y</i><footer>footnote</footer>');

        blocks.setValue([standing(BLOCK_A, 0)]);
        expect(card.innerHTML).toBe(
            `<h3>headline</h3>${A('primary')}<i>X</i><i>Y</i><footer>footnote</footer>`
        );
    });
});
