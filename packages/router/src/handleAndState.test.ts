// @vitest-environment jsdom
//
// Two router features:
//  1. Route `handle` (arbitrary per-route metadata) surfaced on the whole matched
//     branch via `router.getMatches()` — the breadcrumb/title/layout-chain read.
//  2. Location `state` — per-history-entry data carried through navigation on
//     `location.state`, kept in the History API (not the URL).

import { describe, expect, it } from 'vitest';
import { h, text } from '@exodra/core';
import {
    createBrowserHistory,
    createMemoryHistory,
    createRouter,
    matchRouteChain,
    Route,
    createRoutesFromChildren,
} from './index';

const span = (label: string) => h('span', { static: { children: text(label) } });

describe('route handle + match chain', () => {
    const routes = [
        {
            path: '/',
            component: span('Root'),
            handle: { crumb: 'Home' },
            children: [
                {
                    path: 'users',
                    component: span('Users'),
                    handle: { crumb: 'Users' },
                    children: [
                        {
                            path: ':id',
                            component: span('User'),
                            handle: { crumb: 'Profile' },
                        },
                    ],
                },
            ],
        },
    ];

    it('exposes the full matched branch root → leaf via getMatches()', () => {
        const router = createRouter(routes, {
            history: createMemoryHistory('/users/42'),
        });

        const chain = router.getMatches();
        expect(chain.map(m => (m.handle as { crumb: string }).crumb)).toEqual([
            'Home',
            'Users',
            'Profile',
        ]);
        // Leaf of the chain is the same route as `match`; params shared across it.
        expect(chain[chain.length - 1].route).toBe(router.getMatch()!.route);
        expect(chain.every(m => m.params.id === '42')).toBe(true);
        router.dispose();
    });

    it('resolves each ancestor pathname with the matched params', () => {
        const chain = matchRouteChain(routes, '/users/42');
        expect(chain.map(m => m.pathname)).toEqual(['/', '/users', '/users/42']);
    });

    it('mirrors route.handle onto the leaf match', () => {
        const router = createRouter(routes, {
            history: createMemoryHistory('/users/42'),
        });
        expect((router.getMatch()!.handle as { crumb: string }).crumb).toBe('Profile');
        router.dispose();
    });

    it('updates the chain reactively on navigation', async () => {
        const router = createRouter(routes, {
            history: createMemoryHistory('/'),
        });
        expect(router.getMatches().map(m => m.pathname)).toEqual(['/']);
        await router.navigate('/users');
        expect(router.getMatches().map(m => (m.handle as { crumb: string }).crumb)).toEqual([
            'Home',
            'Users',
        ]);
        router.dispose();
    });

    it('carries handle through declarative <Route handle=…>', () => {
        const built = createRoutesFromChildren([
            h(Route, {
                static: { path: '/x', component: span('X'), handle: { crumb: 'X' } },
            }),
        ]);
        expect((built[0].handle as { crumb: string }).crumb).toBe('X');
    });
});

describe('location state', () => {
    it('carries state through navigate() on memory history', async () => {
        const router = createRouter([{ path: '/', component: span('Home') }, { path: '/to', component: span('To') }], {
            history: createMemoryHistory('/'),
        });
        expect(router.getLocation().state).toBeUndefined();
        await router.navigate('/to', { state: { from: 'home', n: 7 } });
        expect(router.getLocation().state).toEqual({ from: 'home', n: 7 });
        // A plain navigation without state clears it (fresh history entry).
        await router.navigate('/');
        expect(router.getLocation().state).toBeUndefined();
        router.dispose();
    });

    it('round-trips state through the memory history adapter (push + replace)', () => {
        const history = createMemoryHistory('/');
        history.push('/a', { tag: 'a' });
        expect(history.getLocation().state).toEqual({ tag: 'a' });
        history.replace('/b', { tag: 'b' });
        expect(history.getLocation().state).toEqual({ tag: 'b' });
    });

    it('round-trips state through the browser History API', () => {
        window.history.replaceState(null, '', '/start');
        const history = createBrowserHistory({ window });
        history.push('/x', { scroll: 10 });
        expect(history.getLocation().state).toEqual({ scroll: 10 });
        history.replace('/y', { scroll: 20 });
        expect(history.getLocation().state).toEqual({ scroll: 20 });
        history.dispose?.();
    });
});
