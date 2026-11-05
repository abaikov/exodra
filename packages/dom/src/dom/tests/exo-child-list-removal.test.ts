// @vitest-environment jsdom
//
// EVERY WAY A CHILD LEAVES A CHILDREN PORT, and the two nodes that bound the port it leaves.
//
// `make-exo-child-list.test.ts` owns the arriving half of a port's child list — `insert`, `move`,
// `attach`, `detach`, `detachAll`. This file owns the half that DISPOSES: `remove`, `removeAll`,
// the render's own teardown, and the one override that turns a departure back into a detachment.
// Following a source is `reconcile-exo-order.test.ts`'s subject; nothing here watches anything.
import type {
    TExoAttrPort,
    TExoChildrenPort,
    TExoNode,
    TExoTextPort,
    TExoMachineInitialState,
} from '@exodra/core';
import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoWire,
    withExoEffects,
    createExoSchema,
    wireExoNode,
} from '@exodra/core';
import { describe, expect, it } from 'vitest';

import { host, source, createExoTestMachine } from '@exodra/test-utils';
import type { TExoTestSource } from '@exodra/test-utils';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import { exoNodeDom } from '../exoNodeDom';
import type { TExoDomNode, TExoDomPhaseSeams } from '../EXO_DOM_NODE_VOCABULARY';
import type { TExoChildList } from '../types/TExoChildList';
import type { TExoDomMark } from '../types/TExoDomMark';
import type { TExoDomPortChildList } from '../types/TExoDomPortChildList';

const EXO_BACKEND = withExoCompiler(new ExoDomBackend());

const ROW = createExoTestMachine(
    (b) => {
        let id!: TExoAttrPort;
        b.el('li', null, (li) => {
            id = li.port('data-id');
        });
        return { id };
    },
    (P): TExoMachineInitialState<TExoDomNode> =>
        (c, id) => {
            c.attr(P.id, id);
        }
);

/**
 * The same row, SUBSCRIBED — the disposal cases need a live subscription to count.
 *
 * The subscription is on the TEXT and `data-id` stays the row's own. Binding `data-id` is the
 * shorter row and makes every bound child in the file show one shared value, after which no
 * assertion can tell one row from another or one order from any other order.
 */
const BOUND_ROW_SCHEMA = createExoSchema((b) => {
    let id!: TExoAttrPort;
    let label!: TExoTextPort;
    b.el('li', null, (li) => {
        id = li.port('data-id');
        label = li.textPort();
    });
    return { id, label };
});

const boundRow = (value: TExoTestSource<string>) => {
    const m = createExoMachine<TExoDomNode, string, { id: string }>(BOUND_ROW_SCHEMA, {
        createInitialState: (_c, id) => ({ id }),
    });
    const machine = composeExoMachine(
        m,
        (m) =>
            withExoTransitions(m, {
                show: (c) => {
                    c.text(BOUND_ROW_SCHEMA.ports.label, value.getValue());
                },
            }),
        (m) =>
            withExoWire(m, (c) => {
                c.attr(BOUND_ROW_SCHEMA.ports.id, c.state.id);
            }),
        (m) => {
            const { show } = m.transitions;
            return withExoEffects(m, (effect) => {
                effect((c) => {
                    show(c);
                    return value.onChange(() => show(c));
                });
            });
        }
    );
    return machine;
};

type TBoundRow = ReturnType<typeof boundRow>;

/**
 * A `<ul>` whose ONE child is a children port, so `TExoDomSchema.ownsElement` is 1 for it and
 * `removeAll` is entitled to the one-call clear.
 *
 * The exonode and the port are held past the wire so the anchor cases can ask the exonode again
 * rather than re-reading a variable captured once — which is a claim about nothing. That is legal
 * for a ROOT record: `createExoNode` writes `nodes` into the holder and nothing clears it.
 */
const mountOwned = () => {
    let exonode!: TExoDomNode & TExoDomPhaseSeams;
    let kids!: TExoChildList;
    let port!: TExoChildrenPort;
    const LIST = createExoTestMachine(
        (b) => {
            let rows!: TExoChildrenPort;
            b.el('ul', null, (ul) => {
                rows = ul.childrenPort();
            });
            return { rows };
        },
        (P): TExoMachineInitialState<TExoDomNode> =>
            (c) => {
                // CAST ON PURPOSE: the anchor cases interrogate a SEAM, which a wire’s surface hides.
                exonode = c as TExoDomNode & TExoDomPhaseSeams;
                port = P.rows;
                kids = (c as TExoDomNode & TExoDomPortChildList).portChildList(P.rows);
            }
    );
    const parent = host();
    const dispose = EXO_BACKEND.render(LIST, parent);
    const ul = parent.querySelector('ul') as HTMLElement;
    return {
        dispose,
        ul,
        kids,
        startAnchor: (): Node | null => exonode.childListStartNode(port),
        build: (id: string): TExoNode<TExoDomMark> => wireExoNode(exonode.createExoNode(ROW), id),
        boundBuild: (component: TBoundRow, id: string): TExoNode<TExoDomMark> =>
            wireExoNode(exonode.createExoNode(component), id),
        shown: (): string =>
            Array.from(ul.children)
                .map((el) => el.getAttribute('data-id'))
                .join(','),
    };
};

/**
 * `<div><h3/>{port}<footer/></div>` — a children port SHARING its element with two statics, which
 * is the shape every conditional block in a real component has. `ownsElement` is 0, so the only
 * thing standing between a heading and a clear that empties the parent is which shell ran.
 */
const mountShared = () => {
    let exonode!: TExoDomNode & TExoDomPhaseSeams;
    let kids!: TExoChildList;
    let port!: TExoChildrenPort;
    const PANEL = createExoTestMachine(
        (b) => {
            let rows!: TExoChildrenPort;
            b.el('div', null, (root) => {
                root.el('h3', null, (h3) => h3.text('head'));
                rows = root.childrenPort();
                root.el('footer', null, (f) => f.text('foot'));
            });
            return { rows };
        },
        (P): TExoMachineInitialState<TExoDomNode> =>
            (c) => {
                // CAST ON PURPOSE: the anchor cases interrogate a SEAM, which a wire’s surface hides.
                exonode = c as TExoDomNode & TExoDomPhaseSeams;
                port = P.rows;
                kids = (c as TExoDomNode & TExoDomPortChildList).portChildList(P.rows);
            }
    );
    const parent = host();
    const dispose = EXO_BACKEND.render(PANEL, parent);
    const div = parent.querySelector('div') as HTMLElement;
    return {
        dispose,
        div,
        kids,
        startAnchor: (): Node | null => exonode.childListStartNode(port),
        endAnchor: (): Node | null | (() => Node | null) => exonode.childListEndNode(port),
        build: (id: string): TExoNode<TExoDomMark> => wireExoNode(exonode.createExoNode(ROW), id),
        tags: (): string[] => Array.from(div.children).map((el) => el.tagName),
    };
};

/** The element behind a child, through the one accessor that is public. */
const nodeOf = (child: TExoNode<TExoDomMark>): Element => exoNodeDom(child).node;

describe('a child list refuses what it did not build', () => {
    it('names `c.createExoNode` at the call that was made, for both placements', () => {
        // The one mistake this API can still be made to commit: a hand-made element, which carries
        // no lifecycle and therefore cannot be unmounted. It fails where it happens rather than
        // somewhere inside a placement, as `insertBefore: parameter 1 is not of type 'Node'`.
        const list = mountOwned();
        const stranger = document.createElement('li') as unknown as TExoNode<TExoDomMark>;
        expect(() => list.kids.insert(stranger)).toThrow(/not made by c\.createExoNode/);
        expect(() => list.kids.attach(stranger)).toThrow(/not made by c\.createExoNode/);
        expect(list.ul.childNodes.length).toBe(0);
    });
});

describe('remove — a child decides what leaving means', () => {
    it('a child whose unmount keeps its wiring is re-inserted without being rebuilt', () => {
        // THE CASE THE WHOLE SPLIT EXISTS FOR. A hidden block that will come back keeps its
        // subscriptions and its wiring; the child list contains no word about caching, and the
        // child's own `unmount` is the only place the policy is written.
        const value = source('x');
        const list = mountOwned();
        const BOUND = boundRow(value);
        const a = list.boundBuild(BOUND, 'a');
        const keeper = list.boundBuild(BOUND, 'keeper');
        exoNodeDom(keeper).unmount = (): void => undefined;
        list.kids.insert(a);
        list.kids.insert(keeper);
        expect(list.shown()).toBe('a,keeper');
        expect(value.subscribers()).toBe(2);

        list.kids.remove(1);
        // Out of the tree, still wired.
        expect(nodeOf(keeper).parentNode).toBeNull();
        expect(value.subscribers()).toBe(2);

        list.kids.insert(keeper);
        // The very same element, back where it belongs, and nothing was built to bring it back.
        expect(list.ul.children[1]).toBe(nodeOf(keeper));
        expect(value.subscribers()).toBe(2);
    });

    it('an ordinary child is disposed on the way out', () => {
        const value = source('x');
        const list = mountOwned();
        const BOUND = boundRow(value);
        list.kids.insert(list.boundBuild(BOUND, 'a'));
        list.kids.insert(list.boundBuild(BOUND, 'b'));
        expect(value.subscribers()).toBe(2);

        list.kids.remove(1);
        expect(value.subscribers()).toBe(1);
        expect(list.shown()).toBe('a');
    });

    it('`mount` runs once the child is in the tree, `unmount` while it still is', () => {
        const list = mountOwned();
        const child = list.build('a');
        const seen: string[] = [];
        const nodeDom = exoNodeDom(child);
        nodeDom.mount = (): void => {
            seen.push('mount:' + String(nodeOf(child).parentNode !== null));
        };
        nodeDom.unmount = (): void => {
            seen.push('unmount:' + String(nodeOf(child).parentNode !== null));
        };
        list.kids.insert(child);
        list.kids.remove(0);
        expect(seen).toEqual(['mount:true', 'unmount:true']);
    });

    it('every surviving child is unmounted when the whole render is disposed', () => {
        // `openChildList` files one disposer with the instance, so a child placed by hand is still
        // told the page is going away. It TELLS and does not detach: the document is being
        // discarded, and `unmount` is entitled to find its node attached.
        const value = source('x');
        const list = mountOwned();
        const BOUND = boundRow(value);
        list.kids.insert(list.boundBuild(BOUND, 'a'));
        list.kids.insert(list.boundBuild(BOUND, 'b'));
        expect(value.subscribers()).toBe(2);

        list.dispose();
        expect(value.subscribers()).toBe(0);
    });
});

/**
 * A FULL CLEAR — every child of a child list leaving at once. A tab hidden, a route left, a filter
 * that matched nothing, "show less".
 *
 * Where the port owns its element the removals collapse into one assignment on the parent, and that
 * is a change to HOW the children leave, not to WHETHER they do. So these cases are written against
 * the outcome and name no call: every child out of the tree, every child's `unmount` run, the
 * parent holding nothing, and the child list refilling afterwards as if nothing had happened. The
 * last one decides whether the ownership question was read correctly.
 */
describe('removeAll — a full clear', () => {
    it('takes every child out, unmounts every child, and leaves the parent empty', () => {
        const value = source('x');
        const list = mountOwned();
        const BOUND = boundRow(value);
        const kids = ['a', 'b', 'c'].map((id) => list.boundBuild(BOUND, id));
        for (const child of kids) list.kids.insert(child);
        expect(list.shown()).toBe('a,b,c');
        expect(value.subscribers()).toBe(3);

        list.kids.removeAll();

        // NODES AND NOT MERELY ELEMENTS: "leaves nothing behind" is a claim about `childNodes`, and
        // it is the one a per-child removal loop cannot make about anything it did not put there.
        expect(list.ul.childNodes.length).toBe(0);
        expect(value.subscribers()).toBe(0);
        expect(list.kids.size).toBe(0);
        for (const child of kids) expect(nodeOf(child).parentNode).toBeNull();
    });

    it('runs every `unmount` while the WHOLE child list is still in the document', () => {
        const list = mountOwned();
        const kids = ['a', 'b', 'c'].map((id) => list.build(id));
        // What each child could see when it was told it was leaving. `unmount` is a public
        // extension point and an override may read the tree, so the guarantee is not "your own node
        // is still attached" but "the child list is still here" — which is stronger than what
        // removing child by child could offer, where the third child saw the first two gone.
        const seen: string[] = [];
        for (const child of kids) {
            exoNodeDom(child).unmount = (): void => {
                seen.push(String(list.ul.children.length));
            };
        }
        for (const child of kids) list.kids.insert(child);

        list.kids.removeAll();

        expect(seen).toEqual(['3', '3', '3']);
        expect(list.ul.childNodes.length).toBe(0);
    });

    it('refills after a full clear, in order, with nothing left over', () => {
        const list = mountOwned();
        for (const id of ['a', 'b']) list.kids.insert(list.build(id));
        list.kids.removeAll();
        for (const id of ['c', 'd', 'e']) list.kids.insert(list.build(id));

        expect(list.shown()).toBe('c,d,e');
        expect(list.ul.childNodes.length).toBe(3);
        expect(list.kids.size).toBe(3);
    });

    it('a child that means to survive the clear is detached and still wired', () => {
        // THE OVERRIDE THAT MAKES A CLEAR A CACHE, and what the `toggle` benchmark's kept row is
        // built on. A clear must detach such a child exactly as a one-by-one removal does — removal
        // is the LIST's business, never the child's — and must not end anything it kept.
        const value = source('x');
        const list = mountOwned();
        const BOUND = boundRow(value);
        const kids = ['a', 'b'].map((id) => list.boundBuild(BOUND, id));
        for (const child of kids) exoNodeDom(child).unmount = (): void => undefined;
        for (const child of kids) list.kids.insert(child);
        expect(value.subscribers()).toBe(2);

        list.kids.removeAll();
        expect(list.ul.childNodes.length).toBe(0);
        for (const child of kids) expect(nodeOf(child).parentNode).toBeNull();
        expect(value.subscribers()).toBe(2);

        for (const child of kids) list.kids.insert(child);
        expect(list.ul.children[0]).toBe(nodeOf(kids[0]));
        expect(list.ul.children[1]).toBe(nodeOf(kids[1]));
        expect(value.subscribers()).toBe(2);
    });

    it('a child list among STATIC SIBLINGS leaves the siblings standing', () => {
        // THE CASE THAT DECIDES WHETHER THE OWNERSHIP CONDITION WAS READ CORRECTLY. This port does
        // not own its element — a heading stands in front of it and a footer behind — so emptying
        // the parent would take both, and the page would lose two elements no caller mentioned.
        const panel = mountShared();
        const kids = ['a', 'b'].map((id) => panel.build(id));
        for (const child of kids) panel.kids.insert(child);
        expect(panel.tags()).toEqual(['H3', 'LI', 'LI', 'FOOTER']);

        panel.kids.removeAll();

        expect(panel.tags()).toEqual(['H3', 'FOOTER']);
        expect(panel.div.children[0].textContent).toBe('head');
        expect(panel.div.children[1].textContent).toBe('foot');
        for (const child of kids) expect(nodeOf(child).parentNode).toBeNull();

        // And the emptied child list still knows where it is: a refill goes BETWEEN the two, not
        // after the footer.
        panel.kids.insert(panel.build('c'));
        expect(panel.tags()).toEqual(['H3', 'LI', 'FOOTER']);
    });

    it('is a no-op on an empty child list, down to touching the document at all', () => {
        // A hide handler that does not know whether the block is already hidden calls this. With
        // children present the owned path's one assignment would take the stray node below — that
        // is the stated difference and the better answer for an owned element — so what is asserted
        // is that the early return really is early.
        const list = mountOwned();
        const stray = document.createElement('i');
        list.ul.appendChild(stray);

        list.kids.removeAll();

        expect(list.kids.size).toBe(0);
        expect(stray.parentNode).toBe(list.ul);
    });
});

/**
 * THE TWO BOUNDARIES OF A CHILD LIST, AS THE EXONODE RESOLVES THEM — the node the children go
 * BEFORE and the node they come AFTER, both exclusive, so an empty child list still has them.
 *
 * `TExoChildList` reads only the end one; the start exists because a `children` implementation that
 * reads old positions off the DOCUMENT cannot tell where a child list's membership stops without
 * it. So these cases assert the VALUE the exonode answers, and the tree shape beside it.
 */
describe('where the exonode says a child list begins and ends', () => {
    it('a child list among statics begins after the heading and ends at the footer', () => {
        const panel = mountShared();
        // EXCLUSIVE AT BOTH ENDS: the `<h3>` itself, not its next sibling — everything strictly
        // between the two nodes is this port's territory.
        expect(panel.startAnchor()).toBe(panel.div.querySelector('h3'));
        expect(panel.endAnchor()).toBe(panel.div.querySelector('footer'));

        // AND BOTH ARE STILL THE STATICS ONCE THE CHILD LIST HAS CONTENT — they are statics of the
        // instance, so filling and emptying the child list cannot move them.
        for (const id of ['a', 'b']) panel.kids.insert(panel.build(id));
        expect(panel.tags()).toEqual(['H3', 'LI', 'LI', 'FOOTER']);
        expect(panel.startAnchor()).toBe(panel.div.querySelector('h3'));
        expect(panel.endAnchor()).toBe(panel.div.querySelector('footer'));

        panel.kids.removeAll();
        expect(panel.startAnchor()).toBe(panel.div.querySelector('h3'));
        expect(panel.endAnchor()).toBe(panel.div.querySelector('footer'));
    });

    it('a child list that owns its element has no start anchor at all', () => {
        // `null` IS THE ANSWER AND NOT A MISSING ONE: nothing static stands in front of this port,
        // so the child list begins at the parent's first child — which is what `null` means, and it
        // is the same reading `null` has at the far end for "runs to the end of the parent".
        const list = mountOwned();
        expect(list.startAnchor()).toBeNull();
        list.kids.insert(list.build('a'));
        expect(list.startAnchor()).toBeNull();
    });
});
