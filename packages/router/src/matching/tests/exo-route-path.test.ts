// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { createExoMachine, createExoSchema } from '@exodra/core';
import { matchExoRoutes } from '../matchExoRoutes';
import { parseExoPath } from '../../path/parseExoPath';
import type { TExoRoute } from '../../types';

// A PAGE THAT IS NEVER RENDERED. Matching reads `path`, `catchAll` and `children` and never
// reads `component` — but a route table is still a route table, so one real page stands in for
// every entry below and says nothing about what any of them draw.
const page = (name: string) =>
    createExoMachine(
        createExoSchema((b) => {
            b.el('p', { class: name });
            return {};
        })
    );

describe('router path matching', () => {
    const routes: readonly TExoRoute[] = [
        { path: '/', component: page('main') },
        {
            path: '/projects/:projectId/tasks/:taskId',
            component: page('article'),
        },
        { path: '/files/*', component: page('section') },
    ];

    it('parses pathname, search, and hash', () => {
        expect(parseExoPath('/projects?tab=open#top')).toEqual({
            pathname: '/projects',
            search: '?tab=open',
            hash: '#top',
            href: '/projects?tab=open#top',
        });
    });

    it('matches static, param, and wildcard routes', () => {
        expect(matchExoRoutes(routes, '/')?.params).toEqual({});
        expect(matchExoRoutes(routes, '/projects/core/tasks/task%201')?.params).toEqual({
            projectId: 'core',
            taskId: 'task 1',
        });
        expect(matchExoRoutes(routes, '/files/docs/readme.md')?.params).toEqual({
            '*': 'docs/readme.md',
        });
    });

    it('returns undefined when no route matches', () => {
        expect(matchExoRoutes(routes, '/missing')).toBeUndefined();
    });

    describe('named catch-all: required vs optional', () => {
        const requiredRoutes: readonly TExoRoute[] = [
            { path: '/files/*', catchAll: 'slug', component: page('section') },
        ];
        const optionalRoutes: readonly TExoRoute[] = [
            {
                path: '/docs/*',
                optionalCatchAll: 'slug',
                component: page('section'),
            },
        ];

        it('required catch-all matches one or more segments', () => {
            expect(matchExoRoutes(requiredRoutes, '/files/a')?.params).toEqual({
                slug: 'a',
            });
            expect(matchExoRoutes(requiredRoutes, '/files/a/b')?.params).toEqual({
                slug: 'a/b',
            });
        });

        it('required catch-all does NOT match zero segments', () => {
            expect(matchExoRoutes(requiredRoutes, '/files')).toBeUndefined();
        });

        it('optional catch-all matches zero segments (empty param)', () => {
            expect(matchExoRoutes(optionalRoutes, '/docs')?.params).toEqual({
                slug: '',
            });
            expect(matchExoRoutes(optionalRoutes, '/docs/a')?.params).toEqual({
                slug: 'a',
            });
        });
    });
});
