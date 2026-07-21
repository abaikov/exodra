import { describe, expect, it } from 'vitest';
import { h } from '@exodra/core';
import { ExoNodeString } from '@exodra/string';
import { ExoNodeDom } from '@exodra/dom';
import { bindable, list, getPersistor } from '@exodra/reactivity';
import { renderPersistorHydration } from '@exodra/ssr';

describe('Full Stack Integration', () => {
    it('complete SSR to client flow', () => {
        // 1. Create reactive state
        const counter = bindable(42);
        const todos = list(['Buy milk', 'Write tests']);
        
        // 2. Register with persistor
        const persistor = getPersistor();
        persistor.register(counter, 'counter');
        persistor.register(todos, 'todos');
        
        // 3. Create component
        const App = () => h('div', { 
            static: {
                id: 'app',
                children: [
                    h('h1', { static: { children: `Count: ${counter.getValue()}` } }),
                    h('ul', {
                        static: {
                            children: todos.snapshot().map((todo, i) => 
                                h('li', { static: { key: i, children: todo } })
                            )
                        }
                    })
                ]
            }
        });
        
        // 4. Server-side render
        const schema = h(App);
        const stringNode = new ExoNodeString(schema);
        const html = stringNode.html;
        const scripts = renderPersistorHydration(persistor);
        
        expect(html).toContain('Count: 42');
        expect(html).toContain('Buy milk');
        expect(scripts).toContain('"counter":42');
        expect(scripts).toContain('"todos":["Buy milk","Write tests"]');
        
        // 5. Simulate client hydration
        persistor.clear();
        counter.setValue(0);
        todos.reset([]);
        
        // Re-register and hydrate
        persistor.register(counter, 'counter');
        persistor.register(todos, 'todos');
        persistor.hydrate('{"counter":42,"todos":["Buy milk","Write tests"]}');
        
        expect(counter.getValue()).toBe(42);
        expect(todos.snapshot()).toEqual(['Buy milk', 'Write tests']);
        
        // 6. Client-side would render DOM here
        // DOM rendering requires proper setup, tested separately
    });
    
    it('reactive updates propagate correctly', () => {
        const value = bindable('initial');
        const items = list([1, 2, 3]);
        
        let renderCount = 0;
        const Component = () => {
            renderCount++;
            return h('div', {
                static: {
                    children: [
                        h('p', { static: { children: value.getValue() } }),
                        h('ul', {
                            static: {
                                children: items.snapshot().map(n => h('li', { static: { key: n, children: String(n) } }))
                            }
                        })
                    ]
                }
            });
        };
        
        const schema = h(Component);
        
        // Initial render
        const node1 = new ExoNodeString(schema);
        expect(node1.html).toContain('initial');
        expect(node1.html).toContain('<li key="1">1</li>');
        
        // Update state
        value.setValue('updated');
        items.push(4);
        
        // Re-render with new state
        const schema2 = h(Component);
        const node2 = new ExoNodeString(schema2);
        expect(node2.html).toContain('updated');
        expect(node2.html).toContain('<li key="4">4</li>');
        
        expect(renderCount).toBe(2);
    });
    
    it('handles complex nested structures', () => {
        // Direct structure without component props
        const App = () => 
            h('main', { 
                static: {
                    class: 'layout',
                    children: [
                        h('header', { static: { children: 'Header' } }),
                        h('div', { 
                            static: {
                                class: 'content',
                                children: [
                                    h('div', { 
                                        static: {
                                            class: 'card',
                                            children: [
                                                h('h2', { static: { children: 'Card 1' } }),
                                                h('p', { static: { children: 'Content 1' } })
                                            ]
                                        }
                                    }),
                                    h('div', { 
                                        static: {
                                            class: 'card',
                                            children: [
                                                h('h2', { static: { children: 'Card 2' } }),
                                                h('p', { static: { children: 'Content 2' } })
                                            ]
                                        }
                                    })
                                ]
                            }
                        }),
                        h('footer', { static: { children: 'Footer' } })
                    ]
                }
            });
        
        const schema = h(App);
        const node = new ExoNodeString(schema);
        
        expect(node.html).toContain('<main class="layout">');
        expect(node.html).toContain('<header>Header</header>');
        expect(node.html).toContain('<footer>Footer</footer>');
        expect(node.html).toContain('<h2>Card 1</h2>');
        expect(node.html).toContain('<h2>Card 2</h2>');
    });
    
    it('fragments work correctly', () => {
        const Fragment = () => [
            h('span', { static: { children: 'A' } }),
            h('span', { static: { children: 'B' } }),
            h('span', { static: { children: 'C' } })
        ];
        
        const schema = h('div', { static: { children: Fragment() } });
        const node = new ExoNodeString(schema);
        
        expect(node.html).toBe('<div><span>A</span><span>B</span><span>C</span></div>');
    });
    
    it('handles edge cases gracefully', () => {
        // Empty children
        const empty = h('div', { static: { children: [] } });
        const emptyNode = new ExoNodeString(empty);
        expect(emptyNode.html).toBe('<div></div>');
        
        // Simple text children
        const text = h('div', {
            static: {
                children: [
                    'text',
                    h('span', { static: { children: 'valid' } })
                ]
            }
        });
        const textNode = new ExoNodeString(text);
        expect(textNode.html).toContain('text');
        expect(textNode.html).toContain('<span>valid</span>');
        
        // Special characters
        const special = h('p', { static: { children: '<script>alert("XSS")</script>' } });
        const specialNode = new ExoNodeString(special);
        expect(specialNode.html).toBe('<p>&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;</p>');
    });
});