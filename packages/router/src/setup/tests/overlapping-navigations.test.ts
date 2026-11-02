import { describe, expect, it } from 'vitest';
import { createExoMachine, createExoSchema } from '@exodra/core';
import { createExoMemoryHistory, createExoRouter } from '../../index';
import type { TExoRoute } from '../../types';

const page = createExoMachine(
    createExoSchema((b) => {
        b.el('p');
        return {};
    })
);

const held = () => {
    let release!: (allowed: boolean | string) => void;
    const answer = new Promise<boolean | string>((resolve) => {
        release = resolve;
    });
    return { answer, release };
};

describe('navigations that overlap', () => {
    it('drops a slow guarded navigation that a later one overtook', async () => {
        const slow = held();
        const history = createExoMemoryHistory('/');
        const router = createExoRouter(
            [
                { path: '/', component: page },
                { path: '/slow', component: page, beforeEnter: () => slow.answer },
                { path: '/fast', component: page },
            ],
            { history }
        );

        const first = router.navigate('/slow');
        await router.navigate('/fast');
        slow.release(true);
        await first;

        expect(router.getLocation().pathname).toBe('/fast');
        expect(history.getLocation().pathname).toBe('/fast');
        expect(router.getMatch()?.route.path).toBe('/fast');
        expect(router.getNavigationState()).toBe('idle');
    });

    it('leaves the state loading while the newest guarded navigation is still deciding', async () => {
        const older = held();
        const newer = held();
        const routes: readonly TExoRoute[] = [
            { path: '/', component: page },
            { path: '/a', component: page, beforeEnter: () => older.answer },
            { path: '/b', component: page, beforeEnter: () => newer.answer },
        ];
        const router = createExoRouter(routes, { history: createExoMemoryHistory('/') });

        const toA = router.navigate('/a');
        const toB = router.navigate('/b');
        older.release(true);
        await toA;
        expect(router.getNavigationState()).toBe('loading');
        expect(router.getLocation().pathname).toBe('/');

        newer.release(true);
        await toB;
        expect(router.getNavigationState()).toBe('idle');
        expect(router.getLocation().pathname).toBe('/b');
    });

    it('commits synchronously when no guard stands on the branch', () => {
        const router = createExoRouter(
            [
                { path: '/', component: page },
                { path: '/about', component: page },
            ],
            { history: createExoMemoryHistory('/') }
        );

        void router.navigate('/about');

        expect(router.getLocation().pathname).toBe('/about');
    });

    it('resolves navigate() only after the redirect it was answered with has landed', async () => {
        const gate = held();
        const router = createExoRouter(
            [
                { path: '/', component: page },
                { path: '/secret', component: page, beforeEnter: () => '/login' },
                { path: '/login', component: page, beforeEnter: () => gate.answer },
            ],
            { history: createExoMemoryHistory('/') }
        );

        const landed = router.navigate('/secret');
        gate.release(true);

        expect((await landed).pathname).toBe('/login');
    });

    it('keeps the identity of every entry a navigation did not change', async () => {
        const router = createExoRouter(
            [
                {
                    path: '/users',
                    component: page,
                    children: [{ path: ':id', component: page }],
                },
            ],
            { history: createExoMemoryHistory('/users/1') }
        );
        const [layout, first] = router.getMatches();

        await router.navigate('/users/2');

        expect(router.getMatches()[0]).toBe(layout);
        expect(router.getMatches()[1]).not.toBe(first);
    });
});
