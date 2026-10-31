/**
 * Output encoding for the JavaScript context.
 *
 * OWASP ASVS, section V5.3 Output Encoding and Injection Prevention — encoding
 * must match the INTERPRETER, and inside a <script> element the interpreter is
 * not the HTML parser. That parser looks only for `</script`, while a JS parser
 * treats U+2028/U+2029 as line terminators.
 *
 *   CWE-79  Cross-site Scripting
 *   CWE-116 Improper Encoding or Escaping of Output
 *
 * Cited at section level: ASVS 5.0 renumbered the chapters.
 */
import { describe, expect, it } from 'vitest';
import { escapeExoJsonForScript, renderExoJsonScript } from '../scripts/renderExoJsonScript';

describe('ASVS V5.3 / CWE-116 — state serialised into <script>', () => {
    it('a payload in state cannot close the script element', () => {
        const json = JSON.stringify({ evil: '</script><script>alert(1)</script>' });
        const out = escapeExoJsonForScript(json);
        expect(out).not.toContain('</script');
        expect(out).not.toContain('<');
        expect(out).not.toContain('>');
    });

    it('round-trips: the escaped payload still parses back to the original', () => {
        const value = { evil: '</script>&<>\u2028end' };
        const out = escapeExoJsonForScript(JSON.stringify(value));
        // \uXXXX escapes are JSON string escapes, so JSON.parse restores them.
        expect(JSON.parse(out)).toEqual(value);
    });

    it('escapes U+2028/U+2029 — line terminators to a JS parser', () => {
        const out = escapeExoJsonForScript(JSON.stringify({ s: '\u2028\u2029' }));
        expect(out).not.toContain('\u2028');
        expect(out).not.toContain('\u2029');
        expect(out).toContain('\\u2028');
        expect(out).toContain('\\u2029');
    });

    it('escapes the id/nonce attributes it interpolates', () => {
        const html = renderExoJsonScript('{}', { id: 'x" onload="alert(1)' });
        expect(html).not.toContain('onload="alert(1)"');
    });

    it('emits a well-formed script element for ordinary input', () => {
        const html = renderExoJsonScript('{"a":1}', { id: 'state', nonce: 'n1' });
        expect(html).toBe('<script id="state" type="application/json" nonce="n1">{"a":1}</script>');
    });
});

/**
 * THE THIRD ESCAPER IN THE REPOSITORY, held to the same two-sided standard as the other two.
 *
 * `@exodra/core`'s `escapeExoText` and `escapeExoAttributeValue` each carry a sweep asserting
 * they change their documented set AND NOTHING ELSE, because a character-by-character test can only
 * speak about characters somebody thought of. This function had the payload half of that and not
 * the negative half: every case above shows something it DOES escape, and nothing pinned the set it
 * leaves alone.
 *
 * The negative matters here for a different reason than it does in HTML. This output is JSON that a
 * browser parses back with `JSON.parse`, so an escape that fires where it should not is not a wrong
 * pixel — it is either a payload that no longer round-trips or, for a character JSON has its own
 * rules about, a syntax error in a `<script>` on every page that serves state.
 */
describe('escapeExoJsonForScript changes five code points and nothing else', () => {
    /** `U+2028`, for a failure message — the bare character would be invisible in one. */
    const named = (code: number): string => `U+${code.toString(16).toUpperCase().padStart(4, '0')}`;

    type TCase = { readonly what: string; readonly char: string; readonly as: string };

    /**
     * The five it touches, and the exact bytes it writes. `\uXXXX` escapes, not HTML entities \u2014
     * the interpreter downstream is a JSON parser, not the HTML one.
     *
     * Typed rather than `as const` on purpose: `as const` narrows `char` to a literal union, which
     * makes the `Set` below a `Set<'<' | '>' | \u2026>` whose `has()` then refuses the plain `string`
     * the sweep hands it.
     */
    const ESCAPED: ReadonlyArray<TCase> = [
        { what: 'less-than, which is how `</script` is spelled', char: '<', as: '\\u003C' },
        { what: 'greater-than, escaped with it for symmetry', char: '>', as: '\\u003E' },
        { what: 'ampersand, in case the element type ever changes', char: '&', as: '\\u0026' },
        { what: 'U+2028, a line terminator to a JS parser', char: '\u2028', as: '\\u2028' },
        { what: 'U+2029, likewise', char: '\u2029', as: '\\u2029' },
    ];

    for (const c of ESCAPED) {
        it(`escapes ${c.what}`, () => {
            expect(escapeExoJsonForScript(c.char)).toBe(c.as);
            expect(escapeExoJsonForScript('a' + c.char + 'b')).toBe('a' + c.as + 'b');
            // More than once, so a replacement written without the `g` flag is caught — the bug
            // that leaves the SECOND `</script>` in a payload intact and is invisible to any test
            // whose payload contains only one.
            expect(escapeExoJsonForScript(c.char + c.char)).toBe(c.as + c.as);
        });
    }

    it('leaves the BACKSLASH alone, which is what makes the output still JSON', () => {
        // THE ONE CHARACTER THIS FUNCTION MUST NOT TOUCH, and the reason the whole design works.
        // Its replacements are JSON string escapes, so they only mean anything because the input is
        // already `JSON.stringify` output in which every literal backslash is ALREADY doubled. A
        // rule added here for `\` would double them a second time and `JSON.parse` would hand the
        // page `\u003C` as six characters instead of a `<`.
        expect(escapeExoJsonForScript('\\')).toBe('\\');
        expect(escapeExoJsonForScript('a\\\\b')).toBe('a\\\\b');
        // Through the real round trip: a value whose own text contains a backslash and a `<`.
        const value = { s: 'C:\\path\\to<file>' };
        expect(JSON.parse(escapeExoJsonForScript(JSON.stringify(value)))).toEqual(value);
    });

    it('escapes a payload made ENTIRELY of escapable characters, at every length', () => {
        // THE DEGENERATE CASE. Every other assertion in this file wraps its character in ordinary
        // text or in JSON punctuation, so an implementation that mishandled the copy of the
        // untouched run would still copy that text and look correct.
        expect(escapeExoJsonForScript('<')).toBe('\\u003C');
        expect(escapeExoJsonForScript('<>&')).toBe('\\u003C\\u003E\\u0026');
        expect(escapeExoJsonForScript('')).toBe('');
        const every = '<>&\u2028\u2029';
        const escaped = '\\u003C\\u003E\\u0026\\u2028\\u2029';
        for (let repeat = 1; repeat <= 40; repeat++) {
            expect(escapeExoJsonForScript(every.repeat(repeat)), `${repeat} repetitions`).toBe(
                escaped.repeat(repeat)
            );
        }
    });

    it('does not eat the escapes it just wrote, whatever order the replacements run in', () => {
        // THE ORDERING QUESTION THE OTHER TWO ESCAPERS ANSWER WITH "`&` FIRST". Here the answer is
        // different and worth pinning as its own fact: `&` is replaced LAST (`render-exo-json-
        // script.ts:40`) and that is safe only because no replacement here INTRODUCES a character
        // another replacement matches — `\u003C` contains a backslash, digits and a letter, and no
        // `<`, `>` or `&` anywhere. The HTML escapers cannot say that, which is exactly why they
        // must order `&` first.
        //
        // The test is the input that would expose the mistake if a future edit switched these to
        // entity-shaped replacements: a bare ampersand next to a bracket, each escaped once.
        expect(escapeExoJsonForScript('&<')).toBe('\\u0026\\u003C');
        expect(escapeExoJsonForScript('<&')).toBe('\\u003C\\u0026');
        expect(escapeExoJsonForScript('&amp;')).toBe('\\u0026amp;');
        // And the output contains no character that would be escaped again by a second pass —
        // stated as the property rather than as a case, since that IS the ordering invariant.
        const once = escapeExoJsonForScript('<>&\u2028\u2029 mixed & text');
        expect(escapeExoJsonForScript(once)).toBe(once);
    });

    it('changes exactly those five code points and nothing else, across the whole BMP', () => {
        // THE OVER-ESCAPING HALF, and the reason it is a sweep. The pointed cases it covers that no
        // hand-written list would: the ASCII control characters and the quote and backslash that
        // `JSON.stringify` has already escaped, all of which must pass through untouched, and
        // U+00A0 — escaped by both HTML escapers in `@exodra/core` and correctly NOT escaped here,
        // because this output is read by a JSON parser to which a non-breaking space is an
        // ordinary character.
        const touched = new Set(ESCAPED.map((c) => c.char));
        const unexpected: string[] = [];
        for (let code = 0; code <= 0xffff; code++) {
            const char = String.fromCharCode(code);
            if (touched.has(char)) continue;
            const input = 'a' + char + 'b';
            const output = escapeExoJsonForScript(input);
            if (output !== input) {
                unexpected.push(`${named(code)} was changed to ${JSON.stringify(output)}`);
            }
        }
        // Listed rather than counted: a failure has to name the code point that started being
        // escaped, because that is the whole of what a reader needs in order to act.
        expect(unexpected).toEqual([]);
    });

    it('round-trips every BMP code point through the real JSON.stringify → escape → parse path', () => {
        // THE PROPERTY THE FUNCTION ACTUALLY OWES, asserted end to end rather than character by
        // character: whatever a user put in state comes back out of `JSON.parse` identical. The
        // sweep above proves the escaper is not over-eager; this proves the escapes it DOES write
        // are ones a JSON parser undoes. Chunked so the cost stays one pass over the BMP rather
        // than 65536 separate parses.
        const CHUNK = 256;
        for (let start = 0; start <= 0xffff; start += CHUNK) {
            const chars: string[] = [];
            for (let code = start; code < start + CHUNK && code <= 0xffff; code++) {
                // Surrogate halves are skipped: `JSON.stringify` emits a lone surrogate as a
                // `\uD800` escape and `JSON.parse` returns it, but comparing them is a claim about
                // the JSON built-ins rather than about this function, and `toEqual` on unpaired
                // halves is a distraction from what is being measured here.
                if (code >= 0xd800 && code <= 0xdfff) continue;
                chars.push(String.fromCharCode(code));
            }
            const value = { s: chars.join(''), n: start };
            const escaped = escapeExoJsonForScript(JSON.stringify(value));
            // No raw `<` or `>` survives anywhere in the payload — the safety half, asked of every
            // block rather than of one hand-picked payload.
            expect(escaped.includes('<'), `raw < in the block at ${named(start)}`).toBe(false);
            expect(escaped.includes('>'), `raw > in the block at ${named(start)}`).toBe(false);
            expect(JSON.parse(escaped), `round trip of the block at ${named(start)}`).toEqual(
                value
            );
        }
    });
});

describe('renderExoJsonScript quotes the attributes it builds', () => {
    it('opens every attribute it emits with a DOUBLE quote', () => {
        // THE THIRD SITE IN THE REPOSITORY THAT OPENS AN ATTRIBUTE VALUE — after
        // `exoAttribute` and `compileExoStrSchema`'s `emit` — and like the second one it holds
        // its own literal (`renderExoJsonScript.ts:6`, ` ${name}="${…}"`) rather than asking the
        // core for it. `escapeExoAttributeValue` leaves `'` and a backtick alone BECAUSE every
        // value is double-quoted, so that omission depends on this line too, and nothing asserted
        // it. A single-quoted head here turns a `nonce` or an `id` holding an apostrophe into a
        // breakout on every page that serves state.
        const html = renderExoJsonScript('{}', { id: "it's", nonce: "a'b" });
        expect(html).toContain(' id="it\'s"');
        expect(html).toContain(' nonce="a\'b"');
        // Counted as well: the element's tag has exactly three attributes and therefore exactly six
        // literal double quotes, and a seventh is a value that escaped its own.
        const upToTagEnd = html.slice(0, html.indexOf('>') + 1);
        expect(upToTagEnd.split('"').length - 1).toBe(6);
    });

    it('cannot have its attributes ended by a hostile id or nonce', () => {
        // The existing case above asserts `not.toContain('onload="alert(1)"')`, which passes for a
        // value that broke out and got escaped SOMEWHERE else too. This asks for the bytes.
        expect(renderExoJsonScript('{}', { id: 'x" onload="alert(1)' })).toBe(
            '<script id="x&quot; onload=&quot;alert(1)" type="application/json">{}</script>'
        );
        // A `>` in the id must not close the start tag early either — the shape that would put the
        // rest of the attributes into the document as text.
        expect(renderExoJsonScript('{}', { id: 'a><script>alert(1)</script>' })).toBe(
            '<script id="a&gt;&lt;script&gt;alert(1)&lt;/script&gt;" ' +
                'type="application/json">{}</script>'
        );
    });

    it('omits the nonce attribute entirely when there is none', () => {
        // The `undefined` branch of `attribute()`, which is the degenerate case for a writer that
        // builds its own markup: the wrong reading prints `nonce="undefined"`.
        const html = renderExoJsonScript('{}', { id: 'state' });
        expect(html).toBe('<script id="state" type="application/json">{}</script>');
        expect(html).not.toContain('nonce');
    });
});
