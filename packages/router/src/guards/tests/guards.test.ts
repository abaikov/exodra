// GUARDS SEEN FROM THE ROUTER, with nothing rendering — what `navigate()` resolves to, what the
// address bar is left showing, and which guards along the matched branch ran, in what order.
//
// Two properties these cases hold down:
//  1. A guard that blocks resolves `navigate()` — the promise reflects the outcome rather than
//     waiting for a location change that never comes — and rolls the address bar back, which
//     `history.push` has already moved by then.
//  2. Every `beforeEnter` along the matched branch runs, not only the leaf's, so a `requireAuth`
//     on a parent layout covers what is under it.
//
// `guarded-routing.test.ts` asks the same questions of a BOUNDARY. These cases are the layer under
// it, and the only one that can see the ORDER the branch's guards ran in.

import { describe, expect, it } from 'vitest';
import { createExoMachine, createExoSchema } from '@exodra/core';
import { createExoMemoryHistory, createExoRouter } from '../../index';

// A PAGE THAT IS NEVER RENDERED — nothing here mounts anything, and a guard never sees a route's
// component. One real page stands in for every entry in the tables below.
const page = (name: string) =>
    createExoMachine(
        createExoSchema((b) => {
            b.el('p', { class: name });
            return {};
        })
    );

describe('guard rejection does not hang and keeps the URL in sync', () => {
    it('navigate() resolves when a guard blocks, and rolls the URL back', async () => {
        const router = createExoRouter(
            [
                { path: '/', component: page('home') },
                {
                    path: '/secret',
                    component: page('secret'),
                    beforeEnter: () => false,
                },
            ],
            { history: createExoMemoryHistory('/') }
        );

        // If navigate() hung, the test would time out. It must resolve.
        await router.navigate('/secret');

        expect(router.getLocation().pathname).toBe('/');
        expect(router.getMatch()?.route.path).toBe('/');
    });

    it('a guard string result redirects instead of blocking', async () => {
        const router = createExoRouter(
            [
                { path: '/', component: page('home') },
                { path: '/login', component: page('login') },
                {
                    path: '/secret',
                    component: page('secret'),
                    beforeEnter: () => '/login',
                },
            ],
            { history: createExoMemoryHistory('/') }
        );

        await router.navigate('/secret');

        expect(router.getLocation().pathname).toBe('/login');
        expect(router.getMatch()?.route.path).toBe('/login');
    });

    it('a passing guard commits normally', async () => {
        const router = createExoRouter(
            [
                { path: '/', component: page('home') },
                {
                    path: '/ok',
                    component: page('ok'),
                    beforeEnter: () => true,
                },
            ],
            { history: createExoMemoryHistory('/') }
        );

        await router.navigate('/ok');

        expect(router.getLocation().pathname).toBe('/ok');
        expect(router.getMatch()?.route.path).toBe('/ok');
    });
});

describe('ancestor/layout guards run', () => {
    it('runs an ancestor beforeEnter even when the leaf declares none', async () => {
        const calls: string[] = [];
        const router = createExoRouter(
            [
                { path: '/', component: page('home') },
                {
                    path: '/admin',
                    component: page('admin-layout'),
                    beforeEnter: () => {
                        calls.push('admin');
                        return true;
                    },
                    children: [{ path: 'users', component: page('users') }],
                },
            ],
            { history: createExoMemoryHistory('/') }
        );

        await router.navigate('/admin/users');

        expect(calls).toEqual(['admin']);
        expect(router.getMatch()?.route.path).toBe('users');
    });

    it('a blocking ancestor guard blocks a child navigation and rolls back', async () => {
        const router = createExoRouter(
            [
                { path: '/', component: page('home') },
                {
                    path: '/admin',
                    component: page('admin-layout'),
                    beforeEnter: () => false,
                    children: [{ path: 'users', component: page('users') }],
                },
            ],
            { history: createExoMemoryHistory('/') }
        );

        await router.navigate('/admin/users');

        expect(router.getLocation().pathname).toBe('/');
        expect(router.getMatch()?.route.path).toBe('/');
    });

    it('runs ancestor before leaf guard (root → leaf order)', async () => {
        const order: string[] = [];
        const router = createExoRouter(
            [
                { path: '/', component: page('home') },
                {
                    path: '/admin',
                    component: page('admin-layout'),
                    beforeEnter: () => {
                        order.push('parent');
                        return true;
                    },
                    children: [
                        {
                            path: 'users',
                            component: page('users'),
                            beforeEnter: () => {
                                order.push('child');
                                return true;
                            },
                        },
                    ],
                },
            ],
            { history: createExoMemoryHistory('/') }
        );

        await router.navigate('/admin/users');

        expect(order).toEqual(['parent', 'child']);
    });
});
