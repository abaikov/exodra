// What a port does to its value here, held against what the other three backends do with it.
//
// `exoTermWriterForPort` is a RE-DERIVATION: `@exodra/core` exports `exoAttribute` (the markup
// spelling, the `class`/`className` answer) and stops, so the VALUE rule was written here out of the
// other backends' PROSE rather than out of their code. Each of the five cases below carries the
// value the other three backends produce next to it. See `createClassWriter` for why "`class` has no
// removal case" and "`class` is not `setAttribute` at all" are two separate implementations.
import type { TExoWiring, TExoAttrPort, TExoMachineInitialState } from '@exodra/core';
import { describe, expect, it } from 'vitest';
import { ExoTermBackend } from '../../backend/ExoTermBackend';
import { createExoTestMachine } from '@exodra/test-utils';

/** ONE BACKEND FOR THE FILE, AT MODULE LOAD — the schema cache is keyed on it by pointer. */
const BACKEND = new ExoTermBackend();

/**
 * The five values a port can be handed, one per rendered row, so the whole rule prints as one
 * artefact and a divergence in any case is one comparison rather than five.
 *
 * The backends this is derived from, on a `class` port:
 *
 *     'card wide' → class="card wide"   dom: className = String(value)
 *     null        → class=""            dom: className = value == null ? '' : …
 *     undefined   → class=""            string: createClassWriter, nullish returns head + '"'
 *     false       → class="false"       dom:    className = nullish ? '' : String(value)
 *     true        → class="true"        …the same String(value) — `class` has no boolean form
 */
const CASES: readonly unknown[] = ['card wide', null, undefined, false, true];

/** A `class` port. */
const CLASS_PORT = createExoTestMachine(
    (b) => {
        let cls!: TExoAttrPort;
        b.el('div', null, (div) => {
            cls = div.port('class');
        });
        return { cls };
    },
    (P): TExoMachineInitialState<TExoWiring> =>
        (c, row) => {
            c.attr(P.cls, CASES[row]);
        }
);

/** An ordinary attribute port taking the same five values, so the contrast is on one screen. */
const ATTR_PORT = createExoTestMachine(
    (b) => {
        let flag!: TExoAttrPort;
        b.el('div', null, (div) => {
            flag = div.port('data-flag');
        });
        return { flag };
    },
    (P): TExoMachineInitialState<TExoWiring> =>
        (c, row) => {
            c.attr(P.flag, CASES[row]);
        }
);

describe('an attribute port, filled with each of the five values a wire can hand it', () => {
    it('writes a class port the way a `className` assignment would, and never the word "null"', () => {
        const screen = BACKEND.renderScreen(CLASS_PORT, CASES.length);

        // THE THREE CASES THAT REGRESS if `class` is routed through the `setAttribute` rules:
        // `null` prints `class="null"`, `undefined` prints `class="undefined"`, `true` prints
        // `class=""`. Only the real string and `false` agree either way.
        expect(screen.text()).toBe(
            [
                'div class="card wide"',
                'div class=""',
                'div class=""',
                'div class="false"',
                'div class="true"',
            ].join('\n')
        );

        // And read off the live tree as well, because `attrs` is what a terminal renderer of
        // someone else's making would read — the serialiser is one consumer of it, not the shape.
        const classOf = (row: number): string | undefined => screen.roots[row].attrs.class;
        expect(classOf(0)).toBe('card wide');
        // `null` and `undefined` are ONE value in this project — "the wire said nothing" — and on
        // a property assignment that value is the empty string, NOT an absent attribute.
        expect(classOf(1)).toBe('');
        expect(classOf(2)).toBe('');
        // `false` and `true` are not boolean-attribute cases here: `el.className = false` puts the
        // four characters "false" in the attribute, and there is no way for a property assignment
        // to mean "no attribute".
        expect(classOf(3)).toBe('false');
        expect(classOf(4)).toBe('true');

        // THE KEY IS ALWAYS PRESENT, which is the other half of "no removal case": a `class` port
        // that was set to `null` leaves `class=""` STANDING, and an element carrying `class=""` is
        // a different element from one carrying no `class` at all.
        for (let row = 0; row < CASES.length; row++) {
            expect(Object.prototype.hasOwnProperty.call(screen.roots[row].attrs, 'class')).toBe(
                true
            );
        }

        screen.dispose();
    });

    it('keeps the ordinary attribute rule intact — nullish and false REMOVE, true is empty', () => {
        // The `class` writer was split out of this one, and the split is only worth anything if
        // this branch still REMOVES: `disabled="false"` is a disabled control, so `false` must
        // leave no attribute.
        const screen = BACKEND.renderScreen(ATTR_PORT, CASES.length);

        expect(screen.text()).toBe(
            ['div data-flag="card wide"', 'div', 'div', 'div', 'div data-flag=""'].join('\n')
        );

        const attrsOf = (row: number): Record<string, string> => screen.roots[row].attrs;
        expect(attrsOf(0)['data-flag']).toBe('card wide');
        expect(Object.prototype.hasOwnProperty.call(attrsOf(1), 'data-flag')).toBe(false);
        expect(Object.prototype.hasOwnProperty.call(attrsOf(2), 'data-flag')).toBe(false);
        expect(Object.prototype.hasOwnProperty.call(attrsOf(3), 'data-flag')).toBe(false);
        expect(attrsOf(4)['data-flag']).toBe('');

        screen.dispose();
    });
});
