// THE RULE FOR AN ATTRIBUTE NAME, as assertions — the half of escaping a value escaper cannot
// reach.
//
// Values are escaped on both backends. A NAME cannot be escaped (an escaped name is a
// different attribute) and so is written into the markup verbatim, which makes a name the one
// string in a schema that is markup rather than data. With nothing refusing a malformed one,
// every byte-parity test in the repo stays green while both backends print the same live
// `onclick`. See `assertExoLegalAttrName.ts` for the full account.
//
// TWO PROPERTIES, and the second is the one that decides whether this rule is worth having:
//
//  1. Nothing that could become markup is accepted.
//  2. EVERY NAME REAL COMPONENTS ALREADY USE IS STILL ACCEPTED. A refusal that breaks a legal
//     name is worse, for everyone who is not being attacked, than the hole it closes — so the
//     legal list below is not a list of names that seemed plausible. It is the names actually
//     found in this repository's tests, benchmarks and examples (`port('…')`, `attr('…')` and
//     the static attribute objects passed to `el()`), plus the shapes the babel plugin can
//     emit from a JSX attribute name.
import { describe, expect, it } from 'vitest';
import { assertExoLegalAttrName } from '../asserts/assertExoLegalAttrName';

const WHERE = 'ExoSchemaCursor.port()';

/** A code point as a one-character string, for the cases whose character is invisible. */
const CP = (code: number): string => String.fromCharCode(code);

/** Names harvested from this repository, plus the spellings the JSX compiler can produce. */
const LEGAL: ReadonlyArray<string> = [
    // Ordinary HTML, as written in `el()` attribute objects across the benchmarks and tests.
    'class',
    'id',
    'type',
    'title',
    'name',
    'src',
    'rel',
    'charset',
    'placeholder',
    'tabindex',
    'disabled',
    'readonly',
    'width',
    'height',
    // The property names — where the attribute and the property are different things.
    'value',
    'checked',
    'selected',
    'indeterminate',
    // Generated-shaped but legal.
    'data-id',
    'data-x',
    'data-theme',
    'data-item-id',
    'aria-labelledby',
    'aria-label',
    // camelCase survives: the markup spelling is lowercased and lowercasing an ASCII name
    // cannot produce a character outside the rule.
    'dataSet',
    // SVG, where the case matters to the reader even though the markup is lowercased.
    'viewBox',
    'cx',
    'r',
    // Namespaced, the one place a colon appears in a real name.
    'xlink:href',
    'xml:lang',
    // A JSXIdentifier may contain `$`, and the babel plugin turns one straight into this
    // string — so refusing it would make a name the compiler can emit illegal at runtime.
    'data-$x',
    // A leading underscore and a dot: legal characters that terminate nothing.
    '_private',
    'x.y',
    // DIGITS IN THE TAIL. The rule allows them and no name above contained one, so the `0-9`
    // of the character class was the one part of it nothing asserted. These are not invented
    // shapes: `x1 y1 x2 y2` are how an SVG `<line>` is written, and a generated `data-` key is
    // as likely to end in a digit as in a letter.
    'x1',
    'y2',
    'data-2',
    'data-row-3',
];

/**
 * Names that are not merely odd but ACTIVE: each one, written into ` name="…"`, produces
 * markup that is not the attribute the author asked for.
 */
const REFUSED: ReadonlyArray<{ readonly what: string; readonly name: string }> = [
    { what: 'closes the value and opens a real handler', name: 'data-x" onclick="alert(1)' },
    { what: 'leaves the tag entirely', name: 'x><script>alert(1)</script' },
    { what: 'a space, which starts a second attribute', name: 'x onclick=alert(1)' },
    { what: 'a slash, which can self-close the tag', name: 'x/onclick=alert(1)' },
    { what: 'an equals sign, which ends the name', name: 'x=y' },
    { what: 'a single quote', name: "x'y" },
    { what: 'a bare angle bracket', name: 'x<y' },
    { what: 'a newline', name: 'x\ny' },
    { what: 'a tab', name: 'x\ty' },
    { what: 'nothing at all', name: '' },
    { what: 'a leading digit', name: '1x' },
    { what: 'a leading dash, which reads as no name at all', name: '-x' },
    // THE CHARACTERS THE ALLOWLIST IS FOR, as opposed to the ones any blocklist would also
    // catch. Everything above this line is refused by the HTML spec's own list of forbidden
    // name characters, which is what a blocklist has to work from; everything below it passes
    // that list and is refused only because this rule states what a name IS. `assertExoLegalAttrName`
    // names each of them in its header as the reason the rule is an allowlist.
    { what: 'a backtick, which older engines treat as a value delimiter', name: 'x`y' },
    { what: 'an ampersand, which starts a character reference', name: 'x&y' },
    { what: 'a non-ASCII letter, which no real component wants in a name', name: 'xé' },
    // The three below are built from their CODE POINTS and never written as literal
    // characters. A combining mark, a zero-width space and a NUL are invisible in a diff,
    // in a review and in most editors, so a literal one here could be normalised away by
    // anything the file passes through and the case would keep passing with nothing in it.
    { what: 'a combining mark, not the character it renders as', name: 'x' + CP(0x0301) },
    { what: 'a zero-width space, invisible in every review', name: 'x' + CP(0x200b) + 'y' },
    { what: 'a NUL, a C0 control the tokenizer replaces', name: 'x' + CP(0x0000) + 'y' },
    { what: 'a carriage return, which the parser turns into a newline', name: 'x\ry' },
    { what: 'a form feed, which HTML counts as whitespace', name: 'x\fy' },
    // THE HEAD IS NARROWER THAN THE TAIL, and these three are the whole of the difference:
    // `.`, `:` and `$` are legal after the first character and refused as the first one. A
    // name that begins with any of them reads as punctuation where a name should be.
    { what: 'a leading dot', name: '.x' },
    { what: 'a leading colon', name: ':x' },
    { what: 'a leading dollar, legal in the TAIL but not here', name: '$x' },
];

describe('assertExoLegalAttrName', () => {
    it('accepts every attribute name this repository actually uses', () => {
        // Collected rather than asserted one at a time, so a failure names the REJECTED NAMES
        // and the reason the rule gave — which is the whole of what somebody who has just
        // tightened the regex needs, and is not what `expect(fn).not.toThrow()` inside a loop
        // reports (it stops at the first, and says only that something threw).
        const rejected: string[] = [];
        for (const name of LEGAL) {
            try {
                assertExoLegalAttrName(name, WHERE);
            } catch (error) {
                rejected.push(`${JSON.stringify(name)}: ${(error as Error).message}`);
            }
        }
        expect(rejected).toEqual([]);
    });

    for (const c of REFUSED) {
        it(`refuses a name that ${c.what}`, () => {
            expect(() => assertExoLegalAttrName(c.name, WHERE)).toThrow();
        });
    }

    it('names what it refused, where it was declared, and what a legal name looks like', () => {
        // The repo's errors are written to END an investigation. An author who sees this has
        // to be able to fix it without opening a compiler: the offending string, the call they
        // made, and the rule.
        let message = '';
        try {
            assertExoLegalAttrName('data-x" onclick="alert(1)', WHERE);
        } catch (error) {
            message = (error as Error).message;
        }
        expect(message).toContain(WHERE);
        expect(message).toContain('data-x');
        expect(message).toContain('onclick');
        expect(message).toContain('data-id');
    });

    it('stays legal in the spelling that reaches the tag, which is the lowercase', () => {
        // The markup spelling is `name.toLowerCase()` and nothing else, so a name that passes
        // cannot introduce a character outside the rule on its way into the tag. That is what
        // makes a second check on the markup spelling unnecessary rather than merely unused.
        for (const name of LEGAL) {
            expect(() => assertExoLegalAttrName(name, WHERE)).not.toThrow();
            expect(() => assertExoLegalAttrName(name.toLowerCase(), WHERE)).not.toThrow();
        }
    });

    it('refuses `className`, naming the spelling to write instead', () => {
        expect(() => assertExoLegalAttrName('className', WHERE)).toThrow(
            /write "class", not "className"/
        );
    });
});
