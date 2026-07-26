import { describe, expect, it } from 'vitest';
import { ssrContext, markHtml } from '@exodra/string';
import { renderToStringCompiled } from './renderToStringCompiled';
import { Head, Header, State, Status } from './components';

// A compiled SSR page is a `() => SafeHtml` closure. Metadata components run
// during that closure and reach the request context via inject(ssrContextKey),
// which — in compile mode — resolves through the ambient installed by
// renderToStringCompiled. We build each component's own `ssrContext(...)` exactly
// as the compiled output would (`Comp(_ctx({ static }))`).
const ctx = (staticProps: Record<string, unknown>) =>
    ssrContext({ static: staticProps });

describe('renderToStringCompiled', () => {
    it('collects status / headers / head / state and returns the body HTML', () => {
        const result = renderToStringCompiled(() => {
            Status(ctx({ code: 404 }));
            Header(ctx({ name: 'X-Test', value: '1' }));
            Head(ctx({ children: markHtml('<title>Hi</title>') }));
            State(ctx({ name: 'user', value: { id: 7 } }));
            return markHtml('<main>body</main>');
        });

        expect(result.html).toBe('<main>body</main>');
        expect(result.status).toBe(404);
        expect(result.headers).toEqual([{ name: 'X-Test', value: '1' }]);
        expect(result.head).toBe('<title>Hi</title>');
        expect(result.state).toEqual({ user: { id: 7 } });
        expect(result.stateScript).toContain('"user"');
        expect(result.stateScript).toContain('type="application/json"');
    });

    it('defaults to status 200 with empty collections and stringifies non-SafeHtml', () => {
        const result = renderToStringCompiled(() => '<p>plain</p>');
        expect(result.html).toBe('<p>plain</p>');
        expect(result.status).toBe(200);
        expect(result.headers).toEqual([]);
        expect(result.head).toBe('');
        expect(result.state).toEqual({});
        expect(result.stateScript).toBe(''); // no state → no script
    });

    it('setHeader (append:false) overrides an earlier value; append:true accumulates', () => {
        const result = renderToStringCompiled(() => {
            Header(ctx({ name: 'Content-Type', value: 'text/plain' }));
            Header(ctx({ name: 'content-type', value: 'text/html' })); // overrides (case-insensitive)
            Header(ctx({ name: 'Set-Cookie', value: 'a=1', append: true }));
            Header(ctx({ name: 'Set-Cookie', value: 'b=2', append: true }));
            return markHtml('');
        });
        // last content-type wins; both cookies kept
        expect(result.headers).toEqual([
            { name: 'content-type', value: 'text/html' },
            { name: 'Set-Cookie', value: 'a=1' },
            { name: 'Set-Cookie', value: 'b=2' },
        ]);
    });

    it('concatenates multiple <Head> entries (single + array)', () => {
        const result = renderToStringCompiled(() => {
            Head(ctx({ children: markHtml('<meta a>') }));
            Head(ctx({ children: [markHtml('<meta b>'), markHtml('<meta c>')] }));
            return markHtml('');
        });
        expect(result.head).toBe('<meta a><meta b><meta c>');
    });

    it('escapes dangerous characters in the serialized state script', () => {
        const result = renderToStringCompiled(() => {
            State(ctx({ name: 'x', value: '</script><b> &    ' }));
            return markHtml('');
        });
        expect(result.stateScript).toContain('\\u003C/script\\u003E');
        expect(result.stateScript).toContain('\\u0026');
        expect(result.stateScript).toContain('\\u2028');
        expect(result.stateScript).toContain('\\u2029');
        // The only literal </script> is the wrapper tag; the DATA is escaped.
        expect(result.stateScript.match(/<\/script>/g)?.length).toBe(1);
        expect(result.stateScript).not.toContain('<b>');
    });

    describe('renderDocument', () => {
        const build = () =>
            renderToStringCompiled(() => {
                Head(ctx({ children: markHtml('<title>T</title>') }));
                State(ctx({ name: 'k', value: 1 }));
                return markHtml('<main>b</main>');
            });

        it('assembles a full document with defaults', () => {
            const doc = build().renderDocument();
            expect(doc.startsWith('<!doctype html>\n<html lang="en">')).toBe(true);
            expect(doc).toContain('<head><title>T</title></head>');
            expect(doc).toContain('<div id="app"><main>b</main></div>');
            expect(doc).toContain('type="application/json"'); // state script embedded
            expect(doc.endsWith('</body></html>')).toBe(true);
        });

        it('honors doctype:false, custom lang and rootId, and a CSP nonce', () => {
            const doc = build().renderDocument({
                doctype: false,
                lang: 'fr',
                rootId: 'root',
                nonce: 'abc123',
            });
            expect(doc.startsWith('<html lang="fr">')).toBe(true);
            expect(doc).toContain('<div id="root">');
            expect(doc).toContain('nonce="abc123"');
        });

        it('honors a custom doctype string', () => {
            const doc = build().renderDocument({ doctype: '<!DOCTYPE html>' });
            expect(doc.startsWith('<!DOCTYPE html>\n<html')).toBe(true);
        });

        it('escapes lang and rootId so a quote cannot break out of the attribute', () => {
            const doc = build().renderDocument({ lang: 'a"b', rootId: 'c"d' });
            expect(doc).toContain('lang="a&quot;b"');
            expect(doc).toContain('id="c&quot;d"');
        });
    });
});
