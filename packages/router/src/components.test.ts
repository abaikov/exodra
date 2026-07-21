// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { h, text } from '@exodra/core';
import { mount } from '@exodra/dom';
import {
    Link,
    Outlet,
    Route,
    RouterProvider,
    Routes,
    createMemoryHistory,
    createRouter,
} from './index';

// Authored with direct h() + the `static` bucket (component props flow through
// attrs.static, which getProps reads). The JSX-runtime no longer ships a
// jsx/jsxs transform, so tests use h() directly.

const span = (label: string) => h('span', { static: { children: text(label) } });

describe('router components', () => {
    it('updates Outlet when the router navigates', async () => {
        const router = createRouter(
            [
                { path: '/', component: span('Home') },
                { path: '/about', component: span('About') },
            ],
            { history: createMemoryHistory('/') }
        );
        const container = document.createElement('div');
        const mounted = mount(
            h(RouterProvider, { static: { router, children: h(Outlet) } }),
            container
        );

        expect(container.textContent).toBe('Home');
        await router.navigate('/about');
        expect(container.textContent).toBe('About');

        mounted.dispose();
    });

    it('creates routes from declarative Route children', () => {
        const history = createMemoryHistory('/settings');
        const container = document.createElement('div');
        const mounted = mount(
            h(Routes, {
                static: {
                    history,
                    children: [
                        h(Route, { static: { path: '/', component: span('Home') } }),
                        h(Route, { static: { path: '/settings', component: span('Settings') } }),
                    ],
                },
            }),
            container
        );

        expect(container.textContent).toBe('Settings');

        mounted.dispose();
    });

    it('navigates internal links on unmodified left-click', async () => {
        const router = createRouter(
            [{ path: '/about', component: span('About') }],
            { history: createMemoryHistory('/') }
        );
        const container = document.createElement('div');
        const mounted = mount(
            h(RouterProvider, {
                static: { router, children: h(Link, { static: { to: '/about', children: text('About') } }) },
            }),
            container
        );

        const anchor = container.querySelector('a');
        expect(anchor?.getAttribute('href')).toBe('/about');
        expect(anchor?.textContent).toBe('About');

        const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
        anchor?.dispatchEvent(event);
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(event.defaultPrevented).toBe(true);
        expect(router.getLocation().href).toBe('/about');

        mounted.dispose();
    });

    it('leaves modified, targeted, and external links to the browser', () => {
        const router = createRouter([], { history: createMemoryHistory('/') });
        const container = document.createElement('div');
        const preventedBeforeRouter: boolean[] = [];
        const onClick = (event: MouseEvent) => preventedBeforeRouter.push(event.defaultPrevented);
        const link = (to: string, label: string, extra: Record<string, unknown> = {}) =>
            h(Link, { static: { to, children: text(label), ...extra }, handlers: { onClick } });

        const mounted = mount(
            h(RouterProvider, {
                static: {
                    router,
                    children: h('div', {
                        static: {
                            children: [
                                link('/modified', 'Modified'),
                                link('/target', 'Target', { target: '_blank' }),
                                link('https://example.com/external', 'External'),
                            ],
                        },
                    }),
                },
            }),
            container
        );

        const anchors = Array.from(container.querySelectorAll('a'));
        expect(anchors).toHaveLength(3);
        anchors.forEach(anchor =>
            anchor.addEventListener('click', event => event.preventDefault())
        );

        const modifiedClick = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, metaKey: true });
        const targetClick = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
        const externalClick = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });

        anchors[0].dispatchEvent(modifiedClick);
        anchors[1].dispatchEvent(targetClick);
        anchors[2].dispatchEvent(externalClick);

        expect(preventedBeforeRouter).toEqual([false, false, false]);
        expect(router.getLocation().href).toBe('/');

        mounted.dispose();
    });
});
