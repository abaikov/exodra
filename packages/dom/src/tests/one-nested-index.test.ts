// @vitest-environment jsdom
//
// WHAT A NESTED INSTANCE IS HANDED — on all three passes, from ONE wiring function.
//
// IT IS ITS PARAMS, AND NOTHING ELSE. There are no props: an initial state is `(enode, params) => out`,
// and the params are handed once, when the instance is built. Props would have to be SERVICED —
// something has to decide which transitions a new value dials — so there are none to maintain.
//
// WHAT THESE CASES ASSERT is that the params arrive identically on the server, on a client render and
// through hydration — because the initial state is one function object shared by all three, and data
// that reached only two of them would be a component that serves one thing and renders another.
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

/** Every params value the nested instance was handed, in the order it saw them. */
const seen: unknown[] = [];

const ITEM: TDetail = { title: 'from the item' };

/** What these wires assume about an exonode — methods, so all three exonodes satisfy it. */
type TNesting = {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
    one(port: TExoPort, component: TExoMachine<never>, params?: unknown): void;
};

/** The same, for the wire that builds a LIST of nested instances instead of one. */
type TListing = TNesting & {
    list(port: TExoPort, component: TExoMachine<never>, params: readonly unknown[]): void;
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
        (c, detail) => {
            seen.push(detail);
            c.text(P.title, (detail as TDetail).title);
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
            c.one(P.slot, PANEL, ITEM);
        }
);

const MARKUP = '<div class="card"><section><p class="panel">from the item</p></section></div>';

describe('one() hands its instance its params, and the three passes agree', () => {
    it('on the server', () => {
        seen.length = 0;
        expect(EXO_STR.render(CARD)).toBe(MARKUP);
        expect(seen[0]).toBe(ITEM);
        expect(seen).toHaveLength(1);
    });

    it('on a client render, byte for byte the same', () => {
        seen.length = 0;
        const parent = host();
        EXO_BACKEND.render(CARD, parent);
        expect(parent.innerHTML).toBe(MARKUP);
        expect(seen[0]).toBe(ITEM);
        expect(seen).toHaveLength(1);
    });

    it('through hydration, without touching the markup the server sent', () => {
        // Hydration writes only what the markup does not already carry, so what the params must do
        // here is REACH the nested initial state — that is where a page's handlers and
        // subscriptions are made. A pass that never ran it would leave the page inert with no error
        // anywhere.
        const parent = host();
        parent.innerHTML = EXO_STR.render(CARD);
        const before = parent.innerHTML;

        seen.length = 0;
        EXO_BACKEND.hydrate(CARD, parent);

        expect(seen[0]).toBe(ITEM);
        expect(seen).toHaveLength(1);
        expect(parent.innerHTML).toBe(before);
    });

    it('per row of a list, so two cards show two different details', () => {
        // THE CASE THE CLOSURE FORM EXISTED FOR: data that varies with the parent. Two cards side
        // by side is a LIST — one card per position — because that is how an application makes
        // several instances of a component. Each card is handed its detail and hands it on, so the
        // value travels two levels down and one shared panel shows both.
        const DETAILS: readonly TDetail[] = [{ title: 'first' }, { title: 'second' }];

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
                (c, detail) => {
                    c.list(P.slot, PANEL, [detail]);
                }
        );

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
                    c.list(P.cards, CARD_OF, DETAILS);
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
