// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { createExoMemoryHistory, createExoRouter } from '../../index';
import {
    ExoQueryValidationError,
    exoQuery,
    mergeExoQuery,
    parseExoQuery,
    stringifyExoQuery,
} from '../exoQuery';

describe('router query utilities', () => {
    it('reads repeated query params as arrays', () => {
        expect(parseExoQuery('?tag=core&tag=router&page=2&debug=false')).toEqual({
            tag: ['core', 'router'],
            page: '2',
            debug: 'false',
        });
    });

    it('can coerce values with parse options', () => {
        expect(
            parseExoQuery('?page=2&tag=core&tag=router&enabled=true', {
                parseNumbers: true,
                parseBooleans: true,
            })
        ).toEqual({
            page: 2,
            tag: ['core', 'router'],
            enabled: true,
        });
        expect(
            parseExoQuery('?page=2', {
                parseValue: (value) => `value:${value}`,
            })
        ).toEqual({ page: 'value:2' });
    });

    it('parses and validates query values through a schema', () => {
        const schema = {
            page: exoQuery.number({
                default: 1,
                validate: (value) => value > 0 || 'must be positive',
            }),
            tags: exoQuery.array(exoQuery.string()),
            debug: exoQuery.optional(exoQuery.boolean()),
        };

        expect(
            parseExoQuery('?page=2&tags=core&tags=router&debug=true&ignored=yes', {
                schema,
            })
        ).toEqual({
            page: 2,
            tags: ['core', 'router'],
            debug: true,
        });
        expect(parseExoQuery('?tags=core', { schema })).toEqual({
            page: 1,
            tags: ['core'],
            debug: undefined,
        });
    });

    it('throws validation errors for invalid schema values', () => {
        const schema = {
            page: exoQuery.number({
                validate: (value) => value > 0 || 'must be positive',
            }),
            debug: exoQuery.boolean(),
        };

        expect(() => parseExoQuery('?page=0&debug=maybe', { schema })).toThrow(
            ExoQueryValidationError
        );

        try {
            parseExoQuery('?page=0&debug=maybe', { schema });
        } catch (error) {
            expect(error).toBeInstanceOf(ExoQueryValidationError);
            expect((error as ExoQueryValidationError).issues).toEqual([
                { key: 'page', value: 0, message: 'must be positive' },
                { key: 'debug', value: 'maybe', message: 'expected a boolean' },
            ]);
        }
    });

    it('carries an explicit `name` on the validation error, which is what survives minification', () => {
        // THE CLASS BINDING DOES NOT SURVIVE THE CDN BUILD AND THIS STRING DOES. `dist/index.js` is
        // unminified, so `error.constructor.name` reads `ExoQueryValidationError` there;
        // `dist/exodra.global.js` and `dist/exodra.esm.js` are minified, and in them the class is
        // bound to a single letter while the export map keeps the public spelling — so
        // `constructor.name` is `"I"` on a CDN page while `error.name` is the same everywhere,
        // which is why `query.ts` assigns it by hand.
        //
        // `instanceof` works in all four artifacts because the build target is ES2020, so the class
        // is emitted natively rather than downlevelled to a function (a downlevelled `extends Error`
        // is the classic way for `instanceof` to start answering `false`). Both spellings are
        // asserted so a target change breaks a test rather than a user's `catch`.
        const schema = { page: exoQuery.number() };

        let thrown: unknown = 'nothing was thrown at all';
        try {
            parseExoQuery('?page=nope', { schema });
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toBeInstanceOf(ExoQueryValidationError);
        expect((thrown as Error).name).toBe('ExoQueryValidationError');
        // And the message names the key and the reason, so a log line is readable on its own.
        expect((thrown as Error).message).toBe('Invalid query string: page: expected a number');
    });

    it('mergeExoQuery lays a patch over a parsed query, and `undefined` in the patch clears a key', () => {
        // The pair `router.patchQuery` is built from: parse what is there, merge the patch,
        // stringify the result. Exported on its own because an application assembling a URL it
        // is not navigating to needs the same three steps.
        expect(mergeExoQuery({ page: '1', tag: 'core' }, { sort: 'asc' })).toEqual({
            page: '1',
            tag: 'core',
            sort: 'asc',
        });

        // A patch WINS over the current value — it is the second spread, and that is the whole
        // of the merge rule.
        expect(mergeExoQuery({ page: '1' }, { page: 2 })).toEqual({ page: 2 });

        // `undefined` SURVIVES THE MERGE as a key holding `undefined`, and is dropped by
        // `stringifyExoQuery` rather than here. That two-step is what makes "clear this one
        // parameter" expressible at all: a merge that deleted the key instead would be
        // indistinguishable from a patch that did not mention it.
        const cleared = mergeExoQuery({ page: '1', tag: 'core' }, { tag: undefined });
        expect(Object.keys(cleared).sort()).toEqual(['page', 'tag']);
        expect(stringifyExoQuery(cleared)).toBe('?page=1');
    });

    it('serializes objects with scalar values and arrays', () => {
        expect(
            stringifyExoQuery({
                tag: ['core', 'router'],
                page: 2,
                debug: false,
                empty: null,
                missing: undefined,
            })
        ).toBe('?tag=core&tag=router&page=2&debug=false');
        expect(stringifyExoQuery({ ok: true })).toBe('?ok=true');
        expect(parseExoQuery('')).toEqual({});
    });

    // ═══ THE TWELVE KEYS `{}` ALREADY HAD AN ANSWER FOR ═══
    //
    // With a `{}` accumulator, `query[key]` for a key on `Object.prototype` is not `undefined`, so
    // the "first time I have seen this key" branch never runs for it. Two wrong endings come out of
    // that, both asserted here: `__proto__` goes through the SETTER and the parameter disappears,
    // `constructor` shadows with an array holding the `Object` function itself.
    //
    // NOT PROTOTYPE POLLUTION — the last assertion in the first test says so: nothing is written
    // into `Object.prototype`, so no second object anywhere changes.
    describe('a query key that is also a name on Object.prototype', () => {
        it('keeps `__proto__` as an ordinary parameter instead of dropping it into the prototype', () => {
            const parsed = parseExoQuery('?__proto__=x&page=2');

            // WITHOUT THE FIX this is `['page']`: the assignment `query['__proto__'] = […]` hit
            // the setter, set the record's prototype, and created no own key at all.
            expect(Object.keys(parsed)).toEqual(['__proto__', 'page']);
            expect(parsed['__proto__']).toBe('x');
            expect(parsed.page).toBe('2');

            // AND NOTHING SHARED MOVED — why this is a dropped key and not a pollution hole: the
            // setter runs `[[SetPrototypeOf]]` on the record in hand, so the blast radius is that
            // one object. Had the fresh ARRAY it was handed landed anywhere shared, every `{}` in
            // the process would have grown a `length` and a `1`. This passes before the fix as well
            // as after, which is exactly the claim being made.
            const bystander: Record<string, unknown> = {};
            expect(bystander.length).toBeUndefined();
            expect(bystander[1]).toBeUndefined();
            expect(Object.getPrototypeOf({})).toBe(Object.prototype);
        });

        it('reads a repeated `__proto__` as an array, the way it reads any repeated key', () => {
            const parsed = parseExoQuery('?__proto__=a&__proto__=b');

            // WITHOUT THE FIX the first write set the prototype to `[Object.prototype, 'a']` and
            // the second one READ that array back through the getter and pushed onto it — so the
            // record ended up with a two-element prototype and still no own key.
            expect(Object.keys(parsed)).toEqual(['__proto__']);
            expect(parsed['__proto__']).toEqual(['a', 'b']);
        });

        it('gives back the string for `constructor`, not an array holding the Object function', () => {
            const parsed = parseExoQuery('?constructor=1&toString=2');

            // WITHOUT THE FIX these are `[Object, '1']` and `[Object.prototype.toString, '2']` —
            // own properties, so they survived `Object.entries` and were handed to the caller as
            // query VALUES with a function inside them.
            expect(parsed['constructor']).toBe('1');
            expect(parsed['toString']).toBe('2');
        });

        it('returns a null-prototype record, which is the contract that closes all twelve at once', () => {
            // Stated as a fact about the RETURN because callers have to know it: `Object.hasOwn`
            // and `in` work, `query.hasOwnProperty(…)` does not.
            expect(Object.getPrototypeOf(parseExoQuery('?a=1'))).toBe(null);
            expect(Object.getPrototypeOf(parseExoQuery(''))).toBe(null);
            // The schema path returns the same shape, so the contract is one sentence.
            const typed = parseExoQuery('?page=2', { schema: { page: exoQuery.number() } });
            expect(Object.getPrototypeOf(typed)).toBe(null);
        });

        it('round-trips `__proto__` through patchQuery, which is where a user meets the drop', async () => {
            const router = createExoRouter([], {
                history: createExoMemoryHistory('/search?__proto__=a'),
            });

            await router.patchQuery({ page: '2' });

            // A `__proto__` key that `parseExoQuery` did not see would be one `stringifyExoQuery`
            // never writes back, so patching an unrelated key would silently delete it and leave
            // `/search?page=2`.
            expect(router.getLocation().href).toBe('/search?__proto__=a&page=2');
            expect(router.getQuery()['__proto__']).toBe('a');

            router.dispose();
        });
    });

    it('sets search from objects and strings and resolves after location update', async () => {
        const router = createExoRouter([], {
            history: createExoMemoryHistory('/projects?tag=old#top'),
        });
        const updates: string[] = [];
        router.onChange(() => updates.push(router.getLocation().href));

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
        const router = createExoRouter([], {
            history: createExoMemoryHistory('/projects?tag=core&tag=router&page=1'),
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
        const router = createExoRouter([], {
            history: createExoMemoryHistory('/projects?page=2&tag=core&tag=router'),
        });

        expect(router.getQuery({ parseNumbers: true })).toEqual({
            page: 2,
            tag: ['core', 'router'],
        });
        expect(
            router.getQuery({
                schema: {
                    page: exoQuery.number(),
                    tag: exoQuery.array(exoQuery.string()),
                },
            })
        ).toEqual({
            page: 2,
            tag: ['core', 'router'],
        });

        router.dispose();
    });
});
