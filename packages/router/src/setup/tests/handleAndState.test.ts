// @vitest-environment jsdom
//
// Two router features:
//  1. Route `handle` (arbitrary per-route metadata) surfaced on the whole matched
//     branch via `router.getMatches()` — the breadcrumb/title/layout-chain read.
//  2. Location `state` — per-history-entry data carried through navigation on
//     `location.state`, kept in the History API (not the URL).

import { describe, expect, it } from 'vitest';
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import {
    createExoBrowserHistory,
    createExoMemoryHistory,
    createExoRouter,
    matchExoRouteChain,
} from '../../index';

// A PAGE THAT IS NEVER RENDERED — nothing here mounts anything. What these cases read is the
// MATCH (`handle`, `pathname`, `params`) and the history entry's `state`, and a route's
// `component` is carried past all of it untouched.
const page = (name: string) =>
    createExoMachineBuilder(
        createExoSchema((b) => {
            b.el('p', { class: name });
            return {};
        })
    ).done();

describe('route handle + match chain', () => {
    const routes = [
        {
            path: '/',
            component: page('root'),
            handle: { crumb: 'Home' },
            children: [
                {
                    path: 'users',
                    component: page('users'),
                    handle: { crumb: 'Users' },
                    children: [
                        {
                            path: ':id',
                            component: page('user'),
                            handle: { crumb: 'Profile' },
                        },
                    ],
                },
            ],
        },
    ];

    it('exposes the full matched branch root → leaf via getMatches()', () => {
        const router = createExoRouter(routes, {
            history: createExoMemoryHistory('/users/42'),
        });

        const chain = router.getMatches();
        expect(chain.map((m) => (m.handle as { crumb: string }).crumb)).toEqual([
            'Home',
            'Users',
            'Profile',
        ]);
        expect(chain[chain.length - 1].route).toBe(router.getMatch()!.route);
        expect(chain.map((m) => m.params)).toEqual([{}, {}, { id: '42' }]);
        router.dispose();
    });

    it('resolves each ancestor pathname with the matched params', () => {
        const chain = matchExoRouteChain(routes, '/users/42');
        expect(chain.map((m) => m.pathname)).toEqual(['/', '/users', '/users/42']);
    });

    it('mirrors route.handle onto the leaf match', () => {
        const router = createExoRouter(routes, {
            history: createExoMemoryHistory('/users/42'),
        });
        expect((router.getMatch()!.handle as { crumb: string }).crumb).toBe('Profile');
        router.dispose();
    });

    it('hands back a new chain after a navigation', async () => {
        const router = createExoRouter(routes, {
            history: createExoMemoryHistory('/'),
        });
        expect(router.getMatches().map((m) => m.pathname)).toEqual(['/']);
        await router.navigate('/users');
        expect(router.getMatches().map((m) => (m.handle as { crumb: string }).crumb)).toEqual([
            'Home',
            'Users',
        ]);
        router.dispose();
    });
});

describe('location state', () => {
    it('carries state through navigate() on memory history', async () => {
        const router = createExoRouter(
            [
                { path: '/', component: page('home') },
                { path: '/to', component: page('to') },
            ],
            {
                history: createExoMemoryHistory('/'),
            }
        );
        expect(router.getLocation().state).toBeUndefined();
        await router.navigate('/to', { state: { from: 'home', n: 7 } });
        expect(router.getLocation().state).toEqual({ from: 'home', n: 7 });
        // A plain navigation without state clears it (fresh history entry).
        await router.navigate('/');
        expect(router.getLocation().state).toBeUndefined();
        router.dispose();
    });

    it('round-trips state through the memory history adapter (push + replace)', () => {
        const history = createExoMemoryHistory('/');
        history.push('/a', { tag: 'a' });
        expect(history.getLocation().state).toEqual({ tag: 'a' });
        history.replace('/b', { tag: 'b' });
        expect(history.getLocation().state).toEqual({ tag: 'b' });
    });

    it('round-trips state through the browser History API', () => {
        window.history.replaceState(null, '', '/start');
        const history = createExoBrowserHistory({ window });
        history.push('/x', { scroll: 10 });
        expect(history.getLocation().state).toEqual({ scroll: 10 });
        history.replace('/y', { scroll: 20 });
        expect(history.getLocation().state).toEqual({ scroll: 20 });
        history.dispose?.();
    });
});
