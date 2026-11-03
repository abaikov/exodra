// @vitest-environment jsdom
//
// THE DOCUMENT ASSEMBLER, AND THE PARTS OF IT NOTHING ASKED ABOUT.
//
// `render-exo-page.test.ts` covers the shapes a page normally produces: the container, the head
// ordering, the state round trip, the response collectors. What it never touches is the SMALL
// PRINT of `ExoSsrResponse.renderDocument` — the wrapper-attribute rules, the `rootId` escape,
// the array form of `head`, and the state-script id — and every one of those is a line that
// decides bytes on every served page.
//
// TWO OF THEM ARE SECURITY-SHAPED and neither had an assertion:
//
//  1. `<div id="${escapeExoAttributeValue(rootId)}">` — the `rootId` is a CALLER's string, and a
//     server that builds it from a route or a tenant name is the ordinary case. Without the
//     escape a `"` ends the attribute and everything after it is markup.
//  2. `renderAttributes` for `<html>` and `<body>` — the same, one element out, plus the
//     omission rules (`false`/`null`/`undefined`/function produce NO attribute) which decide
//     whether a page ships `hidden="false"` on its own `<body>`.
//
// THE THIRD IS A LIMIT RATHER THAN A DEFECT, and it is pinned here so it is a decision instead of
// a surprise: `renderDocument` forwards only the `nonce` to `renderStateScript`, so the state
// script's ID is not reachable through it. A caller who needs another id drives `ExoSsrResponse`
// itself — which is the reason that class is exported, a claim `index.ts` makes and nothing tested.
import type { TExoSchemaCursor, TExoTextPort, TExoMachineInitialState } from '@exodra/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { EXO_STATE_SCRIPT_ID } from '../constants/EXO_STATE_SCRIPT_ID';
import { ExoSsrResponse } from '../context/ExoSsrResponse';
import { readExoStateScript } from '../scripts/readExoStateScript';
import { renderExoPage } from '../page/renderExoPage';
import { createExoTestMachine } from '@exodra/test-utils';

/** Nothing may leak between cases: `readExoStateScript` finds its element BY ID. */
beforeEach(() => {
    document.body.innerHTML = '';
});

/** The smallest possible page — one element, one text port, nothing to distract from the wrapper. */
const PAGE = createExoTestMachine(
    (b: TExoSchemaCursor) => {
        let title!: TExoTextPort;
        b.el('main', null, (main) => {
            title = main.textPort();
        });
        return { title };
    },
    (P): TExoMachineInitialState<{ text(port: TExoTextPort, value: unknown): void }> =>
        (c) => {
            c.text(P.title, 'Home');
        }
);

describe('renderDocument — the container id', () => {
    it('escapes a rootId that would otherwise end the attribute', () => {
        // A `rootId` built from a route, a tenant or a query parameter is the ordinary server
        // case. `escapeExoAttributeValue` is the only thing between that and markup injection
        // into the one element hydration is handed.
        const doc = renderExoPage(PAGE).renderDocument({
            rootId: 'app" onload="alert(1)',
        });

        expect(doc).toContain('<div id="app&quot; onload=&quot;alert(1)">');
        expect(
            doc.includes('onload="alert(1)"'),
            'a rootId closed its own quote and forged an attribute on the hydration container'
        ).toBe(false);
    });

    it('defaults to `app`, which is the id every hydration example passes', () => {
        expect(renderExoPage(PAGE).renderDocument()).toContain('<div id="app">');
    });
});

describe('renderDocument — the wrapper attributes on <html> and <body>', () => {
    it('writes `true` as the empty value, as @exodra/string does, not the word "true"', () => {
        const doc = renderExoPage(PAGE).renderDocument({
            htmlAttributes: { 'data-ready': true },
        });
        expect(doc).toContain('<html lang="en" data-ready="">');
        expect(doc).not.toContain('data-ready="true"');
    });

    it('leaves the attribute out entirely for false, null, undefined and a function', () => {
        // The presence of an attribute IS its value in HTML: `hidden="false"` hides the body.
        // These four are the whole omission rule and none of them had an assertion.
        const doc = renderExoPage(PAGE).renderDocument({
            bodyAttributes: {
                hidden: false,
                'data-null': null,
                'data-undefined': undefined,
                onload: () => undefined,
            },
        });

        expect(doc).toContain('<body>');
        for (const absent of ['hidden', 'data-null', 'data-undefined', 'onload']) {
            expect(doc.includes(absent), `<body> carries ${absent}, which must be omitted`).toBe(
                false
            );
        }
    });

    it("escapes a wrapper attribute value with the render path's own escaper", () => {
        const doc = renderExoPage(PAGE).renderDocument({
            htmlAttributes: { 'data-note': 'a&b "c" <d>' },
        });
        expect(doc).toContain('data-note="a&amp;b &quot;c&quot; &lt;d&gt;"');
    });

    it('lowercases an attribute name, the same mapping an element attribute gets', () => {
        // `exoAttribute` is the schema core's own primitive, so the wrapper and an element
        // attribute are spelled by one rule rather than by two that can drift.
        const doc = renderExoPage(PAGE).renderDocument({
            bodyAttributes: { CLASS: 'ssr dark' },
        });
        expect(doc).toContain('<body class="ssr dark">');
        expect(doc).not.toContain('CLASS');
    });

    it('stringifies a number and lets `lang` be overridden', () => {
        const doc = renderExoPage(PAGE).renderDocument({
            lang: 'ru',
            htmlAttributes: { 'data-build': 42 },
        });
        expect(doc).toContain('<html lang="ru" data-build="42">');
    });
});

describe('renderDocument — the doctype and the head', () => {
    it('accepts a doctype string of its own, and puts a newline after it', () => {
        const doc = renderExoPage(PAGE).renderDocument({ doctype: '<!DOCTYPE html>' });
        expect(doc.startsWith('<!DOCTYPE html>\n<html')).toBe(true);
    });

    it('takes an ARRAY of head entries and keeps them in order, before the collected ones', () => {
        // `renderHeadOption`'s array branch. The ordering rule is the one that matters: a charset
        // arriving after a title is a charset the parser has already had to guess at. The entries
        // seeded through `renderExoPage`'s own `head` option are what `renderHead()` returns, and
        // they come SECOND — after the ones handed to `renderDocument`.
        const doc = renderExoPage(PAGE, { head: '<title>Seeded</title>' }).renderDocument({
            head: ['<meta charset="utf-8">', '<link rel="icon" href="/i">'],
        });

        expect(doc).toContain(
            '<head><meta charset="utf-8"><link rel="icon" href="/i"><title>Seeded</title></head>'
        );
    });

    it('emits an empty head for a null or undefined head option', () => {
        const doc = renderExoPage(PAGE).renderDocument({ head: null });
        expect(doc).toContain('<head></head>');
    });
});

describe('ExoSsrResponse written by hand — the reason it is exported', () => {
    // `index.ts` says this class is exported "for a caller that drives the render by hand: a
    // framework that wants to install `EXO_SSR_RESPONSE` around something other than `ExoStrBackend.render`
    // needs the object `renderExoPage` would have built rather than a second implementation of the
    // same collectors". Nothing exercised that. Every method below is one a framework would call.

    it('collects headers the way the request object promises, and hands back copies', () => {
        const response = new ExoSsrResponse();
        response.setHeader('Content-Type', 'text/plain');
        response.setHeader('content-type', 'text/html; charset=utf-8');
        response.appendHeader('Set-Cookie', 'a=1');
        response.appendHeader('Set-Cookie', 'b=2');

        expect(response.getHeader('CONTENT-TYPE')).toBe('text/html; charset=utf-8');
        expect(response.getHeaderValues('set-cookie')).toEqual(['a=1', 'b=2']);
        // Joined with `, ` when there are several, and `undefined` — not `''` — when there are none.
        expect(response.getHeader('set-cookie')).toBe('a=1, b=2');
        expect(response.getHeader('x-missing')).toBe(undefined);

        // The ARRAY is readonly; each header object's fields are not. Mutating one is exactly what
        // the doc comment on `getHeaders` promises cannot reach the request state.
        response.getHeaders()[0].value = 'tampered';
        expect(
            response.getHeader('content-type'),
            'getHeaders() aliased the request state instead of copying it'
        ).toBe('text/html; charset=utf-8');
    });

    it('reads a seeded state map back by key and as a snapshot', () => {
        const response = new ExoSsrResponse({ state: { seeded: 1 } });
        response.setState('added', { deep: true });

        expect(response.getState('seeded')).toBe(1);
        expect(response.getState('missing')).toBe(undefined);
        expect(response.getStateSnapshot()).toEqual({ seeded: 1, added: { deep: true } });
    });

    it("does not alias a seeded Map — a later setState must not reach the caller's map", () => {
        const seed = new Map<string, unknown>([['a', 1]]);
        const response = new ExoSsrResponse({ state: seed });
        response.setState('b', 2);
        expect(seed.has('b'), "the response mutated the caller's seed map").toBe(false);
    });

    it('does not alias a seeded head array either', () => {
        const seed = ['<title>One</title>'];
        const response = new ExoSsrResponse({ head: seed });
        response.addHead('<title>Two</title>');
        expect(seed.length, "the response mutated the caller's seed array").toBe(1);
        expect(response.renderHead()).toBe('<title>One</title><title>Two</title>');
    });

    it('writes the state script under a custom id and nonce, and reads it back', () => {
        const response = new ExoSsrResponse();
        response.setState('user', { id: 7 });

        const script = response.renderStateScript({ id: 'my-state', nonce: 'n1' });
        expect(script).toBe(
            '<script id="my-state" type="application/json" nonce="n1">{"user":{"id":7}}</script>'
        );

        document.body.innerHTML = script;
        expect(readExoStateScript('my-state')).toEqual({ user: { id: 7 } });
        // And the DEFAULT id finds nothing, which is the failure a mismatched id produces: a page
        // that reads `undefined` and renders empty, with no error anywhere.
        expect(readExoStateScript()).toBe(undefined);
    });

    it('renders no state script at all for an empty map', () => {
        expect(new ExoSsrResponse().renderStateScript()).toBe('');
    });
});

describe('readExoStateScript — the client end', () => {
    it('reads the default id renderDocument writes, out of a document handed to it', () => {
        // The `doc` parameter exists so a caller can read a document that is not the global one
        // (a test, a worker, a parsed response). Nothing exercised it.
        const page = renderExoPage(PAGE, { state: { seeded: 'yes' } });
        const parsed = new DOMParser().parseFromString(page.renderDocument(), 'text/html');
        expect(readExoStateScript(EXO_STATE_SCRIPT_ID, parsed)).toEqual({ seeded: 'yes' });
    });

    it('is undefined for an element that is there but empty', () => {
        // "No element" and "an element with no text" are the same fact — nothing was transferred —
        // and answering `undefined` for both is what keeps a caller from having to tell them apart.
        document.body.innerHTML = `<script id="${EXO_STATE_SCRIPT_ID}" type="application/json"></script>`;
        expect(readExoStateScript()).toBe(undefined);
    });

    it('throws for a script that is there and does not parse, rather than answering undefined', () => {
        // A corrupted response is not the same fact as an absent one, and swallowing it would
        // serve a page that silently lost its state.
        document.body.innerHTML = `<script id="${EXO_STATE_SCRIPT_ID}" type="application/json">{ not json</script>`;
        expect(() => readExoStateScript()).toThrow();
    });
});
