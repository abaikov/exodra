// A GUARD THAT THROWS.
//
// The contract `guards.ts` ships: an exception out of a guard is indistinguishable, to everything
// downstream, from that guard returning `false` — the navigation is refused, the URL stays where
// it was, and the only trace is one `console.error`. A REAL contract, since an auth check whose
// network call rejects is the ordinary guard, not the exotic one.
//
// These cases pin the three consequences a user can observe: the refusal, the unmoved URL, and the
// state going back to `'idle'`.
//
// NOTHING HERE RENDERS — a memory history and pages nobody draws.
import { describe, expect, it, vi } from 'vitest';
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import { createExoMemoryHistory, createExoRouter } from '../../index';

/** A page that is never drawn — every case here reads the router, never the markup. */
const page = (name: string) =>
    createExoMachineBuilder(
        createExoSchema((b) => {
            b.el('p', { class: name });
            return {};
        })
    ).done();

const settled = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('a route guard that throws', () => {
    // IF THIS FAILS: a broken auth check lets the user through to the page it was protecting.
    it('refuses the navigation and rolls the address bar back', async () => {
        const boom = new Error('auth service unreachable');
        const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
        const router = createExoRouter(
            [
                { path: '/', component: page('home') },
                {
                    path: '/secret',
                    component: page('secret'),
                    beforeEnter: () => {
                        throw boom;
                    },
                },
            ],
            { history: createExoMemoryHistory('/') }
        );

        // It RESOLVES rather than rejecting — a caller awaiting `navigate()` is not handed the
        // guard's exception, and neither is the popstate path, which drops the promise entirely.
        const settledAt = await router.navigate('/secret');
        await settled();

        expect(settledAt.pathname).toBe('/');
        expect(router.getLocation().pathname).toBe('/');
        expect(router.getMatch()?.route.path).toBe('/');

        // The one and only report a developer gets. If this line goes, the refusal is silent.
        expect(errors).toHaveBeenCalledWith('Route guard error:', boom);

        errors.mockRestore();
        router.dispose();
    });

    // IF THIS FAILS: one broken guard leaves every spinner in the application turning for ever,
    // because `TExoNavigationState` has no way back from `'loading'`.
    it('leaves navigationState back at idle rather than stuck at loading', async () => {
        const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
        const router = createExoRouter(
            [
                { path: '/', component: page('home') },
                {
                    path: '/secret',
                    component: page('secret'),
                    beforeEnter: () => Promise.reject(new Error('auth service unreachable')),
                },
            ],
            { history: createExoMemoryHistory('/') }
        );

        const pending = router.navigate('/secret');
        // The state DID move — this is the value an application shows a spinner for.
        expect(router.getNavigationState()).toBe('loading');

        await pending;
        await settled();

        expect(router.getNavigationState()).toBe('idle');

        errors.mockRestore();
        router.dispose();
    });

    // IF THIS FAILS: an audit-log guard runs for a navigation a broken guard in front of it already
    // refused, and records a page view nobody was allowed to reach.
    it('stops the branch, so the guards behind the throwing one never run', async () => {
        const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
        const ran: string[] = [];
        const router = createExoRouter(
            [
                { path: '/', component: page('home') },
                {
                    path: '/admin',
                    component: page('admin'),
                    beforeEnter: () => {
                        ran.push('beforeEnter');
                        return true;
                    },
                },
            ],
            {
                history: createExoMemoryHistory('/'),
                beforeEach: () => {
                    throw new Error('broken');
                },
            }
        );

        await router.navigate('/admin');
        await settled();

        expect(ran).toEqual([]);
        expect(router.getLocation().pathname).toBe('/');
        // AND THE REFUSAL WAS THE THROW, not a `return false` — without this line the two cases
        // are indistinguishable and an empty `ran` would prove nothing about a THROWING guard.
        expect(errors).toHaveBeenCalledWith('Route guard error:', expect.any(Error));

        errors.mockRestore();
        router.dispose();
    });
});
