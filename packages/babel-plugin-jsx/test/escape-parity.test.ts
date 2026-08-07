import { describe, expect, it } from 'vitest';
import { VOID_ELEMENTS } from '@exodra/core';
import { escapeHtml } from '@exodra/string';
import { escapeStatic } from '../src/ssr-emit';

// The plugin escapes STATIC text at compile time with its own copy of the
// runtime's escapeHtml (see the comment on escapeStatic — importing the SSR
// runtime into a build-time plugin would push that install onto every consumer,
// including client-only ones). A copy is only acceptable while something proves
// it cannot drift: this file. If the two ever disagree, compiled SSR and the
// runtime walker emit different HTML for the same source.
describe('compile-time escaping matches the runtime escaper', () => {
    const cases = [
        '',
        'plain text',
        'a & b',
        '<script>alert(1)</script>',
        'quote " and \'apostrophe\'',
        'all four: & < > "',
        '&amp; already escaped',
        'ünïcödé — 中文 — 🎉',
        'tab\tnewline\nreturn\r',
        '&&&<<<>>>"""',
    ];

    it.each(cases)('escapes %j identically', value => {
        expect(escapeStatic(value)).toBe(escapeHtml(value));
    });

    it('agrees on a long mixed string', () => {
        const long = cases.join(' | ').repeat(20);
        expect(escapeStatic(long)).toBe(escapeHtml(long));
    });
});

describe('void-element table', () => {
    // Both the emitter and the runtime walker now import this one table from
    // @exodra/core, so they cannot classify an element differently. This pins
    // the contents so the table itself is not edited by accident.
    it('is the HTML void-element set', () => {
        expect([...VOID_ELEMENTS].sort()).toEqual([
            'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
            'link', 'meta', 'param', 'source', 'track', 'wbr',
        ]);
    });
});
