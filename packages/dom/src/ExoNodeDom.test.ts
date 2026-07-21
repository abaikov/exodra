// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { h, createContextKey } from '@exodra/core';
import { bindable, list } from '@exodra/reactivity';
import { createExoBindable } from '../../reactivity/src/createExoBindable';
import { createExoBindableList } from '../../reactivity/src/createExoBindableList';
import { ExoNodeDom } from './ExoNodeDom';
import { hydrate } from './hydrate';
import { mount } from './mount';

describe('ExoNodeDom', () => {
    it('mounts constant children', () => {
        const node = new ExoNodeDom({
            type: 'div',
            attrs: {
                static: {
                    children: {
                        type: 'span',
                        attrs: {
                            static: {
                                textContent: 'hello',
                            },
                        },
                    },
                },
            },
        });

        expect(node.element).toBeInstanceOf(HTMLDivElement);
        expect((node.element as Element).outerHTML).toBe(
            '<div><span>hello</span></div>'
        );
    });

    it('updates bound text content', () => {
        const text = createExoBindable('hello');
        const node = new ExoNodeDom({
            type: 'span',
            attrs: {
                bindables: {
                    textContent: text,
                },
            },
        });

        text.setValue('world');

        expect((node.element as Element).outerHTML).toBe('<span>world</span>');
    });

    it('mounts through the public API and applies attributes and events', () => {
        const label = createExoBindable('first');
        const clicks = createExoBindable(0);
        const container = document.createElement('div');
        const mounted = mount(
            {
                type: 'button',
                attrs: {
                    static: {
                        class: 'primary',
                    },
                    handlers: {
                        onClick: () => {
                            clicks.setValue(clicks.getValue() + 1);
                        },
                    },
                    bindables: {
                        textContent: label,
                    },
                },
            },
            container
        );

        expect(container.innerHTML).toBe(
            '<button class="primary">first</button>'
        );

        label.setValue('second');
        (mounted.element as HTMLButtonElement).click();

        expect(container.innerHTML).toBe(
            '<button class="primary">second</button>'
        );
        expect(clicks.getValue()).toBe(1);

        mounted.dispose();
        expect(container.innerHTML).toBe('');
    });

    it('renders single-root component nodes through the DOM runtime', () => {
        const container = document.createElement('div');
        const Component = () => ({
            type: 'button',
            attrs: {
                static: {
                    textContent: 'component',
                },
            },
        });

        const mounted = mount(
            {
                type: Component,
                attrs: {},
            },
            container
        );

        expect(container.innerHTML).toBe('<button>component</button>');
        expect(mounted.element).toBe(container.firstChild);
    });

    it('rejects multi-root component nodes in the DOM runtime', () => {
        const Component = () => [
            { type: 'span', attrs: { static: { textContent: 'a' } } },
            { type: 'span', attrs: { static: { textContent: 'b' } } },
        ];

        expect(
            () =>
                new ExoNodeDom({
                    type: Component,
                    attrs: {},
                })
        ).toThrow('DOM component nodes must return a single root schema');
    });

    it('runs mount and unmount lifecycle callbacks', () => {
        const calls: string[] = [];
        const container = document.createElement('div');
        const mounted = mount(
            {
                type: 'div',
                attrs: {
                    static: {
                        onExoMount: node => {
                            calls.push(`mount:${node.element?.nodeName}`);
                        },
                        onExoUnmount: node => {
                            calls.push(`unmount:${node.element?.nodeName}`);
                        },
                    },
                },
            },
            container
        );

        mounted.dispose();

        expect(calls).toEqual(['mount:DIV', 'unmount:DIV']);
    });

    it('fires onExoMount for children added by a later bindable update', () => {
        // A child entering a reactive list AFTER initial mount (e.g. a virtual
        // list scrolling a new row in) must still run its onExoMount — and a
        // reused child must NOT re-fire.
        const mountedIds: string[] = [];
        const row = (id: string) => ({
            type: 'div',
            attrs: { static: { 'data-id': id, onExoMount: () => mountedIds.push(id) } },
        });
        const a = row('a');
        const b = row('b');
        const items = bindable<readonly unknown[]>([]);
        const container = document.createElement('div');
        mount({ type: 'div', attrs: { bindables: { children: items } } }, container);

        expect(mountedIds).toEqual([]); // nothing rendered yet
        items.setValue([a]); // a enters after mount
        expect(mountedIds).toEqual(['a']);
        items.setValue([a, b]); // a reused (no re-fire), b enters
        expect(mountedIds).toEqual(['a', 'b']);
        expect(container.querySelectorAll('[data-id]').length).toBe(2);
    });

    it('updates children from bindable list operations', () => {
        const childA = {
            type: 'li',
            attrs: { static: { textContent: 'a' } },
        };
        const childB = {
            type: 'li',
            attrs: { static: { textContent: 'b' } },
        };
        const childC = {
            type: 'li',
            attrs: { static: { textContent: 'c' } },
        };
        const children = createExoBindableList([childA, childB]);
        const node = new ExoNodeDom({
            type: 'ul',
            attrs: {
                bindableLists: {
                    children,
                },
            },
        });

        expect((node.element as Element).outerHTML).toBe(
            '<ul><li>a</li><li>b</li></ul>'
        );
        const elementA = (node.element as Element).childNodes[0];
        const elementB = (node.element as Element).childNodes[1];

        children.insert(1, childC);
        expect((node.element as Element).outerHTML).toBe(
            '<ul><li>a</li><li>c</li><li>b</li></ul>'
        );
        const elementC = (node.element as Element).childNodes[1];
        expect((node.element as Element).childNodes[0]).toBe(elementA);
        expect((node.element as Element).childNodes[2]).toBe(elementB);

        children.move(0, 2);
        expect((node.element as Element).outerHTML).toBe(
            '<ul><li>c</li><li>b</li><li>a</li></ul>'
        );
        expect((node.element as Element).childNodes[0]).toBe(elementC);
        expect((node.element as Element).childNodes[1]).toBe(elementB);
        expect((node.element as Element).childNodes[2]).toBe(elementA);

        children.remove(1);
        expect((node.element as Element).outerHTML).toBe(
            '<ul><li>c</li><li>a</li></ul>'
        );
        expect((node.element as Element).childNodes[0]).toBe(elementC);
        expect((node.element as Element).childNodes[1]).toBe(elementA);
    });

    it('reuses detached children when the same schema returns', () => {
        const text = createExoBindable('hello');
        const child = {
            type: 'span',
            attrs: {
                bindables: {
                    textContent: text,
                },
            },
        };
        const children = createExoBindable<typeof child | readonly typeof child[]>(
            []
        );
        const node = new ExoNodeDom({
            type: 'div',
            attrs: {
                bindables: {
                    children,
                },
            },
        });

        children.setValue(child);
        const element = (node.element as Element).firstChild;

        children.setValue([]);
        text.setValue('world');
        children.setValue(child);

        expect((node.element as Element).firstChild).toBe(element);
        expect((node.element as Element).outerHTML).toBe(
            '<div><span>world</span></div>'
        );
    });

    it('reuses children by identity when a list resets', () => {
        const childA = {
            type: 'li',
            attrs: { static: { textContent: 'a' } },
        };
        const childB = {
            type: 'li',
            attrs: { static: { textContent: 'b' } },
        };
        const children = createExoBindableList([childA, childB]);
        const node = new ExoNodeDom({
            type: 'ul',
            attrs: {
                bindableLists: {
                    children,
                },
            },
        });
        const elementA = (node.element as Element).childNodes[0];
        const elementB = (node.element as Element).childNodes[1];

        children.reset([childB, childA]);

        expect((node.element as Element).outerHTML).toBe(
            '<ul><li>b</li><li>a</li></ul>'
        );
        expect((node.element as Element).childNodes[0]).toBe(elementB);
        expect((node.element as Element).childNodes[1]).toBe(elementA);
    });

    it('disposes children removed by explicit list operations', () => {
        const text = createExoBindable('alive');
        const child = {
            type: 'li',
            attrs: {
                bindables: {
                    textContent: text,
                },
            },
        };
        const children = createExoBindableList([child]);
        const node = new ExoNodeDom({
            type: 'ul',
            attrs: {
                bindableLists: {
                    children,
                },
            },
        });
        const removedElement = (node.element as Element).firstChild;

        children.remove(0);
        text.setValue('disposed');

        expect((node.element as Element).outerHTML).toBe('<ul></ul>');
        expect(removedElement?.textContent).toBe('alive');
    });

    it('disposes children removed by remove operation with count > 1', () => {
        const text1 = createExoBindable('alive1');
        const text2 = createExoBindable('alive2');
        const child1 = {
            type: 'li',
            attrs: { bindables: { textContent: text1 } },
        };
        const child2 = {
            type: 'li', 
            attrs: { bindables: { textContent: text2 } },
        };
        const children = createExoBindableList([child1, child2]);
        const node = new ExoNodeDom({
            type: 'ul',
            attrs: { bindableLists: { children } },
        });
        const removedElement1 = (node.element as Element).childNodes[0];
        const removedElement2 = (node.element as Element).childNodes[1];

        children.remove(0, 2); // Remove both elements
        text1.setValue('disposed1');
        text2.setValue('disposed2');

        expect((node.element as Element).outerHTML).toBe('<ul></ul>');
        expect(removedElement1?.textContent).toBe('alive1');
        expect(removedElement2?.textContent).toBe('alive2');
    });

    it('disposes children replaced by set operation', () => {
        const text1 = createExoBindable('alive1');
        const text2 = createExoBindable('alive2');
        const child1 = {
            type: 'li',
            attrs: { bindables: { textContent: text1 } },
        };
        const child2 = {
            type: 'li',
            attrs: { bindables: { textContent: text2 } },
        };
        const children = createExoBindableList([child1]);
        const node = new ExoNodeDom({
            type: 'ul',
            attrs: { bindableLists: { children } },
        });
        const replacedElement = (node.element as Element).firstChild;

        children.set(0, child2); // Replace first element
        text1.setValue('disposed1');
        text2.setValue('alive2-updated');

        expect((node.element as Element).outerHTML).toBe('<ul><li>alive2-updated</li></ul>');
        expect(replacedElement?.textContent).toBe('alive1'); // Old element should not update
    });

    it('preserves bindings during move operations', () => {
        const text1 = createExoBindable('item1');
        const text2 = createExoBindable('item2');
        const child1 = {
            type: 'li',
            attrs: { bindables: { textContent: text1 } },
        };
        const child2 = {
            type: 'li',
            attrs: { bindables: { textContent: text2 } },
        };
        const children = createExoBindableList([child1, child2]);
        const node = new ExoNodeDom({
            type: 'ul',
            attrs: { bindableLists: { children } },
        });

        children.move(0, 1); // Move first to second position
        text1.setValue('moved-item1');
        text2.setValue('moved-item2');

        expect((node.element as Element).outerHTML).toBe('<ul><li>moved-item2</li><li>moved-item1</li></ul>');
    });

    it('hydrates existing DOM and keeps existing elements', () => {
        const root = document.createElement('div');
        root.innerHTML = '<span>hello</span>';
        const existingSpan = root.firstElementChild;

        const node = ExoNodeDom.hydrate(
            {
                type: 'div',
                attrs: {
                    static: {
                        children: {
                            type: 'span',
                            attrs: {
                                static: {
                                    textContent: 'hello',
                                },
                            },
                        },
                    },
                },
            },
            root
        );

        expect(node.element).toBe(root);
        expect(root.firstElementChild).toBe(existingSpan);
        expect(root.outerHTML).toBe('<div><span>hello</span></div>');
    });

    it('hydrates bound text content and updates existing DOM', () => {
        const text = createExoBindable('server');
        const root = document.createElement('span');
        root.textContent = 'server';

        const node = ExoNodeDom.hydrate(
            {
                type: 'span',
                attrs: {
                    bindables: {
                        textContent: text,
                    },
                },
            },
            root
        );

        text.setValue('client');

        expect(node.element).toBe(root);
        expect(root.outerHTML).toBe('<span>client</span>');
    });

    it('hydrates through the public API', () => {
        const text = createExoBindable('server');
        const root = document.createElement('span');
        root.textContent = 'server';
        const mounted = hydrate(
            {
                type: 'span',
                attrs: {
                    bindables: {
                        textContent: text,
                    },
                },
            },
            root
        );

        text.setValue('client');

        expect(mounted.element).toBe(root);
        expect(root.outerHTML).toBe('<span>client</span>');
        mounted.dispose();
    });

    it('hydrates list children and applies later list operations', () => {
        const childA = {
            type: 'li',
            attrs: { static: { textContent: 'a' } },
        };
        const childB = {
            type: 'li',
            attrs: { static: { textContent: 'b' } },
        };
        const childC = {
            type: 'li',
            attrs: { static: { textContent: 'c' } },
        };
        const root = document.createElement('ul');
        root.innerHTML = '<li>a</li><li>b</li>';
        const existingFirstChild = root.firstElementChild;
        const children = createExoBindableList([childA, childB]);

        ExoNodeDom.hydrate(
            {
                type: 'ul',
                attrs: {
                    bindableLists: {
                        children,
                    },
                },
            },
            root
        );

        expect(root.firstElementChild).toBe(existingFirstChild);

        children.insert(1, childC);
        children.move(0, 2);

        expect(root.outerHTML).toBe('<ul><li>c</li><li>b</li><li>a</li></ul>');
    });
    
    it('mounts with h factory and reactive bindings', () => {
        const container = document.createElement('div');
        
        const title = bindable('Hello');
        const items = list([
            h('li', { static: { children: 'Item 1' } }),
            h('li', { static: { children: 'Item 2' } })
        ]);
        
        const app = h('div', {
            static: {
                children: [
                    h('h1', { bindables: { textContent: title } }),
                    h('ul', { bindableLists: { children: items } }),
                    h('p', { static: { children: 'Static text' } })
                ]
            }
        });
        
        const mounted = mount(app, container);
        
        expect(container.querySelector('h1')?.textContent).toBe('Hello');
        expect(container.querySelectorAll('li').length).toBe(2);
        expect(container.querySelector('p')?.textContent).toBe('Static text');
        
        title.setValue('Updated');
        items.push(h('li', { static: { children: 'Item 3' } }));

        expect(container.querySelector('h1')?.textContent).toBe('Updated');
        expect(container.querySelectorAll('li').length).toBe(3);

        mounted.dispose();
    });

    it('fires mount/unmount for nested elements with their own element', () => {
        const calls: string[] = [];
        const container = document.createElement('div');
        const mounted = mount(
            {
                type: 'div',
                attrs: {
                    static: {
                        onExoMount: n => calls.push(`mount:${n.element.nodeName}`),
                        onExoUnmount: n => calls.push(`unmount:${n.element.nodeName}`),
                        children: {
                            type: 'span',
                            attrs: {
                                static: {
                                    onExoMount: n =>
                                        calls.push(`mount:${n.element.nodeName}`),
                                    onExoUnmount: n =>
                                        calls.push(`unmount:${n.element.nodeName}`),
                                },
                            },
                        },
                    },
                },
            },
            container
        );

        // nested SPAN must fire with ITS element, not the root DIV
        expect(calls).toContain('mount:SPAN');
        expect(calls).toContain('mount:DIV');
        mounted.dispose();
        expect(calls).toContain('unmount:SPAN');
        expect(calls).toContain('unmount:DIV');
    });

    it('subscribes each binding exactly once (no shadow tree)', () => {
        let reads = 0;
        const text = {
            getValue: () => {
                reads += 1;
                return 'x';
            },
            setValue: () => {},
            subscribe: () => () => {},
        };
        new ExoNodeDom({
            type: 'div',
            attrs: {
                static: {
                    children: {
                        type: 'span',
                        attrs: { bindables: { textContent: text } },
                    },
                },
            },
        } as unknown as ConstructorParameters<typeof ExoNodeDom>[0]);
        // One setupBindings → one initial read. A shadow tree would double it.
        expect(reads).toBe(1);
    });

    it('expands fragment children inline (as a child)', () => {
        const node = new ExoNodeDom({
            type: 'div',
            attrs: {
                static: {
                    children: [
                        { type: 'span', attrs: { static: { textContent: 'x' } } },
                        {
                            type: '#fragment',
                            attrs: {
                                static: {
                                    children: [
                                        { type: 'b', attrs: { static: { textContent: 'a' } } },
                                        { type: 'i', attrs: { static: { textContent: 'b' } } },
                                    ],
                                },
                            },
                        },
                    ],
                },
            },
        } as unknown as ConstructorParameters<typeof ExoNodeDom>[0]);

        expect((node.element as Element).outerHTML).toBe(
            '<div><span>x</span><b>a</b><i>b</i></div>'
        );
    });

    it('provides and injects values through component context', () => {
        const key = createContextKey<string>('test.value');
        const seen: Array<string | undefined> = [];
        const Inner = (ctx: { inject: (k: unknown, f?: unknown) => unknown }) => {
            seen.push(ctx.inject(key, 'fallback') as string);
            return { type: 'span', attrs: { static: { textContent: 'inner' } } };
        };
        const Outer = (ctx: { provide: (k: unknown, v: unknown) => void }) => {
            ctx.provide(key, 'provided');
            return { type: Inner, attrs: {} };
        };
        const node = new ExoNodeDom({
            type: Outer,
            attrs: {},
        } as unknown as ConstructorParameters<typeof ExoNodeDom>[0]);

        // Inner (nested component) injects the value Outer provided.
        expect(seen).toEqual(['provided']);
        expect((node.element as Element).outerHTML).toBe('<span>inner</span>');
    });

    it('inject returns the fallback when nothing is provided', () => {
        const key = createContextKey<string>('test.absent');
        let got: unknown;
        const C = (ctx: { inject: (k: unknown, f?: unknown) => unknown }) => {
            got = ctx.inject(key, 'fb');
            return { type: 'div', attrs: {} };
        };
        new ExoNodeDom({
            type: C,
            attrs: {},
        } as unknown as ConstructorParameters<typeof ExoNodeDom>[0]);
        expect(got).toBe('fb');
    });

    it('exposes component constants and bindables through context', () => {
        const label = createExoBindable('hi');
        let constant: unknown;
        let boundValue: unknown;
        const C = (ctx: {
            getConstant: (n: string) => unknown;
            getBindable: (n: string) => unknown;
        }) => {
            constant = ctx.getConstant('id');
            boundValue = ctx.getBindable('text');
            return { type: 'div', attrs: {} };
        };
        new ExoNodeDom({
            type: C,
            attrs: { static: { id: 'x' }, bindables: { text: label } },
        } as unknown as ConstructorParameters<typeof ExoNodeDom>[0]);

        expect(constant).toBe('x');
        expect(boundValue).toBe(label);
    });

    it('runs component onDispose when the node is disposed', () => {
        const container = document.createElement('div');
        let disposed = false;
        const C = (ctx: { onDispose: (fn: () => void) => void }) => {
            ctx.onDispose(() => {
                disposed = true;
            });
            return { type: 'div', attrs: {} };
        };
        const mounted = mount(
            { type: C, attrs: {} } as unknown as Parameters<typeof mount>[0],
            container
        );

        expect(disposed).toBe(false);
        mounted.dispose();
        expect(disposed).toBe(true);
    });

    it('mounts a fragment root inline into the container', () => {
        const container = document.createElement('div');
        const mounted = mount(
            {
                type: '#fragment',
                attrs: {
                    static: {
                        children: [
                            { type: 'b', attrs: { static: { textContent: 'a' } } },
                            { type: 'i', attrs: { static: { textContent: 'b' } } },
                        ],
                    },
                },
            } as unknown as Parameters<typeof mount>[0],
            container
        );

        expect(container.innerHTML).toBe('<b>a</b><i>b</i>');
        mounted.dispose();
        expect(container.innerHTML).toBe('');
    });

    it('disposes bindings under a component root', () => {
        const text = createExoBindable('alive');
        const Comp = () => ({
            type: 'div',
            attrs: {
                static: {
                    children: {
                        type: 'span',
                        attrs: { bindables: { textContent: text } },
                    },
                },
            },
        });
        const container = document.createElement('div');
        const mounted = mount(
            { type: Comp, attrs: {} } as unknown as Parameters<typeof mount>[0],
            container
        );
        const span = container.querySelector('span')!;
        expect(span.textContent).toBe('alive');

        mounted.dispose();
        text.setValue('dead');
        // binding under the component's rendered subtree must be disposed
        expect(span.textContent).toBe('alive');
    });

    it('runs nested component onDispose on dispose', () => {
        const calls: string[] = [];
        const Inner = (ctx: { onDispose: (fn: () => void) => void }) => {
            ctx.onDispose(() => calls.push('inner'));
            return { type: 'span', attrs: {} };
        };
        const Outer = (ctx: { onDispose: (fn: () => void) => void }) => {
            ctx.onDispose(() => calls.push('outer'));
            return { type: Inner, attrs: {} };
        };
        const container = document.createElement('div');
        const mounted = mount(
            { type: Outer, attrs: {} } as unknown as Parameters<typeof mount>[0],
            container
        );
        mounted.dispose();
        expect(calls.sort()).toEqual(['inner', 'outer']);
    });

    it('fires onExoUnmount when a list item is removed', () => {
        const calls: string[] = [];
        const item = {
            type: 'li',
            attrs: { static: { onExoUnmount: () => calls.push('unmount') } },
        };
        const children = createExoBindableList([item]);
        new ExoNodeDom({
            type: 'ul',
            attrs: { bindableLists: { children } },
        } as unknown as ConstructorParameters<typeof ExoNodeDom>[0]);

        children.remove(0);
        expect(calls).toEqual(['unmount']);
    });

    it('moves list items across 3+ positions (to > from)', () => {
        const mk = (t: string) => ({
            type: 'li',
            attrs: { static: { textContent: t } },
        });
        const children = createExoBindableList([mk('a'), mk('b'), mk('c'), mk('d')]);
        const node = new ExoNodeDom({
            type: 'ul',
            attrs: { bindableLists: { children } },
        } as unknown as ConstructorParameters<typeof ExoNodeDom>[0]);

        children.move(0, 2); // [a,b,c,d] -> [b,c,a,d]
        expect((node.element as Element).textContent).toBe('bcad');
    });

    it('reuses a deep dynamic subtree on show/hide (deep bindable + handler stay live)', () => {
        const deepText = createExoBindable('a');
        const clicks = createExoBindable(0);
        const child = {
            type: 'div',
            attrs: {
                static: {
                    children: {
                        type: 'section',
                        attrs: {
                            static: {
                                children: [
                                    { type: 'span', attrs: { bindables: { textContent: deepText } } },
                                    {
                                        type: 'button',
                                        attrs: {
                                            handlers: {
                                                onClick: () => clicks.setValue(clicks.getValue() + 1),
                                            },
                                        },
                                    },
                                ],
                            },
                        },
                    },
                },
            },
        };
        const visible = createExoBindable<typeof child | readonly (typeof child)[]>([
            child,
        ]);
        const node = new ExoNodeDom({
            type: 'div',
            attrs: { bindables: { children: visible } },
        } as unknown as ConstructorParameters<typeof ExoNodeDom>[0]);
        const root = node.element as Element;
        const childEl = root.firstElementChild;

        visible.setValue([]); // hide -> detach + dispose deep bindings
        deepText.setValue('b'); // changes while hidden
        visible.setValue([child]); // show again -> reuse, no re-render

        // same element reused (render not called again)
        expect(root.firstElementChild).toBe(childEl);
        // deep bindable caught up to the value changed while hidden
        expect(root.querySelector('span')!.textContent).toBe('b');
        // deep event handler re-bound
        (root.querySelector('button') as HTMLButtonElement).click();
        expect(clicks.getValue()).toBe(1);
    });

    it('re-syncs a reactive list nested in a reused subtree (changed while hidden)', () => {
        const items = createExoBindableList([
            { type: 'li', attrs: { static: { textContent: 'a' } } },
        ]);
        const panel = {
            type: 'div',
            attrs: {
                static: {
                    children: { type: 'ul', attrs: { bindableLists: { children: items } } },
                },
            },
        };
        const visible = createExoBindable<typeof panel | readonly (typeof panel)[]>([
            panel,
        ]);
        const node = new ExoNodeDom({
            type: 'div',
            attrs: { bindables: { children: visible } },
        } as unknown as ConstructorParameters<typeof ExoNodeDom>[0]);
        const root = node.element as Element;

        visible.setValue([]); // hide the panel (its list subscription dies)
        items.push({ type: 'li', attrs: { static: { textContent: 'b' } } }); // change while hidden
        visible.setValue([panel]); // show again

        // the nested list caught up to its current state on reattach
        expect(root.querySelectorAll('li').length).toBe(2);
        expect(root.querySelector('ul')!.textContent).toBe('ab');
    });

    it('rebuilds (no reuse) when a fresh schema object replaces an identical one', () => {
        // Reuse is keyed by schema OBJECT identity. A `.map(render)` that produces
        // a new object each update therefore never hits the reuse path.
        const children = createExoBindableList([
            { type: 'li', attrs: { static: { textContent: 'a' } } },
        ]);
        const node = new ExoNodeDom({
            type: 'ul',
            attrs: { bindableLists: { children } },
        } as unknown as ConstructorParameters<typeof ExoNodeDom>[0]);
        const ul = node.element as Element;
        const first = ul.querySelector('li');

        children.reset([{ type: 'li', attrs: { static: { textContent: 'a' } } }]);
        const second = ul.querySelector('li');

        expect(second).not.toBe(first); // different object -> rebuilt, not reused
    });

    // Schemas are identity-keyed, so the same object in two LIVE positions is
    // forbidden (it would collide on one record). Enforced with a throw.
    it('forbids the same dynamic schema object in two live positions', () => {
        const text = createExoBindable('x');
        const shared = { type: 'li', attrs: { bindables: { textContent: text } } };
        expect(
            () =>
                new ExoNodeDom({
                    type: 'ul',
                    attrs: {
                        bindableLists: {
                            children: createExoBindableList([shared, shared]),
                        },
                    },
                } as unknown as ConstructorParameters<typeof ExoNodeDom>[0])
        ).toThrow(/two live positions/);
    });

    it('builds a cache-keyed static template once and clones the rest', () => {
        const KEY = Symbol('row');
        let liCreates = 0;
        const realCreate = document.createElement.bind(document);
        (document as unknown as { createElement: (t: string) => Element }).createElement =
            (tag: string) => {
                if (tag === 'li') liCreates += 1;
                return realCreate(tag);
            };
        try {
            const children = list([
                h('li', { static: { children: 'x' } }, KEY),
                h('li', { static: { children: 'x' } }, KEY),
                h('li', { static: { children: 'x' } }, KEY),
            ]);
            const node = new ExoNodeDom(
                h('ul', {
                    bindableLists: { children },
                }) as unknown as ConstructorParameters<typeof ExoNodeDom>[0]
            );
            const ul = node.element as Element;
            expect(ul.querySelectorAll('li').length).toBe(3);
            expect(ul.textContent).toBe('xxx');
            // first occurrence builds (createElement), the rest are cloned
            expect(liCreates).toBe(1);
        } finally {
            (document as unknown as { createElement: unknown }).createElement =
                realCreate;
        }
    });

    // NOTE: `cacheKey` is the compiler's promise that a subtree is static — the
    // compiler only ever assigns it to provably-static `h()` calls. The renderer
    // therefore trusts it and does NOT re-verify staticness at runtime (the old
    // isStaticSubtree guard was removed as dead weight). A hand-written
    // dynamic-schema-with-cacheKey is undefined behaviour by contract, so there is
    // intentionally no test pinning it.

    it('reordering a still-connected row does not churn its subscription', () => {
        // Filter/search reorders a list: kept rows change index but never leave the
        // DOM, so their bindings are already live. Re-binding them (reattach) would
        // needlessly dispose + re-subscribe. Assert we reuse them as-is instead.
        let subscribeCalls = 0;
        const makeRow = (label: string) => {
            const b = createExoBindable(label);
            const realSubscribe = b.subscribe.bind(b);
            (b as unknown as { subscribe: (cb: () => void) => () => void }).subscribe =
                cb => {
                    subscribeCalls += 1;
                    return realSubscribe(cb);
                };
            return { b, schema: h('li', { bindables: { textContent: b } }) };
        };
        const a = makeRow('a');
        const c = makeRow('c');
        const e = makeRow('e');
        const lst = createExoBindableList([a.schema, c.schema, e.schema]);
        const node = new ExoNodeDom(
            h('ul', {
                bindableLists: { children: lst },
            }) as unknown as ConstructorParameters<typeof ExoNodeDom>[0]
        );
        const ul = node.element as Element;
        const liA = ul.childNodes[0];

        expect(subscribeCalls).toBe(3); // one live subscription per row at mount

        // Reorder: drop the middle row, keep a + e but swap their order. Both `a`
        // and `e` stay connected to <ul>, only their index changes.
        lst.reset([e.schema, a.schema]);

        // The kept row keeps its DOM element AND its single live subscription —
        // no dispose+resubscribe. (Without the fix this would be 5.)
        expect(ul.childNodes[1]).toBe(liA);
        expect(subscribeCalls).toBe(3);
        // ...and it is still reactive.
        a.b.setValue('A!');
        expect((liA as Text | Element).textContent).toBe('A!');
    });

    it('flattens nested-array children and drops falsy holes', () => {
        // The shapes JSX produces when you mix a static child with a `.map()`
        // (sibling array) and `{cond && <x/>}` conditionals (false/null holes).
        const node = new ExoNodeDom({
            type: 'ul',
            attrs: {
                static: {
                    children: [
                        { type: 'li', attrs: { static: { textContent: 'A' } } },
                        [
                            { type: 'li', attrs: { static: { textContent: 'B' } } },
                            { type: 'li', attrs: { static: { textContent: 'C' } } },
                        ],
                        false,
                        null,
                        undefined,
                        'D',
                    ],
                },
            },
        } as unknown as ConstructorParameters<typeof ExoNodeDom>[0]);
        const ul = node.element as Element;
        expect(ul.querySelectorAll('li').length).toBe(3);
        expect(ul.textContent).toBe('ABCD');
    });

    it('forbids the same static schema object in two live positions', () => {
        const same = { type: 'li', attrs: { static: { textContent: 'x' } } };
        expect(
            () =>
                new ExoNodeDom({
                    type: 'ul',
                    attrs: { static: { children: [same, same] } },
                } as unknown as ConstructorParameters<typeof ExoNodeDom>[0])
        ).toThrow(/two live positions/);
    });
});
