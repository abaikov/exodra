// THREE PARTS OF A ROUTER'S LIFE — the state it publishes while a navigation is in flight, the hook
// it calls once one has committed, and what `dispose()` actually detaches.
//
// `options.afterEach` takes `TExoRouteMatch | undefined`: a navigation to a path no route matched
// still COMMITS, and the hook is still called — with `undefined` for the destination.
//
// NOTHING HERE RENDERS — these cases read the router object, so a memory history and a table of
// pages that are never drawn is the whole rig.
import { describe, expect, it } from 'vitest';
import { createExoMachine, createExoSchema } from '@exodra/core';
import { createExoMemoryHistory, createExoRouter } from '../../index';
import type { TExoHistory, TExoRoute, TExoRouter } from '../../types';

/** A page that is never drawn — every case here reads the MATCH, never the markup. */
const page = (name: string) =>
    createExoMachine(
        createExoSchema((b) => {
            b.el('p', { class: name });
            return {};
        })
    );

const ROUTES: readonly TExoRoute[] = [
    { path: '/', component: page('home') },
    { path: '/about', component: page('about') },
    { path: '/users/:id', component: page('user') },
];

const settled = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

// --------------------------------------------------------------------- navigationState

const stateChanges = (router: TExoRouter): string[] => {
    const seen: string[] = [];
    let last = router.getNavigationState();
    router.onChange(() => {
        const now = router.getNavigationState();
        if (now === last) return;
        last = now;
        seen.push(now);
    });
    return seen;
};

describe('router.navigationState', () => {
    it('starts idle and is still idle after a navigation with no guard', async () => {
        const router = createExoRouter(ROUTES, { history: createExoMemoryHistory('/') });
        const seen = stateChanges(router);

        expect(router.getNavigationState()).toBe('idle');
        await router.navigate('/about');
        expect(router.getNavigationState()).toBe('idle');
        expect(seen).toEqual([]);

        router.dispose();
    });

    it('reports `loading` for exactly as long as an async guard is deciding', async () => {
        // THE ONE WINDOW THIS VALUE EXISTS FOR: a spinner bound to `navigationState` is only useful
        // if the state is `loading` WHILE the guard awaits and back to `idle` by the time the page
        // is drawn. The guard is held open by hand, because an ordinary `async` one would resolve
        // on the next microtask and leave nothing to observe.
        let release!: (allowed: boolean) => void;
        const held = new Promise<boolean>((resolve) => {
            release = resolve;
        });

        const router = createExoRouter(ROUTES, {
            history: createExoMemoryHistory('/'),
            beforeEach: () => held,
        });
        const seen = stateChanges(router);

        const arrived = router.navigate('/about');
        // The guard has not answered, so nothing has committed and the state says so.
        expect(router.getNavigationState()).toBe('loading');
        expect(router.getLocation().pathname).toBe('/');

        release(true);
        await arrived;

        expect(router.getNavigationState()).toBe('idle');
        expect(router.getLocation().pathname).toBe('/about');
        // Both edges were published, in order — a subscriber that only ever saw `idle` would be
        // a spinner that never appears.
        expect(seen).toEqual(['loading', 'idle']);

        router.dispose();
    });
});

// --------------------------------------------------------------------------- afterEach

describe('createExoRouter option: afterEach', () => {
    it('runs after the location and the match have already been written', async () => {
        // AFTER, and the assertion is taken INSIDE the hook rather than after the await: a hook
        // that ran before the commit would see the OLD location, and a title-setter or an
        // analytics call built on it would report the page the user just left.
        const at: Array<{ to?: string; from?: string; committed: string }> = [];
        const router = createExoRouter(ROUTES, {
            history: createExoMemoryHistory('/'),
            afterEach: (to, from) => {
                at.push({
                    to: to?.pathname,
                    from: from?.pathname,
                    committed: router.getLocation().pathname,
                });
            },
        });

        await router.navigate('/about');
        expect(at).toEqual([{ to: '/about', from: '/', committed: '/about' }]);

        await router.navigate('/users/7');
        expect(at[1]).toEqual({ to: '/users/7', from: '/about', committed: '/users/7' });

        router.dispose();
    });

    it('follows a guard REDIRECT and reports the destination that was actually reached', async () => {
        const at: Array<string | undefined> = [];
        const router = createExoRouter(
            [
                { path: '/', component: page('home') },
                { path: '/login', component: page('login') },
                { path: '/secret', component: page('secret'), beforeEnter: () => '/login' },
            ],
            {
                history: createExoMemoryHistory('/'),
                afterEach: (to) => at.push(to?.pathname),
            }
        );

        await router.navigate('/secret');
        await settled();

        // ONE call, and it names `/login` — never `/secret`, which was never committed.
        expect(at).toEqual(['/login']);
        expect(router.getLocation().pathname).toBe('/login');

        router.dispose();
    });

    it('does not fire for a refused navigation, and the state comes back to idle: nothing was written, so nothing is rolled back', async () => {
        // A refused navigation still has to end the loading state; leaving it at `loading` is a
        // spinner that never stops.
        const at: Array<{ to?: string; from?: string }> = [];
        const history = createExoMemoryHistory('/');
        const router = createExoRouter(ROUTES, {
            history,
            beforeEach: async (match) => match.pathname !== '/about',
            afterEach: (to, from) => at.push({ to: to?.pathname, from: from?.pathname }),
        });

        await router.navigate('/about');
        await settled();

        expect(at).toEqual([]);
        expect(router.getNavigationState()).toBe('idle');
        expect(router.getLocation().pathname).toBe('/');
        expect(history.getLocation().pathname).toBe('/');

        router.dispose();
    });

    it('puts the URL back, silently, when a change it did not make is refused', async () => {
        const at: Array<{ to?: string; from?: string }> = [];
        const history = createExoMemoryHistory('/');
        const router = createExoRouter(ROUTES, {
            history,
            beforeEach: (match) => match.pathname !== '/about',
            afterEach: (to, from) => at.push({ to: to?.pathname, from: from?.pathname }),
        });

        history.push('/about');

        expect(history.getLocation().pathname).toBe('/');
        expect(router.getLocation().pathname).toBe('/');
        expect(at).toEqual([]);

        router.dispose();
    });
});

// ----------------------------------------------------------------------------- dispose

describe('router.dispose()', () => {
    it('stops following the history it was given', async () => {
        // A ROUTER IS A SUBSCRIBER, and the only observable difference disposal makes is that it
        // stops being one. Driving the HISTORY directly (rather than `router.navigate`) is what
        // makes that visible: the URL really does move, and the router really does not follow.
        const history = createExoMemoryHistory('/');
        const router = createExoRouter(ROUTES, { history });
        const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

        history.push('/about');
        await settle();
        expect(router.getLocation().pathname).toBe('/about');

        router.dispose();

        history.push('/users/7');
        await settle();
        expect(history.getLocation().pathname).toBe('/users/7');
        expect(router.getLocation().pathname).toBe('/about');
        expect(router.getMatch()?.route.path).toBe('/about');
    });

    it('disposes the HISTORY as well, which is why one history must not serve two routers', () => {
        // A HAZARD, NOT A FEATURE: `dispose()` calls `history.dispose?.()`, and a memory history's
        // disposal CLEARS ITS SUBSCRIBER SET — every subscriber, not just this router's. So two
        // routers on one history are not independent: disposing either detaches the other,
        // silently, and the survivor goes on answering `getLocation()` with its last committed
        // value. The counted `onChange` is the instrument, because the mechanism is the
        // `subscribers.clear()` in `createExoMemoryHistory`'s `dispose`.
        let notifications = 0;
        const history: TExoHistory = createExoMemoryHistory('/');
        const off = history.onChange(() => {
            notifications += 1;
        });

        const router = createExoRouter(ROUTES, { history });
        history.push('/about');
        expect(notifications).toBe(1);

        router.dispose();

        history.push('/users/7');
        expect(notifications).toBe(1);

        off();
    });
});
