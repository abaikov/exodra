import { describe, expect, it } from 'vitest';
import {
    SafeHtml,
    markHtml,
    escapeOrRaw,
    escapeHtml,
    escapeAttribute,
    isEventName,
    serializeAttributeValue,
    serializeAttribute,
    spaceAttribute,
} from './escape';

describe('escapeHtml', () => {
    it('escapes &, <, >, and "', () => {
        expect(escapeHtml('a & b < c > d "e"')).toBe(
            'a &amp; b &lt; c &gt; d &quot;e&quot;'
        );
    });
    it('stringifies non-strings', () => {
        expect(escapeHtml(42)).toBe('42');
        expect(escapeHtml(null)).toBe('null');
    });
    it('escapeAttribute is the same escaping', () => {
        expect(escapeAttribute).toBe(escapeHtml);
    });
});

describe('SafeHtml / markHtml / escapeOrRaw', () => {
    it('SafeHtml holds raw HTML and stringifies to it', () => {
        const s = new SafeHtml('<b>x</b>');
        expect(s.value).toBe('<b>x</b>');
        expect(String(s)).toBe('<b>x</b>');
        expect([new SafeHtml('<a>'), new SafeHtml('<b>')].join('')).toBe('<a><b>');
    });
    it('markHtml wraps a string as SafeHtml', () => {
        expect(markHtml('<i>')).toBeInstanceOf(SafeHtml);
        expect(markHtml('<i>').value).toBe('<i>');
    });
    it('escapeOrRaw splices SafeHtml RAW but escapes everything else', () => {
        expect(escapeOrRaw(markHtml('<b>bold</b>'))).toBe('<b>bold</b>');
        expect(escapeOrRaw('<b>')).toBe('&lt;b&gt;');
    });
});

describe('isEventName', () => {
    it('matches on[A-Z] but not lifecycle or non-events', () => {
        expect(isEventName('onClick')).toBe(true);
        expect(isEventName('onInput')).toBe(true);
        expect(isEventName('onExoMount')).toBe(false); // lifecycle
        expect(isEventName('onExoUnmount')).toBe(false);
        expect(isEventName('onclick')).toBe(false); // lowercase = not a handler prop
        expect(isEventName('online')).toBe(false);
        expect(isEventName('class')).toBe(false);
    });
});

describe('serializeAttributeValue', () => {
    it('stringifies scalars', () => {
        expect(serializeAttributeValue('x')).toBe('x');
        expect(serializeAttributeValue(3)).toBe('3');
        expect(serializeAttributeValue(null)).toBe('null');
    });
    it('folds an object into "k: v; k2: v2" (e.g. a style object)', () => {
        expect(serializeAttributeValue({ color: 'red', margin: 0 })).toBe(
            'color: red; margin: 0'
        );
    });
});

describe('serializeAttribute', () => {
    it('renders a normal attribute, escaping the value', () => {
        expect(serializeAttribute('id', 'a"b')).toBe('id="a&quot;b"');
    });
    it('maps className → class', () => {
        expect(serializeAttribute('className', 'box')).toBe('class="box"');
    });
    it('emits a bare name for boolean true, nothing for false', () => {
        expect(serializeAttribute('disabled', true)).toBe('disabled');
        expect(serializeAttribute('disabled', false)).toBe('');
    });
    it('does NOT render children / textContent / directives / events / functions / nullish', () => {
        for (const name of ['children', 'textContent', 'dangerouslySetInnerHTML', 'onExoMount', 'onExoUnmount', 'onClick']) {
            expect(serializeAttribute(name, 'x')).toBe('');
        }
        expect(serializeAttribute('onClick', () => {})).toBe('');
        expect(serializeAttribute('title', undefined)).toBe('');
        expect(serializeAttribute('title', null)).toBe('');
        expect(serializeAttribute('handler', () => {})).toBe('');
    });
    it('folds an object attribute value', () => {
        expect(serializeAttribute('style', { color: 'red' })).toBe('style="color: red"');
    });
});

describe('spaceAttribute', () => {
    it('prefixes a space when the attribute renders', () => {
        expect(spaceAttribute('id', 'x')).toBe(' id="x"');
    });
    it('is empty (no stray space) when the attribute does not render', () => {
        expect(spaceAttribute('onClick', () => {})).toBe('');
        expect(spaceAttribute('title', undefined)).toBe('');
    });
});

describe('escapeHtml — the two implementations must agree (security-critical)', () => {
    // Reference: the plain chained-replace escaper, applied unconditionally.
    const reference = (v: unknown): string =>
        String(v)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');

    it('matches the reference on adversarial inputs', () => {
        const cases = [
            '',
            '&',
            '<',
            '>',
            '"',
            '&<>"',
            '&&&&',
            '<script>alert("x")</script>',
            '"><img src=x onerror=alert(1)>',
            'a&b',
            '&amp;', // already-escaped text must be escaped AGAIN
            ' & ',
            'ss&ss', // non-ascii neighbours
            ' '.repeat(63) + '&',
            ' '.repeat(64) + '&',
            ' '.repeat(65) + '&',
            '&' + ' '.repeat(200),
        ];
        for (const input of cases) {
            expect(escapeHtml(input)).toBe(reference(input));
        }
    });

    it('matches the reference across the length threshold, generated', () => {
        let seed = 99;
        const rnd = (n: number) => {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            return seed % n;
        };
        const alphabet = ['a', 'b', ' ', '&', '<', '>', '"'];
        for (let len = 0; len <= 130; len++) {
            for (let trial = 0; trial < 12; trial++) {
                let s = '';
                for (let i = 0; i < len; i++) s += alphabet[rnd(alphabet.length)];
                expect(escapeHtml(s)).toBe(reference(s));
            }
        }
    });

    it('never leaves a bare HTML-significant character in the output', () => {
        const s = '<a href="x">& more &</a>'.repeat(6);
        const out = escapeHtml(s);
        expect(out).not.toMatch(/[<>"]/);
        expect(out.match(/&(?!amp;|lt;|gt;|quot;)/)).toBeNull();
    });

    it('escapes non-string values through String() the same way', () => {
        const values: unknown[] = [0, 1, -1, true, false, null, undefined, NaN];
        for (const v of values) {
            expect(escapeHtml(v)).toBe(reference(v));
        }
        expect(escapeHtml({ toString: () => '<x>' })).toBe(reference({ toString: () => '<x>' }));
    });
});
