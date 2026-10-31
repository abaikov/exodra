// @vitest-environment jsdom
//
// WHAT A REF PORT COSTS THE TWO SIDES OF A PAGE — nothing, and this file is where "nothing"
// is a byte comparison rather than a claim.
//
// `b.refPort()` exists so that a wire can obtain the ELEMENT: observe it, focus it,
// measure it. It has no writer on any backend, so the promise it makes is stronger than the one
// every other port kind makes — not "the two backends print the same thing for it" but "adding it
// to a component changes NO BYTE ON EITHER SIDE". A component that already renders on the server
// can be given one and its response is unchanged, character for character.
//
// THE THREE THINGS THAT COULD HAVE GONE WRONG, one case each:
//
//  1. THE SERVER COULD HAVE PRINTED SOMETHING. It cuts the static run in two — it owns a port
//     number, because the numbering is shared with the DOM backend and dropping its slot would
//     renumber every port after it — and an empty piece concatenated between two runs must be the
//     same string as the two runs joined. That is the whole of `@exodra/string`'s treatment, and
//     the twin comparison is what says so.
//  2. IT COULD HAVE MOVED ANOTHER PORT'S ATTRIBUTE. The DOM backend decides which attribute
//     placeholders stay in the prototype by asking "is another MARKUP port declared after this one
//     on the same element". A ref port counted as markup would change that answer, and the
//     visible symptom is attribute ORDER: the server prints in declaration order, and a fill that
//     appends lands wherever it lands.
//  3. HYDRATION COULD HAVE LANDED SOMEWHERE ELSE. The adopt pass replays a walk over the server's
//     markup, where the ref port printed nothing — so it must resolve exactly the element a
//     clone resolves, and the element it hands over must be the SERVER'S node rather than a
//     replacement.
import type {
    TExoSchemaCursor,
    TExoAttrPort,
    TExoChildrenPort,
    TExoPortNodeReader,
    TExoPortTable,
    TExoRefPort,
    TExoTextPort,
    TExoMachineInitialState,
} from '@exodra/core';
import { describe, expect, it } from 'vitest';

import { host, createExoTestMachine } from '@exodra/test-utils';
import { ExoDomBackend, withExoHydration, withExoCompiler } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

const EXO_BACKEND = withExoHydration(withExoCompiler(new ExoDomBackend()));
const EXO_STR = new ExoStrBackend();

/**
 * WHAT A WIRE THAT READS AN ELEMENT NEEDS OF AN EXONODE AND STILL RUNS EVERYWHERE.
 *
 * The read is typed `Element | undefined`, and that is not a hedge — it is the true statement
 * about a server render, said in the type. `@exodra/string` has no nodes, so its
 * `portNodeReader` answers `undefined`; the two DOM exonodes answer `Element`, and a
 * function returning `Element` satisfies a signature promising `Element | undefined`. So ONE wire
 * is accepted by all three backends and the check is where it belongs, at the use.
 */
type TPortable = {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
    portTable(): TExoPortTable;
    portNodeReader(): TExoPortNodeReader<Element | undefined>;
};

/** What a wire fills when it has no port to read. */
type TFilling = {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
};

/** Every element the ref port resolved to, in render order — `undefined` on the server. */
const SEEN: (Element | undefined)[] = [];

// ─── 1. THE SAME MARKUP, WITH THE PORT AND WITHOUT IT ────────────────────────────────────────

/** `<section class="card"><h1>…</h1><footer class="foot"></footer></section>`, with the port. */
const CARD = createExoTestMachine(
    (b: TExoSchemaCursor) => {
        let title!: TExoTextPort;
        let probe!: TExoRefPort;
        b.el('section', { class: 'card' }, (s) => {
            s.el('h1', null, (h) => {
                title = h.textPort();
            });
            s.el('footer', { class: 'foot' }, (f) => {
                probe = f.refPort();
            });
        });
        return { title, probe };
    },
    (P): TExoMachineInitialState<TPortable> =>
        (c) => {
            c.text(P.title, 'Hello');
            const table = c.portTable();
            const at = c.portNodeReader();
            SEEN.push(at(table, P.probe));
        }
);

/** The same schema with the port left out, and a wire that fills the same text. */
const CARD_TWIN = createExoTestMachine(
    (b: TExoSchemaCursor) => {
        let title!: TExoTextPort;
        b.el('section', { class: 'card' }, (s) => {
            s.el('h1', null, (h) => {
                title = h.textPort();
            });
            s.el('footer', { class: 'foot' });
        });
        return { title };
    },
    (P): TExoMachineInitialState<TFilling> =>
        (c) => {
            c.text(P.title, 'Hello');
        }
);

// ─── 2. A REF PORT STANDING BETWEEN TWO ATTRIBUTE PORTS ─────────────────────────────────

/** `<div data-a data-b>` with the ref port declared BETWEEN the two attribute ports. */
const BETWEEN = createExoTestMachine(
    (b: TExoSchemaCursor) => {
        let a!: TExoAttrPort;
        let probe!: TExoRefPort;
        let z!: TExoAttrPort;
        b.el('div', { class: 'row' }, (d) => {
            a = d.port('data-a');
            probe = d.refPort();
            z = d.port('data-b');
        });
        return { a, probe, z };
    },
    (P): TExoMachineInitialState<TPortable> =>
        (c) => {
            c.attr(P.a, '1');
            c.attr(P.z, '2');
            const table = c.portTable();
            SEEN.push(c.portNodeReader()(table, P.probe));
        }
);

/** The same two attribute ports, with nothing between them. */
const BETWEEN_TWIN = createExoTestMachine(
    (b: TExoSchemaCursor) => {
        let a!: TExoAttrPort;
        let z!: TExoAttrPort;
        b.el('div', { class: 'row' }, (d) => {
            a = d.port('data-a');
            z = d.port('data-b');
        });
        return { a, z };
    },
    (P): TExoMachineInitialState<TFilling> =>
        (c) => {
            c.attr(P.a, '1');
            c.attr(P.z, '2');
        }
);

describe('the bytes a ref port costs', () => {
    it('prints nothing on the server — the response is identical with it and without it', () => {
        SEEN.length = 0;
        const withPort = EXO_STR.render(CARD);
        const without = EXO_STR.render(CARD_TWIN);
        expect(withPort).toBe(without);
        expect(withPort).toBe(
            '<section class="card"><h1>Hello</h1><footer class="foot"></footer></section>'
        );
        // And the read a portable wire makes is `undefined` here rather than a throw, so a
        // component that observes its own element is still a component that can be served.
        expect(SEEN).toEqual([undefined]);
    });

    it('does not disturb the attributes around it, on either backend', () => {
        SEEN.length = 0;
        const withPort = EXO_STR.render(BETWEEN);
        const without = EXO_STR.render(BETWEEN_TWIN);
        expect(withPort).toBe(without);
        expect(withPort).toBe('<div class="row" data-a="1" data-b="2"></div>');

        // And the DOM backend builds the same element, attribute for attribute and in the same
        // order — which is the assertion that the ref port did not change the compiler's
        // answer to "is another markup port declared after this one".
        SEEN.length = 0;
        const parent = host();
        EXO_BACKEND.render(BETWEEN, parent);
        const built = parent.firstElementChild;
        expect(built === null ? '' : built.outerHTML).toBe(withPort);
        expect(SEEN).toEqual([built]);
    });
});

describe('a ref port on a hydrated page', () => {
    it('resolves the element the server sent, and the one a clone resolves', () => {
        // A CLIENT RENDER FIRST, so there is something to compare against.
        SEEN.length = 0;
        const cloned = host();
        EXO_BACKEND.render(CARD, cloned);
        const clonedFoot = SEEN[0];
        if (clonedFoot === undefined) {
            throw new Error('the ref port resolved nothing on the cloned page');
        }
        expect(clonedFoot).toBe(cloned.querySelector('footer.foot'));

        // AND NOW THE SERVER'S MARKUP, ADOPTED. The port printed nothing, so the bytes the browser
        // parses are the same bytes a page without the port would have carried — and the walk must
        // still land on the footer.
        const served = host();
        served.innerHTML = EXO_STR.render(CARD);
        // The node the parser made, captured BEFORE hydration, so "the element the server sent" is
        // a pointer comparison rather than a shape comparison.
        const serverFoot = served.querySelector('footer.foot');
        SEEN.length = 0;
        EXO_BACKEND.hydrate(CARD, served);

        const adoptedFoot = SEEN[0];
        if (adoptedFoot === undefined) {
            throw new Error('the ref port resolved nothing on the adopted page');
        }
        expect(adoptedFoot).toBe(serverFoot);
        // Nothing was rebuilt: the element the wire was handed is still the one in the page.
        expect(adoptedFoot).toBe(served.querySelector('footer.foot'));
        // And it is the same PLACE in the tree the clone resolved — the two passes agree about
        // which element the port stands on.
        expect(adoptedFoot.outerHTML).toBe(clonedFoot.outerHTML);
        expect(served.innerHTML).toBe(cloned.innerHTML);
    });
});
