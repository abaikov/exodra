// `navigate()` TO THE URL THE APPLICATION IS ALREADY ON.
//
// `afterEach` reports COMMITTED NAVIGATIONS, and a re-navigation to the same URL is one: a
// deliberate `navigate('/about')` from `/about` is a navigation the application asked for.
//
// That is why the hook is NOT gated on the URL having changed.
//
// NOTHING HERE RENDERS.
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

const ROUTES: readonly TExoRoute[] = [
    { path: '/', component: page('home') },
    { path: '/about', component: page('about') },
];

const settled = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('navigate() to the URL already displayed', () => {
    // IF THIS FAILS: a "refresh this page" button stops being reported to analytics, and a hook
    // that reloads data on every committed navigation stops firing for the reload.
    it('fires afterEach, with `to` and `from` naming the same route', async () => {
        const at: Array<{ to?: string; from?: string }> = [];
        const router = createExoRouter(ROUTES, {
            history: createExoMemoryHistory('/about'),
            afterEach: (to, from) => at.push({ to: to?.pathname, from: from?.pathname }),
        });

        await router.navigate('/about');
        await settled();

        expect(at).toEqual([{ to: '/about', from: '/about' }]);
        expect(router.getLocation().pathname).toBe('/about');

        router.dispose();
    });

    // IF THIS FAILS: repeated re-navigations to the same URL are collapsed into one report, so the
    // count a page-view hook keeps drifts below the truth.
    it('fires once per call, not once per distinct URL', async () => {
        const at: string[] = [];
        const router = createExoRouter(ROUTES, {
            history: createExoMemoryHistory('/about'),
            afterEach: (to) => at.push(String(to?.pathname)),
        });

        await router.navigate('/about');
        await router.navigate('/about');
        await settled();

        expect(at).toEqual(['/about', '/about']);

        router.dispose();
    });

    // IF THIS FAILS: a guard on the page stops being consulted for a re-navigation, so an auth
    // check that has since expired is not re-run when the user returns to the same URL.
    it('still runs the branch guards for it', async () => {
        const ran: string[] = [];
        const routes: readonly TExoRoute[] = [
            {
                path: '/about',
                component: page('about'),
                beforeEnter: (to) => {
                    ran.push(to.pathname);
                    return true;
                },
            },
        ];
        const router = createExoRouter(routes, { history: createExoMemoryHistory('/about') });

        await router.navigate('/about');
        await settled();

        expect(ran).toEqual(['/about']);

        router.dispose();
    });
});
