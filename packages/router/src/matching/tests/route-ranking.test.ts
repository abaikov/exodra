import { describe, expect, it } from 'vitest';
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import { matchExoRouteChain, matchExoRoutes } from '../matchExoRoutes';
import type { TExoRoute } from '../../types';

const page = createExoMachineBuilder(
    createExoSchema((b) => {
        b.el('p');
        return {};
    })
).done();

const pathOf = (routes: readonly TExoRoute[], pathname: string) =>
    matchExoRoutes(routes, pathname)?.route.path;

describe('route ranking', () => {
    it('lets a static segment win over a param declared before it', () => {
        const routes: readonly TExoRoute[] = [
            { path: '/users/:id', component: page },
            { path: '/users/new', component: page },
        ];
        expect(pathOf(routes, '/users/new')).toBe('/users/new');
        expect(pathOf(routes, '/users/7')).toBe('/users/:id');
    });

    it('lets a param win over a catch-all, and the catch-all take the rest', () => {
        const routes: readonly TExoRoute[] = [
            { path: '/docs/*', component: page },
            { path: '/docs/:slug', component: page },
        ];
        expect(pathOf(routes, '/docs/intro')).toBe('/docs/:slug');
        expect(pathOf(routes, '/docs/a/b')).toBe('/docs/*');
    });

    it('lets a pattern that ENDED win over an optional catch-all at the same place', () => {
        const routes: readonly TExoRoute[] = [
            { path: '/docs/*', optionalCatchAll: 'slug', component: page },
            { path: '/docs', component: page },
        ];
        expect(pathOf(routes, '/docs')).toBe('/docs');
        expect(matchExoRoutes(routes, '/docs/a/b')?.params).toEqual({ slug: 'a/b' });
    });

    it('decides an earlier segment before a later one', () => {
        const routes: readonly TExoRoute[] = [
            { path: '/:section/settings', component: page },
            { path: '/admin/:tab', component: page },
        ];
        expect(pathOf(routes, '/admin/settings')).toBe('/admin/:tab');
    });

    it('keeps declaration order between two equal patterns', () => {
        const first: TExoRoute = { path: '/a/:x', component: page };
        const second: TExoRoute = { path: '/a/:y', component: page };
        expect(matchExoRoutes([first, second], '/a/1')?.route).toBe(first);
    });

    it('reaches an index child before the layout it shares a path with', () => {
        const index: TExoRoute = { path: '', component: page };
        const routes: readonly TExoRoute[] = [
            { path: '/admin', component: page, children: [index] },
        ];
        const chain = matchExoRouteChain(routes, '/admin');
        expect(chain.map((match) => match.route.path)).toEqual(['/admin', '']);
        expect(chain[1].route).toBe(index);
    });

    it('gives each entry of a branch only the params of its own path', () => {
        const routes: readonly TExoRoute[] = [
            {
                path: '/orgs/:org',
                component: page,
                children: [{ path: 'repos/:repo', component: page }],
            },
        ];
        const chain = matchExoRouteChain(routes, '/orgs/exo/repos/router');
        expect(chain.map((match) => match.params)).toEqual([
            { org: 'exo' },
            { org: 'exo', repo: 'router' },
        ]);
    });
});
