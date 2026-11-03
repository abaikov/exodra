import { describe, expect, it } from 'vitest';
import { assertExoNoTextAfterChildrenPort } from '../asserts/assertExoNoTextAfterChildrenPort';

/**
 * THE REFUSAL SHIPS. Static text after a children port is a shape that RENDERS on both backends
 * and renders DIFFERENTLY: the region is anchored on the next static ELEMENT, so the browser puts
 * its rows after the text while the server prints them before it, and hydration then counts
 * sibling hops to a position that does not exist. Nothing errors, both pages look plausible, and
 * this file is the only place in the repository that says no — so a build that folds it away has
 * no second line of defence.
 *
 * Written `if (guard && COND) throw`, a production build deletes it entirely, condition included.
 * It uses the second shape from the two-baskets note in `createExoSchema.ts` instead.
 *
 * THE UNIT IS CALLED DIRECTLY HERE, and the two backends' end-to-end refusals are pinned in
 * `@exodra/dom`'s `void-and-shape.test.ts` ("is refused by the STRING backend too, in the same
 * words"). This file is about WHEN the function refuses, which is a question about the function.
 *
 * The source SHAPE — that the guard is the test of a `? :` and not the head of an `if` — is
 * asserted in `check-misplaced-property-port.test.ts`, which checks this file among the three.
 */

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

describe('assertExoNoTextAfterChildrenPort is NOT dev-only — it ships', () => {
    it('carries the bare code in production, and the element and the whole sentence in dev', () => {
        const message = (): string => {
            try {
                assertExoNoTextAfterChildrenPort('section', ' items');
            } catch (e) {
                return (e as Error).message;
            }
            return '';
        };
        const short = underProduction(message);
        const long = message();

        expect(short).toBe('EXO0014');
        expect(short).not.toContain('Wrap the text in an element');
        expect(long).toContain('<section>');
        expect(long).toContain('" items"');
        expect(long).toContain('Wrap the text in an element');
        expect(long).toContain('anchored on the next static ELEMENT');
        expect(long.length).toBeGreaterThan(short.length);
        expect(long).not.toContain('EXO0014');
    });

    it('still accepts an EMPTY run under production, which is not a divergence', () => {
        // A text kid holding the empty string emits nothing, occupies no position and moves no
        // anchor. Refusing it would refuse a program that renders correctly on both backends —
        // and production must apply the same rule as development, not a widened one.
        expect(() =>
            underProduction(() => assertExoNoTextAfterChildrenPort('p', ''))
        ).not.toThrow();
    });

    it('refuses a run that is only WHITESPACE, because a Text node is still a node', () => {
        // The distinction this function draws is empty vs. not, and a space is not empty: the
        // parser builds a Text node for it, the region anchors past it, and the orders diverge
        // exactly as they do for a word. Pinned so that "trim it first" is a change somebody has
        // to make deliberately.
        expect(() => underProduction(() => assertExoNoTextAfterChildrenPort('p', ' '))).toThrow(
            'EXO0014'
        );
    });
});
