import { describe, expect, it } from 'vitest';
import { h } from '@exodra/core';
import { matchRoutes, parsePath } from './path';
import type { TExoRoute } from './types';

describe('router path matching', () => {
    const routes: readonly TExoRoute[] = [
        { path: '/', component: h('main') },
        { path: '/projects/:projectId/tasks/:taskId', component: h('article') },
        { path: '/files/*', component: h('section') },
    ];

    it('parses pathname, search, and hash', () => {
        expect(parsePath('/projects?tab=open#top')).toEqual({
            pathname: '/projects',
            search: '?tab=open',
            hash: '#top',
            href: '/projects?tab=open#top',
        });
    });

    it('matches static, param, and wildcard routes', () => {
        expect(matchRoutes(routes, '/')?.params).toEqual({});
        expect(
            matchRoutes(routes, '/projects/core/tasks/task%201')?.params
        ).toEqual({
            projectId: 'core',
            taskId: 'task 1',
        });
        expect(matchRoutes(routes, '/files/docs/readme.md')?.params).toEqual({
            '*': 'docs/readme.md',
        });
    });

    it('returns undefined when no route matches', () => {
        expect(matchRoutes(routes, '/missing')).toBeUndefined();
    });

    describe('named catch-all: required vs optional', () => {
        const requiredRoutes: readonly TExoRoute[] = [
            { path: '/files/*', catchAll: 'slug', component: h('section') },
        ];
        const optionalRoutes: readonly TExoRoute[] = [
            { path: '/docs/*', optionalCatchAll: 'slug', component: h('section') },
        ];

        it('required catch-all matches one or more segments', () => {
            expect(matchRoutes(requiredRoutes, '/files/a')?.params).toEqual({
                slug: 'a',
            });
            expect(matchRoutes(requiredRoutes, '/files/a/b')?.params).toEqual({
                slug: 'a/b',
            });
        });

        it('required catch-all does NOT match zero segments', () => {
            expect(matchRoutes(requiredRoutes, '/files')).toBeUndefined();
        });

        it('optional catch-all matches zero segments (empty param)', () => {
            expect(matchRoutes(optionalRoutes, '/docs')?.params).toEqual({
                slug: '',
            });
            expect(matchRoutes(optionalRoutes, '/docs/a')?.params).toEqual({
                slug: 'a',
            });
        });
    });
});
