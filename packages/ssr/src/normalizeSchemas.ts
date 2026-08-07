import type { TExoSchema } from '@exodra/core';

/**
 * One normalizer for every "a schema or a list of schemas" input in the SSR
 * package: `<Head>` children, the node's `options.head`, and `addHead()`.
 * Nullish → empty, a single value → a one-item array, an array → a copy (so the
 * caller's array is never aliased into SSR state and later mutated).
 *
 * In compile mode the same shapes arrive as already-rendered `SafeHtml` rather
 * than schemas; only the array shape matters here, so those call sites cast.
 */
export function normalizeSchemas(
    schema: TExoSchema | readonly TExoSchema[] | null | undefined
): TExoSchema[] {
    if (schema === null || schema === undefined) {
        return [];
    }

    return Array.isArray(schema)
        ? [...(schema as readonly TExoSchema[])]
        : [schema as TExoSchema];
}
