// THE ATTRIBUTE-VALUE ESCAPER, PINNED IN THE PACKAGE THAT OWNS IT.
//
// This escaper leaves a single quote and a backtick alone. That is not an oversight and it is
// not a judgement about those characters: it is only safe because the QUOTING STYLE IS FIXED —
// every schema compiler opens a value with ` name="`, and inside double quotes a `'` cannot end
// anything. That half is asserted only in `compile-exo-str-schema.test.ts`; the DOM schema
// compiler builds the same head and no test asks it, so ` name='` there would break this
// escaper with nothing red.
//
// The rest of the file is the same two-sided claim `escapeExoText.test.ts` makes:
// under-escaping is an injection (a `"` that survives closes the value and opens a real
// `onclick`), and over-escaping is a hydration failure (a character escaped here and not by the
// server, or the other way round, is a page that adopts wrong on every row that has one).
import { describe, expect, it } from 'vitest';
import { escapeExoAttributeValue } from '../escapeExoAttributeValue';

/**
 * U+00A0, built from its code point and never written as the literal character — the rule
 * `escapeExoAttributeValue` states for its own source, kept here for the same reason: a file
 * copied through anything that normalises whitespace must not be able to turn this into a case
 * about a plain space.
 */
const NBSP = String.fromCharCode(0xa0);

type TCase = { readonly what: string; readonly char: string; readonly as: string };

/**
 * The five code points this escaper touches. It is FIVE and not the text escaper's four: a
 * double quote ends a value and a text node has no quote to end.
 *
 * `< >` are in the list although nothing about them can leave a quoted value — a purely BYTES
 * decision, taken because Chromium's serialiser escapes them (`setAttribute('x', 'a<b>')` comes
 * back as `x="a&lt;b&gt;"`), so a backend that left them literal would print markup the DOM
 * backend never produces.
 */
const ESCAPED: ReadonlyArray<TCase> = [
    { what: 'an ampersand, which starts a character reference', char: '&', as: '&amp;' },
    { what: 'a double quote, which would END the value', char: '"', as: '&quot;' },
    { what: 'a less-than, which a serialiser escapes though it is inert', char: '<', as: '&lt;' },
    { what: 'a greater-than, for the same reason', char: '>', as: '&gt;' },
    { what: 'a non-breaking space, which no diff would show', char: NBSP, as: '&nbsp;' },
];

/** `U+0022`, for a failure message — a bare character would be unreadable in one. */
const named = (code: number): string => `U+${code.toString(16).toUpperCase().padStart(4, '0')}`;

describe('escapeExoAttributeValue', () => {
    for (const c of ESCAPED) {
        it(`escapes ${c.what}`, () => {
            expect(escapeExoAttributeValue(c.char)).toBe(c.as);
            expect(escapeExoAttributeValue('a' + c.char + 'b')).toBe('a' + c.as + 'b');
            // More than once, so a replacement written without the `g` flag is caught.
            expect(escapeExoAttributeValue(c.char + c.char)).toBe(c.as + c.as);
        });
    }

    it('neutralises the payload that would forge a second attribute', () => {
        // The whole reason the quote is in the set, written as the attack rather than as the
        // character. Unescaped, this value ends `data-x="…"` and opens a working `onclick`, on
        // BOTH backends, so no parity test would notice.
        expect(escapeExoAttributeValue('x" onclick="alert(1)')).toBe(
            'x&quot; onclick=&quot;alert(1)'
        );
    });

    it('escapes the ampersand FIRST, so an entity it just wrote is not eaten', () => {
        // Any other order and `&quot;` would print as `&amp;quot;` — for input that never
        // contained an ampersand.
        expect(escapeExoAttributeValue('"')).toBe('&quot;');
        expect(escapeExoAttributeValue('say "hi" & bye')).toBe('say &quot;hi&quot; &amp; bye');
    });

    it('escapes input that is ALREADY escaped, so there is no double-decode hole', () => {
        expect(escapeExoAttributeValue('&amp;')).toBe('&amp;amp;');
        expect(escapeExoAttributeValue('&quot;')).toBe('&amp;quot;');
    });

    it('returns a value with nothing to escape unchanged', () => {
        const plain = "it's fine, 42 items";
        expect(escapeExoAttributeValue(plain)).toBe(plain);
        expect(escapeExoAttributeValue('')).toBe('');
    });

    it('neutralises the mXSS payloads the angle brackets were added to the spec for', () => {
        // THE `< >` DECISION HAS A SECOND JUSTIFICATION, and it is a stronger one than the BYTES
        // argument the function's own comment gives. That comment says Chromium escapes them, so we
        // escape them to agree. WHY Chromium escapes them is this: the HTML standard was changed
        // to escape `<` and `>` in attribute values unconditionally (whatwg/html#6362, opened as
        // whatwg/html#6235), shipping in Chrome 138, Firefox 140 and Safari 26, expressly to close
        // a class of MUTATION XSS. Blink records it in `markup_formatter.h`, on the line that
        // added Lt and Gt to `kEntityMaskInHtmlAttributeValue`.
        //
        // THE CLASS: markup that survives one parse, is serialised, and is parsed AGAIN. In the
        // second parse the attribute's contents are read in the data state rather than as an
        // attribute value, so a closing sequence smuggled inside a value becomes a real end tag —
        // the shape every DOMPurify bypass of the last decade has been built out of. Leaving `<`
        // and `>` literal in a value is safe for ONE parse and is what makes the second one lethal,
        // which is why a byte-parity argument and a safety argument land in the same place here.
        //
        // These are asserted because the character-by-character cases above cannot show it: the set
        // is the same set, and what changes is whether a reader can see what it buys.
        expect(escapeExoAttributeValue('x</style><img src=x onerror=alert(1)>')).toBe(
            'x&lt;/style&gt;&lt;img src=x onerror=alert(1)&gt;'
        );
        expect(escapeExoAttributeValue('</textarea><script>alert(1)</script>')).toBe(
            '&lt;/textarea&gt;&lt;script&gt;alert(1)&lt;/script&gt;'
        );
        // Comment smuggling, the other half of the same family: a `<!--` inside a value re-parses
        // as a comment that swallows everything up to the next `-->` and changes where the document
        // resumes. It is neutralised by the same `<`, and by nothing else here — this function has
        // no rule about `-` and needs none, because a comment cannot start without the bracket.
        expect(escapeExoAttributeValue('a<!--b-->c')).toBe('a&lt;!--b--&gt;c');
    });

    it('leaves a character OUTSIDE the BMP intact, which the sweeps below cannot reach', () => {
        // THE SWEEPS' OWN BOUND — the same argument as in `escapeExoText.test.ts`, and it has to
        // be made in both files because neither sweep can construct an astral character:
        // `String.fromCharCode(0 … 0xFFFF)` only ever produces code UNITS. A replacement written
        // over a badly bounded character class could cut a surrogate pair in half with both sweeps
        // still green, and half a pair is invalid UTF-8 in the response body, not a wrong pixel.
        const astral = '\u{1F600}\u{1D49C}\u{20BB7}';
        expect(escapeExoAttributeValue(astral)).toBe(astral);
        expect(escapeExoAttributeValue('a' + astral + '"')).toBe('a' + astral + '&quot;');
        // A pair with an escaped character wedged between its halves — the arrangement in which an
        // index-based rewrite goes wrong — comes back exactly as it arrived.
        expect(escapeExoAttributeValue('\uD83D' + '"' + '\uDE00')).toBe('\uD83D&quot;\uDE00');
    });

    it('leaves TAB, LINE FEED and CARRIAGE RETURN alone, matching the serialiser exactly', () => {
        // THE SET IS BLINK'S, AND THIS IS THE HALF THAT LOOKS LIKE AN OMISSION AND IS NOT. Blink
        // keeps two attribute masks in `markup_formatter.h` and the ONLY difference between them is
        // these three characters:
        //
        //     kEntityMaskInHtmlAttributeValue = Amp | Quot | Lt | Gt | Nbsp          ← our five
        //     kEntityMaskInAttributeValue     = Amp | Quot | Lt | Gt | Tab | LF | CR ← XML ONLY
        //
        // An XML serialiser writes `&#9;` `&#10;` `&#13;` because an XML processor normalises
        // attribute whitespace to spaces; an HTML serialiser writes the characters, because an HTML
        // parser does not. Reaching for the XML set here would be writing bytes no HTML serialiser
        // writes, on every multi-line `title` on every page.
        //
        // ═══ AND CR IS AN OPEN DIVERGENCE THAT THIS TEST DOES NOT CLOSE ═══
        //
        // Agreeing with the serialiser is a PROXY for what this package promises — that the server's
        // page and the DOM backend's page hold the same VALUE — and for CR the proxy is wrong,
        // because the serialiser's own round trip is lossy there (w3c/DOM-Parsing#59). The HTML
        // parser normalises newlines across the whole input stream before tokenization, so
        // `title="a\rb"` printed by the server arrives on the page as `a\nb`, while the DOM
        // backend's `setAttribute` keeps the `\r` it was handed. One value, two pages. Nothing in
        // this repository carries a CR through either escaper: `@exodra/dom`'s `AWKWARD` list — the
        // one whose test is named "arrives intact on both backends, character for character" — has
        // an ampersand, a quote, an apostrophe, a non-breaking space and two tags in it, and no
        // `\r`.
        //
        // NOT FIXED HERE, deliberately: `&#13;` would converge the two backends and would put this
        // function outside the serialiser that defines it. That is a decision about the contract,
        // not about the character, and it is reported as open rather than taken quietly.
        const TAB = String.fromCharCode(0x09);
        const LF = String.fromCharCode(0x0a);
        const CR = String.fromCharCode(0x0d);
        expect(escapeExoAttributeValue('a' + TAB + 'b')).toBe('a' + TAB + 'b');
        expect(escapeExoAttributeValue('a' + LF + 'b')).toBe('a' + LF + 'b');
        expect(escapeExoAttributeValue('a' + CR + 'b')).toBe('a' + CR + 'b');
        expect(escapeExoAttributeValue('a' + CR + LF + 'b')).toBe('a' + CR + LF + 'b');
    });

    it('passes U+0000, the C0/C1 controls and a LONE SURROGATE through — the `he` divergence', () => {
        // WHAT THE REFERENCE DOES. `he.encode(input, { strict: true })` THROWS on every value in
        // this test: `he.js:53` builds `regexInvalidRawCodePoint` from `[\0-\x08\x0B\x0E-\x1F
        // \x7F-\x9F]`, the non-characters, and both halves of an unpaired surrogate, and
        // `he.js:143` raises `Parse error` when the input matches. The two serialiser-shaped
        // libraries do not: `escape-html/index.js:15` is `/["'&<>]/` and
        // `entities/src/escape.ts:139` is `/["&\u{A0}]/gu`, so both pass all of these through.
        //
        // WE ARE WITH THE SERIALISERS. A throw is not something a template can do halfway through
        // a response body, and this function runs on every attribute of every render.
        //
        // ═══ AND U+0000 IS A SECOND OPEN DIVERGENCE, THE SAME SHAPE AS THE CR ONE ABOVE ═══
        //
        // Read from the HTML spec, not measured here, and note it is a DIFFERENT outcome from the
        // text escaper's: the tokenizer's attribute-value-(double-quoted) state says of U+0000
        // "unexpected-null-character parse error. Append a U+FFFD REPLACEMENT CHARACTER character
        // to the current attribute's value" — so a NUL the server prints reaches the page as
        // U+FFFD, while `@exodra/dom`'s `setAttribute` keeps the NUL it was handed. In a TEXT
        // position the same character is DROPPED instead. One value, two pages, two different
        // mismatches depending on where it lands.
        //
        // NOT FIXED HERE, and no escape fixes it: `&#0;` is itself a parse error the parser turns
        // into U+FFFD, so escaping would move the disagreement rather than close it. Converging the
        // backends means dropping or replacing the character before either one sees it, which is a
        // decision about the contract. Pinned as passthrough so a later change is a visible one.
        const NUL = String.fromCharCode(0x00);
        expect(escapeExoAttributeValue('a' + NUL + 'b')).toBe('a' + NUL + 'b');
        for (const code of [0x01, 0x08, 0x0b, 0x0c, 0x0e, 0x1f, 0x7f, 0x85, 0x9f]) {
            const control = String.fromCharCode(code);
            expect(escapeExoAttributeValue('a' + control + 'b'), named(code)).toBe(
                'a' + control + 'b'
            );
        }
        // Unpaired code units, the two shapes `he` rejects — what `String.prototype.slice` on a
        // character boundary produces, so they arrive in practice rather than in theory.
        expect(escapeExoAttributeValue('a\uD83Db')).toBe('a\uD83Db');
        expect(escapeExoAttributeValue('a\uDE00b')).toBe('a\uDE00b');
        expect(escapeExoAttributeValue('\uD83D')).toBe('\uD83D');
        // Beside a character we DO escape, which is where a rewrite walking code points rather
        // than code units loses one of the two.
        expect(escapeExoAttributeValue('\uD83D"')).toBe('\uD83D&quot;');
        expect(escapeExoAttributeValue('"\uDE00')).toBe('&quot;\uDE00');
        for (const code of [0xfdd0, 0xfdef, 0xfffe, 0xffff]) {
            const nonCharacter = String.fromCharCode(code);
            expect(escapeExoAttributeValue('a' + nonCharacter + 'b'), named(code)).toBe(
                'a' + nonCharacter + 'b'
            );
        }
    });

    it('escapes a value that is NOTHING BUT escapable characters, at every length', () => {
        // THE DEGENERATE CASE. Every assertion above wraps its character in `'a' + … + 'b'`, so a
        // rewrite whose copy of the untouched run is off by one — the `substring(last, index)`
        // shape `entities/src/escape.ts:106` gets right and a hand-written fast path gets wrong —
        // still copies the `a` and the `b` and passes. With no ordinary character in the value
        // there is nothing for the error to hide behind.
        //
        // It matters more here than in text: this is the escaper whose omission of `'` is only
        // safe because the value is quoted, and `x" onclick="…` is a payload made ENTIRELY of
        // characters this function has an opinion about.
        expect(escapeExoAttributeValue('"')).toBe('&quot;');
        expect(escapeExoAttributeValue('&"')).toBe('&amp;&quot;');
        expect(escapeExoAttributeValue('&"<>')).toBe('&amp;&quot;&lt;&gt;');
        expect(escapeExoAttributeValue('&"<>' + NBSP)).toBe('&amp;&quot;&lt;&gt;&nbsp;');
        expect(escapeExoAttributeValue(NBSP + '><"&')).toBe('&nbsp;&gt;&lt;&quot;&amp;');
        // Long enough to cross the boundaries of a chunked or index-based implementation, with the
        // expectation derived rather than typed — a hand-typed one this long hides a second bug.
        const every = '&"<>' + NBSP;
        const escaped = '&amp;&quot;&lt;&gt;&nbsp;';
        for (let repeat = 1; repeat <= 40; repeat++) {
            expect(escapeExoAttributeValue(every.repeat(repeat)), `${repeat} repetitions`).toBe(
                escaped.repeat(repeat)
            );
        }
        expect(escapeExoAttributeValue('a' + every.repeat(8) + 'b')).toBe(
            'a' + escaped.repeat(8) + 'b'
        );
    });

    it('changes exactly those five code points and nothing else, across the whole BMP', () => {
        const touched = new Set(ESCAPED.map((c) => c.char));
        const unexpected: string[] = [];
        for (let code = 0; code <= 0xffff; code++) {
            const char = String.fromCharCode(code);
            if (touched.has(char)) continue;
            const input = 'a' + char + 'b';
            const output = escapeExoAttributeValue(input);
            if (output !== input) {
                unexpected.push(`${named(code)} was changed to ${JSON.stringify(output)}`);
            }
        }
        expect(unexpected).toEqual([]);
    });
});

describe('the single quote this escaper does NOT touch, and why that is safe', () => {
    it('is left exactly as written', () => {
        // Stated as its own case rather than left to the sweep, because it is the one omission
        // an auditor comes looking for.
        expect(escapeExoAttributeValue("' onclick='alert(1)")).toBe("' onclick='alert(1)");
    });

    it('is the whole of the gap against the escaping libraries, and here is that gap named', () => {
        // THE UNION OF WHAT THE LIBRARIES ESCAPE, minus what we escape, is exactly three
        // characters, and every one of them is here with the library that wants it:
        //
        //  - `'`  — `he` (&#x27;), `escape-html` (&#39;), `lodash.escape` (&#39;), React's
        //           `escapeTextForBrowser` (&#x27;), Vue's `escapeHtml` (&#39;), and OWASP's XSS
        //           prevention cheat sheet. Not one of those is a serialiser: each escapes ONE set
        //           for EVERY context, so the quote goes in to cover the single-quoted attribute
        //           they cannot rule out. We can rule it out — see the next test.
        //  - `` ` `` — `he` alone (&#x60;), for a reason its source states and that has expired:
        //           "in Internet Explorer <= 8, the backtick character can be used to break out of
        //           (un)quoted attribute values or HTML comments".
        //  - `/`  — no library; OWASP recommends `&#x2F;` because it "helps end an HTML entity".
        //           Inside a quoted value it is an ordinary character, and every `href` and `src`
        //           on a page is made of them.
        //
        // `entities`, the one library on the list that IS written to the serialisation algorithm,
        // escapes NONE of the three: `escapeAttribute` is `/["&\u{A0}]/gu` and `escapeText` is
        // `/[&<>\u{A0}]/gu` — the pre-2025 spec sets, which are our five and four minus the angle
        // brackets the 2025 change added to attributes.
        for (const value of ["it's", 'a`b', 'a/b', "'`/"]) {
            expect(escapeExoAttributeValue(value)).toBe(value);
        }
        // A real path, which is what the omission actually costs and buys: it passes through whole,
        // and the one character in it that IS ours is escaped exactly once.
        expect(escapeExoAttributeValue("/user's/photo?a=1&b=2")).toBe("/user's/photo?a=1&amp;b=2");
    });
});
