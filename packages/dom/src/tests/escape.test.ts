// @vitest-environment jsdom
//
// THE ESCAPERS BOTH BACKENDS SHARE.
//
// They used to live under `str/`, and the DOM compiler imported them across the folder
// boundary with a comment in its own header saying that was the wrong place for them. The
// position matters more than tidiness: what these two functions hold up is an agreement
// BETWEEN the backends — the markup the server prints and the markup the DOM compiler parses
// its prototype from must be the same bytes — so a copy made "for the DOM side" is not a
// duplicate helper, it is the end of hydration.
//
// The cases below are the ones a second copy gets wrong: the angle brackets inside a quoted
// attribute value, which the OLDER `cursor/string/escape-attribute-value` deliberately leaves raw
// (safe — nothing but the quote can end a value — and different bytes), and the non-breaking
// space, which is invisible in a diff.
import { escapeExoAttributeValue, escapeExoText } from '@exodra/core';
import type { TExoMachineInitialState } from '@exodra/core';
import { describe, expect, it } from 'vitest';

import { host, createExoTestMachine } from '@exodra/test-utils';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

const EXO_BACKEND = withExoCompiler(new ExoDomBackend());
const EXO_STR = new ExoStrBackend();

describe('escapeExoAttributeValue', () => {
    it('escapes the angle brackets a browser escapes, which the older string backend does not', () => {
        expect(escapeExoAttributeValue('a<b>c')).toBe('a&lt;b&gt;c');
    });

    it('escapes the quote that would end the value, and the ampersand FIRST', () => {
        // `&` first is the whole ordering rule: any other order would re-escape the
        // ampersands the earlier replacements just introduced, and `&quot;` would print as
        // `&amp;quot;`.
        expect(escapeExoAttributeValue('say "hi" & bye')).toBe('say &quot;hi&quot; &amp; bye');
    });

    it('escapes a non-breaking space, which no diff would ever show', () => {
        expect(escapeExoAttributeValue('a\u00A0b')).toBe('a&nbsp;b');
    });

    it('returns the very same string when there is nothing to escape', () => {
        const plain = 'nothing here';
        expect(escapeExoAttributeValue(plain)).toBe(plain);
    });
});

describe('escapeExoText', () => {
    it('escapes what a text position needs and leaves the quote alone', () => {
        // A `"` in text is a `"` in the serialised tree, so escaping it would be SAFE and
        // would be different bytes — which is the only failure mode that matters here.
        expect(escapeExoText('<b>a & "b"</b>\u00A0')).toBe('&lt;b&gt;a &amp; "b"&lt;/b&gt;&nbsp;');
    });

    it('returns the very same string when there is nothing to escape', () => {
        const plain = 'nothing here';
        expect(escapeExoText(plain)).toBe(plain);
    });
});

describe('the two backends escape their static markup the same way', () => {
    // The reason the functions are shared, asserted through the compilers that call them:
    // one schema whose static attribute and static text both need escaping, rendered by the
    // server and built by the DOM backend, byte for byte.
    //
    // The attribute value deliberately carries no `<`: the HTML SERIALISER (what `innerHTML`
    // hands back) escapes only `&`, `"` and U+00A0 inside an attribute, so a `<` here would
    // come back raw from the DOM and raw-vs-`&lt;` would be a fact about serialisation rather
    // than about these functions. The angle brackets are pinned directly, above.
    //
    // Every byte of it is static, so the component's wiring is the empty one - which a
    // component still carries, because a component is both halves whether or not the second
    // one has anything to do.
    //
    // THE RETURN TYPE ON THE FACTORY IS NOT DECORATION, and the emitted function is byte for byte
    // the one that was here before it. `unknown` for the exonode is what lets ONE declaration
    // satisfy both backends' `render` below: a function parameter is contravariant, so a wire
    // accepting `unknown` there is accepted by a backend that hands it a real exonode, which is the
    // whole reason the case can hand one component to both backends.
    const ESCAPED = createExoTestMachine(
        (b) => {
            b.el('div', { title: 'a&b "c"\u00A0d' }, (div) => {
                div.text('x < y > z & w\u00A0end');
            });
            return {};
        },
        (): TExoMachineInitialState<unknown> => () => undefined
    );

    it('agrees on a static attribute and a static text run', () => {
        const fromServer = EXO_STR.render(ESCAPED);
        const parent = host();
        EXO_BACKEND.render(ESCAPED, parent);

        expect(parent.innerHTML).toBe(fromServer);
        expect(fromServer).toContain('title="a&amp;b &quot;c&quot;&nbsp;d"');
        expect(fromServer).toContain('x &lt; y &gt; z &amp; w&nbsp;end');
    });
});
