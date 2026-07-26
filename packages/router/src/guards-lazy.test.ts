// @vitest-environment jsdom
//
// Regression coverage for three router bugs:
//  1. Lazy routes never displayed the loaded component — the async load warmed the
//     schema cache but nothing re-rendered (with `suspense` it stuck on the spinner;
//     WITHOUT `suspense` renderMatchSync threw and stayed on the fallback forever).
//  2. A guard that blocked navigation hung `navigate()` forever (the promise only
//     resolved on a location change) and left the URL desynced (history.push had
//     already moved the address bar with no rollback).
//  3. Ancestor/layout `beforeEnter` guards never ran — only the matched leaf's own
//     guard was inspected, so a `requireAuth` on a parent layout was bypassed.

import { describe, expect, it } from 'vitest';
import { h, text } from '@exodra/core';
import { mount } from '@exodra/dom';
import {
    Outlet,
    RouterProvider,
    createMemoryHistory,
    createRouter,
    lazy,
} from './index';

const span = (label: string) => h('span', { static: { children: text(label) } });

// Flush pending microtasks (the lazy loader chain) + the DOM reconcile.
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('lazy routes render after load', () => {
    it('shows suspense first, then the loaded component', async () => {
        const router = createRouter(
            [{ path: '/lazy', component: lazy(() => Promise.resolve(span('LazyLoaded'))) }],
            { history: createMemoryHistory('/lazy') }
        );
        const container = document.createElement('div');
        const mounted = mount(
            h(RouterProvider, {
                static: {
                    router,
                    children: h(Outlet, {
                        static: { suspense: text('Loading'), fallback: text('NotFound') },
                    }),
                },
            }),
            container
        );

        expect(container.textContent).toBe('Loading');
        await flush();
        expect(container.textContent).toBe('LazyLoaded');

        mounted.dispose();
    });

    it('without suspense: shows fallback then the loaded component (used to throw + stick)', async () => {
        const router = createRouter(
            [{ path: '/lazy', component: lazy(() => Promise.resolve(span('LoadedNoSuspense'))) }],
            { history: createMemoryHistory('/lazy') }
        );
        const container = document.createElement('div');
        const mounted = mount(
            h(RouterProvider, {
                static: {
                    router,
                    children: h(Outlet, { static: { fallback: text('Fallback') } }),
                },
            }),
            container
        );

        // Previously this threw inside renderRouteComponent and never recovered.
        expect(container.textContent).toBe('Fallback');
        await flush();
        expect(container.textContent).toBe('LoadedNoSuspense');

        mounted.dispose();
    });

    it('loads the lazy component only once even across re-renders', async () => {
        let loads = 0;
        const router = createRouter(
            [
                { path: '/', component: span('Home') },
                {
                    path: '/lazy',
                    component: lazy(() => {
                        loads += 1;
                        return Promise.resolve(span('Once'));
                    }),
                },
            ],
            { history: createMemoryHistory('/') }
        );
        const container = document.createElement('div');
        const mounted = mount(
            h(RouterProvider, {
                static: { router, children: h(Outlet, { static: { suspense: text('...') } }) },
            }),
            container
        );

        await router.navigate('/lazy');
        await flush();
        await flush();
        expect(container.textContent).toBe('Once');
        expect(loads).toBe(1);

        mounted.dispose();
    });
});

describe('guard rejection does not hang and keeps the URL in sync', () => {
    it('navigate() resolves when a guard blocks, and rolls the URL back', async () => {
        const router = createRouter(
            [
                { path: '/', component: span('Home') },
                { path: '/secret', component: span('Secret'), beforeEnter: () => false },
            ],
            { history: createMemoryHistory('/') }
        );

        // If navigate() hung, the test would time out. It must resolve.
        await router.navigate('/secret');

        expect(router.getLocation().pathname).toBe('/');
        expect(router.getMatch()?.route.path).toBe('/');
    });

    it('a guard string result redirects instead of blocking', async () => {
        const router = createRouter(
            [
                { path: '/', component: span('Home') },
                { path: '/login', component: span('Login') },
                { path: '/secret', component: span('Secret'), beforeEnter: () => '/login' },
            ],
            { history: createMemoryHistory('/') }
        );

        await router.navigate('/secret');

        expect(router.getLocation().pathname).toBe('/login');
        expect(router.getMatch()?.route.path).toBe('/login');
    });

    it('a passing guard commits normally', async () => {
        const router = createRouter(
            [
                { path: '/', component: span('Home') },
                { path: '/ok', component: span('Ok'), beforeEnter: () => true },
            ],
            { history: createMemoryHistory('/') }
        );

        await router.navigate('/ok');

        expect(router.getLocation().pathname).toBe('/ok');
        expect(router.getMatch()?.route.path).toBe('/ok');
    });
});

describe('ancestor/layout guards run', () => {
    it('runs an ancestor beforeEnter even when the leaf declares none', async () => {
        const calls: string[] = [];
        const router = createRouter(
            [
                { path: '/', component: span('Home') },
                {
                    path: '/admin',
                    component: span('AdminLayout'),
                    beforeEnter: () => {
                        calls.push('admin');
                        return true;
                    },
                    children: [{ path: 'users', component: span('Users') }],
                },
            ],
            { history: createMemoryHistory('/') }
        );

        await router.navigate('/admin/users');

        expect(calls).toEqual(['admin']);
        expect(router.getMatch()?.route.path).toBe('users');
    });

    it('a blocking ancestor guard blocks a child navigation and rolls back', async () => {
        const router = createRouter(
            [
                { path: '/', component: span('Home') },
                {
                    path: '/admin',
                    component: span('AdminLayout'),
                    beforeEnter: () => false,
                    children: [{ path: 'users', component: span('Users') }],
                },
            ],
            { history: createMemoryHistory('/') }
        );

        await router.navigate('/admin/users');

        expect(router.getLocation().pathname).toBe('/');
        expect(router.getMatch()?.route.path).toBe('/');
    });

    it('runs ancestor before leaf guard (root → leaf order)', async () => {
        const order: string[] = [];
        const router = createRouter(
            [
                { path: '/', component: span('Home') },
                {
                    path: '/admin',
                    component: span('AdminLayout'),
                    beforeEnter: () => {
                        order.push('parent');
                        return true;
                    },
                    children: [
                        {
                            path: 'users',
                            component: span('Users'),
                            beforeEnter: () => {
                                order.push('child');
                                return true;
                            },
                        },
                    ],
                },
            ],
            { history: createMemoryHistory('/') }
        );

        await router.navigate('/admin/users');

        expect(order).toEqual(['parent', 'child']);
    });
});
