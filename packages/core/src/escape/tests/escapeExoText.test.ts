// THE TEXT ESCAPER, PINNED IN THE PACKAGE THAT OWNS IT.
//
// WHY HERE, when `@exodra/dom/src/escape.test.ts` already asserts four cases about this
// function. That file is a BACKEND's test: it is declared `@vitest-environment jsdom`, it
// imports two renderers, and its subject is the agreement between them. If `@exodra/dom` is
// ever restructured, the only unit assertions this escaper has go with it — and this is the
// function every backend in the repository, and every backend written outside it, calls on
// every value that reaches a text position.
//
// WHAT THIS FILE ADDS rather than repeats. The downstream test names four cases. What decides
// whether this escaper is right is not four cases, it is the SET: exactly which code points it
// changes, and — the half no case-by-case test can reach — that it changes nothing else. Both
// halves are load-bearing and for different reasons:
//
//  - UNDER-escaping is an injection. `<` is the only character that can start a tag and `&` the
//    only one that can start a character reference, so those two are the safety claim.
//  - OVER-escaping is a hydration failure. The server's bytes and the bytes the DOM backend
//    hands the parser must be identical, so a character this escaper touches that the HTML
//    serialisation algorithm does not — a `"`, say — is a page that adopts wrong on every row
//    that contains one. That is why the sweep below asserts the NEGATIVE across the whole BMP
//    rather than spot-checking a quote.
import { describe, expect, it } from 'vitest';
import { escapeExoText } from '../escapeExoText';

/**
 * U+00A0, built from its code point and never written as the literal character — the rule
 * `escapeExoText` states for its own source, kept here for the same reason. A file saved,
 * diffed or copied through anything that normalises whitespace must not be able to turn this
 * into a case about a plain space, which is precisely the case that would then pass while the
 * rule it was meant to pin had gone.
 */
const NBSP = String.fromCharCode(0xa0);

type TCase = { readonly what: string; readonly char: string; readonly as: string };

/**
 * The four code points this escaper touches, and the exact bytes it writes for each — the set
 * the HTML serialisation algorithm writes for a Text node, which is why it is these four and
 * not the five an attribute value needs.
 */
const ESCAPED: ReadonlyArray<TCase> = [
    { what: 'an ampersand, the only character that can start a reference', char: '&', as: '&amp;' },
    { what: 'a less-than, the only character that can start a tag', char: '<', as: '&lt;' },
    { what: 'a greater-than, which the serialiser writes escaped', char: '>', as: '&gt;' },
    { what: 'a non-breaking space, which no diff would show', char: NBSP, as: '&nbsp;' },
];

/**
 * `U+00A0`, for a failure message. A bare character in the message would be invisible in
 * exactly the case this file exists to catch.
 */
const named = (code: number): string => `U+${code.toString(16).toUpperCase().padStart(4, '0')}`;

describe('escapeExoText', () => {
    for (const c of ESCAPED) {
        it(`escapes ${c.what}`, () => {
            expect(escapeExoText(c.char)).toBe(c.as);
            // …and in the position it actually arrives in, with text on both sides of it, so a
            // rule that only fired at the start or the end of a value would be caught here.
            expect(escapeExoText('a' + c.char + 'b')).toBe('a' + c.as + 'b');
            // …and more than once, so a replacement written without the `g` flag is caught.
            expect(escapeExoText(c.char + c.char)).toBe(c.as + c.as);
        });
    }

    it('leaves a double quote alone, which is a BYTES claim and not a safety one', () => {
        // Escaping a `"` in a text position would still be SAFE — nothing about a quote can
        // leave a text node. It would be different BYTES from what the HTML serialiser writes,
        // and different bytes is the whole failure mode of a server render a client hydrates.
        expect(escapeExoText('say "hi"')).toBe('say "hi"');
        expect(escapeExoText("it's")).toBe("it's");
    });

    it('escapes the ampersand FIRST, so an entity it just wrote is not eaten', () => {
        // The ordering rule, stated as the thing it prevents. If `&` were replaced last, the
        // ampersand this function itself introduced for `<` would be escaped a second time and
        // `&lt;` would print as `&amp;lt;` — for input that never contained an ampersand.
        expect(escapeExoText('<')).toBe('&lt;');
        expect(escapeExoText(NBSP)).toBe('&nbsp;');
        // And input that DOES contain one is escaped exactly once, whichever way round it comes.
        expect(escapeExoText('&<')).toBe('&amp;&lt;');
        expect(escapeExoText('<&')).toBe('&lt;&amp;');
    });

    it('escapes input that is ALREADY escaped, so there is no double-decode hole', () => {
        // A value that arrives holding `&lt;script&gt;` is a value whose author wrote those
        // characters. Passing it through unchanged would let a browser decode it back into a
        // tag; escaping the ampersand is what makes the round trip lossless instead.
        expect(escapeExoText('&amp;')).toBe('&amp;amp;');
        expect(escapeExoText('&lt;script&gt;')).toBe('&amp;lt;script&amp;gt;');
    });

    it('returns a value with nothing to escape unchanged', () => {
        // The fast path is a separate scan precisely so the overwhelmingly common case
        // allocates nothing. What is assertable from here is that it does not CHANGE anything.
        const plain = 'Ordinary text, 42 items, 100% done.';
        expect(escapeExoText(plain)).toBe(plain);
        expect(escapeExoText('')).toBe('');
    });

    it('neutralises the payloads an escaping library keeps in its own suite', () => {
        // THE SAFETY HALF, written as the attack rather than as the character set. `escape-html`
        // and `he` both carry payload-shaped cases next to their character-by-character ones, and
        // the reason is that a reader auditing an escaper wants to see the thing it is for, not a
        // table. `@exodra/dom`'s `dynamic-escape.test.ts` asserts the same payloads on the TREE —
        // "no <img> element exists on either backend" — which is the stronger claim and the one a
        // user cares about; this is the same claim about the BYTES, in the package that owns the
        // function, so it survives the DOM backend being restructured.
        expect(escapeExoText('<script>alert(1)</script>')).toBe(
            '&lt;script&gt;alert(1)&lt;/script&gt;'
        );
        expect(escapeExoText('<img src=x onerror=alert(1)>')).toBe(
            '&lt;img src=x onerror=alert(1)&gt;'
        );
        // Breaking OUT of the element the text sits in is the same character and worth naming
        // separately, because it is the shape that survives a naive "strip <script>" filter.
        expect(escapeExoText('</p><svg onload=alert(1)>')).toBe(
            '&lt;/p&gt;&lt;svg onload=alert(1)&gt;'
        );
    });

    it('leaves a character OUTSIDE the BMP intact, which the sweeps below cannot reach', () => {
        // THE SWEEPS' OWN BOUND, asserted instead of left implicit. Both of them walk code UNITS,
        // `String.fromCharCode(0 … 0xFFFF)`, so no astral character can be constructed by either:
        // an emoji, a CJK extension ideograph and a mathematical letter are all outside what they
        // can even try. A replacement written over a badly bounded character class could therefore
        // cut a surrogate pair in half and leave both sweeps green, and half a pair is not a
        // rendering difference — it is invalid UTF-8 in the response body.
        const astral = '\u{1F600}\u{1D49C}\u{20BB7}';
        expect(escapeExoText(astral)).toBe(astral);
        expect(escapeExoText('a' + astral + '&')).toBe('a' + astral + '&amp;');
        // And a pair with an escaped character wedged between its halves stays exactly as it
        // arrived — the arrangement in which an index-based rewrite goes wrong.
        expect(escapeExoText('\uD83D' + '&' + '\uDE00')).toBe('\uD83D&amp;\uDE00');
    });

    it('leaves every character the ESCAPING LIBRARIES escape and a serialiser does not', () => {
        // THE UNION GAP, named library by library, because every one of these is a character this
        // function declines to escape and is regularly asked about:
        //
        //  - `'` is escaped by `he` (&#x27;), `escape-html` (&#39;), `lodash.escape` (&#39;),
        //    React's `escapeTextForBrowser` (&#x27;) and Vue's `escapeHtml` (&#39;), and by the
        //    OWASP XSS prevention cheat sheet's rule 1. Not one of them is a serialiser: they
        //    escape one set for EVERY context, so a quote has to go in for the sake of the
        //    single-quoted attribute case, and the cost of that is paid in text.
        //  - `` ` `` is escaped by `he` alone (&#x60;), for a stated reason that has expired —
        //    "in Internet Explorer <= 8, the backtick character can be used to break out of
        //    (un)quoted attribute values or HTML comments".
        //  - `/` is escaped by neither, and OWASP recommends it (&#x2F;) on the grounds that it
        //    "helps end an HTML entity".
        //
        // We escape none of the three, and in a TEXT position none of them can do anything at all:
        // `<` is the only character that starts a tag and `&` the only one that starts a reference.
        // Escaping them would be safe and would be DIFFERENT BYTES from what the serialiser writes,
        // which is the failure this whole function exists to prevent.
        expect(escapeExoText(`it's a "quote" 'both' \`tick\` and/or a slash`)).toBe(
            `it's a "quote" 'both' \`tick\` and/or a slash`
        );
        // The payload spelled with the characters we decline to touch, so what is being claimed is
        // visible: in text this is six words, and nothing about it is markup.
        expect(escapeExoText("' onerror='alert(1)")).toBe("' onerror='alert(1)");
    });

    it('leaves TAB, LINE FEED and CARRIAGE RETURN alone, matching the serialiser exactly', () => {
        // THE SET IS BLINK'S, AND HERE IS THE HALF OF IT THAT IS EASY TO GET WRONG. Blink keeps two
        // masks in `markup_formatter.h`, and the difference between them is precisely this:
        //
        //     kEntityMaskInHtmlPCDATA        = Amp | Lt | Gt | Nbsp        ← our four
        //     kEntityMaskInHtmlAttributeValue= Amp | Quot | Lt | Gt | Nbsp ← the other file's five
        //     kEntityMaskInAttributeValue    = …| Tab | LineFeed | CarriageReturn  ← XML ONLY
        //
        // Tab, LF and CR are escaped when serialising XML and NOT when serialising HTML, so an
        // escaper that reached for `&#13;` would be writing bytes no HTML serialiser writes.
        //
        // ═══ AND THERE IS AN OPEN DIVERGENCE UNDERNEATH THAT, WHICH THIS TEST DOES NOT CLOSE ═══
        //
        // Matching the serialiser is a PROXY for the property this package actually promises — that
        // the server's page and the DOM backend's page hold the same values — and for CR the proxy
        // is wrong, because the serialiser's own round trip is lossy there (w3c/DOM-Parsing#59).
        // The HTML parser normalises newlines over the WHOLE input stream before tokenization
        // ("there are never any U+000D CR characters in the input to the tokenization stage"), so a
        // CR the server prints into a text or attribute value reaches the page as an LF, while the
        // DOM backend's `.data`/`setAttribute` write keeps the CR it was given. One value, two
        // pages, and no test in this repository carries a CR — `@exodra/dom`'s `AWKWARD` list, the
        // one that asserts "arrives intact on both backends, character for character", has no `\r`
        // in it.
        //
        // It is NOT fixed here, and it is not fixed here for a reason worth stating rather than for
        // want of an edit: escaping CR as `&#13;` would converge the two backends and would put
        // this function outside the serialiser it is defined by, which is a call about the contract
        // and not about the character. It is reported as open.
        const TAB = String.fromCharCode(0x09);
        const LF = String.fromCharCode(0x0a);
        const CR = String.fromCharCode(0x0d);
        expect(escapeExoText('a' + TAB + 'b')).toBe('a' + TAB + 'b');
        expect(escapeExoText('a' + LF + 'b')).toBe('a' + LF + 'b');
        expect(escapeExoText('a' + CR + 'b')).toBe('a' + CR + 'b');
        expect(escapeExoText('a' + CR + LF + 'b')).toBe('a' + CR + LF + 'b');
    });

    it('passes U+0000, the C0/C1 controls and a LONE SURROGATE through — the `he` divergence', () => {
        // WHAT THE REFERENCE DOES, and it is the one place a general-purpose escaping library
        // does something we do not. `he.encode(input, { strict: true })` THROWS on all of these:
        // `he.js:53` builds `regexInvalidRawCodePoint` out of `[\0-\x08\x0B\x0E-\x1F\x7F-\x9F]`,
        // the non-characters `﷐-﷯￾￿`, and both halves of an unpaired surrogate
        // (`[\uD800-\uDBFF](?![\uDC00-\uDFFF])` and `(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]`), and
        // `he.js:143` raises `Parse error` if the input matches. `escape-html` and `entities` do
        // NOT — `escape-html/index.js:15` is `/["'&<>]/` and `entities/src/escape.ts:153` is
        // `/[&<>\u{A0}]/gu`, so both hand every one of these back unchanged, as we do.
        //
        // WE ARE WITH THE SERIALISERS AND NOT WITH `he`, on purpose: this function is called on
        // every value of every render, `he`'s check is a whole-string regex on top of the escape,
        // and a THROW is not a thing a template can do halfway through a response body.
        //
        // ═══ AND U+0000 IS A SECOND OPEN DIVERGENCE, OF THE SAME SHAPE AS THE CR ONE ABOVE ═══
        //
        // Read from the HTML spec, not measured here. A NUL that reaches the parser in a text
        // position is dropped: the tokenizer's data state emits it as a character token
        // ("unexpected-null-character parse error"), and the "in body" insertion mode's rule for
        // "a character token that is U+0000 NULL" is "Parse error. Ignore the token." So a NUL the
        // server prints is NOT on the page, while `@exodra/dom` writes it into `.data` and keeps
        // it. One value, two pages — exactly the CR situation, and worth the same treatment.
        //
        // NOT FIXED HERE. There is no escape that helps: `&#0;` is itself a parse error the parser
        // turns into U+FFFD, so escaping would make the two backends disagree DIFFERENTLY rather
        // than agree. Converging them means dropping or replacing the character before it reaches
        // either backend, which is a decision about the contract and not about this function.
        // Pinned as passthrough so that a later "sanitise it here" is a deliberate, visible change.
        const NUL = String.fromCharCode(0x00);
        expect(escapeExoText('a' + NUL + 'b')).toBe('a' + NUL + 'b');
        for (const code of [0x01, 0x08, 0x0b, 0x0c, 0x0e, 0x1f, 0x7f, 0x85, 0x9f]) {
            const control = String.fromCharCode(code);
            expect(escapeExoText('a' + control + 'b'), named(code)).toBe('a' + control + 'b');
        }
        // A high surrogate with nothing after it and a low surrogate with nothing before it — the
        // two shapes `he` rejects. Both are unpaired code units, which is what a value sliced by
        // `String.prototype.slice` on a character boundary produces, so they do arrive in practice.
        expect(escapeExoText('a\uD83Db')).toBe('a\uD83Db');
        expect(escapeExoText('a\uDE00b')).toBe('a\uDE00b');
        expect(escapeExoText('\uD83D')).toBe('\uD83D');
        // A lone surrogate NEXT TO a character we do escape, which is where a rewrite that walked
        // code POINTS rather than code units would lose one of the two.
        expect(escapeExoText('\uD83D&')).toBe('\uD83D&amp;');
        expect(escapeExoText('&\uDE00')).toBe('&amp;\uDE00');
        // The non-characters, which `he` also rejects and no serialiser touches.
        for (const code of [0xfdd0, 0xfdef, 0xfffe, 0xffff]) {
            const nonCharacter = String.fromCharCode(code);
            expect(escapeExoText('a' + nonCharacter + 'b'), named(code)).toBe(
                'a' + nonCharacter + 'b'
            );
        }
    });

    it('escapes a value that is NOTHING BUT escapable characters, at every length', () => {
        // THE DEGENERATE CASE, and the reason it is worth its own test rather than being left to
        // the sweeps: every assertion above this one wraps the character in `'a' + … + 'b'`, so a
        // rewrite whose copy of the untouched run is off by one — a `substring(last, index)` with
        // the wrong bound, the shape `entities/src/escape.ts:106` gets right and a hand-written
        // fast path gets wrong — still copies the `a` and the `b` and looks fine. With NO ordinary
        // character anywhere in the value there is nothing to hide the error behind.
        expect(escapeExoText('&')).toBe('&amp;');
        expect(escapeExoText('&<')).toBe('&amp;&lt;');
        expect(escapeExoText('&<>')).toBe('&amp;&lt;&gt;');
        expect(escapeExoText('&<>' + NBSP)).toBe('&amp;&lt;&gt;&nbsp;');
        expect(escapeExoText(NBSP + '><&')).toBe('&nbsp;&gt;&lt;&amp;');
        // Long enough that a chunked or index-based implementation crosses its own boundaries, and
        // built so the expected value is derived rather than typed — a hand-typed expectation of
        // this length is a place for a second bug to hide.
        const every = '&<>' + NBSP;
        const escaped = '&amp;&lt;&gt;&nbsp;';
        for (let repeat = 1; repeat <= 40; repeat++) {
            expect(escapeExoText(every.repeat(repeat)), `${repeat} repetitions`).toBe(
                escaped.repeat(repeat)
            );
        }
        // And the same value with ONE ordinary character at each end, so the pair shows the run
        // copying is what is under test rather than the replacement.
        expect(escapeExoText('a' + every.repeat(8) + 'b')).toBe('a' + escaped.repeat(8) + 'b');
    });

    it('changes exactly those four code points and nothing else, across the whole BMP', () => {
        // THE OVER-ESCAPING HALF, and the reason it is a sweep rather than a list. A
        // case-by-case test can only assert about characters somebody thought of; the property
        // that keeps hydration working is about the ones nobody thought of. U+2028 and U+2029
        // are the pointed example — they are line terminators to a JavaScript parser and
        // @exodra/ssr's JSON writer escapes them for that reason — and they must NOT be escaped
        // here, because the HTML serialiser leaves them alone and the DOM backend would
        // therefore disagree with the server on every value that contains one.
        const touched = new Set(ESCAPED.map((c) => c.char));
        const unexpected: string[] = [];
        for (let code = 0; code <= 0xffff; code++) {
            const char = String.fromCharCode(code);
            if (touched.has(char)) continue;
            const input = 'a' + char + 'b';
            const output = escapeExoText(input);
            if (output !== input) {
                unexpected.push(`${named(code)} was changed to ${JSON.stringify(output)}`);
            }
        }
        // Listed, not counted: a failure here has to say WHICH code point started being
        // escaped, because that is the whole of what the reader needs to act.
        expect(unexpected).toEqual([]);
    });

    it('agrees with itself about which values need work', () => {
        // The function TESTS before it replaces, so the guard regex and the replacement list are
        // two statements of one set and are free to drift — a character added to one and not
        // the other is either an escape that never fires or a scan that never returns early.
        // Asserted by requiring "the value came back changed" and "the value contains one of
        // the four" to answer identically for every code point in the BMP.
        const touched = new Set(ESCAPED.map((c) => c.char));
        const disagreed: string[] = [];
        for (let code = 0; code <= 0xffff; code++) {
            const char = String.fromCharCode(code);
            const input = 'a' + char + 'b';
            const changed = escapeExoText(input) !== input;
            if (changed !== touched.has(char)) {
                disagreed.push(
                    `${named(code)}: the escaper changed it = ${changed}, ` +
                        `it is in the documented set = ${touched.has(char)}`
                );
            }
        }
        expect(disagreed).toEqual([]);
    });
});
