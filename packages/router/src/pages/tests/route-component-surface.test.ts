// @vitest-environment jsdom
//
// THE SIX EXPORTS THAT ANSWER "WHAT IS IN THIS ROUTE'S `component`, AND IS IT HERE YET" —
// `isExoPageMachine`, `isExoLazyLoader`, `loadExoLazyMachine`, `resolveExoRouteMachine`,
// `fetchExoRouteChunk` and `exoLazy`.
//
// ONLY THE LAST TWO BLOCKS NEED A DOM, and the reason they need one is a limit rather than a taste:
// the `fetchExoRouteChunk` vs `preloadExoPage` case asks "can a render that cannot await see this
// page", which has to be asked through a boundary — and a boundary is `remove` then `insert` over a
// child list, a door `@exodra/string` does not have. `ExoDomBackend.render` is synchronous too, so
// it answers the same question.
import { describe, expect, it } from 'vitest';
import { createExoMachine, composeExoMachine, withExoWire, createExoSchema } from '@exodra/core';
import type { TExoChildrenPort, TExoMachine, TExoMachineNode, TExoTextPort } from '@exodra/core';
import { host } from '@exodra/test-utils';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';

const EXO_BACKEND = withExoCompiler(new ExoDomBackend());

import {
    createExoMemoryHistory,
    createExoRouter,
    exoLazy,
    exoOutlet,
    fetchExoRouteChunk,
    isExoLazyLoader,
    isExoPageMachine,
    loadExoLazyMachine,
    preloadExoPage,
    provideExoRouter,
    resolveExoRouteMachine,
} from '../../index';
import type { TExoRoute, TExoRouteMachine, TExoRouter, TExoRouteMatch } from '../../types';

interface TNestingNode extends TExoMachineNode {
    one(port: TExoChildrenPort, machine: TExoMachine<never>): void;
}

const page = (name: string) => {
    const schema = createExoSchema((b) => {
        let label!: TExoTextPort;
        b.el('p', { class: name }, (p) => {
            label = p.textPort();
        });
        return { label };
    });
    const m = createExoMachine<TExoMachineNode, TExoRouteMatch>(schema);
    return composeExoMachine(m, (m) =>
        withExoWire(m, (c, match) => {
            c.text(schema.ports.label, name + ' at ' + match.pathname);
        })
    );
};

const DASHBOARD = page('dashboard');

/**
 * A plain `{ type, attrs }` object, as a route's component. `TExoRouteMachine` does not admit
 * one, so THE CAST is the test: without it there would be no case — only a compile error the
 * people who reach this never see.
 */
const NOT_A_PAGE = { type: 'span', attrs: {} } as unknown as TExoRouteMachine;

// ------------------------------------------------------------------ what a component IS

describe('isExoPageMachine', () => {
    it('says yes to a machine and no to a loader', () => {
        expect(isExoPageMachine(DASHBOARD)).toBe(true);
        expect(isExoPageMachine(exoLazy(() => Promise.resolve(DASHBOARD)))).toBe(false);
    });

    it('says no to the removed runtime’s h() schema, which is what it is for', () => {
        // The two fields are the whole test, and a `{ type, attrs }` object has neither. This is
        // what turns "the page is blank" into the named error `showExoOutletRoute` throws.
        expect(isExoPageMachine(NOT_A_PAGE)).toBe(false);
    });
});

describe('isExoLazyLoader', () => {
    it('says yes to an exoLazy loader and no to a page', () => {
        expect(isExoLazyLoader(exoLazy(() => Promise.resolve(DASHBOARD)))).toBe(true);
        expect(isExoLazyLoader(DASHBOARD)).toBe(false);
    });
});

// --------------------------------------------------------------------- fetching a chunk

describe('loadExoLazyMachine', () => {
    it('fetches once and hands every later caller the same promise', async () => {
        let fetches = 0;
        const loader = exoLazy(() => {
            fetches += 1;
            return Promise.resolve(DASHBOARD);
        });

        const first = loadExoLazyMachine(loader);
        const second = loadExoLazyMachine(loader);

        // ONE `loader()` CALL, which is what the cache buys: n outlets asking at once would
        // otherwise be n network requests for a chunk already in flight.
        //
        // NOT the same promise OBJECT, though the cache stores one: `loadExoLazyMachine` is
        // declared `async`, so every call is wrapped in a fresh promise whatever it returns. What
        // is shared is the awaited work, not the handle.
        expect(await first).toBe(DASHBOARD);
        expect(await second).toBe(DASHBOARD);
        expect(fetches).toBe(1);
    });

    it('forgets a REJECTED load, so the next caller really tries again', async () => {
        // A NETWORK BLIP MUST NOT BE PERMANENT. Caching the rejected promise would turn one
        // failed fetch into a route that is blank for the rest of the session; `exoLazy` deletes
        // its own entry in the `catch` for exactly this.
        let attempts = 0;
        const loader = exoLazy(() => {
            attempts += 1;
            return attempts === 1
                ? Promise.reject(new Error('network went away'))
                : Promise.resolve(DASHBOARD);
        });

        await expect(loadExoLazyMachine(loader)).rejects.toThrow('network went away');
        expect(await loadExoLazyMachine(loader)).toBe(DASHBOARD);
        expect(attempts).toBe(2);
    });
});

describe('resolveExoRouteMachine', () => {
    it('hands a page straight back', async () => {
        expect(await resolveExoRouteMachine(DASHBOARD)).toBe(DASHBOARD);
    });

    it('follows a CHAIN — a loader whose module exports another loader', async () => {
        // This is why it recurses rather than awaiting once. A re-exporting barrel module is the
        // ordinary way to produce one of these without meaning to.
        const inner = exoLazy(() => Promise.resolve(DASHBOARD));
        const outer = exoLazy(() => Promise.resolve(inner));

        expect(await resolveExoRouteMachine(outer)).toBe(DASHBOARD);
    });
});

// ---------------------------------------- the difference between the two preloads, shown

const OUTLET = exoOutlet('main');

const shellFor = (router: TExoRouter) => {
    const schema = createExoSchema((b) => {
        let body!: TExoChildrenPort;
        b.el('div', { class: 'shell' }, (d) => {
            body = d.childrenPort();
        });
        return { body };
    });
    const m = createExoMachine<TNestingNode>(schema, {
        createInitialState: (c) => {
            provideExoRouter(c, router);
            c.one(schema.ports.body, OUTLET);
        },
    });
    return m as never;
};

/** ONE SYNCHRONOUS RENDER, which is the instrument: nothing here awaits between mount and read. */
const renderOf = (component: TExoRouteMachine): string => {
    const routes: readonly TExoRoute[] = [{ path: '/dash', component }];
    const router: TExoRouter = createExoRouter(routes, {
        history: createExoMemoryHistory('/dash'),
    });
    const parent = host();
    const dispose = EXO_BACKEND.render(shellFor(router), parent);
    const markup = parent.innerHTML;
    dispose();
    router.dispose();
    return markup;
};

const EMPTY = '<div class="shell"><main></main></div>';
const DRAWN = '<div class="shell"><main><p class="dashboard">dashboard at /dash</p></main></div>';

describe('fetchExoRouteChunk is NOT preloadExoPage', () => {
    it('makes the chunk arrive and STILL leaves a synchronous render nothing to print', async () => {
        // THE WHOLE DIFFERENCE BETWEEN THE TWO, as bytes. Both await the same module; only
        // `preloadExoPage` stores the settled COMPONENT where a synchronous render can read it.
        // This is the shape of the "I awaited the chunk and the page still came out empty" report.
        const loader = exoLazy(() => Promise.resolve(DASHBOARD));

        await fetchExoRouteChunk(loader);
        expect(renderOf(loader)).toBe(EMPTY);

        await preloadExoPage(loader);
        expect(renderOf(loader)).toBe(DRAWN);
    });

    it('is a no-op for a route whose component is already a page', async () => {
        // It takes a route's `component`, not a loader, precisely so that a table entry holding a
        // page is a resolved promise rather than an error — which is what lets a caller walk a
        // whole table and warm whatever happens to be lazy.
        await expect(fetchExoRouteChunk(DASHBOARD)).resolves.toBeUndefined();
        expect(renderOf(DASHBOARD)).toBe(DRAWN);
    });
});

describe('preloadExoPage', () => {
    it('REJECTS a loader that resolves to something that is not a page', async () => {
        // Refused where the caller is awaiting and can see it, rather than inside a subscriber an
        // hour later with no stack pointing at the table.
        const loader = exoLazy(() => Promise.resolve(NOT_A_PAGE));

        await expect(preloadExoPage(loader)).rejects.toThrow(/not a page component/);
    });

    it('lets a NEW caller retry after a failed load rather than replaying the rejection', async () => {
        // The `LOADING.delete(loader)` in the `catch`. Without it the DERIVED promise stays cached,
        // every later call hands back the same rejection, and the chunk is never fetched again — a
        // lazy page permanently blank because of one blip.
        let attempts = 0;
        const loader = exoLazy(() => {
            attempts += 1;
            return attempts === 1
                ? Promise.reject(new Error('network went away'))
                : Promise.resolve(DASHBOARD);
        });

        await expect(preloadExoPage(loader)).rejects.toThrow('network went away');
        await expect(preloadExoPage(loader)).resolves.toBeUndefined();
        expect(attempts).toBe(2);
        expect(renderOf(loader)).toBe(DRAWN);
    });
});
