// @vitest-environment jsdom
//
// THE DIAGNOSTIC ITSELF, asked directly rather than through an adoption.
//
// `findExoRowDisagreement` compares a live element's landings against the same landings over the
// schema's PROTOTYPE, and the prototype half is no longer walked here: it is the schema's own
// `protoLandings`, computed once when the schema was compiled and verified there. These cases are
// what says that swap changed no verdict — a row that agrees, a row that is SHORT, and a row whose
// tag is wrong are the three answers the callers act on.
import type { TExoSchemaCursor, TExoTextPort, TExoMachineInitialState } from '@exodra/core';
import { describe, expect, it } from 'vitest';

import { findExoRowDisagreement } from '../findExoRowDisagreement';
import { host, createExoTestMachine } from '@exodra/test-utils';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

/**
 * THE BACKEND SELECTS THE SCHEMA, and that is the whole of what this argument does here — nothing
 * `findExoRowDisagreement` reads off a schema (`hydrateWalk`, `slots`, `proto`, `protoLandings`)
 * differs between two compositions of one declaration. It is at module level because the schema
 * chain is keyed by backend POINTER: a backend per call would compile a schema per call.
 */
const EXO_BACKEND = withExoCompiler(new ExoDomBackend());
const EXO_STR = new ExoStrBackend();

/** What the wire fills — text ports, and nothing else these cases need. */
type TFilling = { text(port: TExoTextPort, value: unknown): void };

/**
 * BOTH ELEMENTS CARRY A PORT, and that is not decoration: a subtree with no port in it is never
 * resolved by the walk (`markNeeded` in the compiler), so a schema whose footer were static would
 * have no landing there and nothing to disagree about.
 */
function buildCard(b: TExoSchemaCursor) {
    let title!: TExoTextPort;
    let note!: TExoTextPort;
    b.el('section', { class: 'card' }, (s) => {
        s.el('h1', null, (h) => {
            title = h.textPort();
        });
        s.el('footer', null, (f) => {
            note = f.textPort();
        });
    });
    return { title, note };
}

const CARD = createExoTestMachine(
    buildCard,
    (P): TExoMachineInitialState<TFilling> =>
        (c, i) => {
            c.text(P.title, 'card ' + i);
            c.text(P.note, 'footnote');
        }
);

/** The server's markup for one card, in a parent — the tree every case starts from. */
const served = (): Element => {
    const parent = host();
    parent.innerHTML = EXO_STR.render(CARD);
    return parent.firstElementChild as Element;
};

describe('findExoRowDisagreement', () => {
    it('agrees with the markup its own schema produced', () => {
        // The values differ from the prototype's in every filled port, which is the point of the
        // comparison being about SHAPE: a check that compared text would call the data a defect.
        expect(findExoRowDisagreement(CARD, served(), EXO_BACKEND)).toBe(null);
    });

    it('reports a row the markup ran SHORT of, naming what the schema has there', () => {
        // The landing the schema asks for is missing. This used to be answered by walking the
        // prototype alongside the row; it is now answered by the schema's landings, and the message
        // still names the node the schema has — which is the whole value of the diagnostic.
        const row = served();
        (row.querySelector('footer') as Element).remove();
        const problem = findExoRowDisagreement(CARD, row, EXO_BACKEND);
        expect(problem).toContain('ran out of nodes');
        expect(problem).toContain('<footer>');
    });

    it('reports a landing that is the wrong element', () => {
        const row = served();
        const footer = row.querySelector('footer') as Element;
        const impostor = document.createElement('aside');
        footer.replaceWith(impostor);
        const problem = findExoRowDisagreement(CARD, row, EXO_BACKEND);
        expect(problem).toContain('expected <footer>');
        expect(problem).toContain('<aside>');
    });

    it('refuses an element that is not this schema at all', () => {
        const other = document.createElement('div');
        expect(findExoRowDisagreement(CARD, other, EXO_BACKEND)).toContain("the row's root is");
    });
});
