import { describe, expect, it } from 'vitest';
import { h } from '@exodra/core';
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

    it('updates when a child text binding changes', () => {
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

        text.setValue('world');

        expect(node.html).toBe('<div>world</div>');
    });

    it('renders serializable attributes and updates bound attributes', () => {
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

        className.setValue('second');

        expect(node.html).toBe(
            '<button id="action" class="second">go</button>'
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

    it('updates children from bindable list operations', () => {
        const childA = {
            type: '#text',
            attrs: { static: { textContent: 'a' } },
        };
        const childB = {
            type: '#text',
            attrs: { static: { textContent: 'b' } },
        };
        const childC = {
            type: '#text',
            attrs: { static: { textContent: 'c' } },
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

        children.insert(1, childC);
        expect(node.html).toBe('<div>acb</div>');

        children.move(0, 2);
        expect(node.html).toBe('<div>cba</div>');

        children.remove(1);
        expect(node.html).toBe('<div>ca</div>');
    });

    it('updates children from set and reset operations', () => {
        const childA = {
            type: '#text',
            attrs: { static: { textContent: 'a' } },
        };
        const childB = {
            type: '#text',
            attrs: { static: { textContent: 'b' } },
        };
        const childC = {
            type: '#text',
            attrs: { static: { textContent: 'c' } },
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

        children.set(1, childC);
        expect(node.html).toBe('<div>ac</div>');

        children.reset([childC, childA]);
        expect(node.html).toBe('<div>ca</div>');
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

        it('updates when fragment bindableList changes', () => {
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
            
            items.push(h('div', { static: { children: 'Added' } }));
            expect(node.html).toBe('<div>Initial</div><div>Added</div>');
            
            items.reset([h('div', { static: { children: 'Reset' } })]);
            expect(node.html).toBe('<div>Reset</div>');
        });
    });
});
