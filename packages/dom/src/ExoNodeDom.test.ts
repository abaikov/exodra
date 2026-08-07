// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
        ).toThrow(/component Component returned 2 root schemas.*single root/s);
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

    // A #fragment as a direct reactive-list item spreads N DOM nodes, which the
    // index-based reconcile can't track (it would silently corrupt sibling
    // positions). Rather than that, it now fails loudly — at build time for an
    // initial fragment item, and at op time for one inserted later.
    const fragItem = () => ({
        type: '#fragment',
        attrs: {
            static: {
                children: [
                    { type: 'li', attrs: { static: { textContent: 'a1' } } },
                    { type: 'li', attrs: { static: { textContent: 'a2' } } },
                ],
            },
        },
    });

    it('throws for a #fragment as an INITIAL reactive-list item', () => {
        const items = createExoBindableList<unknown>([fragItem()]);
        expect(
            () =>
                new ExoNodeDom({
                    type: 'ul',
                    attrs: { bindableLists: { children: items } },
                } as unknown as ConstructorParameters<typeof ExoNodeDom>[0])
        ).toThrow(/#fragment cannot be a direct item/);
    });

    it('throws for a #fragment INSERTED into a reactive list later', () => {
        const items = createExoBindableList<unknown>([
            { type: 'li', attrs: { static: { textContent: 'b' } } },
        ]);
        new ExoNodeDom({
            type: 'ul',
            attrs: { bindableLists: { children: items } },
        } as unknown as ConstructorParameters<typeof ExoNodeDom>[0]);

        expect(() => items.insert(0, fragItem() as unknown as never)).toThrow(
            /#fragment cannot be a direct item/
        );
    });

    it('component-wrapped bindable children REPLACES old content on swap', () => {
        // Regression: for a component-wrapped host the reconcile keyed off the
        // resolved element record (no children) instead of the canonical one, so a
        // swap appended ('AB') instead of replacing ('B').
        const child = createExoBindable(
            h('span', { static: { textContent: 'A' } })
        );
        const Comp = () => h('div', { bindables: { children: child } });
        const node = new ExoNodeDom({
            type: Comp,
            attrs: {},
        } as unknown as ConstructorParameters<typeof ExoNodeDom>[0]);

        expect((node.element as Element).textContent).toBe('A');
        child.setValue(h('span', { static: { textContent: 'B' } }) as never);
        expect((node.element as Element).textContent).toBe('B');
    });

    it('component-wrapped bindableLists reconciles ops against the initial items', () => {
        const a = { type: 'li', attrs: { static: { textContent: 'a' } } };
        const b = { type: 'li', attrs: { static: { textContent: 'b' } } };
        const items = createExoBindableList<unknown>([a, b]);
        const Comp = () => h('ul', { bindableLists: { children: items } });
        const node = new ExoNodeDom({
            type: Comp,
            attrs: {},
        } as unknown as ConstructorParameters<typeof ExoNodeDom>[0]);

        expect((node.element as Element).textContent).toBe('ab');
        items.remove(0); // must dispose the INITIAL item, not no-op
        expect((node.element as Element).textContent).toBe('b');
        items.insert(1, {
            type: 'li',
            attrs: { static: { textContent: 'c' } },
        } as unknown as never);
        expect((node.element as Element).textContent).toBe('bc');
    });

    it('a fragment WRAPPED in an element is a valid list item', () => {
        // The documented workaround: wrap the multi-node content in one element.
        const wrapped = (t: string) => ({
            type: 'li',
            attrs: { static: { textContent: t } },
        });
        const items = createExoBindableList<unknown>([wrapped('a'), wrapped('b')]);
        const node = new ExoNodeDom({
            type: 'ul',
            attrs: { bindableLists: { children: items } },
        } as unknown as ConstructorParameters<typeof ExoNodeDom>[0]);

        expect((node.element as Element).textContent).toBe('ab');
        items.insert(1, wrapped('c') as unknown as never);
        expect((node.element as Element).textContent).toBe('acb');
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

    it('fires onExoMount for nested nodes on hydrate, with the right element', () => {
        const calls: string[] = [];
        const root = document.createElement('div');
        root.innerHTML = '<span>a</span><em>b</em>';
        const mounted = hydrate(
            {
                type: 'div',
                attrs: {
                    static: {
                        onExoMount: n => calls.push(`root:${n.element.nodeName}`),
                        children: [
                            {
                                type: 'span',
                                attrs: {
                                    static: {
                                        textContent: 'a',
                                        onExoMount: n =>
                                            calls.push(`child:${n.element.nodeName}`),
                                    },
                                },
                            },
                            { type: 'em', attrs: { static: { textContent: 'b' } } },
                        ],
                    },
                },
            },
            root
        );

        expect(calls).toEqual(['root:DIV', 'child:SPAN']);
        expect(root.querySelector('span')).toBeTruthy();
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

    it('runs disposers and onExoUnmount below a STATIC fragment', () => {
        // Same gap as the mount side: disposeSchema descends via rec.children, and a
        // static fragment kept its children only on the walk node.
        const calls: string[] = [];
        const text = createExoBindable('a');
        let subscribed = 0;
        const tracked = {
            getValue: () => text.getValue(),
            onChange: (cb: () => void) => {
                subscribed += 1;
                const un = text.onChange(cb);
                return () => { subscribed -= 1; un(); };
            },
        };
        const container = document.createElement('div');
        const mounted = mount(
            h('div', {
                static: {
                    children: [
                        h('#fragment', {
                            static: {
                                children: [
                                    h('span', {
                                        bindables: { textContent: tracked },
                                        static: {
                                            onExoUnmount: () => calls.push('unmount'),
                                        },
                                    }),
                                ],
                            },
                        }),
                    ],
                },
            }),
            container
        );

        expect(subscribed).toBe(1);
        mounted.dispose();
        expect(calls).toEqual(['unmount']);
        expect(subscribed).toBe(0);
    });

    it('re-mounts the same schema object after dispose', () => {
        // The record lives on the schema now, so a second mount reuses a stale
        // record — it must be overwritten cleanly, not tripped over.
        const schema = h('div', { static: { children: h('span', { static: { textContent: 'x' } }) } });
        const c1 = document.createElement('div');
        const first = mount(schema, c1);
        expect(c1.innerHTML).toBe('<div><span>x</span></div>');
        first.dispose();

        const c2 = document.createElement('div');
        const second = mount(schema, c2);
        expect(c2.innerHTML).toBe('<div><span>x</span></div>');
        expect(second.element).not.toBe(first.element);
        second.dispose();
    });

    it('rejects the same schema rendered in two live positions', () => {
        const shared = h('span', { static: { textContent: 'shared' } });
        const c1 = document.createElement('div');
        const live = mount(shared, c1);

        const c2 = document.createElement('div');
        expect(() => mount(shared, c2)).toThrow(/two live positions/);

        live.dispose();
    });

    it('fires onExoMount parent-first, siblings in document order', () => {
        // Hooks are queued as the tree is built, so they fire in build order. The
        // old commit walked a stack, which fired siblings in REVERSE.
        const calls: string[] = [];
        const hook = (id: string) => ({
            static: {
                'data-id': id,
                onExoMount: () => calls.push(id),
            },
        });
        const container = document.createElement('div');
        const mounted = mount(
            {
                type: 'div',
                attrs: {
                    static: {
                        ...hook('root').static,
                        children: [
                            {
                                type: 'span',
                                attrs: {
                                    static: {
                                        ...hook('a').static,
                                        children: [
                                            { type: 'b', attrs: hook('a1') },
                                            { type: 'i', attrs: hook('a2') },
                                        ],
                                    },
                                },
                            },
                            { type: 'span', attrs: hook('b') },
                        ],
                    },
                },
            },
            container
        );

        expect(calls).toEqual(['root', 'a', 'a1', 'a2', 'b']);
        mounted.dispose();
    });

    it('fires onExoMount for children nested inside a STATIC fragment', () => {
        // commitMountFrom descends via rec.children, but a static #fragment in the
        // build path stores its children on the WALK node, not on a record — so a
        // hook below a static fragment can be skipped entirely.
        const calls: string[] = [];
        const container = document.createElement('div');
        const mounted = mount(
            {
                type: 'div',
                attrs: {
                    static: {
                        children: [
                            {
                                type: '#fragment',
                                attrs: {
                                    static: {
                                        children: [
                                            {
                                                type: 'span',
                                                attrs: {
                                                    static: {
                                                        onExoMount: n =>
                                                            calls.push(
                                                                `mount:${n.element.nodeName}`
                                                            ),
                                                    },
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                        ],
                    },
                },
            },
            container
        );

        expect(container.querySelectorAll('span')).toHaveLength(1);
        expect(calls).toEqual(['mount:SPAN']);
        mounted.dispose();
    });

    it('subscribes each binding exactly once (no shadow tree)', () => {
        let reads = 0;
        const text = {
            getValue: () => {
                reads += 1;
                return 'x';
            },
            setValue: () => {},
            onChange: () => () => {},
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

    it('a list item built by a LATER list op still injects an ancestor value', () => {
        // Regression: buildTree started a fresh scope chain for dynamically-built
        // children, so inject() in a list item added after the initial render
        // returned the fallback instead of the provided value.
        const key = createContextKey<string>('scope.list');
        const seen: string[] = [];
        const Item = (ctx: { inject: (k: unknown, f?: unknown) => unknown }) => {
            seen.push(ctx.inject(key, 'fallback') as string);
            return { type: 'li', attrs: { static: { textContent: 'x' } } };
        };
        const children = createExoBindableList<unknown>([]);
        const Provider = (ctx: { provide: (k: unknown, v: unknown) => void }) => {
            ctx.provide(key, 'provided');
            return { type: 'ul', attrs: { bindableLists: { children } } };
        };
        new ExoNodeDom({
            type: Provider,
            attrs: {},
        } as unknown as ConstructorParameters<typeof ExoNodeDom>[0]);

        expect(seen).toEqual([]);
        children.insert(0, {
            type: Item,
            attrs: {},
        } as unknown as never);
        expect(seen).toEqual(['provided']);
    });

    it('a reactive-fragment child built by a later op still injects an ancestor value', () => {
        const key = createContextKey<string>('scope.frag');
        const seen: string[] = [];
        const Item = (ctx: { inject: (k: unknown, f?: unknown) => unknown }) => {
            seen.push(ctx.inject(key, 'fallback') as string);
            return { type: 'span', attrs: { static: { textContent: 'x' } } };
        };
        const children = createExoBindableList<unknown>([]);
        const Provider = (ctx: { provide: (k: unknown, v: unknown) => void }) => {
            ctx.provide(key, 'provided');
            // Fragment nested in a host (a component can't return a bare #fragment).
            return {
                type: 'div',
                attrs: {
                    static: {
                        children: [{ type: '#fragment', attrs: { bindableLists: { children } } }],
                    },
                },
            };
        };
        new ExoNodeDom({
            type: Provider,
            attrs: {},
        } as unknown as ConstructorParameters<typeof ExoNodeDom>[0]);

        children.insert(0, {
            type: Item,
            attrs: {},
        } as unknown as never);
        expect(seen).toEqual(['provided']);
    });

    it('a reactive single-child bindable built by a later op injects an ancestor value', () => {
        const key = createContextKey<string>('scope.bindchild');
        const seen: string[] = [];
        const Item = (ctx: { inject: (k: unknown, f?: unknown) => unknown }) => {
            seen.push(ctx.inject(key, 'fallback') as string);
            return { type: 'em', attrs: { static: { textContent: 'x' } } };
        };
        const child = createExoBindable<unknown>({
            type: 'em',
            attrs: { static: { textContent: 'initial' } },
        });
        const Provider = (ctx: { provide: (k: unknown, v: unknown) => void }) => {
            ctx.provide(key, 'provided');
            return { type: 'div', attrs: { bindables: { children: child } } };
        };
        new ExoNodeDom({
            type: Provider,
            attrs: {},
        } as unknown as ConstructorParameters<typeof ExoNodeDom>[0]);

        child.setValue({ type: Item, attrs: {} } as unknown);
        expect(seen).toEqual(['provided']);
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

    it('inlines a static list of already-cached cache-key clones (2nd mount, no per-row build)', () => {
        const KEY = Symbol('row');
        const makeTree = () =>
            h('ul', {
                static: {
                    children: [
                        h('li', { static: { children: 'x' } }, KEY),
                        h('li', { static: { children: 'x' } }, KEY),
                        h('li', { static: { children: 'x' } }, KEY),
                    ],
                },
            }) as unknown as ConstructorParameters<typeof ExoNodeDom>[0];

        // First mount caches the template (per-row cache-key branch builds row 1,
        // clones rows 2-3).
        const first = new ExoNodeDom(makeTree());
        const ul1 = first.element as Element;
        expect(ul1.querySelectorAll('li').length).toBe(3);
        expect(ul1.textContent).toBe('xxx');

        // Second mount: template cached AND children are a STATIC list → the inline
        // fast path clones all three without a per-row walkSchema frame. Zero `li`
        // createElement proves every row came from a clone; output is identical.
        let liCreates = 0;
        const realCreate = document.createElement.bind(document);
        (document as unknown as { createElement: (t: string) => Element }).createElement =
            (tag: string) => {
                if (tag === 'li') liCreates += 1;
                return realCreate(tag);
            };
        try {
            const second = new ExoNodeDom(makeTree());
            const ul2 = second.element as Element;
            expect(ul2.querySelectorAll('li').length).toBe(3);
            expect(ul2.textContent).toBe('xxx');
            expect(liCreates).toBe(0);
            expect(() => second.dispose()).not.toThrow();
        } finally {
            (document as unknown as { createElement: unknown }).createElement =
                realCreate;
        }
    });

    it('falls back to the normal walk when a static list is not all cached clones', () => {
        // A mixed static list (a cached clone + a plain element) must NOT take the
        // inline fast path: it bails having mutated nothing and walks normally, so the
        // plain element still renders — in order.
        const KEY = Symbol('row');
        // Prime the cache with the keyed template.
        new ExoNodeDom(
            h('ul', {
                static: { children: [h('li', { static: { children: 'x' } }, KEY)] },
            }) as unknown as ConstructorParameters<typeof ExoNodeDom>[0]
        );
        const node = new ExoNodeDom(
            h('ul', {
                static: {
                    children: [
                        h('li', { static: { children: 'x' } }, KEY), // cached clone
                        h('li', { static: { children: 'y' } }), // plain, uncached
                    ],
                },
            }) as unknown as ConstructorParameters<typeof ExoNodeDom>[0]
        );
        const ul = node.element as Element;
        expect(ul.querySelectorAll('li').length).toBe(2);
        expect(ul.textContent).toBe('xy');
    });

    it('clones + patches a cache-key template with holes (text/attr/handler), per instance', () => {
        const KEY = Symbol('card');
        let clicks = 0;
        const makeCard = (name: string, cls: string) => {
            const title = createExoBindable(name);
            const badge = createExoBindable(cls);
            const schema = h(
                'div',
                {
                    static: {
                        class: 'card',
                        children: [
                            h('h3', { bindables: { textContent: title } }),
                            h('span', { bindables: { class: badge } }),
                            h('button', {
                                static: { textContent: 'x' },
                                handlers: { onClick: () => { clicks += 1; } },
                            }),
                        ],
                    },
                },
                KEY
            ) as unknown as ConstructorParameters<typeof ExoNodeDom>[0];
            return { schema, title, badge };
        };

        // First occurrence: builds the skeleton + records hole paths, then clones +
        // patches instance 1 from it.
        const a = makeCard('Alice', 'on');
        const n1 = new ExoNodeDom(a.schema);
        const card1 = n1.element as Element;
        expect(card1.querySelector('h3')!.textContent).toBe('Alice');
        expect(card1.querySelector('span')!.getAttribute('class')).toBe('on');

        // Second occurrence (same key): clone the cached skeleton + patch with
        // instance 2's OWN values — instances are independent.
        const b = makeCard('Bob', 'off');
        const n2 = new ExoNodeDom(b.schema);
        const card2 = n2.element as Element;
        expect(card2.querySelector('h3')!.textContent).toBe('Bob');
        expect(card2.querySelector('span')!.getAttribute('class')).toBe('off');
        expect(card1.querySelector('h3')!.textContent).toBe('Alice'); // unchanged

        // Reactivity survives cloning: updating instance 2's bindable updates ONLY
        // card2's cloned node.
        b.title.setValue('Bobby');
        expect(card2.querySelector('h3')!.textContent).toBe('Bobby');
        expect(card1.querySelector('h3')!.textContent).toBe('Alice');

        // The handler is live on the clone.
        card2.querySelector('button')!.dispatchEvent(new Event('click'));
        expect(clicks).toBe(1);

        // Dispose cleans the hole subscriptions (no throw, and the detached clone
        // stops reacting).
        n2.dispose();
        expect(() => b.title.setValue('Gone')).not.toThrow();
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
            const realOnChange = b.onChange.bind(b);
            (b as unknown as { onChange: (cb: () => void) => () => void }).onChange =
                cb => {
                    subscribeCalls += 1;
                    return realOnChange(cb);
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

// --- hard errors --------------------------------------------------------

describe('ExoNodeDom — hard errors and misconfigured props', () => {
    type Ctor = ConstructorParameters<typeof ExoNodeDom>[0];

    it('errors point at the node: bad schema type names the node', () => {
        expect(
            () =>
                new ExoNodeDom({
                    type: 42 as unknown as string,
                    attrs: { static: { id: 'oops' } },
                } as unknown as Ctor)
        ).toThrow(/cannot create a DOM node.*is 42 \(number\)/s);
    });

    it('mount root that produces no element names the schema', () => {
        const Empty = () => null;
        expect(() =>
            mount(
                { type: Empty, attrs: {} } as unknown as Parameters<typeof mount>[0],
                document.createElement('div')
            )
        ).toThrow(/component Empty.*no element to mount/s);
    });

    it('skips a nullish handler instead of throwing (intentional absence)', () => {
        const node = new ExoNodeDom({
            type: 'button',
            attrs: { handlers: { onClick: undefined as unknown } },
        } as unknown as Ctor);
        expect(node.element).toBeInstanceOf(HTMLButtonElement);
    });

    it('skips a nullish bindable / bindableHandler instead of throwing', () => {
        const node = new ExoNodeDom({
            type: 'button',
            attrs: {
                bindables: { title: undefined as unknown },
                bindableHandlers: { onClick: undefined as unknown },
            },
        } as unknown as Ctor);
        expect(node.element).toBeInstanceOf(HTMLButtonElement);
    });

    it('a valid handler still works', () => {
        let clicks = 0;
        const node = new ExoNodeDom({
            type: 'button',
            attrs: { handlers: { onClick: () => clicks++ } },
        } as unknown as Ctor);
        (node.element as HTMLButtonElement).dispatchEvent(
            new MouseEvent('click', { bubbles: true })
        );
        expect(clicks).toBe(1);
    });

    // Regression: a fragment is transparent (no host element), so reactive children
    // on it used to render their INITIAL value but never subscribe — updates after
    // mount were silently ignored ("the render doesn't run a second time"). They now
    // reconcile within the fragment's own anchor range, leaving siblings untouched.
    it('reactive children on a fragment update after mount (not just initial)', () => {
        const container = document.createElement('div');
        const A = () => h('span', { static: { class: 'x', textContent: 'A' } });
        const B = () => h('span', { static: { class: 'x', textContent: 'B' } });
        const kids = bindable<unknown>([A()]);
        const app = h('div', {
            static: {
                children: [
                    h('em', { static: { class: 'sib', textContent: 'sib' } }),
                    h('#fragment', { bindables: { children: kids } }),
                ],
            },
        });
        const node = mount(app as never, container);
        expect(container.querySelector('.x')!.textContent).toBe('A');
        expect(container.querySelector('.sib')!.textContent).toBe('sib');

        kids.setValue([B()]); // was ignored on a fragment before the fix
        expect(container.querySelector('.x')!.textContent).toBe('B');

        kids.setValue(null); // hide
        expect(container.querySelector('.x')).toBeNull();
        expect(container.querySelector('.sib')!.textContent).toBe('sib'); // sibling intact

        kids.setValue([A()]); // show again
        expect(container.querySelector('.x')!.textContent).toBe('A');
        node.dispose();
    });

    it('reactive LIST children on a fragment reconcile after mount', () => {
        const container = document.createElement('div');
        const li = (t: string) => h('i', { static: { class: 'item', textContent: t } });
        const items = list([li('a'), li('b')]);
        const app = h('div', {
            static: {
                children: [
                    h('em', { static: { class: 'sib' } }),
                    h('#fragment', { bindableLists: { children: items } }),
                ],
            },
        });
        const node = mount(app as never, container);
        const texts = () =>
            [...container.querySelectorAll('.item')].map(e => e.textContent);
        expect(texts()).toEqual(['a', 'b']);
        items.push(li('c'));
        expect(texts()).toEqual(['a', 'b', 'c']);
        items.remove(0);
        expect(texts()).toEqual(['b', 'c']);
        expect(container.querySelector('.sib')).not.toBeNull();
        node.dispose();
    });

    // Declarative keyed reconcile (bindable<schema[]> → updateChildren). Reuse is by
    // schema-object identity, so stable schemas must keep their DOM node across a
    // reorder (moved via the minimal-move LIS pass, never rebuilt); inserts/removes
    // touch only the delta.
    describe('declarative children reconcile', () => {
        const rows = (labels: string[]) =>
            labels.map(t => h('li', { static: { class: 'row', textContent: t } }));
        const order = (el: Element): (string | null)[] =>
            [...el.querySelectorAll('.row')].map(n => n.textContent);
        const nodeMap = (el: Element): Map<string | null, Element> => {
            const m = new Map<string | null, Element>();
            for (const li of el.querySelectorAll('.row')) m.set(li.textContent, li);
            return m;
        };

        it('reorders to the new array, reusing the SAME nodes (no rebuild)', () => {
            const container = document.createElement('div');
            const [a, b, c, d, e] = rows(['a', 'b', 'c', 'd', 'e']);
            const children = bindable<readonly unknown[]>([a, b, c, d, e]);
            const node = mount(h('ul', { bindables: { children } }) as never, container);
            const ul = container.firstElementChild as Element;
            const before = nodeMap(ul);
            expect(order(ul)).toEqual(['a', 'b', 'c', 'd', 'e']);

            children.setValue([c, e, a, d, b]); // shuffle
            expect(order(ul)).toEqual(['c', 'e', 'a', 'd', 'b']);
            const after = nodeMap(ul);
            for (const t of ['a', 'b', 'c', 'd', 'e']) {
                expect(after.get(t)).toBe(before.get(t)); // moved, not rebuilt
            }
            node.dispose();
        });

        it('reverses correctly, reusing all nodes', () => {
            const container = document.createElement('div');
            const [a, b, c] = rows(['a', 'b', 'c']);
            const children = bindable<readonly unknown[]>([a, b, c]);
            mount(h('ul', { bindables: { children } }) as never, container);
            const ul = container.firstElementChild as Element;
            const before = nodeMap(ul);
            children.setValue([c, b, a]);
            expect(order(ul)).toEqual(['c', 'b', 'a']);
            const after = nodeMap(ul);
            for (const t of ['a', 'b', 'c']) expect(after.get(t)).toBe(before.get(t));
        });

        it('inserts new nodes in place, reusing the kept ones', () => {
            const container = document.createElement('div');
            const [a, b, c] = rows(['a', 'b', 'c']);
            const [x, y] = rows(['x', 'y']);
            const children = bindable<readonly unknown[]>([a, b, c]);
            mount(h('ul', { bindables: { children } }) as never, container);
            const ul = container.firstElementChild as Element;
            const before = nodeMap(ul);
            children.setValue([a, x, b, y, c]); // insert x, y between kept nodes
            expect(order(ul)).toEqual(['a', 'x', 'b', 'y', 'c']);
            const after = nodeMap(ul);
            for (const t of ['a', 'b', 'c']) expect(after.get(t)).toBe(before.get(t));
        });

        it('removes dropped nodes (detached) and reuses survivors', () => {
            const container = document.createElement('div');
            const [a, b, c, d] = rows(['a', 'b', 'c', 'd']);
            const children = bindable<readonly unknown[]>([a, b, c, d]);
            mount(h('ul', { bindables: { children } }) as never, container);
            const ul = container.firstElementChild as Element;
            const before = nodeMap(ul);
            children.setValue([a, c]); // drop b, d
            expect(order(ul)).toEqual(['a', 'c']);
            expect(before.get('b')!.isConnected).toBe(false);
            expect(before.get('d')!.isConnected).toBe(false);
            expect(nodeMap(ul).get('a')).toBe(before.get('a'));
            expect(nodeMap(ul).get('c')).toBe(before.get('c'));
        });

        it('prepend touches only the new node (kept nodes untouched)', () => {
            const container = document.createElement('div');
            const [a, b] = rows(['a', 'b']);
            const [z] = rows(['z']);
            const children = bindable<readonly unknown[]>([a, b]);
            mount(h('ul', { bindables: { children } }) as never, container);
            const ul = container.firstElementChild as Element;
            const nA = nodeMap(ul).get('a');
            children.setValue([z, a, b]);
            expect(order(ul)).toEqual(['z', 'a', 'b']);
            expect(nodeMap(ul).get('a')).toBe(nA);
        });
    });
});

// --- review probes: paths whose guards changed when runtime diagnostics were removed
describe('ExoNodeDom — post-diagnostics behaviour', () => {
    type Ctor = ConstructorParameters<typeof ExoNodeDom>[0];

    it('a truthy non-function in handlers fails loudly (no silent dead UI)', () => {
        // The old code skipped it with a dev warning; with diagnostics gone the
        // value reaches addEventListener. Whatever it does, it must not silently
        // produce a button that looks wired but is not.
        expect(() =>
            new ExoNodeDom({
                type: 'button',
                attrs: { handlers: { onClick: 'nope' as unknown } },
            } as unknown as Ctor)
        ).toThrow();
    });

    it('re-mounts a schema whose subtree contains a component', () => {
        const Inner = () => h('span', { static: { textContent: 'inner' } });
        const schema = h('div', { static: { children: [h(Inner, {})] } });
        const c1 = document.createElement('div');
        const first = mount(schema, c1);
        expect(c1.innerHTML).toBe('<div><span>inner</span></div>');
        first.dispose();

        const c2 = document.createElement('div');
        const second = mount(schema, c2);
        expect(c2.innerHTML).toBe('<div><span>inner</span></div>');
        second.dispose();
    });

    it('re-mounts a schema whose subtree contains a STATIC fragment', () => {
        const schema = h('div', {
            static: {
                children: [
                    h('#fragment', {
                        static: { children: [h('span', { static: { textContent: 'f' } })] },
                    }),
                ],
            },
        });
        const c1 = document.createElement('div');
        const first = mount(schema, c1);
        expect(c1.querySelectorAll('span')).toHaveLength(1);
        first.dispose();

        const c2 = document.createElement('div');
        const second = mount(schema, c2);
        expect(c2.querySelectorAll('span')).toHaveLength(1);
        second.dispose();
    });

    it('re-mounts a list host and keeps list ops working afterwards', () => {
        const items = createExoBindableList([
            h('li', { static: { textContent: 'a' } }),
        ]);
        const schema = h('ul', { bindableLists: { children: items } });
        const c1 = document.createElement('div');
        const first = mount(schema, c1);
        expect(c1.innerHTML).toBe('<ul><li>a</li></ul>');
        first.dispose();

        const c2 = document.createElement('div');
        const second = mount(schema, c2);
        items.push(h('li', { static: { textContent: 'b' } }));
        expect(c2.innerHTML).toBe('<ul><li>a</li><li>b</li></ul>');
        second.dispose();
    });

    it('disposing a reactive fragment releases its subtree (no stale live position)', () => {
        const kids = createExoBindableList([
            h('span', { static: { textContent: 'x' } }),
        ]);
        const schema = h('div', {
            static: { children: [h('#fragment', { bindableLists: { children: kids } })] },
        });
        const c1 = document.createElement('div');
        const first = mount(schema, c1);
        expect(c1.querySelectorAll('span')).toHaveLength(1);
        first.dispose();

        const c2 = document.createElement('div');
        const second = mount(schema, c2);
        expect(c2.querySelectorAll('span')).toHaveLength(1);
        second.dispose();
    });
});

describe('ExoNodeDom — list op / DOM consistency', () => {
    // Index math in applyListOp (insert/remove/move/set/reset) and in the keyed
    // reconcile is where off-by-ones hide. Invariant: after EVERY op the DOM must
    // equal the list's own getValue(). Deterministic PRNG so a failure reproduces.
    it('keeps the DOM equal to getValue() across 600 random ops', () => {
        let seed = 12345;
        const rnd = (n: number) => {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            return seed % n;
        };
        const mk = (id: number) =>
            h('li', { static: { 'data-id': String(id), textContent: String(id) } });

        let nextId = 0;
        const items = createExoBindableList([mk(nextId++), mk(nextId++), mk(nextId++)]);
        const container = document.createElement('div');
        const mounted = mount(h('ul', { bindableLists: { children: items } }), container);
        const ul = container.querySelector('ul')!;

        const domIds = () =>
            [...ul.children].map(el => el.getAttribute('data-id')).join(',');
        const listIds = () =>
            (items.getValue() as ReadonlyArray<{ attrs?: { static?: Record<string, unknown> } }>)
                .map(s => String(s.attrs?.static?.['data-id']))
                .join(',');

        for (let step = 0; step < 600; step++) {
            const len = items.getValue().length;
            switch (rnd(5)) {
                case 0:
                    items.insert(rnd(len + 1), mk(nextId++));
                    break;
                case 1:
                    if (len > 0) items.remove(rnd(len), 1 + rnd(2));
                    break;
                case 2:
                    if (len > 1) items.move(rnd(len), rnd(len), 1 + rnd(2));
                    break;
                case 3:
                    if (len > 0) items.set(rnd(len), mk(nextId++));
                    break;
                default:
                    items.reset(Array.from({ length: rnd(6) }, () => mk(nextId++)));
            }
            if (domIds() !== listIds()) {
                throw new Error(`step ${step}: DOM [${domIds()}] != list [${listIds()}]`);
            }
        }
        expect(domIds()).toBe(listIds());
        mounted.dispose();
    });
});

describe('ExoNodeDom — hydrate teardown parity', () => {
    it('runs disposers below a STATIC fragment after HYDRATE too', () => {
        // The build path had a leak here (a static fragment kept children only on
        // the walk node, so dispose never descended). Hydrate builds its own
        // records — assert it does not have the same hole.
        const text = createExoBindable('a');
        let live = 0;
        const tracked = {
            getValue: () => text.getValue(),
            onChange: (cb: () => void) => {
                live += 1;
                const un = text.onChange(cb);
                return () => { live -= 1; un(); };
            },
        };
        const root = document.createElement('div');
        root.innerHTML = '<span>a</span>';
        const mounted = hydrate(
            {
                type: 'div',
                attrs: {
                    static: {
                        children: [
                            {
                                type: '#fragment',
                                attrs: {
                                    static: {
                                        children: [
                                            {
                                                type: 'span',
                                                attrs: { bindables: { textContent: tracked } },
                                            },
                                        ],
                                    },
                                },
                            },
                        ],
                    },
                },
            } as unknown as Parameters<typeof hydrate>[0],
            root
        );

        expect(live).toBe(1);
        mounted.dispose();
        expect(live).toBe(0);
    });
});
