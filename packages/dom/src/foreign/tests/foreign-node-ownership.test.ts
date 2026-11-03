// @vitest-environment jsdom
//
// WHICH DOCUMENT A FOREIGN ELEMENT BELONGS TO WHILE IT IS BEING PLACED — and how many times that
// answer changes before the page ever sees it.
//
// THE MECHANISM, so that a failure here can be read rather than guessed at. A schema's prototype is
// parsed inside a `<template>` and STAYS there (`dom/proto-ownership.test.ts` pins that, and the
// measurement that bought it). `cloneNode` preserves the owner, so an instance is owned by the
// TEMPLATE CONTENTS OWNER DOCUMENT until it is inserted. `mountExoInstance` WIRES BEFORE IT
// INSERTS, and wiring is where `attachExoChildren` runs its opening `applyDiff()` — so on an
// INITIAL BUILD a children port fills a parent that is not in the page yet.
//
// For a child this package built that is invisible: the child was cloned from the same prototype,
// so it is already in the same document as the parent it is appended to and the DOM's pre-insertion
// "adopt node into parent's node document" step finds nothing to do. A FOREIGN element is not that
// child. It was made by the application, out of the PAGE's document, so appending it to a
// template-owned parent MOVES it — and inserting the finished instance moves it back.
//
// TWO OBSERVABLES ARE USED HERE, and they are independent on purpose:
//  - `ownerDocument`, which every element has and which needs no custom element registry;
//  - `adoptedCallback`, which is application code and is the reason any of this matters. The block
//    at the top proves this environment implements it before anything else leans on it, because a
//    case that silently observes nothing is worse than no case at all.
//
// WHAT THESE CASES ARE NOT. They are not about whether the tree comes out right — the sibling
// suite `exo-foreign-node.test.ts` covers placement, order, movement and removal, and every one of
// its cases fills the list by `setValue` AFTER the render, which is the UPDATE path. That is
// exactly why this file exists: the update path is the one path on which none of this happens, so
// a suite written entirely on it cannot see the build path at all.
import type {
    TExoAttrPort,
    TExoChildrenPort,
    TExoNode,
    TExoMachineInitialState,
} from '@exodra/core';
import { describe, expect, it } from 'vitest';
import { host, source, createExoTestMachine } from '@exodra/test-utils';
import type { TExoTestSource } from '@exodra/test-utils';
import type { TExoDomNode } from '../../dom/EXO_DOM_NODE_VOCABULARY';

import { exoForeignNode } from '../exoForeignNode';
import { placeExoChildrenFrom } from './placeExoChildrenFrom';
import type { TExoDomMark } from '../../dom/types/TExoDomMark';
import { ExoDomBackend, withExoCompiler, withExoChildList } from '@exodra/dom';

const EXO_BACKEND = withExoChildList(withExoCompiler(new ExoDomBackend()));
/** Where a `<template>`'s contents live in this environment — the document a prototype stays in. */
const templateOwner = (): Document | null =>
    document.createElement('template').content.ownerDocument;

/**
 * WHICH DOCUMENT, AS A WORD. Every assertion below compares these strings rather than `Document`
 * objects, for one reason: a failed `expect(a).toBe(b)` between two documents prints two
 * indistinguishable blobs, and a failed comparison of `'the page'` against `'the template contents
 * owner'` prints the finding.
 */
const whichDocument = (node: Node | null): string => {
    if (node === null) return 'nowhere — the node has no parent';
    const owner = node.nodeType === 9 ? (node as Document) : node.ownerDocument;
    if (owner === document) return 'the page';
    if (owner === templateOwner()) return 'the template contents owner';
    return 'some third document';
};

/** An ordinary child, so a foreign one can be given neighbours built the normal way. */
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

const buildRow = (
    c: { build(component: typeof ROW, params?: unknown): TExoNode<TExoDomMark> },
    id: string
): TExoNode<TExoDomMark> => {
    return c.build(ROW, id);
};

/**
 * A `<ul>` whose one child is a children port.
 *
 * `fill` IS THE WHOLE POINT OF THIS HELPER, and it is the one thing the sibling suite's `mount`
 * does not have. It runs INSIDE the wiring function, before the children are placed, so the array it
 * returns is what the opening `applyDiff()` reads — the children are placed while the instance
 * root is still a detached, template-owned clone. Called without it, this behaves exactly like the
 * sibling suite's helper: the list renders empty and a later `setValue` fills it against a `<ul>`
 * that is already in the page.
 *
 * IT IS HANDED THE EXONODE, and on the build path there is nowhere else to get one: the door
 * takes the instance making the child, and that instance only exists while its wire is on the
 * stack — so a case testing the build path makes its foreign node HERE, not before the render.
 */
const mount = (
    src: TExoTestSource<readonly TExoNode<TExoDomMark>[]>,
    fill?: (c: TExoDomNode) => readonly TExoNode<TExoDomMark>[]
) => {
    let exonode!: TExoDomNode;
    const LIST = createExoTestMachine(
        (b) => {
            let kids!: TExoChildrenPort;
            b.el('ul', null, (ul) => {
                kids = ul.childrenPort();
            });
            return { kids };
        },
        (P): TExoMachineInitialState<TExoDomNode> =>
            (c) => {
                exonode = c;
                if (fill !== undefined) src.setValue(fill(c));
                placeExoChildrenFrom(c, P.kids, src);
            }
    );
    const parent = host();
    const dispose = EXO_BACKEND.render(LIST, parent);
    const ul = parent.querySelector('ul') as HTMLElement;
    return {
        dispose,
        parent,
        ul,
        /** The instance the door is handed on the UPDATE path, once the wire has returned. */
        exonode,
        build: (id: string): TExoNode<TExoDomMark> => buildRow(exonode, id),
        shown: (): string =>
            Array.from(ul.children)
                .map((el) => el.getAttribute('data-id'))
                .join(','),
    };
};

/** An element nothing in this package made: created in the PAGE's document, filled, handed over. */
const foreignElement = (id: string): HTMLElement => {
    const el = document.createElement('li');
    el.setAttribute('data-id', id);
    el.innerHTML = '<b>drawn by somebody else</b>';
    return el;
};

/** Each call defines a NEW tag, because `customElements.define` refuses a name twice. */
let widgetTags = 0;

/**
 * A foreign CUSTOM ELEMENT that writes into a shared log every time the platform tells it its
 * document changed. The log is shared with the hooks so that ORDER is assertable and not merely
 * counts — the whole question is whether an adoption lands before or after `mount()`.
 */
const foreignWidget = (log: string[]): HTMLElement => {
    const name = `exo-foreign-widget-${++widgetTags}`;
    class Widget extends HTMLElement {
        adoptedCallback(_from: Document, into: Document): void {
            log.push(`adopted into ${whichDocument(into)}`);
        }
    }
    customElements.define(name, Widget);
    const el = document.createElement(name);
    el.setAttribute('data-id', 'w');
    return el;
};

describe('the two observables these cases rest on', () => {
    it('parses a template into a document that is not the page', () => {
        // Asserted first: if this were false, every ownership assertion below would pass
        // vacuously and the property they describe would be unobservable.
        expect(templateOwner()).not.toBe(document);
    });

    it('runs adoptedCallback synchronously when a node crosses between documents', () => {
        // THIS IS THE PROBE, AND IT USES NOTHING OF EXODRA'S. If it fails, this environment does
        // not implement `adoptedCallback` (or does not flush custom element reactions inside
        // `appendChild`), and the three cases below that count adoptions are observing nothing —
        // read the `ownerDocument` cases instead, which stand on their own and need no registry.
        const log: string[] = [];
        const el = foreignWidget(log);
        const shelf = document.createElement('template');
        shelf.content.appendChild(el);
        expect(log).toEqual(['adopted into the template contents owner']);
        document.body.appendChild(el);
        expect(log).toEqual(['adopted into the template contents owner', 'adopted into the page']);
        el.remove();
    });
});

describe('a foreign element placed by the INITIAL BUILD', () => {
    it('is in the same document as the parent it was just placed into, and in the page when the render is over', () => {
        // THE INVARIANT, AND IT IS DERIVED RATHER THAN ASSUMED. The DOM's pre-insertion step is
        // "adopt node into PARENT's node document", so an element and the parent it was just put
        // in cannot disagree — whatever document that is. And whatever happens in between, the
        // finished page owns the element. Both halves hold if the prototype is template-owned and
        // both hold if it is ever page-owned again, so this case pins the good behaviour in either
        // world; the case below is the one that says which world this is.
        const el = foreignElement('f');
        let elAtMount = '';
        let parentAtMount = '';
        const src = source<readonly TExoNode<TExoDomMark>[]>([]);
        const list = mount(src, (c) => [
            buildRow(c, 'a'),
            exoForeignNode(c, el, {
                onMount: () => {
                    elAtMount = whichDocument(el);
                    parentAtMount = whichDocument(el.parentNode);
                },
            }),
            buildRow(c, 'b'),
        ]);

        expect(elAtMount).toBe(parentAtMount);
        expect(whichDocument(el)).toBe('the page');
        // And the tree is right, with neighbours, which is what makes the ownership question the
        // only difference between this path and the update path.
        expect(list.shown()).toBe('a,f,b');
        expect(list.ul.children[1]).toBe(el);
        expect(el.innerHTML).toBe('<b>drawn by somebody else</b>');
    });

    it('records, stage by stage, where the element lives during that build', () => {
        // THE SEQUENCE IS THE FINDING, STATED AS DATA. Read a failure here as a report and not as
        // a defect in this file: if it comes back saying the element was in `the page` inside the
        // mount hook and `connected: true`, then the instance root is being page-owned or inserted
        // before it is wired — the limit documented in `exoForeignNode.ts` as the first entry
        // under WHAT THIS DOES NOT SUPPORT ("A CONNECTED ELEMENT AT `mount`, AND TWO DOCUMENT
        // CROSSINGS ON THE WAY TO ONE") no longer exists, and that entry should go with this
        // expectation.
        const el = foreignElement('f');
        const stages: string[] = [];
        stages.push(`made by the application: ${whichDocument(el)}`);
        const src = source<readonly TExoNode<TExoDomMark>[]>([]);
        mount(src, (c) => {
            const f = exoForeignNode(c, el, {
                onMount: () => {
                    stages.push(`inside the mount hook: ${whichDocument(el)}`);
                    stages.push(`its parent then: ${whichDocument(el.parentNode)}`);
                    stages.push(`connected then: ${String(el.isConnected)}`);
                },
            });
            stages.push(`handed to exoForeignNode: ${whichDocument(el)}`);
            return [f];
        });
        stages.push(`once the instance was inserted: ${whichDocument(el)}`);

        expect(stages).toEqual([
            'made by the application: the page',
            'handed to exoForeignNode: the page',
            'inside the mount hook: the template contents owner',
            'its parent then: the template contents owner',
            'connected then: false',
            'once the instance was inserted: the page',
        ]);
    });

    it('adopts a foreign custom element twice — out of the page and back into it — around one mount', () => {
        // THE COUNT AND THE ORDER TOGETHER, because the two say different things. The COUNT is
        // what the application pays: `adoptedCallback` is its own code, and it runs twice for one
        // placement. The ORDER is what corrects the obvious guess about it — only the FIRST
        // adoption precedes `mount()`. The second happens later, when `mountExoInstance` inserts
        // the finished instance, by which time the hook has already run and a foreign renderer
        // started inside it may well be running too.
        const log: string[] = [];
        const el = foreignWidget(log);
        const src = source<readonly TExoNode<TExoDomMark>[]>([]);
        const list = mount(src, (c) => [
            exoForeignNode(c, el, {
                onMount: () => log.push('mount hook'),
                onUnmount: () => log.push('unmount hook'),
            }),
        ]);

        expect(log).toEqual([
            'adopted into the template contents owner',
            'mount hook',
            'adopted into the page',
        ]);
        // The pair nets out: the element ends where it began, in the page, in the list.
        expect(whichDocument(el)).toBe('the page');
        expect(list.ul.children[0]).toBe(el);
        expect(el.isConnected).toBe(true);
    });

    it('does not adopt again when the child is later moved, dropped or re-placed', () => {
        // THE COST IS THE BUILD'S AND NOTHING ELSE'S. Once the instance is in the page every
        // parent this child can be put in is page-owned too, so a reorder, a removal and a return
        // cross no document boundary at all. Stated here so that "two adoptions" cannot be read as
        // "two adoptions per operation".
        const log: string[] = [];
        const el = foreignWidget(log);
        const src = source<readonly TExoNode<TExoDomMark>[]>([]);
        // Made inside the wire, because that is where the exonode is, and kept out here because
        // the four updates below place and drop the very same child.
        let f!: TExoNode<TExoDomMark>;
        const list = mount(src, (c) => {
            f = exoForeignNode(c, el);
            return [buildRow(c, 'a'), f, buildRow(c, 'b')];
        });
        const adoptionsAtBuild = log.length;
        const a = list.build('x');
        const b = list.build('y');

        src.setValue([b, f, a]);
        src.setValue([b, a]);
        src.setValue([b, f, a]);
        src.setValue([]);

        expect(log.length).toBe(adoptionsAtBuild);
        expect(whichDocument(el)).toBe('the page');
    });
});

describe('a foreign element placed by an UPDATE', () => {
    it('is never adopted anywhere, and its mount hook sees a connected element', () => {
        // THE PATH THE SIBLING SUITE ALREADY WALKS, asserted here for what it does NOT do. The
        // `<ul>` is in the page before the child arrives, so `appendChild` finds the element
        // already in the parent's document and the adopt step is a no-op.
        const log: string[] = [];
        const src = source<readonly TExoNode<TExoDomMark>[]>([]);
        const list = mount(src);
        expect(whichDocument(list.ul)).toBe('the page');

        const el = foreignWidget(log);
        const stages: string[] = [];
        const f = exoForeignNode(list.exonode, el, {
            onMount: () => {
                stages.push(`inside the mount hook: ${whichDocument(el)}`);
                stages.push(`connected then: ${String(el.isConnected)}`);
            },
        });
        src.setValue([list.build('a'), f]);

        expect(log).toEqual([]);
        expect(stages).toEqual(['inside the mount hook: the page', 'connected then: true']);
        expect(list.shown()).toBe('a,w');
    });
});
