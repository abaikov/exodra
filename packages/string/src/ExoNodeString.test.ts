import { describe, expect, it } from 'vitest';
import { h, createContextKey } from '@exodra/core';
import type { TExoContext } from '@exodra/core';
import { bindable, list } from '@exodra/reactivity';
import { createExoBindable } from '../../reactivity/src/createExoBindable';
import { createExoBindableList } from '../../reactivity/src/createExoBindableList';
import { ExoNodeString } from './ExoNodeString';
import { renderToString } from './renderToString';

describe('ExoNodeString', () => {
    it('renders constant children', () => {
        const node = new ExoNodeString({
            type: 'div',
            attrs: {
                static: {
                    children: {
                        type: '#text',
                        attrs: {
                            static: {
                                textContent: 'hello',
                            },
                        },
                    },
                },
            },
        });

        expect(node.html).toBe('<div>hello</div>');
    });

    it('renders a bindable text child once (one-shot)', () => {
        const text = createExoBindable('hello');
        const node = new ExoNodeString({
            type: 'div',
            attrs: {
                static: {
                    children: {
                        type: '#text',
                        attrs: {
                            bindables: {
                                textContent: text,
                            },
                        },
                    },
                },
            },
        });

        expect(node.html).toBe('<div>hello</div>');
    });

    it('renders serializable attributes and bound attributes (one-shot)', () => {
        const className = createExoBindable('first');
        const node = new ExoNodeString({
            type: 'button',
            attrs: {
                static: {
                    id: 'action',
                    onClick: () => {},
                    textContent: 'go',
                },
                bindables: {
                    class: className,
                },
            },
        });

        expect(node.html).toBe(
            '<button id="action" class="first">go</button>'
        );
    });

    it('renders through the public API', () => {
        expect(
            renderToString({
                type: 'span',
                attrs: {
                    static: {
                        class: 'label',
                        textContent: 'hello',
                    },
                },
            })
        ).toBe('<span class="label">hello</span>');
    });

    it('renders component nodes as transparent wrappers', () => {
        const Component = () => ({
            type: 'strong',
            attrs: {
                static: {
                    textContent: 'component',
                },
            },
        });

        expect(
            renderToString({
                type: Component,
                attrs: {},
            })
        ).toBe('<strong>component</strong>');
    });

    it('renders bindableList children once (one-shot)', () => {
        const childA = {
            type: '#text',
            attrs: { static: { textContent: 'a' } },
        };
        const childB = {
            type: '#text',
            attrs: { static: { textContent: 'b' } },
        };
        const children = createExoBindableList([childA, childB]);
        const node = new ExoNodeString({
            type: 'div',
            attrs: {
                bindableLists: {
                    children,
                },
            },
        });

        expect(node.html).toBe('<div>ab</div>');
    });

    it('renders with h factory', () => {
        const app = h('section', { 
            static: {
                class: 'container',
                children: [
                    h('h1', { static: { children: 'Title' } }),
                    h('p', { static: { id: 'text', children: 'Content' } }),
                    h('ul', { 
                        static: {
                            children: [
                                h('li', { static: { children: 'One' } }),
                                h('li', { static: { children: 'Two' } })
                            ]
                        }
                    })
                ]
            }
        });
        
        const html = renderToString(app);
        
        expect(html).toContain('<section class="container">');
        expect(html).toContain('<h1>Title</h1>');
        expect(html).toContain('<p id="text">Content</p>');
        expect(html).toContain('<li>One</li>');
        expect(html).toContain('<li>Two</li>');
        expect(html).toContain('</section>');
    });
    
    it('renders reactive bindings with h factory', () => {
        const count = bindable(0);
        const todos = list([
            h('li', { static: { children: 'Todo 1' } })
        ]);
        
        const app = h('div', {
            static: {
                children: [
                    h('span', { bindables: { textContent: count } }),
                    h('ul', { bindableLists: { children: todos } })
                ]
            }
        });
        
        let html = renderToString(app);
        expect(html).toContain('<span>0</span>');
        expect(html).toContain('<li>Todo 1</li>');
        
        count.setValue(5);
        todos.push(h('li', { static: { children: 'Todo 2' } }));
        
        html = renderToString(app);
        expect(html).toContain('<span>5</span>');
        expect(html).toContain('<li>Todo 2</li>');
    });

    describe('Fragment handling', () => {
        it('renders fragment with constant children', () => {
            const fragment = h('#fragment', {
                static: {
                    children: [
                        h('div', { static: { children: 'First' } }),
                        h('div', { static: { children: 'Second' } })
                    ]
                }
            });
            
            const html = renderToString(fragment);
            expect(html).toBe('<div>First</div><div>Second</div>');
        });

        it('renders fragment with bindableList children', () => {
            const items = list([
                h('li', { static: { children: 'Item 1' } }),
                h('li', { static: { children: 'Item 2' } }),
                h('li', { static: { children: 'Item 3' } })
            ]);
            
            const fragment = h('#fragment', {
                bindableLists: {
                    children: items
                }
            });
            
            const html = renderToString(fragment);
            expect(html).toBe('<li>Item 1</li><li>Item 2</li><li>Item 3</li>');
        });

        it('renders fragment with bindable child', () => {
            const child = bindable(h('span', { static: { children: 'Dynamic' } }));
            
            const fragment = h('#fragment', {
                bindables: {
                    children: child
                }
            });
            
            const html = renderToString(fragment);
            expect(html).toBe('<span>Dynamic</span>');
        });

        it('renders mixed static and dynamic children using fragment', () => {
            const dynamicItems = list([
                h('li', { static: { children: 'Dynamic 1' } }),
                h('li', { static: { children: 'Dynamic 2' } })
            ]);
            
            const container = h('ul', {
                static: {
                    children: [
                        h('li', { static: { children: 'Static' } }),
                        h('#fragment', {
                            bindableLists: {
                                children: dynamicItems
                            }
                        })
                    ]
                }
            });
            
            const html = renderToString(container);
            expect(html).toBe('<ul><li>Static</li><li>Dynamic 1</li><li>Dynamic 2</li></ul>');
        });

        it('renders fragment bindableList children once (one-shot)', () => {
            const items = list([
                h('div', { static: { children: 'Initial' } })
            ]);

            const fragment = h('#fragment', {
                bindableLists: {
                    children: items
                }
            });

            const node = new ExoNodeString(fragment);
            expect(node.html).toBe('<div>Initial</div>');
        });
    });

    describe('void elements', () => {
        it('emits no closing tag for br/hr', () => {
            expect(renderToString(h('br', {}))).toBe('<br>');
            expect(renderToString(h('hr', {}))).toBe('<hr>');
        });

        it('emits void elements with attributes and no closing tag', () => {
            expect(
                renderToString(h('img', { static: { src: 'x.png', alt: 'x' } }))
            ).toBe('<img src="x.png" alt="x">');
            expect(
                renderToString(h('input', { static: { type: 'text', value: 'v' } }))
            ).toBe('<input type="text" value="v">');
            expect(
                renderToString(h('meta', { static: { charset: 'utf-8' } }))
            ).toBe('<meta charset="utf-8">');
            expect(
                renderToString(h('link', { static: { rel: 'stylesheet', href: 'a.css' } }))
            ).toBe('<link rel="stylesheet" href="a.css">');
        });

        it('non-void elements still get a closing tag', () => {
            expect(renderToString(h('div', {}))).toBe('<div></div>');
            expect(renderToString(h('span', {}))).toBe('<span></span>');
        });
    });

    describe('textContent edge cases', () => {
        it('nullish static textContent falls back to children, not "null"', () => {
            const node = new ExoNodeString({
                type: 'div',
                attrs: {
                    static: {
                        textContent: null,
                        children: { type: '#text', attrs: { static: { textContent: 'kids' } } },
                    },
                },
            } as ConstructorParameters<typeof ExoNodeString>[0]);
            expect(node.html).toBe('<div>kids</div>');
        });

        it('bindable null textContent falls back to static textContent', () => {
            const node = new ExoNodeString({
                type: 'div',
                attrs: {
                    bindables: { textContent: createExoBindable(null) },
                    static: { textContent: 'fallback' },
                },
            } as ConstructorParameters<typeof ExoNodeString>[0]);
            expect(node.html).toBe('<div>fallback</div>');
        });
    });

    describe('duplicate class/className', () => {
        it('emits a single class attribute when both class and className are set', () => {
            const html = renderToString(
                h('div', { static: { class: 'a', className: 'b' } })
            );
            // Exactly one class attribute (no `class="a" class="b"`).
            expect(html.match(/class=/g)?.length).toBe(1);
            expect(html).toBe('<div class="b"></div>');
        });
    });

    describe('component context', () => {
        it('reads static via ctx.getConstant', () => {
            const Comp = (ctx: TExoContext) => ({
                type: 'b',
                attrs: { static: { textContent: ctx.getConstant('label') } },
            });
            expect(
                renderToString({ type: Comp, attrs: { static: { label: 'hi' } } })
            ).toBe('<b>hi</b>');
        });

        it('reads bindables via ctx.getBindable', () => {
            const Comp = (ctx: TExoContext) => ({
                type: 'b',
                attrs: {
                    static: {
                        textContent: (ctx.getBindable('count') as { getValue(): number }).getValue(),
                    },
                },
            });
            expect(
                renderToString({
                    type: Comp,
                    attrs: { bindables: { count: createExoBindable(7) } },
                })
            ).toBe('<b>7</b>');
        });

        it('reads bindableLists via ctx.getBindableList', () => {
            const Comp = (ctx: TExoContext) => {
                const items = ctx.getBindableList('items') as { snapshot(): unknown[] };
                return {
                    type: 'span',
                    attrs: { static: { textContent: items.snapshot().length } },
                };
            };
            expect(
                renderToString({
                    type: Comp,
                    attrs: { bindableLists: { items: createExoBindableList([1, 2, 3]) } },
                })
            ).toBe('<span>3</span>');
        });

        it('threads provide() from a parent component into inject() of a descendant', () => {
            const themeKey = createContextKey<string>('theme');
            const Child = (ctx: TExoContext) => ({
                type: 'em',
                attrs: { static: { textContent: ctx.inject(themeKey) } },
            });
            const Parent = (ctx: TExoContext) => {
                ctx.provide(themeKey, 'dark');
                return { type: Child, attrs: {} };
            };
            expect(renderToString({ type: Parent, attrs: {} })).toBe('<em>dark</em>');
        });

        it('inject() returns the fallback when nothing is provided', () => {
            const missingKey = createContextKey<string>('missing');
            const Comp = (ctx: TExoContext) => ({
                type: 'em',
                attrs: { static: { textContent: ctx.inject(missingKey, 'default') } },
            });
            expect(renderToString({ type: Comp, attrs: {} })).toBe('<em>default</em>');
        });
    });

    describe('dangerouslySetInnerHTML', () => {
        it('emits raw inner HTML verbatim, skipping children', () => {
            const html = renderToString({
                type: 'div',
                attrs: {
                    static: {
                        dangerouslySetInnerHTML: { __html: '<b>raw & unescaped</b>' },
                        children: { type: '#text', attrs: { static: { textContent: 'ignored' } } },
                    },
                },
            });
            expect(html).toBe('<div><b>raw & unescaped</b></div>');
        });

        it('falls back to normal rendering when __html is nullish', () => {
            const html = renderToString({
                type: 'div',
                attrs: {
                    static: {
                        dangerouslySetInnerHTML: { __html: null },
                        textContent: 'shown',
                    },
                },
            });
            expect(html).toBe('<div>shown</div>');
        });
    });
});
