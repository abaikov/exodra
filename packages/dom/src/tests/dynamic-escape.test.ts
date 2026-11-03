// @vitest-environment jsdom
//
// WHAT A *FILLED* VALUE DOES TO THE MARKUP — the half of escaping that had no test.
//
// `escape.test.ts` pins the two escape functions as units and pins that the two backends
// escape their STATIC markup the same way. `string/render-rows.test.ts` pins that the
// server escapes a filled value. What nobody had written down is the pair: a value that arrives
// at render time, through a port, on BOTH backends — which is where the legacy suite spent an
// entire file (`string/legacy/security.test.ts`) because it is where a payload gets in.
//
// TWO PROPERTIES ARE AT STAKE AND THEY ARE NOT THE SAME PROPERTY.
//
//  1. SAFETY. A value in a text position must not be able to open a tag; a value in an
//     attribute position must not be able to close the quote and start another attribute. This
//     is asserted on the RESULTING TREE — no `<script>`, no `<img>`, no second attribute — and
//     not on the bytes, because a tree is what a browser acts on.
//
//  2. AGREEMENT. Hydration works because the bytes the server sent and the tree the browser
//     would have built are the same thing. A value the two backends escape differently is not
//     an error on either side; it is a page that adopts wrong.
//
// The two are separated deliberately. Two backends that are both wrong in the same way satisfy
// (2) perfectly, and the legacy suite's hardest-won lesson was that "they agree" is not a
// security claim.
import { withExoSchemaAsserts } from '@exodra/core';
import type {
    TExoSchemaCursor,
    TExoAttrPort,
    TExoChildrenPort,
    TExoMachine,
    TExoSchemaDecorator,
    TExoTextPort,
    TExoMachineInitialState,
} from '@exodra/core';
import { describe, expect, it } from 'vitest';

import { host, createExoTestMachine } from '@exodra/test-utils';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

const EXO_BACKEND = withExoCompiler(new ExoDomBackend());
const EXO_STR = new ExoStrBackend();

/** The only exonode call these wires make. A method, so real exonodes satisfy it. */
type TSetting = {
    attr(port: TExoAttrPort, value: unknown): void;
    text(port: TExoTextPort, value: unknown): void;
    unsafeHtml(port: TExoChildrenPort, markup: unknown): void;
};

/** One element, one ATTRIBUTE port, nothing else — so the markup is the attribute and no more. */
const attrWith = (
    attribute: string,
    value: unknown,
    decorate?: TExoSchemaDecorator<{ x: TExoAttrPort }>
) =>
    createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let x!: TExoAttrPort;
            b.el('div', null, (d) => {
                x = d.port(attribute);
            });
            return { x };
        },
        (P): TExoMachineInitialState<TSetting> =>
            (c) => {
                c.attr(P.x, value);
            },
        decorate
    );

/** One element, one TEXT port, nothing else. */
const textWith = (value: unknown) =>
    createExoTestMachine(
        (b: TExoSchemaCursor) => {
            let t!: TExoTextPort;
            b.el('p', null, (p) => {
                t = p.textPort();
            });
            return { t };
        },
        (P): TExoMachineInitialState<TSetting> =>
            (c) => {
                c.text(P.t, value);
            }
    );

/** The element a DOM render actually built. */
const domElement = (component: TExoMachine<TExoDomNode>): Element => {
    const parent = host();
    EXO_BACKEND.render(component, parent);
    return parent.firstElementChild as Element;
};

const fromDom = (component: TExoMachine<TExoDomNode>): string => {
    const parent = host();
    EXO_BACKEND.render(component, parent);
    return parent.innerHTML;
};

/**
 * The element a BROWSER builds out of the server's bytes — which is the only thing the server's
 * output is for, and the right unit to compare against a client render for anything that is
 * about safety rather than about bytes.
 */
const parsed = (html: string): Element => {
    const holder = document.createElement('template');
    holder.innerHTML = html;
    return holder.content.firstElementChild as Element;
};

/**
 * The characters the two escapers name, plus one that looks harmless and is not.
 *
 * U+00A0 is in the list because it is the case NO DIFF WOULD EVER SHOW: a non-breaking space
 * and a space are the same picture, so a backend that stopped escaping it would look correct in
 * every screenshot and produce different bytes on every row that has one.
 */
const AWKWARD: ReadonlyArray<{ readonly what: string; readonly value: string }> = [
    { what: 'an ampersand', value: 'Ben & Jerry' },
    { what: 'an already-escaped entity', value: '&amp;lt;' },
    { what: 'a double quote', value: 'say "hi"' },
    { what: 'a single quote', value: "it's" },
    // Written as an escape SEQUENCE and never as the literal character, so that a file
    // saved, diffed or copied through anything that normalises whitespace cannot quietly
    // turn this into a case about a plain space — the rule `escapeExoAttributeValue` states
    // for the same reason.
    { what: 'a non-breaking space', value: 'a\u00A0b' },
    { what: 'a tag', value: '<b>bold</b>' },
    { what: 'a closing tag for the element it sits in', value: '</p><script>x</script>' },
];

describe('a value filled into a TEXT port', () => {
    for (const c of AWKWARD) {
        it(`renders byte-identically on both backends: ${c.what}`, () => {
            // Text is the position where the two escapers agree completely — `& < > U+00A0` is
            // both what `escapeExoText` writes and what the HTML serialisation algorithm writes
            // for a text node — so this is a straight byte comparison. If it ever stops being
            // one, the two backends have stopped producing the same page and hydration is
            // adopting markup it did not predict.
            expect(fromDom(textWith(c.value))).toBe(EXO_STR.render(textWith(c.value)));
        });
    }

    it('cannot open a tag, on either backend', () => {
        // THE SAFETY CLAIM, on the tree rather than on the bytes. The legacy suite asserted
        // this on `escapeHtml` in isolation; what matters to a user is that the payload never
        // becomes an element, whichever side rendered the page.
        const payload = '<img src=x onerror=alert(1)><script>alert(2)</script>';

        const built = domElement(textWith(payload));
        expect(built.querySelector('img')).toBeNull();
        expect(built.querySelector('script')).toBeNull();
        expect(built.textContent).toBe(payload);

        const served = parsed(EXO_STR.render(textWith(payload)));
        expect(served.querySelector('img')).toBeNull();
        expect(served.querySelector('script')).toBeNull();
        expect(served.textContent).toBe(payload);
    });

    it('survives a round trip through the server unchanged, character for character', () => {
        // The property a user notices: an apostrophe in a name, an ampersand in a company, a
        // non-breaking space in a price. Escaping is only correct if it is reversible.
        for (const c of AWKWARD) {
            expect(parsed(EXO_STR.render(textWith(c.value))).textContent).toBe(c.value);
        }
    });
});

describe('a value filled into an ATTRIBUTE port', () => {
    it('arrives intact on both backends, character for character', () => {
        // ASSERTED AS THE VALUE AND NOT AS THE BYTES, on purpose.
        //
        // The HTML serialisation algorithm escapes `& " U+00A0` in an attribute value and
        // deliberately leaves `<` and `>` alone — a quote is the only thing that can end a
        // value — while `escapeExoAttributeValue` escapes all five, on the grounds (stated in its
        // own comment) that Chromium's serialiser escapes the angle brackets too. Whichever of
        // those is true of a given engine, the ATTRIBUTE ITSELF is the same string on both
        // sides, and that is what a page is made of. Pinning bytes here would pin whichever
        // serialiser the test runner happens to ship.
        for (const c of AWKWARD) {
            expect(domElement(attrWith('data-x', c.value)).getAttribute('data-x')).toBe(c.value);
            expect(parsed(EXO_STR.render(attrWith('data-x', c.value))).getAttribute('data-x')).toBe(
                c.value
            );
        }
    });

    it('renders byte-identically for every character the two escapers agree on', () => {
        // The subset where bytes ARE the claim: everything except `<` and `>`, for the reason
        // above. Keeping this separate from the value assertion means a change to either
        // escaper has to break something that names it, rather than being absorbed.
        const agreed = AWKWARD.filter((c) => !/[<>]/.test(c.value));
        expect(agreed.length).toBeGreaterThan(0);
        for (const c of agreed) {
            expect(fromDom(attrWith('data-x', c.value))).toBe(
                EXO_STR.render(attrWith('data-x', c.value))
            );
        }
    });

    it('cannot close its quote and forge a second attribute, on either backend', () => {
        // THE SAFETY CLAIM for attribute position. A payload that escaped the quote would land
        // as a REAL `onclick`, which is a working exploit and not a cosmetic difference — and
        // it would land identically on both backends, so no parity test would notice.
        const payload = 'x" onclick="alert(1)';

        const built = domElement(attrWith('data-x', payload));
        expect(built.getAttribute('data-x')).toBe(payload);
        expect(built.hasAttribute('onclick')).toBe(false);

        const served = parsed(EXO_STR.render(attrWith('data-x', payload)));
        expect(served.getAttribute('data-x')).toBe(payload);
        expect(served.hasAttribute('onclick')).toBe(false);
    });

    it('cannot forge an attribute through a `class` port either, where the rules differ', () => {
        // `class` goes through the `className` PROPERTY on the DOM side and through its own
        // writer on the server, so it does not share a code path with the case above and needs
        // its own assertion. The legacy suite learned this the same way: the second escaping
        // rule is where the first rule's test does not reach.
        const payload = 'a" onclick="alert(1)';

        const built = domElement(attrWith('class', payload));
        expect(built.getAttribute('class')).toBe(payload);
        expect(built.hasAttribute('onclick')).toBe(false);

        const served = parsed(EXO_STR.render(attrWith('class', payload)));
        expect(served.getAttribute('class')).toBe(payload);
        expect(served.hasAttribute('onclick')).toBe(false);
    });
});

describe('an attribute port whose NAME is not a legal attribute name', () => {
    // THIS WAS A LIVE INJECTION AND THE CHECK THAT CLOSES IT IS A RESTORATION, not a new idea.
    //
    // Values are escaped everywhere. NAMES cannot be escaped — an escaped name is a different
    // attribute — so both compilers wrote `exoAttribute(name).head`, which is ` ` + the
    // lowercased name + `="`, straight into the markup. A port named `data-x" onclick="alert(1)`
    // produced
    //
    //     <div data-x" onclick="alert(1)="VALUE">
    //
    // on the server, and the identical string was what `compileExoDomSchema` handed to the parser
    // to build the prototype every client instance is cloned from. Both backends agreed — and
    // both served a live `onclick`. Every parity test in this package passed while it happened,
    // which is exactly why this needs its own case.
    //
    // IT WAS NEVER MERELY THEORETICAL. `exo-str-attr-form` explicitly supports GENERATED names —
    // its whole bounded-cache design exists because "a program is generating names" is a
    // legitimate thing to be doing (`attr('data-' + key, …)`) — and the moment `key` comes from
    // data rather than from a literal, the name is attacker-shaped. The legacy string renderer
    // refused exactly this (`isValidAttributeName`, still shipped as
    // `isValidAttributeNameLegacy`), and `string/legacy/security.test.ts` carried it as a named CWE-83
    // regression test. The schema renderer dropped the check and the test with it.
    //
    // IT IS NOW REFUSED WHERE THE PORT IS DECLARED — `ExoSchemaCursor.port()`, via
    // `core/attr/asserts/assert-exo-illegal-attr-name` — which is once per port per process and nothing per render,
    // covers both backends and the hydrate path out of one rule, and names the author's line
    // rather than a position inside a compiler.
    const INJECTING: ReadonlyArray<{ readonly what: string; readonly name: string }> = [
        { what: 'closes the value and opens a real handler', name: 'data-x" onclick="alert(1)' },
        { what: 'leaves the tag entirely', name: 'x><script>alert(1)</script' },
        { what: 'uses a space to start a second attribute', name: 'x onclick=alert(1)' },
        { what: 'uses a slash to self-close the tag', name: 'x/onclick=alert(1)' },
    ];

    for (const c of INJECTING) {
        it(`is refused where the port is declared: a name that ${c.what}`, () => {
            expect(() => attrWith(c.name, 'v', withExoSchemaAsserts)).toThrow();
        });
    }

    it('leaves every attribute name real components already use alone', () => {
        // THE HALF THAT MATTERS TO EVERYONE WHO IS NOT BEING ATTACKED. A refusal that broke a
        // legal name would be worse than the hole it closes, so these are not names that seemed
        // plausible: they are the ones found in this repository's tests, benchmarks and
        // examples, plus the spellings the babel plugin can emit from a JSX attribute name.
        // `core/attr/tests/assert-exo-illegal-attr-name.test.ts` pins the rule itself; this pins that the CURSOR
        // is what applies it.
        const legal = [
            'class',
            'href',
            'id',
            'title',
            'value',
            'checked',
            'selected',
            'indeterminate',
            'tabindex',
            'disabled',
            'data-id',
            'data-x',
            'data-theme',
            'aria-labelledby',
            'dataSet',
            'viewBox',
            'cx',
            'xlink:href',
        ];
        for (const name of legal) {
            expect(() => attrWith(name, 'v', withExoSchemaAsserts)).not.toThrow();
        }
    });

    it('still renders a name built from data behind a fixed prefix, on both backends', () => {
        // The pattern `exo-str-attr-form`'s bounded cache exists for, and the one this fix must not
        // take away: a name assembled at runtime is fine as long as it is still a NAME. Asserted
        // through both backends, because "it did not throw" is not the same claim as "the
        // attribute is there and holds the value".
        const key = 'kind';
        const component = attrWith('data-' + key, 'v');
        expect(domElement(component).getAttribute('data-kind')).toBe('v');
        expect(parsed(EXO_STR.render(component)).getAttribute('data-kind')).toBe('v');
    });
});
