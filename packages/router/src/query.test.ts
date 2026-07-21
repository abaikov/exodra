import { describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from './index';
import {
    ExoQueryValidationError,
    createSearch,
    parseSearch,
    query,
    readSearch,
    stringifySearch,
} from './query';

describe('router query utilities', () => {
    it('reads repeated query params as arrays', () => {
        expect(readSearch('?tag=core&tag=router&page=2&debug=false')).toEqual({
            tag: ['core', 'router'],
            page: '2',
            debug: 'false',
        });
    });

    it('can coerce values with parse options', () => {
        expect(
            readSearch('?page=2&tag=core&tag=router&enabled=true', {
                parseNumbers: true,
                parseBooleans: true,
            })
        ).toEqual({
            page: 2,
            tag: ['core', 'router'],
            enabled: true,
        });
        expect(
            readSearch('?page=2', {
                parseValue: value => `value:${value}`,
            })
        ).toEqual({ page: 'value:2' });
    });

    it('parses and validates query values through a schema', () => {
        const schema = {
            page: query.number({
                default: 1,
                validate: value => value > 0 || 'must be positive',
            }),
            tags: query.array(query.string()),
            debug: query.optional(query.boolean()),
        };

        expect(
            parseSearch('?page=2&tags=core&tags=router&debug=true&ignored=yes', {
                schema,
            })
        ).toEqual({
            page: 2,
            tags: ['core', 'router'],
            debug: true,
        });
        expect(parseSearch('?tags=core', { schema })).toEqual({
            page: 1,
            tags: ['core'],
            debug: undefined,
        });
    });

    it('throws validation errors for invalid schema values', () => {
        const schema = {
            page: query.number({
                validate: value => value > 0 || 'must be positive',
            }),
            debug: query.boolean(),
        };

        expect(() => parseSearch('?page=0&debug=maybe', { schema })).toThrow(
            ExoQueryValidationError
        );

        try {
            parseSearch('?page=0&debug=maybe', { schema });
        } catch (error) {
            expect(error).toBeInstanceOf(ExoQueryValidationError);
            expect((error as ExoQueryValidationError).issues).toEqual([
                { key: 'page', value: 0, message: 'must be positive' },
                { key: 'debug', value: 'maybe', message: 'expected a boolean' },
            ]);
        }
    });

    it('serializes objects with scalar values and arrays', () => {
        expect(
            stringifySearch({
                tag: ['core', 'router'],
                page: 2,
                debug: false,
                empty: null,
                missing: undefined,
            })
        ).toBe('?tag=core&tag=router&page=2&debug=false');
        expect(createSearch({ ok: true })).toBe('?ok=true');
        expect(parseSearch('')).toEqual({});
    });

    it('sets search from objects and strings and resolves after location update', async () => {
        const router = createRouter([], {
            history: createMemoryHistory('/projects?tag=old#top'),
        });
        const updates: string[] = [];
        router.location.subscribe(location => updates.push(location.href));

        const queryLocation = await router.setQuery({
            tag: ['core', 'router'],
            page: 1,
        });
        const searchLocation = await router.setSearch('mode=compact', {
            replace: true,
        });

        expect(queryLocation.href).toBe('/projects?tag=core&tag=router&page=1#top');
        expect(searchLocation.href).toBe('/projects?mode=compact#top');
        expect(router.getQuery()).toEqual({ mode: 'compact' });
        expect(updates).toEqual([
            '/projects?tag=core&tag=router&page=1#top',
            '/projects?mode=compact#top',
        ]);

        router.dispose();
    });

    it('patches query values and updates pathname asynchronously', async () => {
        const router = createRouter([], {
            history: createMemoryHistory('/projects?tag=core&tag=router&page=1'),
        });
        const { patchQuery, setPathname } = router;

        await patchQuery({
            tag: ['dom'],
            page: null,
            q: 'search',
        });
        const pathnameLocation = await setPathname('/tasks');

        expect(router.getLocation().href).toBe('/tasks?tag=dom&q=search');
        expect(pathnameLocation.href).toBe('/tasks?tag=dom&q=search');

        router.dispose();
    });

    it('reads typed query values from router.getQuery options', () => {
        const router = createRouter([], {
            history: createMemoryHistory('/projects?page=2&tag=core&tag=router'),
        });

        expect(router.getQuery({ parseNumbers: true })).toEqual({
            page: 2,
            tag: ['core', 'router'],
        });
        expect(
            router.getQuery({
                schema: {
                    page: query.number(),
                    tag: query.array(query.string()),
                },
            })
        ).toEqual({
            page: 2,
            tag: ['core', 'router'],
        });

        router.dispose();
    });
});
