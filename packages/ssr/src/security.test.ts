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
import { escapeJsonForScript, renderJsonScript } from './renderJsonScript';

describe('ASVS V5.3 / CWE-116 — state serialised into <script>', () => {
    it('a payload in state cannot close the script element', () => {
        const json = JSON.stringify({ evil: '</script><script>alert(1)</script>' });
        const out = escapeJsonForScript(json);
        expect(out).not.toContain('</script');
        expect(out).not.toContain('<');
        expect(out).not.toContain('>');
    });

    it('round-trips: the escaped payload still parses back to the original', () => {
        const value = { evil: '</script>&<>\u2028end' };
        const out = escapeJsonForScript(JSON.stringify(value));
        // \uXXXX escapes are JSON string escapes, so JSON.parse restores them.
        expect(JSON.parse(out)).toEqual(value);
    });

    it('escapes U+2028/U+2029 — line terminators to a JS parser', () => {
        const out = escapeJsonForScript(JSON.stringify({ s: '\u2028\u2029' }));
        expect(out).not.toContain('\u2028');
        expect(out).not.toContain('\u2029');
        expect(out).toContain('\\u2028');
        expect(out).toContain('\\u2029');
    });

    it('escapes the id/nonce attributes it interpolates', () => {
        const html = renderJsonScript('{}', { id: 'x" onload="alert(1)' });
        expect(html).not.toContain('onload="alert(1)"');
    });

    it('emits a well-formed script element for ordinary input', () => {
        const html = renderJsonScript('{"a":1}', { id: 'state', nonce: 'n1' });
        expect(html).toBe(
            '<script id="state" type="application/json" nonce="n1">{"a":1}</script>'
        );
    });
});
