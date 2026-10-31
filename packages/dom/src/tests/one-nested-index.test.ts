// @vitest-environment jsdom
//
// WHAT A NESTED INSTANCE IS HANDED — on all three passes, from ONE wiring function.
//
// IT IS ITS INDEX, AND NOTHING ELSE. There are no props: a wire is `(enode, index) => out`, and a
// component that needs data reads it by index from wherever its caller put it. That is not an
// ergonomic preference. Props would have to be SERVICED — something has to decide which transitions
// a new value dials — and an init transition the application calls itself is cheaper and is already
// expressible, so the argument was taken out rather than maintained.
//
// WHAT THESE CASES ASSERT is that the index arrives, and the data behind it, identically on the
// server, on a client render and through hydration — because the wire is one function object shared
// by all three, and data that reached only two of them would be a component that serves one thing
// and renders another.
import type {
    TExoChildrenPort,
    TExoMachine,
    TExoPort,
    TExoTextPort,
    TExoAttrPort,
    TExoMachineInitialState,
} from '@exodra/core';
import { describe, expect, it } from 'vitest';

import { host, createExoTestMachine } from '@exodra/test-utils';
import { ExoDomBackend, withExoHydration, withExoCompiler } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

const EXO_BACKEND = withExoHydration(withExoCompiler(new ExoDomBackend()));
const EXO_STR = new ExoStrBackend();

type TDetail = { readonly title: string };

/** Every index the nested wire was handed, in the order it saw them. */
const seen: number[] = [];

/** What the nested rows read, BY INDEX. The caller owns it; the component only indexes it. */
const DETAILS: TDetail[] = [];

/** What these wires assume about an exonode — methods, so all three exonodes satisfy it. */
type TNesting = {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
    one(port: TExoPort, component: TExoMachine<never>): void;
};

/** The same, for the wire that builds a LIST of nested instances instead of one. */
type TListing = TNesting & {
    list(port: TExoPort, component: TExoMachine<never>, count: number): void;
};

const PANEL = createExoTestMachine(
    (b) => {
        let title!: TExoTextPort;
        b.el('p', { class: 'panel' }, (p) => {
            title = p.textPort();
        });
        return { title };
    },
    (P): TExoMachineInitialState<TNesting> =>
        (c, i) => {
            seen.push(i);
            c.text(P.title, DETAILS[i].title);
        }
);

/** THE PARENT: one children port holding exactly one instance of PANEL. */
const CARD = createExoTestMachine(
    (b) => {
        let slot!: TExoChildrenPort;
        b.el('div', { class: 'card' }, (card) => {
            card.el('section', null, (section) => {
                slot = section.childrenPort();
            });
        });
        return { slot };
    },
    (P): TExoMachineInitialState<TNesting> =>
        (c) => {
            // TWO ARGUMENTS, no closure. A single nested instance is at index 0 by definition.
            c.one(P.slot, PANEL);
        }
);

const MARKUP = '<div class="card"><section><p class="panel">from the item</p></section></div>';

describe('one() hands its instance an index, and the three passes agree', () => {
    it('on the server', () => {
        DETAILS.length = 0;
        DETAILS.push({ title: 'from the item' });
        seen.length = 0;
        expect(EXO_STR.render(CARD)).toBe(MARKUP);
        expect(seen).toEqual([0]);
    });

    it('on a client render, byte for byte the same', () => {
        DETAILS.length = 0;
        DETAILS.push({ title: 'from the item' });
        seen.length = 0;
        const parent = host();
        EXO_BACKEND.render(CARD, parent);
        expect(parent.innerHTML).toBe(MARKUP);
        expect(seen).toEqual([0]);
    });

    it('through hydration, without touching the markup the server sent', () => {
        // Hydration writes only what the markup does not already carry, so what the index must do
        // here is REACH the nested wire — that wire is where a page's handlers and subscriptions
        // are made. A pass that never ran it would leave the page inert with no error anywhere.
        DETAILS.length = 0;
        DETAILS.push({ title: 'from the item' });
        const parent = host();
        parent.innerHTML = EXO_STR.render(CARD);
        const before = parent.innerHTML;

        seen.length = 0;
        EXO_BACKEND.hydrate(CARD, parent);

        expect(seen).toEqual([0]);
        expect(parent.innerHTML).toBe(before);
    });

    it('per row of a list, so two cards show two different details', () => {
        // THE CASE THE CLOSURE FORM EXISTED FOR: data that varies with the parent. Two cards side
        // by side is a LIST — one card per position — because that is how an application makes
        // several instances of a component. The index travels two levels down from ONE array, and
        // each level indexes the same array rather than being handed a value to carry.
        DETAILS.length = 0;
        DETAILS.push({ title: 'first' }, { title: 'second' });

        const CARD_OF = createExoTestMachine(
            (b) => {
                let slot!: TExoChildrenPort;
                b.el('div', { class: 'card' }, (card) => {
                    card.el('section', null, (section) => {
                        slot = section.childrenPort();
                    });
                });
                return { slot };
            },
            (P): TExoMachineInitialState<TListing> =>
                (c, i) => {
                    c.list(P.slot, PANEL_AT[i], 1);
                }
        );
        // ONE SCHEMA PER POSITION, and this is what the index costs: row 0 and row 1 both hand
        // their nested instance index 0, so a single shared component cannot tell them apart.
        const PANEL_AT = [panelReading(0), panelReading(1)];

        const PAIR = createExoTestMachine(
            (b) => {
                let cards!: TExoChildrenPort;
                b.el('div', { class: 'cards' }, (root) => {
                    cards = root.childrenPort();
                });
                return { cards };
            },
            (P): TExoMachineInitialState<TListing> =>
                (c) => {
                    c.list(P.cards, CARD_OF, DETAILS.length);
                }
        );

        seen.length = 0;
        const parent = host();
        EXO_BACKEND.render(PAIR, parent);

        expect(Array.from(parent.querySelectorAll('.panel')).map((n) => n.textContent)).toEqual([
            'first',
            'second',
        ]);
        // And the server agrees, from the same wiring.
        expect(EXO_STR.render(PAIR)).toBe(parent.innerHTML);
    });
});

/** A panel reading a FIXED position of `DETAILS`, so a nested instance at index 0 can still show
 *  its own card's detail. */
function panelReading(at: number) {
    return createExoTestMachine(
        (b) => {
            let title!: TExoTextPort;
            b.el('p', { class: 'panel' }, (p) => {
                title = p.textPort();
            });
            return { title };
        },
        (P): TExoMachineInitialState<TNesting> =>
            (c) => {
                c.text(P.title, DETAILS[at].title);
            }
    );
}
