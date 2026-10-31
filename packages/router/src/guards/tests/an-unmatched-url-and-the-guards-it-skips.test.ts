// `beforeLeave`, AND THE URL THAT MATCHES NOTHING.
//
// The first two cases are the promise: the guard on the page being LEFT runs, and refusing from it
// keeps the user where they are — the unsaved-changes guard.
//
// The third and fourth pin a GAP rather than a feature. `decide` in `createExoRouter.ts` returns
// `true` before it collects any guard when nothing matched, so a mistyped URL runs no
// `beforeEach`, no `beforeEnter` — and no `beforeLeave` either, which is exactly the case the
// unsaved-changes guard was written for. Closing it needs `TExoRouteGuard`'s first parameter
// widened to `TExoRouteMatch | undefined`, which is a decision about what a guard MEANS.
//
// NOTHING HERE RENDERS — a memory history and pages nobody draws.
import { describe, expect, it } from 'vitest';
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import { createExoMemoryHistory, createExoRouter } from '../../index';
import type { TExoRoute } from '../../types';

const page = (name: string) =>
    createExoMachineBuilder(
        createExoSchema((b) => {
            b.el('p', { class: name });
            return {};
        })
    ).done();

const settled = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('beforeLeave, on the branch being left', () => {
    // IF THIS FAILS: a page with unsaved changes is left without ever asking, because the guard the
    // application declared for exactly that is never consulted.
    it('runs with the destination and the page being left, and lets the navigation through', async () => {
        const seen: Array<{ to?: string; from?: string }> = [];
        const routes: readonly TExoRoute[] = [
            { path: '/about', component: page('about') },
            {
                path: '/edit',
                component: page('edit'),
                beforeLeave: (to, from) => {
                    seen.push({ to: to.pathname, from: from?.pathname });
                    return true;
                },
            },
        ];
        const router = createExoRouter(routes, { history: createExoMemoryHistory('/edit') });

        await router.navigate('/about');
        await settled();

        expect(seen[0]).toEqual({ to: '/about', from: '/edit' });
        expect(router.getLocation().pathname).toBe('/about');

        router.dispose();
    });

    // IF THIS FAILS: "you have unsaved changes" is answered "stay", and the editor is thrown away
    // anyway.
    it('keeps the user on the page when it refuses', async () => {
        const seen: string[] = [];
        const routes: readonly TExoRoute[] = [
            { path: '/about', component: page('about') },
            {
                path: '/edit',
                component: page('edit'),
                beforeLeave: (to) => {
                    seen.push(to.pathname);
                    return to.pathname !== '/about';
                },
            },
        ];
        const router = createExoRouter(routes, { history: createExoMemoryHistory('/edit') });

        await router.navigate('/about');
        await settled();

        expect(seen[0]).toBe('/about');
        expect(router.getLocation().pathname).toBe('/edit');
        expect(router.getMatch()?.route.path).toBe('/edit');

        router.dispose();
    });
});

describe('a navigation to a URL no route matches', () => {
    // IF THIS FAILS: the application's own 404 page becomes unreachable, because a global
    // beforeEach redirects every mistyped URL before the router can commit it.
    it('commits without running beforeEach or beforeEnter, and reports the 404 to afterEach', async () => {
        const ran: string[] = [];
        const at: Array<{ to?: string; from?: string }> = [];
        const routes: readonly TExoRoute[] = [
            {
                path: '/edit',
                component: page('edit'),
                beforeEnter: () => {
                    ran.push('beforeEnter');
                    return true;
                },
            },
        ];
        const router = createExoRouter(routes, {
            history: createExoMemoryHistory('/edit'),
            beforeEach: () => {
                ran.push('beforeEach');
                return false;
            },
            afterEach: (to, from) => at.push({ to: to?.pathname, from: from?.pathname }),
        });

        await router.navigate('/nope');
        await settled();

        // The refusing beforeEach never ran, so the URL committed.
        expect(ran).toEqual([]);
        expect(router.getLocation().pathname).toBe('/nope');
        expect(router.getMatch()).toBeUndefined();
        // `to` is `undefined` and the hook is still called — a 404 is a real navigation.
        expect(at).toEqual([{ to: undefined, from: '/edit' }]);

        router.dispose();
    });

    // IF THIS FAILS AS WRITTEN, THE GAP HAS BEEN CLOSED — see the header. What ships is that an
    // unsaved-changes guard is skipped when the user pastes a broken URL, which is the very case it
    // was written for; the user loses the editor with no prompt.
    it('does NOT run the beforeLeave of the page being left — the gap in the header', async () => {
        const ran: string[] = [];
        const routes: readonly TExoRoute[] = [
            {
                path: '/edit',
                component: page('edit'),
                beforeLeave: () => {
                    ran.push('beforeLeave');
                    return false;
                },
            },
        ];
        const router = createExoRouter(routes, { history: createExoMemoryHistory('/edit') });

        await router.navigate('/nope');
        await settled();

        expect(ran).toEqual([]);
        expect(router.getLocation().pathname).toBe('/nope');

        router.dispose();
    });
});
