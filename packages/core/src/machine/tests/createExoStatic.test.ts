import { describe, expect, it } from 'vitest';
import { EXO_NO_EFFECTS } from '../constants/EXO_NO_EFFECTS';
import { EXO_NO_HANDLERS } from '../constants/EXO_NO_HANDLERS';
import { createExoStatic } from '../factories/createExoStatic';
import type { TExoChildrenWiring } from '@exodra/core';
import type { TExoPort } from '@exodra/core';
import { createExoSchema } from '../../schema/factories/createExoSchema';
import { exoSchemaShape } from '../../schema/tests/exoSchemaShape';

describe('createExoStatic', () => {
    it('builds a machine that arms nothing and shares the two empty lists', () => {
        const A = createExoStatic((b) => {
            b.el('div', { class: 'a' });
        });
        const B = createExoStatic((b) => {
            b.el('span');
        });
        expect(A.createInitialState).toBeNull();
        expect(A.effects).toBe(EXO_NO_EFFECTS);
        expect(A.handlers).toBe(EXO_NO_HANDLERS);
        expect(B.effects).toBe(A.effects);
        expect(B.handlers).toBe(A.handlers);
    });

    it('is a machine — the same five fields, so every entry point takes it unchanged', () => {
        const S = createExoStatic((b) => {
            b.el('hr');
        });
        expect(Object.keys(S).sort()).toEqual([
            'createInitialState',
            'declaration',
            'effects',
            'forms',
            'handlers',
        ]);
        expect(S.declaration.portList).toHaveLength(0);
        expect(S.forms).toEqual([]);
    });

    it('refuses a cursor that declared ports, because nothing would ever fill them', () => {
        // The failure this prevents is silent: an attribute stuck empty and a text position
        // stuck blank on a page that renders without error.
        expect(() =>
            createExoStatic((b) => {
                b.el('div', null, (d) => {
                    d.port('data-id');
                });
            })
        ).toThrow(/1 port/);
    });

    it('still refuses a cursor that produced no element at all', () => {
        expect(() => createExoStatic(() => undefined)).toThrow(/no element/);
    });

    it('carries the same static markup the schema builder does on its own', () => {
        // `createExoStatic` is a SHORTHAND and not a second kind of schema, so the shape it
        // describes must be the one `createExoSchema` describes from the same markup. The
        // builder underneath both is what settles it.
        const viaStatic = createExoStatic((b) => {
            b.el('div', { class: 'details' }, (d) => d.text('details…'));
        });
        const viaBuilder = createExoSchema((b) => {
            b.el('div', { class: 'details' }, (d) => d.text('details…'));
            return {};
        });
        expect(viaStatic.declaration.rootTag).toBe(viaBuilder.rootTag);
        expect(exoSchemaShape(viaStatic.declaration).attrs).toEqual(
            exoSchemaShape(viaBuilder).attrs
        );
        expect(viaStatic.declaration.portList).toHaveLength(viaBuilder.portList.length);
    });
});

/** See `check-misplaced-property-port.test.ts` for what this simulates and what it cannot. */
function underProduction<T>(fn: () => T): T {
    const before = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
        return fn();
    } finally {
        if (before === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = before;
    }
}

describe("createExoStatic's port refusal is NOT dev-only — it ships", () => {
    // WHY IT IS NOT STRIPPABLE. `build` is an arbitrary function a host application supplies, and
    // a cursor that LOOPS declares a number of ports that the developer's copy of the data never
    // showed. What a stripped build then accepted was a static machine — one that fills nothing —
    // standing in front of ports that stay empty for the life of the page, with no error anywhere
    // and both backends agreeing, so no parity test can see it either.
    //
    // The source SHAPE — that the guard is the test of a `? :` and not the head of an `if` — is
    // asserted in `check-misplaced-property-port.test.ts`, which checks this file among the three.

    it('refuses a cursor that declared ports under NODE_ENV=production', () => {
        expect(() =>
            underProduction(() =>
                createExoStatic((b) => {
                    b.el('div', null, (d) => {
                        d.port('data-id');
                    });
                })
            )
        ).toThrow('EXO0019');
    });

    it('refuses ports that came from DATA — the case a stripped build could not see', () => {
        // Nobody typed a port call twice here: the count is whatever the configuration says, and
        // an empty list on this machine is a non-empty one on a user's.
        const badges = ['data-kind', 'data-tone'];
        expect(() =>
            underProduction(() =>
                createExoStatic((b) => {
                    b.el('span', null, (s) => {
                        for (const attr of badges) s.port(attr);
                    });
                })
            )
        ).toThrow('EXO0019');
    });

    it('carries the bare code in production and the COUNT in dev', () => {
        // The code is bare, so how many ports were declared is development's — and that count is
        // the fact a re-run on the author's own data does not always reproduce.
        const message = (): string => {
            try {
                createExoStatic((b) => {
                    b.el('div', null, (d) => {
                        d.port('data-id');
                    });
                });
            } catch (e) {
                return (e as Error).message;
            }
            return '';
        };
        const short = underProduction(message);
        const long = message();

        expect(short).toBe('EXO0019');
        expect(long).toContain(
            'createExoStatic: this schema declared 1 port(s), and a static component has nothing to ' +
                'fill them'
        );
        expect(long).toContain('createExoMachine and fill them');
        expect(long).not.toContain('EXO0019');
        expect(long.length).toBeGreaterThan(short.length);
    });

    it('refuses items for a static component — the reason this is a separate function', () => {
        // THE CLAIM THIS PINS is `createExoStatic`'s own header: `TProps` is `void`, so
        // `c.list(port, STATIC, items)` stops compiling, because a component that fills
        // nothing cannot be given anything to fill from. Until the test files of this
        // repository were type-checked at all, that claim was a sentence in a comment and
        // nothing could contradict it.
        //
        // IT IS A TWO-WAY LOCK, which a runtime assertion cannot be. If the refusal ever stops
        // firing, the directive becomes an
        // UNUSED one and TypeScript reports it — so the gate goes red on the day the hole
        // opens, not on the day somebody notices.
        //
        // WHY IT COULD OPEN. The props position is contravariant, so making a static wire
        // assignable where specific props are wanted means widening `TProps` past `number` —
        // and `list` infers `TItem` from BOTH `items` (covariantly) and the wire (contra-),
        // preferring the covariant candidate whenever it is a subtype of the other. `unknown`
        // admits every item type, so widening to it makes this very call legal. Anyone who
        // reaches for that trade meets this line.
        const STATIC = createExoStatic((b) => {
            b.el('li');
        });
        const check = (c: TExoChildrenWiring, port: TExoPort): void => {
            // @ts-expect-error a static component fills nothing, so it takes no items
            c.list(port, STATIC, Array.from({ length: ['a', 'b'] }));
        };
        expect(typeof check).toBe('function');
    });

    it('still builds a port-free static component under production', () => {
        // The other half: what ships is a REFUSAL, not a scare. A component with markup and
        // nothing to fill is the ordinary case and must keep building.
        const S = underProduction(() =>
            createExoStatic((b) => {
                b.el('div', { class: 'spinner' });
            })
        );
        expect(S.effects).toBe(EXO_NO_EFFECTS);
        expect(S.declaration.portList).toHaveLength(0);
    });
});
