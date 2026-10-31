// The schema slot: that this backend caches on the declaration, caches ONCE, and touches nobody
// else's slot. `exoTermSchemaOf` takes a LINK on `schema.domSchema`, which is not `@exodra/dom`'s field
// but the slot for a KIND OF OUTPUT — a schema that builds a LIVE TREE, which a terminal tree is.
// The link says who compiled it (`owner`) and what follows it (`next`); see `exoTermSchemaOf.ts`.
//
// WHAT THE LAST CASE PINS: that a term compile leaves the MARKUP slot alone and writes a link this
// package can find again on the live-tree one. Nothing more — it calls `exoTermSchemaOf` and no other
// PACKAGE's accessor, so `@exodra/dom` crossing into this chain would leave it green. This file
// cannot call another package's backend, because `imports-only-core.test.ts` states the exact
// inventory of specifiers a file here may name; that crossing is pinned in
// `packages/conformance/src/tests/the-schema-slots-do-not-collide.test.ts` instead.
//
// WHAT THE SECOND CASE PINS IS THE PRICE OF THIS BACKEND BEING A SERVICE: the chain is
// keyed on the BACKEND OBJECT, so two terminal backends take two links and two compiles of one
// schema. That is not a leak and not an eviction — it is what a caller pays for building more than
// one backend, and it is why every caller in this tree builds exactly one, at module load.
//
// THE COLLISION ITSELF IS PINNED IN
// `packages/conformance/src/tests/the-schema-slots-do-not-collide.test.ts`, the one place in the
// repository where two backends can be handed the same declaration. A crossed slot makes a render
// evict the other's schema and recompile, silently and per instance, with byte-identical output —
// invisible in output and expensive in time, which is why it is asserted by object identity.
import type { TExoWiring, TExoTextPort, TExoMachineInitialState } from '@exodra/core';
import { describe, expect, it } from 'vitest';
import { ExoTermBackend } from '../../backend/ExoTermBackend';
import { exoTermSchemaOf } from '../exoTermSchemaOf';
import { createExoTestMachine } from '@exodra/test-utils';

/**
 * ONE BACKEND FOR THE FILE, AT MODULE LOAD — and here it is the SUBJECT rather than a fixture: the
 * chain is keyed on this object by pointer, so "compiles once" below means "once per (schema,
 * backend)" and the second case would fail outright with a second backend in it.
 */
const BACKEND = new ExoTermBackend();

const CARD = createExoTestMachine(
    (b) => {
        let title!: TExoTextPort;
        b.el('div', { class: 'card' }, (div) => {
            title = div.textPort();
        });
        return { title };
    },
    (P): TExoMachineInitialState<TExoWiring> =>
        (c, i) => {
            c.text(P.title, i);
        }
);

describe('exoTermSchemaOf', () => {
    it('leaves machine.forms empty until something renders the machine', () => {
        const FRESH = createExoTestMachine(
            (b) => {
                b.el('p', {}, () => undefined);
                return {};
            },
            (): TExoMachineInitialState<TExoWiring, void> => () => undefined
        );
        expect(FRESH.forms).toEqual([]);
    });

    it('compiles once per (machine, backend) and hands back the same schema on every call', () => {
        const first = exoTermSchemaOf(CARD, BACKEND);
        expect(CARD.forms[BACKEND.backendType]).toBe(first);
        expect(exoTermSchemaOf(CARD, BACKEND)).toBe(first);
    });

    it('a SECOND backend compiles a second schema, and neither evicts the other', () => {
        const TWICE = createExoTestMachine(
            (b) => {
                b.el('aside', {}, () => undefined);
                return {};
            },
            (): TExoMachineInitialState<TExoWiring, void> => () => undefined
        );
        const second = new ExoTermBackend();

        const firstSchema = exoTermSchemaOf(TWICE, BACKEND);
        const secondSchema = exoTermSchemaOf(TWICE, second);

        expect(secondSchema).not.toBe(firstSchema);
        expect(TWICE.forms[BACKEND.backendType]).toBe(firstSchema);
        expect(TWICE.forms[second.backendType]).toBe(secondSchema);
        expect(exoTermSchemaOf(TWICE, BACKEND)).toBe(firstSchema);
        expect(exoTermSchemaOf(TWICE, second)).toBe(secondSchema);
        expect(firstSchema.backend).toBe(BACKEND);
        expect(secondSchema.backend).toBe(second);
    });
});
