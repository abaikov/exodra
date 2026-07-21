import { describe, expect, it } from 'vitest';
import { h, type TExoContext } from '@exodra/core';
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
            '<title>From component</title><meta name="description" content="Exodra SSR"></meta>'
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
});
