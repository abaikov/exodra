// @vitest-environment jsdom
//
// WHICH DOCUMENT OWNS A PLAN'S PROTOTYPE — a property with no visible effect and a measured price
// on every instance this renderer ever builds.
//
// A prototype is parsed inside a `<template>`, and a template's contents belong to the TEMPLATE
// CONTENTS OWNER DOCUMENT rather than to the page. `cloneNode` preserves the owner, so an instance
// is foreign-owned until it is inserted, and the DOM's pre-insertion step "adopt node into parent's
// node document" then walks the inserted subtree writing a new document pointer into every node.
//
// THIS PACKAGE USED TO MOVE THE PROTOTYPE INTO THE PAGE — `document.importNode(proto, true)`, once
// per schema, guarded by a predicate that kept `<img>` and custom elements out of it — to take that
// walk off every insertion. The numbers it was bought at (380 ns per insertion foreign-owned
// against 240 ns page-owned, 1.58×) came from another machine and the file that held them said
// outright that nothing in this repository reproduced them.
//
// BOTH HALVES HAVE BEEN MEASURED HERE, on trees first checked byte-identical so that only the
// ownership differed (`packages/benchmarks`, Chromium). THE RECORDING IS GONE: one of the two
// axes that produced these rates was `dom-vs-stage0-phases`, which existed to compare this
// backend against `@exodra/stage0-backend`, and that package and every recording of it were
// deleted from this repository — a measurement taken against an implementation carrying four
// known defects is not evidence about anything. `import-node-trade` is the surviving instrument
// and it has never been recorded, so the rates below are READ FROM A RUN NOBODY CAN REPLAY OFF
// DISK. Re-run that axis before quoting them:
//
//   cloning a PAGE-owned prototype costs ~95 ns MORE per clone than cloning a template-owned one
//   inserting a page-owned clone saves ~26 ns per insertion by skipping the adopt
//
// A clone is inserted once, so those two rates apply the same number of times and the trade is a
// straight loss. Swept over subtree sizes 1…64 nodes it never crosses into profit and the loss
// GROWS with size (−14.9 ns per node, straight line over seven rungs), so there is no size a
// threshold could have been set at. Removing the import measured **−9.2% on the mount axis**
// (0.413 → 0.375 ms, floor ±3.3%, machine drift ×1.000 across ten control participants).
//
// AND THE SAFETY ARGUMENT RUNS THE SAME WAY, which is why the predicate went with it. `<template>`
// was chosen for the parse because its contents are inert: no image loads, no `adoptedCallback`.
// Importing is what ended that inertness, and the predicate existed to name the schemas where
// ending it was harmful. Not importing at all is the branch that predicate already took for those
// schemas — now taken for every schema, so nothing can begin loading at module load whatever the
// markup holds.
//
// What this file pins is that ownership, in both directions: the prototype stays out of the page,
// and every instance still arrives in it.
import type { TExoSchemaCursor, TExoTextPort, TExoMachineInitialState } from '@exodra/core';
import { describe, expect, it } from 'vitest';
import { exoDomSchemaOf } from '../exoDomSchemaOf';

import type { TExoDomNode } from '../EXO_DOM_NODE_VOCABULARY';
import { host, createExoTestMachine } from '@exodra/test-utils';
import { ExoDomBackend, withExoCompiler, withExoForeignNamespaces } from '@exodra/dom';

const EXO_BACKEND = withExoForeignNamespaces(withExoCompiler(new ExoDomBackend()));

/** A component with nothing to fill — these cases are about the prototype, not the wiring. */
const inert = (build: (b: TExoSchemaCursor) => void) =>
    createExoTestMachine(
        (b: TExoSchemaCursor) => {
            build(b);
            return {};
        },
        (): TExoMachineInitialState<unknown> => () => undefined
    );

/** Where a `<template>`'s contents live in this environment — the document a prototype stays in. */
const templateOwner = (): Document | null =>
    document.createElement('template').content.ownerDocument;

describe('the environment this whole case rests on', () => {
    it('parses a template into a document that is not the page', () => {
        // ASSERTED FIRST, because if it were false every other case in this file would pass
        // vacuously and the property they describe would be unobservable. jsdom implements the
        // template contents owner document; a runtime that did not would make every ownership
        // assertion below trivially true, and this is where that would be said out loud.
        expect(templateOwner()).not.toBe(document);
    });
});

describe("a schema's prototype", () => {
    it('stays in the document the template parsed it into, and is never moved into the page', () => {
        const CARD = inert((b) => {
            b.el('div', { class: 'card' }, (d) => {
                d.el('h3', null, (h) => {
                    h.text('title');
                });
                d.el('p', null, (p) => {
                    p.text('body');
                });
            });
        });

        const proto = exoDomSchemaOf(CARD, EXO_BACKEND).proto;

        expect(proto.ownerDocument).not.toBe(document);
        expect(proto.ownerDocument).toBe(templateOwner());
    });

    it('keeps its SVG namespace, which the parse and not the ownership decides', () => {
        // The whole SVG repair in `svg-rooted-schema` depends on the prototype being in the SVG
        // namespace, and "the prototype is a different node now" is exactly the kind of change
        // that would undo it silently: an `<svg>` in the HTML namespace draws nothing and
        // serialises identically. Pinned here because this file is where the prototype's identity
        // is asserted, and it was pinned here when the prototype was imported too.
        const ICON = inert((b) => {
            b.el('svg', { viewBox: '0 0 10 10' }, (s) => {
                s.el('rect', { width: '4' });
            });
        });

        const proto = exoDomSchemaOf(ICON, EXO_BACKEND).proto;

        expect(proto.namespaceURI).toBe('http://www.w3.org/2000/svg');
        expect(proto.ownerDocument).toBe(templateOwner());
    });
});

describe("the schema's protoLandings", () => {
    // THE PROPERTY THE DELETED COPY BRANCH EXISTED TO KEEP. `findExoRowDisagreement` compares a live row
    // against `schema.protoLandings`, and the compiler used to build that array by REPLAYING the walk
    // over `document.importNode`'s copy — because the array the walk replay had already produced
    // pointed into the tree the PARSER built, which the import left behind as garbage. With nothing
    // imported the parser's tree IS `schema.proto`, so the replay array is kept as it stands and
    // the branch is gone. What that removal rests on is pinned here rather than read off the
    // one line: every landing is a node inside the very prototype every instance is cloned from.
    // If a copy step ever comes back without its replay, these assertions are what fails instead of
    // adoption silently comparing live rows against a tree nobody clones.
    function buildCard(b: TExoSchemaCursor) {
        let title!: TExoTextPort;
        b.el('div', { class: 'card' }, (d) => {
            d.el('h3', null, (h) => {
                title = h.textPort();
            });
            d.el('p', null, (p) => {
                p.text('body');
            });
        });
        return { title };
    }
    const CARD = createExoTestMachine(
        buildCard,
        (): TExoMachineInitialState<TExoDomNode> => () => undefined
    );

    it('are nodes inside that same prototype, one per slot', () => {
        const schema = exoDomSchemaOf(CARD, EXO_BACKEND);

        expect(schema.protoLandings.length).toBe(schema.slots);
        expect(schema.slots).toBeGreaterThan(1);
        expect(schema.protoLandings[0]).toBe(schema.proto);
        for (const landing of schema.protoLandings) {
            expect(schema.proto.contains(landing)).toBe(true);
        }
    });

    it('land the port on the element the walk says, and stay out of the page with it', () => {
        const schema = exoDomSchemaOf(CARD, EXO_BACKEND);

        // PORT 0 IS THE TEXT PORT, AND ITS SLOT HOLDS WHAT ITS WRITER ASKED FOR. Under the bare
        // backend that writer is `setExoText`, which declares `takesTextNode`, so the walk
        // resolves the `<h3>`'s Text NODE into the port's one slot and the fill is one store
        // (`TExoDomSchema.elem`). The fact this case is about is unchanged — the walk lands the port
        // where the schema put it — so it is asserted where the port now lands and on the element
        // that landing hangs from. Compose an element-holding text writer and the same line reads
        // the `<h3>` itself; `plugins/exo-reclaiming-text` pins both answers side by side.
        const at = schema.protoLandings[schema.elem[0]];
        expect(at.nodeType).toBe(3);
        expect((at.parentNode as Element).tagName).toBe('H3');
        for (const landing of schema.protoLandings) {
            expect(landing.ownerDocument).toBe(templateOwner());
        }
    });
});

describe('an instance built from that prototype', () => {
    it('is owned by the page once it has been inserted', () => {
        // The other half, and the one that makes the first half safe to have: the adopt step runs
        // on insertion and every instance ends up in the page's document exactly as before. The
        // cost moved; nothing about the resulting tree did.
        const ROW = inert((b) => {
            b.el('li', null, (li) => {
                li.text('x');
            });
        });

        const parent = host();
        // THREE SEPARATE MOUNTS INTO ONE PARENT, and a loop is the honest shape for it: the rows
        // are identical, so nothing here is about a row knowing its position — what is asserted is
        // that EVERY clone gets adopted, which needs more than one clone and nothing else.
        // `render` appends, so the three land side by side.
        for (let i = 0; i < 3; i++) EXO_BACKEND.render(ROW, parent);

        expect(parent.children.length).toBe(3);
        for (const child of Array.from(parent.children)) {
            expect(child.ownerDocument).toBe(document);
        }
    });

    it('adopts the whole subtree, not only the root it was inserted by', () => {
        // Adoption is specified as a walk of the inserted subtree, and this renderer holds
        // references to interior nodes (every port's element is one). A descendant left in the
        // template's document would be a node this package hands to a setter while it belongs to
        // a document with no browsing context.
        const CARD = inert((b) => {
            b.el('div', null, (d) => {
                d.el('h3', null, (h) => {
                    h.text('t');
                });
            });
        });

        const parent = host();
        EXO_BACKEND.render(CARD, parent);

        for (const node of Array.from(parent.querySelectorAll('*'))) {
            expect(node.ownerDocument).toBe(document);
        }
    });
});

describe('a schema whose markup would do work when its node document changes', () => {
    // This used to be the ONE case the predicate protected — a schema holding an `<img>` kept
    // its template-owned prototype so that "update the image data" could not start a fetch
    // before the application had rendered anything. It is now the case for every schema, and
    // the guarantee is structural rather than a list of tag names that had to be kept
    // complete: the compiler moves no prototype anywhere, so there is no adopt to trigger it.
    const WORKING_MARKUP: ReadonlyArray<{
        readonly what: string;
        readonly build: (b: TExoSchemaCursor) => void;
    }> = [
        {
            what: 'never begins that work at module load, because nothing is adopted at compile time',
            build: (b) => {
                b.el('div', null, (d) => {
                    d.el('img', { src: 'https://example.invalid/a.png', alt: '' });
                });
            },
        },
        {
            what: 'is a custom element too, whose adoptedCallback is application code',
            build: (b) => {
                b.el('my-widget', { 'data-a': '' });
            },
        },
    ];

    for (const c of WORKING_MARKUP) {
        it(c.what, () => {
            expect(exoDomSchemaOf(inert(c.build), EXO_BACKEND).proto.ownerDocument).toBe(
                templateOwner()
            );
        });
    }

    it('still renders into the page exactly as any other schema does', () => {
        const AVATAR = inert((b) => {
            b.el('img', { src: 'https://example.invalid/a.png', alt: '' });
        });

        const parent = host();
        EXO_BACKEND.render(AVATAR, parent);

        expect(parent.innerHTML).toBe('<img src="https://example.invalid/a.png" alt="">');
        expect((parent.firstElementChild as Element).ownerDocument).toBe(document);
    });
});
