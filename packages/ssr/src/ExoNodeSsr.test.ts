import { describe, expect, it } from 'vitest';
import { h, createContextKey, type TExoContext } from '@exodra/core';
import { ExoNodeSsr } from './ExoNodeSsr';
import { Head, Header, State, Status } from './components';
import { useSsr } from './context';

describe('ExoNodeSsr', () => {
    it('renders body, head, state, status, and headers from node methods', () => {
        const node = new ExoNodeSsr(
            h('main', {
                static: {
                    textContent: 'hello',
                }
            })
        );

        node.setStatus(201);
        node.setHeader('content-type', 'text/html; charset=utf-8');
        node.appendHeader('set-cookie', 'a=1');
        node.appendHeader('set-cookie', 'b=2');
        node.addHead(h('title', { static: { textContent: 'SSR' } }));
        node.setState('payload', {
            html: '</script><div>&',
        });

        expect(node.renderBody()).toBe('<main>hello</main>');
        expect(node.renderHead()).toBe('<title>SSR</title>');
        expect(node.getStatus()).toBe(201);
        expect(node.getHeader('content-type')).toBe('text/html; charset=utf-8');
        expect(node.getHeaderValues('set-cookie')).toEqual(['a=1', 'b=2']);
        expect(node.renderStateScript()).toContain('\\u003C/script\\u003E');
        expect(node.renderStateScript()).toContain('\\u0026');
        expect(node.renderDocument()).toContain(
            '<div id="app"><main>hello</main></div>'
        );
    });

    it('lets components write SSR metadata through context', () => {
        const App = () =>
            h('section', {
                static: {
                    children: [
                        h(Head, {
                            static: {
                                children: [
                                    h('title', { static: { textContent: 'From component' } }),
                                    h('meta', {
                                        static: {
                                            name: 'description',
                                            content: 'Exodra SSR',
                                        }
                                    }),
                                ]
                            }
                        }),
                        h(Status, { static: { code: 404 } }),
                        h(Header, {
                            static: {
                                name: 'cache-control',
                                value: 'no-store',
                            }
                        }),
                        h(State, {
                            static: {
                                name: 'route',
                                value: '/missing',
                            }
                        }),
                        h('h1', { static: { textContent: 'Not found' } })
                    ]
                }
            });

        const node = new ExoNodeSsr(h(App));

        expect(node.renderBody()).toBe('<section><h1>Not found</h1></section>');
        expect(node.renderHead()).toBe(
            // <meta> is a void element — no closing tag (was previously the invalid
            // `<meta ...></meta>`, which the HTML parser mishandles).
            '<title>From component</title><meta name="description" content="Exodra SSR">'
        );
        expect(node.getStatus()).toBe(404);
        expect(node.getHeader('cache-control')).toBe('no-store');
        expect(node.getState('route')).toBe('/missing');
    });

    it('exposes the same SSR object through useSsr', () => {
        function App(context: TExoContext) {
            const ssr = useSsr(context);
            ssr?.setStatus(202);
            ssr?.addHead(h('title', { static: { textContent: 'Manual' } }));

            return h('p', { static: { textContent: 'accepted' } });
        }

        const node = new ExoNodeSsr(h(App));

        expect(node.getStatus()).toBe(202);
        expect(node.renderHead()).toBe('<title>Manual</title>');
        expect(node.renderBody()).toBe('<p>accepted</p>');
    });

    describe('constructor options (initial SSR state)', () => {
        it('seeds status, headers, head, and state (object) from options', () => {
            const node = new ExoNodeSsr(h('main', { static: { textContent: 'x' } }), {
                status: 418,
                headers: [{ name: 'X-Init', value: 'y' }],
                head: h('title', { static: { textContent: 'Seed' } }),
                state: { a: 1 },
            });
            expect(node.getStatus()).toBe(418);
            expect(node.getHeaders()).toEqual([{ name: 'X-Init', value: 'y' }]);
            expect(node.renderHead()).toBe('<title>Seed</title>');
            expect(node.getState('a')).toBe(1);
        });

        it('accepts an initial state passed as a Map', () => {
            const node = new ExoNodeSsr(h('main'), {
                state: new Map<string, unknown>([['b', 2]]),
            });
            expect(node.getStateSnapshot()).toEqual({ b: 2 });
        });

        it('defaults to status 200 and empty collections with no options', () => {
            const node = new ExoNodeSsr(h('main'));
            expect(node.getStatus()).toBe(200);
            expect(node.getHeaders()).toEqual([]);
            expect(node.renderHead()).toBe('');
            expect(node.getStateSnapshot()).toEqual({});
        });
    });

    describe('getters', () => {
        it('getHeader joins repeated values; getHeaderValues lists them; missing → undefined/[]', () => {
            const node = new ExoNodeSsr(h('main'));
            node.appendHeader('Set-Cookie', 'a=1');
            node.appendHeader('set-cookie', 'b=2');
            expect(node.getHeader('set-cookie')).toBe('a=1, b=2');
            expect(node.getHeaderValues('Set-Cookie')).toEqual(['a=1', 'b=2']);
            expect(node.getHeader('missing')).toBeUndefined();
            expect(node.getHeaderValues('missing')).toEqual([]);
        });

        it('getHeaders returns copies (mutating the result does not affect the node)', () => {
            const node = new ExoNodeSsr(h('main'));
            node.setHeader('X', '1');
            const headers = node.getHeaders();
            (headers as { name: string; value: string }[])[0].value = 'mutated';
            expect(node.getHeader('X')).toBe('1');
        });

        it('getState returns undefined for an unset key', () => {
            const node = new ExoNodeSsr(h('main'));
            expect(node.getState('nope')).toBeUndefined();
        });

        it('setHeader replaces the matching header (case-insensitive) and keeps others', () => {
            const node = new ExoNodeSsr(h('main'));
            node.setHeader('A', '1');
            node.setHeader('B', '2');
            node.setHeader('a', '3'); // replaces A (case-insensitive), keeps B
            expect(node.getHeaders()).toEqual([
                { name: 'B', value: '2' },
                { name: 'a', value: '3' },
            ]);
        });
    });

    describe('renderStateScript', () => {
        it('is empty when there is no state', () => {
            const node = new ExoNodeSsr(h('main'));
            expect(node.renderStateScript()).toBe('');
        });

        it('honors a custom id and a CSP nonce', () => {
            const node = new ExoNodeSsr(h('main'));
            node.setState('k', 1);
            const script = node.renderStateScript({ id: 'STATE', nonce: 'n0nce' });
            expect(script).toContain('id="STATE"');
            expect(script).toContain('nonce="n0nce"');
            expect(script).toContain('type="application/json"');
        });
    });

    describe('renderDocument options', () => {
        const build = () => {
            const node = new ExoNodeSsr(h('main', { static: { textContent: 'b' } }));
            node.addHead(h('title', { static: { textContent: 'T' } }));
            node.setState('k', 1);
            return node;
        };

        it('supports doctype:false, custom lang/rootId, html/body attributes, extra head, and nonce', () => {
            const doc = build().renderDocument({
                doctype: false,
                lang: 'de',
                rootId: 'root',
                htmlAttributes: { 'data-theme': 'dark' },
                bodyAttributes: { class: 'ssr' },
                head: h('meta', { static: { charset: 'utf-8' } }),
                nonce: 'xyz',
            });
            expect(doc.startsWith('<html lang="de" data-theme="dark">')).toBe(true);
            expect(doc).toContain('<body class="ssr">');
            expect(doc).toContain('<div id="root"><main>b</main></div>');
            // options.head is rendered BEFORE the collected head
            expect(doc).toContain('<head><meta charset="utf-8"><title>T</title></head>');
            expect(doc).toContain('nonce="xyz"');
        });

        it('supports a custom doctype string', () => {
            const doc = build().renderDocument({ doctype: '<!DOCTYPE html>' });
            expect(doc.startsWith('<!DOCTYPE html>\n<html')).toBe(true);
        });

        it('drops boolean-false/nullish/function attributes and emits bare names for true', () => {
            const doc = build().renderDocument({
                htmlAttributes: {
                    hidden: true, // bare name
                    'data-x': false, // dropped
                    'data-y': null, // dropped
                    'data-z': undefined, // dropped
                    'data-fn': () => {}, // dropped
                },
            });
            const htmlTag = doc.slice(doc.indexOf('<html'), doc.indexOf('>', doc.indexOf('<html')) + 1);
            expect(htmlTag).toContain(' hidden');
            expect(htmlTag).not.toContain('data-x');
            expect(htmlTag).not.toContain('data-y');
            expect(htmlTag).not.toContain('data-z');
            expect(htmlTag).not.toContain('data-fn');
        });
    });

    it('inject() falls through to the parent context for non-SSR keys', () => {
        const themeKey = createContextKey<string>('theme');
        const Child = (context: TExoContext) => ({
            type: 'em',
            attrs: { static: { textContent: context.inject(themeKey, 'fallback') } },
        });
        const Parent = (context: TExoContext) => {
            context.provide(themeKey, 'dark');
            // also proves the SSR key still resolves to the node itself
            useSsr(context)?.setStatus(207);
            return h(Child);
        };
        const node = new ExoNodeSsr(h(Parent));
        expect(node.renderBody()).toBe('<em>dark</em>');
        expect(node.getStatus()).toBe(207);
    });
});
