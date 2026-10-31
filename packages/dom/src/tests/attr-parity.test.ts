// @vitest-environment jsdom
//
// WHAT EACH BACKEND PRINTS FOR AN ATTRIBUTE PORT, VALUE BY VALUE — the table, written as
// assertions so that it cannot rot.
//
// This matters more than it looks. Hydration works because the bytes the server sent and the
// tree the browser would have built are the SAME thing, so a value that the two backends
// disagree about is not an error anywhere: it is a wrong attribute on a live page, found by a
// user. `dom/exo-dom-backend-render.test.ts` already pins byte parity for ordinary string values;
// what nobody had written down is the four values where the two backends used to diverge, and
// `exo-writer-for-port.ts` and `repair-attribute.ts` both referred to that divergence in their
// comments without anything checking that it was still what happened.
//
//   value        DOM backend        string backend      agree?
//   null         REMOVED            REMOVED             yes
//   undefined    REMOVED            REMOVED             yes
//   false        REMOVED            REMOVED             yes
//   true         data-x=""          data-x=""           yes
//   0            data-x="0"         data-x="0"          yes
//   ''           data-x=""          data-x=""           yes
//
// THE FOUR DISAGREEMENTS ARE GONE, and the server is what moved. The DOM side was the one to
// keep — `disabled` present with ANY value, including the string "false", is a disabled
// control, so removal is the only thing that can express "not disabled" — and the server used
// to be unable to remove anything, because ` name="` and its closing quote were merged into the
// static pieces on either side of the port. They now belong to the port's WRITER
// (`exo-writer-for-port`), which can decline to write them; the MERGE the SSR path is measured at
// 2x for is untouched, since the number of pieces did not change, only which strings two of
// them start and end with.
//
// So this file pins each backend's ACTUAL output value by value, and then pins that the two
// agree — separately, so that a careless "let us make null print something sensible" has to
// break two assertions and read this comment before it can land.
import { withExoSchemaAsserts } from '@exodra/core';
import type {
    TExoSchemaCursor,
    TExoAttrPort,
    TExoChildrenPort,
    TExoSchemaDecorator,
    TExoTextPort,
    TExoMachineInitialState,
} from '@exodra/core';
import { describe, expect, it } from 'vitest';

import { host, createExoTestMachine } from '@exodra/test-utils';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

const EXO_BACKEND = withExoCompiler(new ExoDomBackend());
const EXO_STR = new ExoStrBackend();

/** The only exonode call these wires make. A method, so real exonodes satisfy it. */
type TSetting = {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
};

/** One element, one attribute port, nothing else — so the markup is the attribute and no more. */
const portedDiv = (attribute: string) => (b: TExoSchemaCursor) => {
    let x!: TExoAttrPort;
    b.el('div', null, (d) => {
        x = d.port(attribute);
    });
    return { x };
};

/** One component per case: the value under test is baked into the wire. */
const divWith = (
    attribute: string,
    value: unknown,
    decorate?: TExoSchemaDecorator<{ x: TExoAttrPort }>
) =>
    createExoTestMachine(
        portedDiv(attribute),
        (P): TExoMachineInitialState<TSetting> =>
            (c) => {
                c.attr(P.x, value);
            },
        decorate
    );

/** Render one instance through the DOM backend and hand back the markup it produced. */
const fromDom = (component: ReturnType<typeof divWith>): string => {
    const parent = host();
    EXO_BACKEND.render(component, parent);
    return parent.innerHTML;
};

const fromStr = (component: ReturnType<typeof divWith>): string => EXO_STR.render(component);

/**
 * The six values, each with what the two backends are CURRENTLY observed to print.
 *
 * Changing an expectation here is not a test fix, it is a decision about what a page looks
 * like — which is why they are spelled out per backend rather than derived from each other.
 */
const CASES: ReadonlyArray<{
    readonly what: string;
    readonly value: unknown;
    readonly dom: string;
    readonly str: string;
}> = [
    { what: 'null', value: null, dom: '<div></div>', str: '<div></div>' },
    {
        what: 'undefined',
        value: undefined,
        dom: '<div></div>',
        str: '<div></div>',
    },
    { what: 'false', value: false, dom: '<div></div>', str: '<div></div>' },
    {
        what: 'true',
        value: true,
        dom: '<div data-x=""></div>',
        str: '<div data-x=""></div>',
    },
    { what: '0', value: 0, dom: '<div data-x="0"></div>', str: '<div data-x="0"></div>' },
    {
        what: 'the empty string',
        value: '',
        dom: '<div data-x=""></div>',
        str: '<div data-x=""></div>',
    },
];

describe('an ordinary attribute port, value by value', () => {
    for (const c of CASES) {
        it(`${c.what}: the DOM prints ${c.dom} and the server prints ${c.str}`, () => {
            // THE TABLE, EXECUTED. If either half of this ever changes, somebody changed what
            // a page looks like — a removed attribute is not a cosmetic difference for
            // `disabled`, `hidden`, `checked` or any `aria-*`, and an added one is not either.
            expect(fromDom(divWith('data-x', c.value))).toBe(c.dom);
            expect(fromStr(divWith('data-x', c.value))).toBe(c.str);
        });
    }
});

describe('byte parity between the backends', () => {
    /**
     * EVERY VALUE, ASSERTED AS PARITY — which is a different statement from the table above
     * and is the one hydration actually needs. The table says what each backend prints; this
     * says they are the same string, so a change that moves BOTH in the same wrong direction
     * still has to explain itself to the table, and a change that moves one has to explain
     * itself here.
     *
     * FOUR OF THESE USED TO BE `it.fails`: `null`, `undefined` and `false` (the server printed
     * `data-x=""`, `data-x=""` and `data-x="false"` where the DOM removed the attribute) and
     * `true` (the server printed `data-x="true"`). They are plain assertions now. If one of
     * them ever fails again, the page it describes is wrong in the browser before anybody
     * looks at a test: an attribute that is present with a falsy value is still present, which
     * is what `disabled="false"` means to a browser.
     */
    for (const c of CASES) {
        it(`${c.what} renders byte-identically`, () => {
            expect(fromDom(divWith('data-x', c.value))).toBe(fromStr(divWith('data-x', c.value)));
        });
    }
});

describe('a class port', () => {
    // WHERE THE REMOVAL RULE STOPS, and it is worth pinning because it looks like it should be
    // the same case and is not. `class` is written through the `className` PROPERTY, which has
    // no removal case at all — `exo-attr-setter` coerces null to `''` — so BOTH backends leave
    // `class=""` standing where an ordinary attribute would have vanished, and `true`
    // stringifies to `class="true"` where an ordinary attribute would be `data-x=""`.
    //
    // The two backends still agree on every value, which is the point: the rule that changed is
    // a rule about `setAttribute`, and this port never reaches it.
    for (const c of CASES) {
        it(`${c.what} renders byte-identically`, () => {
            expect(fromDom(divWith('class', c.value))).toBe(fromStr(divWith('class', c.value)));
        });
    }

    it('keeps the attribute for null, where an ordinary attribute is removed', () => {
        // The difference between the two rules, in one pair of lines. Both are pinned as bytes
        // because "they agree" is also true of two backends that are both wrong.
        expect(fromStr(divWith('class', null))).toBe('<div class=""></div>');
        expect(fromStr(divWith('data-x', null))).toBe('<div></div>');
    });

    it('stringifies true, where an ordinary attribute prints the empty value', () => {
        expect(fromStr(divWith('class', true))).toBe('<div class="true"></div>');
        expect(fromStr(divWith('data-x', true))).toBe('<div data-x=""></div>');
    });
});

describe('a port NAMED className', () => {
    it('is refused where it is declared, before either compiler sees it', () => {
        // FOUND WHILE WRITING THE TABLE ABOVE, and it was a real divergence rather than a
        // spelling preference.
        //
        // Both compilers put the port's name into the markup as the schema spells it, and the
        // DOM backend's setter does not use that name: `class` goes through the className
        // PROPERTY. So the browser ended up with a meaningless `classname=""` from the parsed
        // markup AND a real `class="…"` the setter added, while the server printed one
        // `className="…"` that a browser parses as `classname`. Same wiring, two different
        // elements, and neither of them the one that was asked for.
        //
        // The spelling is now refused in `assertExoLegalAttrName`, so no schema carrying it reaches a
        // compiler at all, and the refusal says which name to write instead.
        expect(() => divWith('className', 'a b', withExoSchemaAsserts)).toThrow(
            /write "class", not "className"/
        );
    });
});

describe('a property port', () => {
    it('is a divergence for a STRING property, on purpose, and the keystroke is why', () => {
        // `value`, `checked`, `selected` are names where the attribute and the property are
        // different things: the attribute is the control's INITIAL state and the property is its
        // live one, and after a user types, `setAttribute('value', …)` moves nothing on screen. So
        // the DOM backend writes the PROPERTY, and for `value` it stops there — this backend prints
        // NO `value` attribute at all, while the server has only the attribute to print into. The
        // bytes differ, and this case says so.
        //
        // THE ATTRIBUTE IS NOT MERELY BYTES, IT IS THE RESET VALUE, and for the two BOOLEAN
        // members of the family that made it a real bug: `defaultChecked` IS the `checked`
        // attribute, so a client-rendered `checked={false}` box came back TICKED from
        // `form.reset()` where the served one came back empty. Those two therefore DO write the
        // attribute after the property (`checked` on an `<input>`, `selected` on an `<option>` —
        // see the case below and `property-parity.test.ts` for the whole family), which is
        // invisible on screen because the property assignment has already set the control's dirty
        // flag, and which costs one extra DOM write per DATA CHANGE.
        //
        // `value` DOES NOT, AND THE ONE-WORD REASON IS "KEYSTROKE". A two-way bound field fills
        // this port from every `input` event, so syncing the attribute there is an
        // extra DOM write per character typed, bought against a reset-value claim that is a
        // judgement call in either direction. `exo-attr-setter` states the trade; the
        // `defaultValue` case in `property-parity.test.ts` states what it gives up.
        //
        // Writing the attribute INSTEAD of the property is still the bug behind "clearing the form
        // silently did nothing", and `dom/form-state.test.ts` is what holds that line: it drives a
        // control the user has already touched.
        const INPUT = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                let v!: TExoAttrPort;
                b.el('input', null, (i) => {
                    v = i.port('value');
                });
                return { x: v };
            },
            (P): TExoMachineInitialState<TSetting> =>
                (c) => {
                    c.attr(P.x, 'typed');
                }
        );

        const parent = host();
        EXO_BACKEND.render(INPUT, parent);
        // The live property carries the value. The reset value does not, and the bytes say so:
        // this used to print `<input value="">`, the empty placeholder the compiler reserved for
        // the port's position; nothing reserves one now, so the attribute is absent entirely.
        // `defaultValue` reads `''` either way — an absent `value` attribute and an empty one are
        // the same reset value — so what changed is the markup, not the control.
        expect((parent.firstElementChild as HTMLInputElement).value).toBe('typed');
        expect((parent.firstElementChild as HTMLInputElement).defaultValue).toBe('');
        expect(parent.innerHTML).toBe('<input>');
        expect(EXO_STR.render(INPUT)).toBe('<input value="typed">');
    });

    it('serves an unticked checkbox UNTICKED, which is the one thing the bytes must say', () => {
        // THIS TEST USED TO PIN THE BUG. The server printed `checked="false"` here, because a
        // property port's writer was kept as the pre-removal attribute rule on purpose while
        // the ordinary rule was being fixed — and in HTML the PRESENCE of a boolean attribute
        // is its value, so every reader of the served page saw a TICKED box for a wire that
        // says `false`, and every unselected radio in a group arrived selected. It was written
        // down as an open question; this is the answer.
        //
        // THE SERVER IS WHAT MOVED FIRST, and it had to: the DOM backend's bytes here were a
        // PLACEHOLDER (` checked=""` for every value, because the setter wrote the property and
        // never touched the attribute), so there was no byte on this side to copy. The DOM
        // backend has since caught up — its setter keeps the attribute in step behind the
        // property, and the compiler reserves no position for either — so the two print the same
        // string here. What they have to agree on is still the STATE, asserted below and, value by
        // value, in `property-parity.test.ts`.
        const BOX = createExoTestMachine(
            (b: TExoSchemaCursor) => {
                let v!: TExoAttrPort;
                b.el('input', { type: 'checkbox' }, (i) => {
                    v = i.port('checked');
                });
                return { x: v };
            },
            (P): TExoMachineInitialState<TSetting> =>
                (c) => {
                    c.attr(P.x, false);
                }
        );

        const parent = host();
        EXO_BACKEND.render(BOX, parent);
        // Unchecked on the client — the property is what the browser draws from — and the setter
        // removes the attribute behind it, so a reset does not tick it either.
        expect((parent.firstElementChild as HTMLInputElement).checked).toBe(false);
        expect((parent.firstElementChild as HTMLInputElement).defaultChecked).toBe(false);
        expect(parent.innerHTML).toBe('<input type="checkbox">');
        // And unchecked on the server, because the attribute is now ABSENT. Changing this
        // expectation is not a test fix: it is a decision to tick a box the wire says is empty.
        expect(EXO_STR.render(BOX)).toBe('<input type="checkbox">');

        const served = document.createElement('template');
        served.innerHTML = EXO_STR.render(BOX);
        expect((served.content.firstElementChild as HTMLInputElement).checked).toBe(false);
    });
});
