// @vitest-environment jsdom
//
// A ROUTE WHOSE PAGE IS NOT THERE YET — a code-split chunk — and a route whose page is not a page
// at all.
//
// A render is one SYNCHRONOUS call on every backend, so a route whose component is still a
// `() => import(…)` draws NOTHING: an empty boundary, filled once the chunk lands. `preloadExoPage`
// fetches the chunk AND remembers the resolved component, which is what `fetchExoRouteChunk` cannot
// do — it caches a promise and hands a renderer nothing it can use.
//
// THE SERVER HALF OF THIS FILE IS GONE, and not because it stopped mattering. A boundary is
// `remove` then `insert` over a child list, and `@exodra/string` has no placement door, so a routed
// page has no server expression at all — which makes "prints nothing on the server until somebody
// preloaded it" and "is server-rendered after preloadExoPage, and the browser adopts it"
// unaskable here. `preloadExoPage` still remembers the component, and
// `route-component-surface.test.ts` asserts that through a synchronous browser render.
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoChildrenPort, TExoMachine, TExoMachineNode, TExoTextPort } from '@exodra/core';
import { describe, expect, it, vi } from 'vitest';

import { createExoMemoryHistory } from '../../history/createExoMemoryHistory';
import { createExoRouter } from '../../setup/createExoRouter';
import { exoOutlet } from '../../components/exoOutlet';
import { exoLazy } from '../exoLazy';
import { preloadExoPage } from '../preloadExoPage';
import { provideExoRouter } from '../../setup/provideExoRouter';
import type { TExoRoute, TExoRouteMachine, TExoRouter, TExoRouteMatch } from '../../types';
import { host } from '@exodra/test-utils';
import { ExoDomBackend, withExoCompiler, withExoChildList } from '@exodra/dom';

const EXO_BACKEND = withExoChildList(withExoCompiler(new ExoDomBackend()));

/**
 * Something that is not a page, as a route's component.
 *
 * `TExoRouteMachine` does not admit one, so THE CAST IS THE TEST: these cases are about a table
 * that nevertheless contains one — the position a JavaScript caller, an old build or a `.js` module
 * with no types is in. Without the cast there is no case, only a compile error the people who need
 * the message never see.
 */
const NOT_A_PAGE = { type: 'span', attrs: {} } as unknown as TExoRouteMachine;

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
    const m = createExoMachineBuilder<TExoMachineNode, TExoRouteMatch>(schema);
    m.wire((c, match) => {
        c.text(schema.ports.label, name + ' at ' + match.pathname);
    });
    return m.done();
};

const HOME = page('home');
const DASHBOARD = page('dashboard');

const OUTLET = exoOutlet('main');

const shellFor = (router: TExoRouter) => {
    const schema = createExoSchema((b) => {
        let body!: TExoChildrenPort;
        b.el('div', { class: 'shell' }, (d) => {
            body = d.childrenPort();
        });
        return { body };
    });
    const m = createExoMachineBuilder<TNestingNode>(schema);
    m.createInitialState((c) => {
        provideExoRouter(c, router);
        c.one(schema.ports.body, OUTLET);
    });
    return m.done() as never;
};

const routerOver = (routes: readonly TExoRoute[], at: string): TExoRouter =>
    createExoRouter(routes, { history: createExoMemoryHistory(at) });

describe('a lazy page', () => {
    it('leaves the boundary empty, then fills it when the chunk lands', async () => {
        const loader = exoLazy(() => Promise.resolve(DASHBOARD));
        const router = routerOver(
            [
                { path: '/', component: HOME },
                { path: '/dash', component: loader },
            ],
            '/dash'
        );
        const parent = host();
        EXO_BACKEND.render(shellFor(router), parent);

        // Nothing yet — and, crucially, no placeholder node either: an empty boundary is an
        // empty region, with nothing in it standing for the page that has not arrived.
        expect(parent.innerHTML).toBe('<div class="shell"><main></main></div>');

        // The SAME in-flight promise the boundary is already waiting on — `preloadExoPage` is
        // memoised per loader, so this starts nothing and joins the queue behind the source's own
        // continuation, which is what tells the boundary the component now exists. The location
        // never changed, so nothing else would have.
        await preloadExoPage(loader);
        await Promise.resolve();

        expect(parent.innerHTML).toBe(
            '<div class="shell"><main><p class="dashboard">dashboard at /dash</p></main></div>'
        );
    });

    it('reports a loader that does not resolve to a page, and leaves the boundary empty', async () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        try {
            // A module that exports something other than a component — a plain node-shaped
            // object is the shape that arrives here.
            const loader = exoLazy(() => Promise.resolve(NOT_A_PAGE));
            const router = routerOver([{ path: '/dash', component: loader }], '/dash');
            const parent = host();
            EXO_BACKEND.render(shellFor(router), parent);

            await preloadExoPage(loader).catch(() => undefined);
            await Promise.resolve();

            expect(parent.innerHTML).toBe('<div class="shell"><main></main></div>');
            expect(spy).toHaveBeenCalled();
        } finally {
            spy.mockRestore();
        }
    });
});

describe('a route this renderer cannot draw', () => {
    it('names the route and both runtimes rather than rendering nothing', () => {
        // A table holding something this renderer cannot draw, handed to the outlet. Silence here
        // would be an empty page with nothing pointing at the table, so it throws while the
        // render is still on the stack.
        const router = routerOver([{ path: '/', component: NOT_A_PAGE }], '/');
        expect(() => EXO_BACKEND.render(shellFor(router), host())).toThrow(
            /schema core cannot render/
        );
    });
});
