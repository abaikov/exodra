// @vitest-environment jsdom
//
// GUARDS, SEEN FROM THE RENDERER — a redirect, a block, and an ancestor's guard.
//
// What these cases pin is that the boundary follows the LOCATION and nothing else, and the location
// is what `createExoRouter` commits only after the guards have had their say: a redirect commits the
// redirected URL, a block commits nothing and rolls the address bar back. So a guarded route needs
// NO cooperation from the outlet — the obvious alternative (an outlet watching `match`, or drawing
// optimistically on `navigate`) would flash the guarded page before the guard finished.
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoChildrenPort, TExoMachine, TExoMachineNode, TExoTextPort } from '@exodra/core';
import { describe, expect, it } from 'vitest';

import { createExoMemoryHistory } from '../../history/createExoMemoryHistory';
import { createExoRouter } from '../../setup/createExoRouter';
import { exoOutlet } from '../../components/exoOutlet';
import { provideExoRouter } from '../../setup/provideExoRouter';
import type { TExoRoute, TExoRouteGuard, TExoRouter, TExoRouteMatch } from '../../types';
import { host } from '@exodra/test-utils';
import { ExoDomBackend, withExoCompiler, withExoChildList } from '@exodra/dom';

const EXO_BACKEND = withExoChildList(withExoCompiler(new ExoDomBackend()));

interface TNestingNode extends TExoMachineNode {
    one(port: TExoChildrenPort, machine: TExoMachine<never>): void;
}

/** One shape, one text port — these cases are about WHICH page is standing, not about what it says. */
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
const LOGIN = page('login');
const SECRET = page('secret');
const ADMIN_HOME = page('admin-home');

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

const mount = (routes: readonly TExoRoute[], at: string) => {
    const router = createExoRouter(routes, { history: createExoMemoryHistory(at) });
    const parent = host();
    EXO_BACKEND.render(shellFor(router), parent);
    return { router, parent };
};

/** What is standing in the boundary right now, by the class its page carries. */
const showing = (parent: HTMLElement): string | null => {
    const at = parent.querySelector('main > p');
    return at === null ? null : at.className;
};

describe('a boundary under guards', () => {
    it('shows the REDIRECTED page, and never the guarded one', async () => {
        const { router, parent } = mount(
            [
                { path: '/', component: HOME },
                { path: '/login', component: LOGIN },
                {
                    path: '/secret',
                    component: SECRET,
                    beforeEnter: () => '/login',
                },
            ],
            '/'
        );
        expect(showing(parent)).toBe('home');

        await router.navigate('/secret');

        expect(router.getLocation().pathname).toBe('/login');
        expect(showing(parent)).toBe('login');
        // The guarded page was not drawn on the way through — the boundary follows the
        // COMMITTED location, and `/secret` was never committed.
        expect(parent.querySelector('.secret')).toBe(null);
    });

    it('leaves the page where it was when a guard BLOCKS', async () => {
        const { router, parent } = mount(
            [
                { path: '/', component: HOME },
                { path: '/secret', component: SECRET, beforeEnter: () => false },
            ],
            '/'
        );
        const before = parent.querySelector('p.home');

        await router.navigate('/secret');

        expect(router.getLocation().pathname).toBe('/');
        expect(showing(parent)).toBe('home');
        // Not even rebuilt: a blocked navigation commits no location, so the boundary is never
        // asked to re-read anything that changed.
        expect(parent.querySelector('p.home')).toBe(before);
    });

    it("honours an ANCESTOR's guard even when the leaf declares none", async () => {
        // The branch's guards run root → leaf, so a `requireAuth` on a layout covers everything
        // under it. What is being pinned here is that the boundary shows the redirect's page and
        // not a half-entered branch.
        let signedIn = false;
        const requireSignIn: TExoRouteGuard = () => (signedIn ? true : '/login');

        const { router, parent } = mount(
            [
                { path: '/', component: HOME },
                { path: '/login', component: LOGIN },
                {
                    path: '/admin',
                    component: ADMIN_HOME,
                    beforeEnter: requireSignIn,
                    children: [{ path: 'secret', component: SECRET }],
                },
            ],
            '/'
        );

        await router.navigate('/admin/secret');
        expect(router.getLocation().pathname).toBe('/login');
        expect(showing(parent)).toBe('login');

        signedIn = true;
        await router.navigate('/admin/secret');
        expect(router.getLocation().pathname).toBe('/admin/secret');
        // Depth 0 of the branch is the `/admin` layout page, which is what this boundary shows.
        // The leaf would need a boundary INSIDE that page, which `@exodra/dom` cannot do: `build`
        // hands a page a `null` context chain, so a nested outlet finds no router.
        expect(showing(parent)).toBe('admin-home');
    });

    it('runs an ASYNC guard and only then draws the page', async () => {
        const { router, parent } = mount(
            [
                { path: '/', component: HOME },
                {
                    path: '/slow',
                    component: SECRET,
                    beforeEnter: () =>
                        new Promise<boolean>((resolve) => {
                            setTimeout(() => resolve(true), 0);
                        }),
                },
            ],
            '/'
        );

        const navigation = router.navigate('/slow');
        // The guard has not answered yet, so the boundary is still showing what it was.
        expect(showing(parent)).toBe('home');

        await navigation;
        expect(showing(parent)).toBe('secret');
    });
});
