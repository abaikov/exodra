// @vitest-environment jsdom
//
// ONE WIRING FUNCTION, THREE BACKENDS — the property the whole two-and-a-half-backend design
// exists for, asserted as a type and as behaviour in the same file.
//
// A component is a SCHEMA (compiled once, three ways) and a WIRE (written by hand, once), and
// since `createExoTestMachine` it is ONE VALUE carrying both. The server's wire type and the DOM's used
// to be two separate declarations of the same three parameters, each carrying a comment asking
// the reader to keep it level with the other — so nothing but attention stopped them drifting,
// and a drift would mean every component needs a second wiring function for the server. They
// are now one generic (`TExoMachineInitialState`) with the exonode as its only parameter.
//
// THE TEST OF THAT IS THE ABSENCE OF A CAST. Every other cross-backend test in this folder used
// to pass its wire as `never`, precisely because one function could not be typed for two
// backends. The component below is declared ONCE, against the surface all three exonodes
// share, and handed to all three entry points with no cast anywhere — which stops compiling the
// moment the two wire types stop being the same shape.
import type {
    TExoSchemaCursor,
    TExoAttrPort,
    TExoChildrenWiring,
    TExoChildrenPort,
    TExoMachine,
    TExoMachineNode,
    TExoWiring,
    TExoEventPort,
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
} from '@exodra/core';
import { describe, expect, it } from 'vitest';

import { host, source, createExoTestMachine } from '@exodra/test-utils';
import { ExoDomBackend, withExoHydration, withExoCompiler } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

const EXO_BACKEND = withExoHydration(withExoCompiler(new ExoDomBackend()));
const EXO_STR = new ExoStrBackend();

// THE BACKEND-BLIND SURFACE IS `@exodra/core`'s, AND THAT IS WHAT THIS FILE KEEPS HONEST: it is
// `TExoWiring` (values) and `TExoChildrenWiring` (values plus every children-port call), the
// two types a published component is written against. What asserts that a real exonode satisfies
// them is the ABSENCE OF A CAST at the three entry points below.

let clicked = -1;

/**
 * ONE COMPONENT. The wiring is written once, against no backend in particular, and it can no
 * longer be separated from the shape it fills: the ports arrive as the factory's argument and
 * the wire leaves inside the same value the schema does.
 */
const ROW = createExoTestMachine(
    (b) => {
        let id!: TExoAttrPort;
        let label!: TExoTextPort;
        let click!: TExoEventPort;
        b.el('li', { class: 'row' }, (li) => {
            id = li.port('data-id');
            click = li.eventPort('click');
            li.el('span', null, (span) => {
                label = span.textPort();
            });
        });
        return { id, label, click };
    },
    (P): TExoMachineInitialState<TExoWiring> =>
        (c, at) => {
            c.attr(P.id, at);
            c.text(P.label, 'Item ' + at);
            c.on(P.click, () => {
                clicked = at as number;
            });
        }
);

/**
 * A LEAF TYPED AGAINST THE MINIMAL SURFACE, so that the parent below nests something that never
 * claimed it could nest. That direction has to be free — `TExoChildrenWiring` extends
 * `TExoWiring` and a wire's exonode parameter is contravariant — and it is the whole reason
 * the surface is GRADED rather than one wide type: a component that fills two ports should not
 * have to declare `bindMany` to be usable.
 */
const LEAF = createExoTestMachine(
    (b) => {
        let text!: TExoTextPort;
        b.el('span', { class: 'leaf' }, (span) => {
            text = span.textPort();
        });
        return { text };
    },
    (P): TExoMachineInitialState<TExoWiring> =>
        (c, text) => {
            c.text(P.text, text);
        }
);

/**
 * AND A PARENT THAT NESTS IT — the WIDER surface, exercised on all three backends.
 *
 * It is here because `TExoChildrenWiring` is the half of the surface that could not be spelled
 * flatly: `one` takes a COMPONENT, a component is generic over the exonode it is wired against,
 * so the signature names the exonode recursively. Whether the three real exonodes satisfy that
 * is a question only the compiler can answer, and this is where it is asked — again with no cast
 * at any of the three entry points.
 */
const PAGE = createExoTestMachine(
    (b) => {
        let slot!: TExoChildrenPort;
        b.el('div', { class: 'page' }, (div) => {
            slot = div.childrenPort();
        });
        return { slot };
    },
    (P): TExoMachineInitialState<TExoChildrenWiring> =>
        (c) => {
            c.one(P.slot, LEAF, 'nested');
        }
);

/**
 * `n` INSTANCES OF ONE COMPONENT, AS A LIST — because that is what an application writes when it
 * wants several, and because this file's whole subject is that ONE wire serves three backends: a
 * list is the shape that puts the same several instances on all three, and hydration in particular
 * has no other one (adopting twice would adopt the same first element twice).
 *
 * TYPED AGAINST `TExoChildrenWiring` FOR THE FILE'S OWN REASON. `c.list` names the exonode
 * recursively — its component parameter is generic over the same surface — so this helper is
 * another place where "the three real exonodes satisfy the wider type" is asked of the compiler
 * rather than asserted in a comment. It takes the WIDE component type and is handed `ROW`, which
 * is declared against the narrow one: that direction is free because a wire's exonode parameter
 * is contravariant, which is the same rule the LEAF/PAGE pair below is about.
 */
const listOf = (tag: string, component: TExoMachine<TExoChildrenWiring>, n: number) => {
    const items: number[] = [];
    for (let i = 0; i < n; i++) items.push(i);
    return createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let rows!: TExoChildrenPort;
            b.el(tag, null, (parent) => {
                rows = parent.childrenPort();
            });
            return { rows };
        },
        (P): TExoMachineInitialState<TExoChildrenWiring> =>
            (c) => {
                c.list(P.rows, component, items);
            }
    );
};

describe('one wire, three backends', () => {
    it('is accepted by all three entry points with no cast, and the two renders agree byte for byte', () => {
        // NO `as never` ANYWHERE BELOW. That is the assertion: `ExoStrBackend.render` wants a
        // `TExoStrMachine`, `ExoDomBackend`'s `render` and `hydrate` want a `TExoDomMachine`,
        // and one value satisfies all three only while those are the same shape.
        const LIST = listOf('ul', ROW, 3);
        const fromServer = EXO_STR.render(LIST);
        const parent = host();
        EXO_BACKEND.render(LIST, parent);
        expect(parent.innerHTML).toBe(fromServer);
    });

    it('adopts its own server output and attaches the listener the markup could not carry', () => {
        const LIST = listOf('ul', ROW, 3);
        const parent = host();
        parent.innerHTML = EXO_STR.render(LIST);
        const before = parent.innerHTML;
        EXO_BACKEND.hydrate(LIST, parent);

        expect(parent.innerHTML).toBe(before);
        clicked = -1;
        parent
            .querySelectorAll('.row')[2]
            .dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(clicked).toBe(2);
    });
});

/**
 * THE ONE CALL ON THE SHARED SURFACE THAT DOES NOT DO THE SAME THING ON ALL THREE BACKENDS — and
 * the value the tests above cannot see it with.
 *
 * Every hydrate assertion in this file is `expect(parent.innerHTML).toBe(before)`, which is the
 * right question for those cases and is BLIND here: it cannot tell "hydration correctly left
 * correct bytes alone" from "hydration silently dropped a fill", because the wire fills the same
 * bytes the server printed. So the drift is put in the DATA — one cell, read by a `set` and bound
 * by a `bind` in the same wire, moved between the server render and the adoption — and the two
 * halves of one wire come out of hydration saying different things.
 *
 * WHICH IS THE DOCUMENTED BEHAVIOUR AND NOT A DEFECT PARKED HERE. A `bind` has a SOURCE, so
 * hydration can re-read it and repair the markup (`TExoHydrateNode.bind` →
 * `repair-attribute`); a `set` has a value and nothing to re-read it from, and its entry in the
 * hydrate schema's table is the shared no-op (`compileExoHydrateSchema`, `ignoreExoFill`). The cost of
 * repairing it anyway would be a `getAttribute` per set port per row at the page's most contended
 * moment — paid by every honest fill for the rare environment-dependent one — where `bind` charges
 * only the port that needs it. What was wrong was the SILENCE about it: `TExoWiring.set` said
 * "the signature every backend agrees on" while naming the string backend's `bind` divergence and
 * not this one. It names both now, and this is the test that keeps it true.
 */
const drift = source('server');

const DRIFT_SCHEMA = createExoSchema((b) => {
    let stamped!: TExoAttrPort;
    let bound!: TExoAttrPort;
    let label!: TExoTextPort;
    b.el('li', { class: 'drift' }, (li) => {
        stamped = li.port('data-stamped');
        bound = li.port('data-bound');
        li.el('span', null, (span) => {
            label = span.textPort();
        });
    });
    return { stamped, bound, label };
});
// ONE VALUE, THREE FILLS. Two read the cell and hand over the value; the third is an effect that
// follows it over the same door. Everything else about them is identical, which is what makes any
// difference in the assertions attributable to the call and to nothing else.
const mDrift = createExoMachine<TExoMachineNode>(DRIFT_SCHEMA);
const DRIFT = composeExoMachine(
    mDrift,
    (m) =>
        withExoTransitions(m, {
            showDrift: (c) => {
                c.attr(DRIFT_SCHEMA.ports.bound, drift.getValue());
            },
        }),
    (m) =>
        withExoWire(m, (c) => {
            c.attr(DRIFT_SCHEMA.ports.stamped, drift.getValue());
            c.text(DRIFT_SCHEMA.ports.label, drift.getValue());
        }),
    (m) => {
        const { showDrift } = m.transitions;
        return withExoEffects(m, (effect) => {
            effect((c) => {
                showDrift(c);
                return drift.onChange(() => showDrift(c));
            });
        });
    }
);

describe('every fill repairs when the client disagrees with the served bytes', () => {
    it('repairs an attribute, a text port and a composed binding alike', () => {
        drift.setValue('server');
        const served = EXO_STR.render(DRIFT);
        expect(served).toContain('data-stamped="server"');
        expect(served).toContain('data-bound="server"');

        const parent = host();
        parent.innerHTML = served;
        // The client disagrees with the server about all three — a price in the client's locale,
        // a media query, a flag that flipped while the bundle was downloading.
        drift.setValue('client');
        const dispose = EXO_BACKEND.hydrate(DRIFT, parent);

        const li = parent.querySelector('li') as Element;
        // ALL THREE ARE REPAIRED, and the asymmetry this case was written to pin is GONE. It
        // existed because the compare lived behind `bind`; an adopting fill now reads what the
        // server printed, compares, and writes only on disagreement — so a plain `attr` or
        // `text` repairs exactly as a composed binding does, and a page cannot be left showing
        // data the client no longer holds.
        expect(li.getAttribute('data-bound')).toBe('client');
        expect(li.getAttribute('data-stamped')).toBe('client');
        expect((parent.querySelector('span') as Element).textContent).toBe('client');

        dispose();
    });

    it('is hydration and not the wire: a client RENDER of the same component writes ‘client’', () => {
        // The other half of the claim. If the wire itself were producing 'server' the case above
        // would prove nothing about hydration, so the same component is rendered from scratch
        // against the same cell in the same state.
        drift.setValue('client');
        const parent = host();
        const dispose = EXO_BACKEND.render(DRIFT, parent);

        const li = parent.querySelector('li') as Element;
        expect(li.getAttribute('data-stamped')).toBe('client');
        expect(li.getAttribute('data-bound')).toBe('client');
        expect((parent.querySelector('span') as Element).textContent).toBe('client');

        dispose();
    });
});

describe('the WIDER surface — a wire that nests, on the same three backends', () => {
    it('renders and serves the same bytes for a nested instance, with no cast', () => {
        // The same absence-of-a-cast assertion, one level up: `c.one(P.slot, LEAF, 'nested')` is
        // typed against `TExoChildrenWiring`, and `PAGE` is handed to `@exodra/string`'s
        // renderer and to this package's straight from that one declaration.
        const LIST = listOf('div', PAGE, 2);
        const fromServer = EXO_STR.render(LIST);
        const parent = host();
        EXO_BACKEND.render(LIST, parent);
        expect(parent.innerHTML).toBe(fromServer);
        expect(fromServer).toContain('<span class="leaf">nested</span>');
    });

    it('adopts the server’s nested markup rather than appending beside it', () => {
        const LIST = listOf('div', PAGE, 2);
        const parent = host();
        parent.innerHTML = EXO_STR.render(LIST);
        const before = parent.innerHTML;
        const leaves = Array.from(parent.querySelectorAll('.leaf'));
        expect(leaves).toHaveLength(2);
        EXO_BACKEND.hydrate(LIST, parent);

        expect(parent.innerHTML).toBe(before);
        // ADOPTED, not rebuilt: the very elements the server's markup was parsed into are the
        // ones still standing. A nested instance that had been appended instead would leave
        // these behind as inert bytes under a duplicate, which the byte compare above cannot
        // see once the duplicate is identical. Compared by IDENTITY, one by one, because that
        // is the only thing "adopted" means.
        const after = Array.from(parent.querySelectorAll('.leaf'));
        expect(after).toHaveLength(2);
        expect(after[0]).toBe(leaves[0]);
        expect(after[1]).toBe(leaves[1]);
    });
});
