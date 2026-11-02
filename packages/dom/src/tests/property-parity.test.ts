// @vitest-environment jsdom
//
// WHAT EACH BACKEND PRODUCES FOR A *PROPERTY* PORT, VALUE BY VALUE — the table `attr-parity`
// is for ordinary attributes, for the four names where the attribute and the property are not
// the same thing: `value`, `checked`, `selected`, `indeterminate`.
//
// THE BYTES SPLIT BY *KIND OF PROPERTY*, AND THAT SPLIT IS THE WHOLE FILE.
// `compileExoDomSchema` leaves NO attribute in the prototype for a port, and `exo-attr-setter`
// then writes the PROPERTY. Where it stops there, the DOM backend prints no bytes for that port
// whatever the value is: `<input>` for a wire that says `'typed'`, while the server has no
// property to write and only the attribute to print into.
//
// THAT LEAVES A CONTROL WHOSE *RESET* VALUE DOES NOT FOLLOW ITS DATA. The attribute a control is
// parsed with IS its reset value — `defaultChecked` is the `checked` attribute, `defaultValue` is
// the `value` one — so a client-rendered `checked={false}` box came back TICKED from
// `form.reset()` while the served one came back empty. One component, one wire, two forms.
//
// IT IS CLOSED FOR A BOOLEAN PROPERTY AND DELIBERATELY LEFT OPEN FOR A STRING ONE. `checked` and
// `selected` get the attribute written AFTER the property (see `exo-attr-setter` for why the
// order makes the second write invisible), so both backends print the same bytes for them and a
// reset restores the same control. `value` does NOT: it fills on EVERY KEYSTROKE of a two-way
// bound field, so an attribute write there is one extra DOM write per character typed, against a
// "reset value" claim that is a judgement call in either direction. So the `value` row below has
// TWO columns and says out loud what each backend prints, and the `defaultValue` case further
// down asserts what the client render actually restores rather than a parity it does not have.
//
// WHAT STILL MATTERS MORE IS THE STATE. The server's bytes exist to be PARSED; the control a
// browser builds out of them has to be the control a client render would have produced, or the
// served page is wrong before a line of JavaScript runs — and hydration, which adopts those very
// nodes, adopts a wrong control. That is what the second table below asserts: the property on an
// element parsed from the server's markup, against the property on an element the DOM backend
// built. It is kept even where the bytes agree, because equal bytes are the EVIDENCE and the
// control is the claim — `indeterminate` has no bytes on either side and still differs.
//
// THE BUG THIS FILE WAS WRITTEN FOR. The server's property writer had no removal rule, so
// `checked={false}` printed `checked="false"` — and in HTML the PRESENCE of a boolean attribute
// is its value, so that is a TICKED box, and every unselected radio in a group was served
// selected. The rule that replaced it is TRUTHINESS → PRESENCE for a boolean property, which is
// deliberately not the ordinary `null`/`undefined`/`false` removal rule: that one still serves
// `checked=""` for `''` and `checked="0"` for `0`, both of which tick the box.
import {
    EXO_DOM_PROPERTIES,
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoEffects,
    createExoSchema,
    withExoSchemaAsserts,
} from '@exodra/core';
import type {
    TExoSchemaCursor,
    TExoAttrPort,
    TExoChildrenPort,
    TExoMachineNode,
    TExoSchemaDecorator,
    TExoTextPort,
    TExoMachineInitialState,
} from '@exodra/core';
import { describe, expect, it } from 'vitest';

import { host, source, createExoTestMachine } from '@exodra/test-utils';
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

/**
 * One control per property name, chosen so the name is a REAL property of the element — which is
 * what makes it a property port at all. Both backends decide that from the (TAG, NAME) pair now
 * (`exoDomPropertyKind` in `@exodra/core`), so this table is the pair each name is a property ON;
 * every OTHER element is an ordinary attribute on both sides, and the last describe in this file
 * is where that is pinned.
 *
 * `<option>` stands ALONE rather than inside a `<select>`, on purpose: a single-option select
 * runs the "ask for a reset" algorithm and re-selects the option the moment anything deselects
 * it, so every value would agree at `true` and the table would assert nothing.
 */
const CONTROLS: Readonly<
    Record<string, { readonly tag: string; readonly attrs: Record<string, string> | null }>
> = {
    value: { tag: 'input', attrs: null },
    checked: { tag: 'input', attrs: { type: 'checkbox' } },
    selected: { tag: 'option', attrs: null },
    indeterminate: { tag: 'input', attrs: { type: 'checkbox' } },
};

/** One element, one property port, nothing else — so the markup is the control and no more. */
const controlWith = (name: string, value: unknown) => {
    const control = CONTROLS[name];
    return createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let p!: TExoAttrPort;
            b.el(control.tag, control.attrs, (e) => {
                p = e.port(name);
            });
            return { x: p };
        },
        (P): TExoMachineInitialState<TSetting> =>
            (c) => {
                c.attr(P.x, value);
            }
    );
};

/** The element a DOM render actually built, and the markup it serialises to. */
const built = (name: string, value: unknown): Element => {
    const parent = host();
    EXO_BACKEND.render(controlWith(name, value), parent);
    return parent.firstElementChild as Element;
};

const domBytes = (name: string, value: unknown): string => {
    const parent = host();
    EXO_BACKEND.render(controlWith(name, value), parent);
    return parent.innerHTML;
};

const strBytes = (name: string, value: unknown): string => EXO_STR.render(controlWith(name, value));

/**
 * The element a BROWSER builds out of the server's bytes — the only thing those bytes are for,
 * and the nodes hydration adopts. Parsed in a `<template>` so nothing is loaded or laid out.
 */
const served = (name: string, value: unknown): Element => {
    const holder = document.createElement('template');
    holder.innerHTML = strBytes(name, value);
    return holder.content.firstElementChild as Element;
};

const property = (el: Element, name: string): unknown =>
    (el as unknown as Record<string, unknown>)[name];

/** The six values every port kind in this suite is asked about. */
const VALUES: ReadonlyArray<{ readonly what: string; readonly value: unknown }> = [
    { what: 'null', value: null },
    { what: 'undefined', value: undefined },
    { what: 'false', value: false },
    { what: 'true', value: true },
    { what: 'the empty string', value: '' },
    { what: 'a string', value: 'x' },
];

/**
 * THE BYTES — spelled out value by value rather than derived from anything, because every one of
 * them is a decision about what a page looks like.
 *
 * ONE COLUMN WHERE THE TWO BACKENDS AGREE, A PAIR WHERE THEY DO NOT. `checked`, `selected` and
 * `indeterminate` are one string each, asserted against BOTH backends, which is what makes a
 * future divergence a red test rather than a second column nobody notices has drifted. `value` is
 * a pair, because the DOM backend deliberately does not write that attribute — see the head of
 * this file, and `exo-attr-setter` for the trade. Writing the pair out rather than dropping the
 * DOM assertion is the point: a DOM column that quietly grew a value, or a server column that
 * quietly lost one, both have to come through here.
 */
const BYTES: ReadonlyArray<{
    readonly name: string;
    readonly bytes: Readonly<
        Record<string, string | { readonly dom: string; readonly str: string }>
    >;
}> = [
    {
        name: 'value',
        // THE DOM COLUMN IS NOTHING, SIX TIMES. `value` on an `<input>` is a STRING property whose
        // setter writes the property and nothing else, so this backend leaves no `value` attribute
        // behind at all. This column read `<input value="">` six times while the compiler reserved
        // a position for every attribute port; it reserves none, and the empty placeholder that
        // used to stand for the life of the page is gone. `defaultValue` is `''` either way — an
        // absent `value` attribute and an empty one are the same reset value — so the CONTROL is
        // untouched and only the bytes moved.
        bytes: {
            // `null` prints the EMPTY VALUE on the server and not an absent attribute:
            // `HTMLInputElement.value` is `[LegacyNullToEmptyString]`, so `el.value = null` is an
            // empty box and the bytes that produce an empty box carry the attribute.
            null: { dom: '<input>', str: '<input value="">' },
            undefined: { dom: '<input>', str: '<input value="">' },
            // A STRING property stringifies, so these are the words the SERVER prints. `false`
            // printing nothing would be an empty box where the client render shows the text
            // "false".
            false: { dom: '<input>', str: '<input value="false">' },
            true: { dom: '<input>', str: '<input value="true">' },
            'the empty string': { dom: '<input>', str: '<input value="">' },
            'a string': { dom: '<input>', str: '<input value="x">' },
        },
    },
    {
        name: 'checked',
        bytes: {
            // PRESENCE IS THE VALUE. Every falsy value leaves the attribute out — including `''`
            // and `0`, which the ordinary removal rule would have printed as a present (ticked)
            // attribute.
            null: '<input type="checkbox">',
            undefined: '<input type="checkbox">',
            false: '<input type="checkbox">',
            true: '<input type="checkbox" checked="">',
            'the empty string': '<input type="checkbox">',
            'a string': '<input type="checkbox" checked="">',
        },
    },
    {
        name: 'selected',
        bytes: {
            null: '<option></option>',
            undefined: '<option></option>',
            false: '<option></option>',
            true: '<option selected=""></option>',
            'the empty string': '<option></option>',
            'a string': '<option selected=""></option>',
        },
    },
    {
        name: 'indeterminate',
        bytes: {
            // NOTHING, FOR EVERY VALUE, ON BOTH BACKENDS. `indeterminate` has no markup form at
            // all — that is what `EXO_DOM_PROPERTIES` records by giving the name the value
            // `false` — so there is no attribute a browser would read it from. The server used to
            // print `indeterminate="true"`, an attribute no parser gives any meaning to; the DOM
            // backend kept an ` indeterminate=""` PLACEHOLDER standing for the life of the page,
            // which is the same claim in the other direction, on the backend that had no need to
            // make it at all. No attribute port leaves anything in the prototype now
            // (`compileExoDomSchema`). The STATE below is where this name genuinely differs, and
            // it differs because HTML has no way to express it — not because either backend prints
            // bytes.
            null: '<input type="checkbox">',
            undefined: '<input type="checkbox">',
            false: '<input type="checkbox">',
            true: '<input type="checkbox">',
            'the empty string': '<input type="checkbox">',
            'a string': '<input type="checkbox">',
        },
    },
];

describe('a property port, byte by byte', () => {
    for (const row of BYTES) {
        for (const v of VALUES) {
            const expected = row.bytes[v.what];
            const str = typeof expected === 'string' ? expected : expected.str;
            const dom = typeof expected === 'string' ? expected : expected.dom;
            const title =
                str === dom
                    ? `${row.name}=${v.what}: both backends print ${str}`
                    : `${row.name}=${v.what}: the server prints ${str} and the DOM ${dom}`;
            it(title, () => {
                expect(strBytes(row.name, v.value)).toBe(str);
                expect(domBytes(row.name, v.value)).toBe(dom);
            });
        }
    }
});

/**
 * THE STATE, WHICH IS THE CLAIM THAT MATTERS — the control a browser builds from the server's
 * bytes against the control the DOM backend builds. This is what a reader of the served page
 * sees before the bundle arrives, and what hydration adopts.
 *
 * WHERE THEY CANNOT AGREE THE ENTRY IS THE PAIR THEY ACTUALLY PRODUCE, served first — an
 * ordinary assertion of what happens and not an `it.fails` holding a wish. There is exactly one
 * such name and it is `indeterminate`, whose reason is HTML's own and is written out below: no
 * bytes a server can send produce that state, so "they differ" is not a defect to be closed but
 * the shape of the platform, and the suite pins the shape. The day either side moves, the pair
 * stops matching and the test goes red asking to be read.
 */
const STATE: ReadonlyArray<{
    readonly name: string;
    readonly agrees: Readonly<
        Record<string, true | { readonly served: unknown; readonly built: unknown }>
    >;
}> = [
    {
        name: 'value',
        agrees: {
            null: true,
            // THIS USED TO BE THE ONE GAP ON `value`, and it was ours rather than the DOM's.
            // `el.value = undefined` converts through IDL `DOMString`, which stringifies
            // everything except `null`, so a client render put the literal text "undefined" in a
            // box the served page showed empty. `exo-attr-setter`'s property branch now maps
            // `undefined` to `null` before the assignment — the same rule its attribute branch
            // always kept, and the same rule the server keeps.
            undefined: true,
            false: true,
            true: true,
            'the empty string': true,
            'a string': true,
        },
    },
    {
        name: 'checked',
        agrees: {
            null: true,
            undefined: true,
            false: true,
            true: true,
            'the empty string': true,
            'a string': true,
        },
    },
    {
        name: 'selected',
        agrees: {
            null: true,
            undefined: true,
            false: true,
            true: true,
            'the empty string': true,
            'a string': true,
        },
    },
    {
        name: 'indeterminate',
        agrees: {
            null: true,
            undefined: true,
            false: true,
            // NOT A DIVERGENCE AT ALL ONCE IT IS STATED PROPERLY, which is why these two entries
            // are pairs and not a wish. `indeterminate` is live client state with NO content
            // attribute anywhere in HTML — that is what `EXO_DOM_PROPERTIES` records by giving
            // the name the kind `false` — so there are no bytes a server could send that would
            // produce it. The served page shows a plain unticked box and the client render shows
            // a dashed one, and asserting anything else would be asserting that HTML has a
            // feature it does not have.
            //
            // WHAT WOULD HAVE TO CHANGE TO LIFT IT: nothing in this repository. It is HTML's own
            // rule, and the only thing that closes it is running JavaScript. Hydration is exactly
            // that: `repair-attribute` finds the attribute absent where a truthy value wants it
            // present and writes the property through the live setter, so a BOUND indeterminate
            // port is right the moment the page hydrates. A `set()` one is not —
            // `compileExoHydrateSchema` silences every value fill — and that is a gap in which
            // entries that table silences, not in these bytes.
            true: { served: false, built: true },
            'the empty string': true,
            // The string goes through the IDL boolean conversion on the client and comes out
            // `true`; the server has nothing to print either way.
            'a string': { served: false, built: true },
        },
    },
];

describe('the control a browser ends up with', () => {
    for (const row of STATE) {
        for (const v of VALUES) {
            const outcome = row.agrees[v.what];
            if (outcome === true) {
                it(`${row.name}=${v.what}: the served page and the client render agree`, () => {
                    expect(property(served(row.name, v.value), row.name)).toBe(
                        property(built(row.name, v.value), row.name)
                    );
                });
            } else {
                it(`${row.name}=${v.what}: the served page has ${String(
                    outcome.served
                )} and the client render ${String(outcome.built)}`, () => {
                    // BOTH SIDES SPELLED OUT rather than compared to each other: "they differ" is
                    // satisfied by any two wrong values, and the whole reason this case is here is
                    // that each side is separately correct for what it can express.
                    expect(property(served(row.name, v.value), row.name)).toBe(outcome.served);
                    expect(property(built(row.name, v.value), row.name)).toBe(outcome.built);
                });
            }
        }
    }
});

describe('the boolean/string split the server has to know about', () => {
    it('accounts for every name in EXO_DOM_PROPERTIES', () => {
        // ANTI-DRIFT, and it is the one thing this file cannot assert behaviourally. The server
        // has no element to ask, so `string/constants/string-property-names` carries the list of
        // property names whose markup form holds a STRING, and everything else in
        // `EXO_DOM_PROPERTIES` gets the PRESENCE rule.
        //
        // That default is deliberate and is why a new name does not have to be classified to be
        // safe: presence is the rule that cannot serve `disabled="false"` on a page. This test
        // exists for the other direction — a name added to core whose markup form is a string
        // would silently be served as a boolean attribute — so both lists are spelled out here
        // and asserted to be exactly the table, and a new name arrives as a failure that names
        // the file to edit rather than as a wrong control.
        const presence = ['checked', 'selected', 'indeterminate'];
        const stringy = ['value'];
        expect(Object.keys(EXO_DOM_PROPERTIES).sort()).toEqual([...presence, ...stringy].sort());
    });

    it('is not the ordinary removal rule, which would still tick the box', () => {
        // THE DIFFERENCE, IN THE TWO VALUES THAT SHOW IT. `null`/`undefined`/`false` → absent is
        // the ordinary attribute rule and would have been the easy fix; it leaves `''` and `0`
        // printing a PRESENT attribute, and a present `checked` is a ticked box whatever it
        // holds. Truthiness is what makes those two right.
        expect(strBytes('checked', '')).toBe('<input type="checkbox">');
        expect(strBytes('checked', 0)).toBe('<input type="checkbox">');
        expect((served('checked', '') as HTMLInputElement).checked).toBe(false);
        expect((served('checked', 0) as HTMLInputElement).checked).toBe(false);
    });

    it('restores the same box on a form RESET as the served page does', () => {
        // THE BUG THIS CLOSED, kept in full because the argument for the fix is the argument for
        // the cost it carries.
        //
        // `defaultChecked` is the `checked` ATTRIBUTE, and it is what `form.reset()` puts back.
        // The DOM backend's prototype used to carry ` checked=""` for every `checked` port — a
        // port had to occupy a position — so a client-rendered box was `defaultChecked` whatever
        // the wire said, and a reset TICKED a box the data says is empty. It used to be
        // symmetrical by accident: the server printed `checked="false"`, which is also a present
        // attribute, so both sides were wrong in the same way. The server was fixed first, and
        // for a while the two differed.
        //
        // WHAT CLOSED IT. NOT dropping the placeholder on its own — that alone only flips which
        // side is wrong, since `checked={true}` would then build a box whose `defaultChecked` is
        // false where the server's ` checked=""` makes it true. It is the SETTER that closes it:
        // it keeps the attribute in step with the value AFTER writing the property
        // (`exo-attr-setter`) — property first, so the control's dirty flag is already set and the
        // attribute write moves nothing on screen, then `setAttribute`/`removeAttribute` on
        // truthiness. With that in place the placeholder has nothing left to do, and it is gone.
        //
        // WHAT IT COSTS, AND WHY THE COST IS AFFORDABLE *HERE* AND NOT FOR `value`: one extra DOM
        // write per FILL, and a `checked` port fills when the DATA changes. A `value` port on a
        // two-way bound field fills on every KEYSTROKE, which is why that one writes the property
        // alone — see `exo-attr-setter`, and the `defaultValue` case below for what that gives up.
        expect((served('checked', false) as HTMLInputElement).defaultChecked).toBe(
            (built('checked', false) as HTMLInputElement).defaultChecked
        );
        expect((built('checked', false) as HTMLInputElement).defaultChecked).toBe(false);
    });

    it('restores the same box for a TICKED one, which is the direction that flips', () => {
        // The other half, and the one that says the fix is not "remove the placeholder": a truthy
        // value has to leave the attribute PRESENT, or a reset would untick a box the data says
        // is ticked.
        expect((served('checked', true) as HTMLInputElement).defaultChecked).toBe(
            (built('checked', true) as HTMLInputElement).defaultChecked
        );
        expect((built('checked', true) as HTMLInputElement).defaultChecked).toBe(true);
    });

    it('restores the same OPTION, which is the other BOOLEAN member of the family', () => {
        // `defaultSelected` is the `selected` attribute, and every word above about
        // `defaultChecked` is true of it: same setter, same boolean branch, same line. Asserted
        // separately because "the family" is a claim about each member.
        expect((served('selected', true) as HTMLOptionElement).defaultSelected).toBe(
            (built('selected', true) as HTMLOptionElement).defaultSelected
        );
        expect((built('selected', true) as HTMLOptionElement).defaultSelected).toBe(true);
        expect((served('selected', false) as HTMLOptionElement).defaultSelected).toBe(
            (built('selected', false) as HTMLOptionElement).defaultSelected
        );
        expect((built('selected', false) as HTMLOptionElement).defaultSelected).toBe(false);
    });

    it('does NOT restore the same TEXT, and that is the guarantee traded for the keystroke', () => {
        // ═══ THIS CASE USED TO ASSERT PARITY, AND THE PARITY IS GONE ON PURPOSE ═══
        //
        // SAID PLAINLY, BECAUSE IT IS A REAL GUARANTEE BEING GIVEN UP RATHER THAN A TEST BEING
        // TIDIED: `defaultValue` is the `value` attribute, `form.reset()` restores it, and a
        // client-rendered field has NO `value` attribute whatever the wire said — so its
        // `defaultValue` is `''` — where the served page's is the text the server printed. So
        // `form.reset()` on a
        // client-rendered text field empties it, and on a hydrated one restores what the response
        // carried rather than what the model last wrote. That is a real difference between a
        // served form and a client-rendered one, and nothing in this repository closes it.
        //
        // WHY IT IS TRADED. The attribute sync costs one DOM write per FILL, and `value` on a
        // field written back on every keystroke fills on every keystroke, so the parity above was
        // being bought at one extra DOM write per character typed for the life of every form on
        // the page. `checked`/`selected` fill when the data changes, which is why they keep it.
        // The other half — a checkbox coming back TICKED against its data — is a visible
        // correctness bug; "which of two plausible texts does reset restore" is not.
        //
        // ASSERTED AS THE PAIR EACH SIDE ACTUALLY PRODUCES, served first, exactly as the
        // `indeterminate` rows above are: "they differ" is satisfied by any two wrong values, and
        // what is being pinned is that each side is separately what its own bytes say.
        expect((served('value', 'x') as HTMLInputElement).defaultValue).toBe('x');
        expect((built('value', 'x') as HTMLInputElement).defaultValue).toBe('');

        // The LIVE property still agrees, which is the half that matters on screen and is
        // asserted value by value in the state table above.
        expect((served('value', 'x') as HTMLInputElement).value).toBe('x');
        expect((built('value', 'x') as HTMLInputElement).value).toBe('x');
    });

    it('still moves a control the user has touched, whatever the attribute says', () => {
        // THE ASSERTION THAT KEEPS THE PROPERTY WRITE HONEST, and the one whose absence would let
        // "clearing the form silently did nothing" back in. Writing the attribute INSTEAD of the
        // property moves nothing on screen once the control is dirty; the property is the write
        // the browser draws from, and for `value` it is now the ONLY write this setter makes.
        //
        // The control is fired by a SOURCE, so that the second and third values reach the SAME
        // element — a second `render` would build a second control and prove nothing —
        // and the user's own edit happens in between, exactly where it does on a real page.
        const model = source<unknown>('Anna');
        const schema = createExoSchema((b: TExoSchemaCursor) => {
            let p!: TExoAttrPort;
            b.el('input', null, (e) => {
                p = e.port('value');
            });
            return { x: p };
        });
        const m = createExoMachine<TExoMachineNode>(schema);
        const FIELD = composeExoMachine(
            m,
            (m) =>
                withExoTransitions(m, {
                    show: (c) => {
                        c.attr(schema.ports.x, model.getValue());
                    },
                }),
            (m) =>
                withExoEffects(m, (effect) => {
                    effect((c) => {
                        show(c);
                        return model.onChange(() => show(c));
                    });
                })
        );
        const { show } = FIELD.transitions;

        const parent = host();
        EXO_BACKEND.render(FIELD, parent);
        const input = parent.firstElementChild as HTMLInputElement;
        expect(input.value).toBe('Anna');

        // The user types. From here on the attribute is not what the browser draws from.
        input.value = 'Andrei';
        // And the application clears the form.
        model.setValue('');
        expect(input.value).toBe('');
        model.setValue('Anna');
        expect(input.value).toBe('Anna');
        // AND THE RESET VALUE DID NOT MOVE AT ALL — no `value` attribute, three fills later.
        // Pinned rather than left unsaid, because this is the one line that would go green again
        // the moment somebody re-adds the `setAttribute` to the string branch, and the case above
        // says why that is not a fix.
        expect(input.defaultValue).toBe('');
    });

    it('keeps a string property stringifying, where presence would empty the box', () => {
        // The mirror of the case above: applying the presence rule to `value` would serve an
        // EMPTY input for `value={false}` where a client render shows the text "false".
        expect(strBytes('value', false)).toBe('<input value="false">');
        expect((served('value', false) as HTMLInputElement).value).toBe('false');
    });
});

// ============================================================ THE SAME NAME, ANOTHER ELEMENT
//
// EVERYTHING ABOVE IS ABOUT `<input>` AND `<option>`, AND THAT WAS THE BUG. `EXO_DOM_PROPERTIES`
// records four NAMES, and the server applied their rules to every element that carried one —
// so `port('value')` was written with the `<input>` rule on an `<option>`, a `<button>`, a
// `<select>` and a `<div>` alike. The DOM backend asked the ELEMENT and did something else in
// every one of those cases. Neither side was checked, because this file only ever built the
// element each name is a property on.
//
// The pair is decided by `exoDomPropertyKind(tag, name)` now, read by BOTH compilers, and it splits
// three ways:
//
//   ORDINARY ATTRIBUTE   `value` on <option>/<button>/<li>/…, `checked` on a <div>: the property
//                        (where there is one) is the content attribute reflected, with no live
//                        state behind it, so both backends write the attribute and both REMOVE
//                        it for a nullish value. Byte parity, which the property ports above
//                        cannot have.
//   PROPERTY, MARKUP     `value`/`checked` on an <input>, `selected` on an <option> — the tables
//                        at the top of this file.
//   PROPERTY, NO MARKUP  `value` on <select>/<textarea>/<output>: none of them HAS a `value`
//                        content attribute, so the server prints NOTHING rather than bytes that
//                        make a claim the page cannot honour.
/** One element, one port on it, and the value baked into the wire. */
const portedOn = (
    tag: string,
    name: string,
    value: unknown,
    decorate?: TExoSchemaDecorator<{ x: TExoAttrPort }>
) =>
    createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let p!: TExoAttrPort;
            b.el(tag, null, (e) => {
                p = e.port(name);
            });
            return { x: p };
        },
        (P): TExoMachineInitialState<TSetting> =>
            (c) => {
                c.attr(P.x, value);
            },
        decorate
    );

const domOf = (tag: string, name: string, value: unknown): string => {
    const parent = host();
    EXO_BACKEND.render(portedOn(tag, name, value), parent);
    return parent.innerHTML;
};

const strOf = (tag: string, name: string, value: unknown): string =>
    EXO_STR.render(portedOn(tag, name, value));

describe('a name that is a plain reflected attribute on THIS element', () => {
    /**
     * Every value, both tags, and the ONE string both backends must print.
     *
     * `<option>` is the case the reviewer found: its `value` IDL attribute reflects the content
     * attribute, and an option with NO `value` attribute takes its value from its own TEXT. So
     * `null` must REMOVE the attribute — which is what the DOM backend does through the ordinary
     * path, and what the server used to get wrong by printing ` value=""`, an option whose value
     * is the empty string. `option.value = null` through the PROPERTY would have been worse
     * still: `HTMLOptionElement.value` is not `[LegacyNullToEmptyString]`, so it stringifies and
     * leaves `value="null"`.
     */
    const CASES: ReadonlyArray<{
        readonly what: string;
        readonly value: unknown;
        readonly attr: string;
    }> = [
        { what: 'a string', value: 'x', attr: ' value="x"' },
        { what: 'null', value: null, attr: '' },
        { what: 'undefined', value: undefined, attr: '' },
        { what: 'false', value: false, attr: '' },
        { what: 'true', value: true, attr: ' value=""' },
        { what: 'the empty string', value: '', attr: ' value=""' },
    ];

    for (const tag of ['option', 'button']) {
        for (const c of CASES) {
            it(`value=${c.what} on a <${tag}>: both backends print <${tag}${c.attr}>`, () => {
                const markup = `<${tag}${c.attr}></${tag}>`;
                expect(strOf(tag, 'value', c.value)).toBe(markup);
                expect(domOf(tag, 'value', c.value)).toBe(markup);
            });
        }
    }

    it('gives an <option> back its TEXT fallback when the value is nullish', () => {
        // The whole point of removing rather than emptying, stated as the thing a user sees: an
        // `<option>` with no `value` attribute is worth its own label, and one with `value=""`
        // submits nothing.
        const holder = document.createElement('template');
        holder.innerHTML = '<select>' + strOf('option', 'value', null) + '</select>';
        const option = holder.content.querySelector('option') as HTMLOptionElement;
        option.textContent = 'Anna';
        expect(option.value).toBe('Anna');
    });

    it('treats `checked` on a <div> as the attribute it is, on both backends', () => {
        // The other half of the same residue, and the one that showed up as a difference in the
        // VALUE rather than in the presence: the server applied the boolean-property PRESENCE
        // rule by name, printing ` checked=""` for `'x'`, where the DOM backend — which asks the
        // element and finds no such property — wrote ` checked="x"`.
        expect(strOf('div', 'checked', 'x')).toBe('<div checked="x"></div>');
        expect(domOf('div', 'checked', 'x')).toBe('<div checked="x"></div>');
        expect(strOf('div', 'checked', false)).toBe('<div></div>');
        expect(domOf('div', 'checked', false)).toBe('<div></div>');
    });

    it('treats `value` on a <div> as the attribute it is, on both backends', () => {
        // The residue named in `exo-writer-for-port` for months: the server printed ` value=""` for
        // `null` where the DOM backend removed the attribute.
        expect(strOf('div', 'value', null)).toBe('<div></div>');
        expect(domOf('div', 'value', null)).toBe('<div></div>');
    });
});

describe('a `value` port on an element with no `value` attribute at all', () => {
    /**
     * `<select>`, `<textarea>` and `<output>` have a `value` IDL attribute and NO `value` content
     * attribute. `select.value` picks the option whose value matches, `textarea.value` is the
     * element's text, `output.value` is its text — none of them is markup the server can write.
     *
     * SO THE SERVER PRINTED NOTHING, WHICH WAS HONEST ABOUT THE BYTES AND STILL THE WRONG PAGE.
     * That is what this describe used to pin, with the last case red on purpose: a `<select>`
     * whose data says the second option was SERVED on the first, until the bundle arrived and
     * forever without one. "No bytes" is only the right answer when there are no bytes to be had.
     *
     * TWO OF THE THREE ARE REFUSED WHERE THE SCHEMA IS DECLARED NOW (`@exodra/core`'s
     * `check-misplaced-property-port`), because their state DOES have a markup form — just not in
     * this port's slot, and both compilers cut exactly one slot per port:
     *
     *   <select>   ` selected` on the OPTION, a different element, later in the document. The
     *              refusal names `port('selected')`, which is a `true` pair (property AND
     *              markup) on both backends, and works when the options are a list.
     *   <output>   the element's own TEXT — `output.value` acts like `textContent` — so a
     *              `textPort()` says it, on both backends, with nothing user-editable to drift.
     *
     * `<textarea>` IS NOT REFUSED AND ITS GAP IS STILL OPEN, which the case below states rather
     * than hides. Its markup form is the element's text too, but a textarea's text is only its
     * DEFAULT value: after the user types, writing it moves nothing on screen. Refusing `value`
     * there would hand back "clearing the form silently did nothing", so the port stays and the
     * served bytes stay empty.
     *
     * WHAT DID *NOT* CHANGE: `indeterminate` above, which is a property with no markup form
     * ANYWHERE, and is therefore not this defect at all.
     */
    /** The shape that is refused: the chosen option said on the `<select>` itself. */
    const selectValuePort = (value: unknown) =>
        createExoTestMachine(
            (b: TExoSchemaCursor) => {
                let p!: TExoAttrPort;
                b.el('select', null, (s) => {
                    p = s.port('value');
                    s.el('option', { value: 'a' }, (o) => {
                        o.text('A');
                    });
                    s.el('option', { value: 'b' }, (o) => {
                        o.text('B');
                    });
                });
                return { x: p };
            },
            (P): TExoMachineInitialState<TSetting> =>
                (c) => {
                    c.attr(P.x, value);
                },
            withExoSchemaAsserts
        );

    /**
     * The same select said the way the refusal names it: one `selected` port per `<option>`,
     * filled from the chosen value — which is what `@exodra/forms`' `writeExoChoice` writes too.
     */
    const chooseOption = (chosen: string) =>
        createExoTestMachine(
            (b: TExoSchemaCursor) => {
                let first!: TExoAttrPort;
                let second!: TExoAttrPort;
                b.el('select', null, (s) => {
                    s.el('option', { value: 'a' }, (o) => {
                        first = o.port('selected');
                        o.text('A');
                    });
                    s.el('option', { value: 'b' }, (o) => {
                        second = o.port('selected');
                        o.text('B');
                    });
                });
                return { first, second };
            },
            (P): TExoMachineInitialState<TSetting> =>
                (c) => {
                    c.attr(P.first, chosen === 'a');
                    c.attr(P.second, chosen === 'b');
                }
        );

    it('refuses a `value` port on a <select>, and names the option port instead', () => {
        // THE REFUSAL FIRES WHERE THE SCHEMA IS BUILT, so it is `createExoTestMachine` that throws and
        // neither backend ever sees the shape — which is what "both backends" means here. The
        // message is asserted for the FIX it names, not only for the fault: a refusal that says
        // "no" without saying "say it this way instead" would just be a feature deleted.
        expect(() => selectValuePort('b')).toThrow(
            'ExoSchemaCursor.port(): port("value") on <select> cannot be SERVED'
        );
        expect(() => selectValuePort('b')).toThrow("port('selected')");
        expect(() => selectValuePort('b')).toThrow('writeExoChoice');
        // The value is irrelevant — the SHAPE is what is refused, at module-load time, before any
        // data exists.
        expect(() => selectValuePort(null)).toThrow('cannot be SERVED');
    });

    it('refuses a `value` port on an <output>, and names the text port instead', () => {
        expect(() => portedOn('output', 'value', 'x', withExoSchemaAsserts)).toThrow(
            'ExoSchemaCursor.port(): port("value") on <output> cannot be SERVED'
        );
        expect(() => portedOn('output', 'value', 'x', withExoSchemaAsserts)).toThrow('textPort()');
    });

    it('prints no value attribute on a <textarea>, which is an OPEN gap and not a fix', () => {
        // WHAT THIS PINS IS A DEFECT, deliberately, because the alternative is worse and the
        // honest thing is to say which. The server has no attribute to print, so it prints none
        // — and a served textarea is therefore EMPTY where the data says otherwise, exactly the
        // wrong page the `<select>` case was refused for. It is not refused because its only
        // other spelling, the element's text, is its DEFAULT value: it stops moving the control
        // the moment the user types, so the substitute would trade a wrong page for a dead
        // control. Closing it needs a port that writes into the element's CONTENT slot instead of
        // its tag, which is a change to the schema both backends share.
        expect(strOf('textarea', 'value', 'x')).toBe('<textarea></textarea>');
    });

    it('serves the <select> on the option the client render shows', () => {
        // THE CASE THIS FILE WAS RED FOR, and it is green because the defect is closed rather
        // than because the claim was weakened: the assertion is still "the served page and the
        // client render put the user on the same option", asked of the spelling that is now the
        // only one there is.
        const holder = document.createElement('template');
        holder.innerHTML = EXO_STR.render(chooseOption('b'));
        const parent = host();
        EXO_BACKEND.render(chooseOption('b'), parent);
        expect((holder.content.firstElementChild as HTMLSelectElement).value).toBe('b');
        expect((parent.firstElementChild as HTMLSelectElement).value).toBe('b');
    });

    it('prints the same bytes on both backends, with `selected` on the chosen option', () => {
        // The evidence under the claim above, spelled out: one string, both backends, and the
        // attribute standing on the OPTION where a browser reads it from.
        const markup =
            '<select><option value="a">A</option>' +
            '<option value="b" selected="">B</option></select>';
        expect(EXO_STR.render(chooseOption('b'))).toBe(markup);
        const parent = host();
        EXO_BACKEND.render(chooseOption('b'), parent);
        expect(parent.innerHTML).toBe(markup);
    });

    it('still drives the control in the browser, from the option port', () => {
        // The other direction of the same table: the DOM backend moves the selection through the
        // option's live `selected` property, and the setter brings the attribute into step behind
        // it — so the chosen option carries ` selected=""` and the other carries nothing, out of a
        // prototype where neither option had the attribute to begin with.
        const parent = host();
        EXO_BACKEND.render(chooseOption('a'), parent);
        const select = parent.querySelector('select') as HTMLSelectElement;
        expect(select.value).toBe('a');
        expect(select.selectedIndex).toBe(0);
        expect(parent.innerHTML).toBe(
            '<select><option value="a" selected="">A</option>' +
                '<option value="b">B</option></select>'
        );
    });
});
