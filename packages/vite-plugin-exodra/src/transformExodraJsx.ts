import type { Rollup } from 'vite';
import { transformExodraJsx as runExodra } from 'babel-preset-exodra';

export interface ExodraTransformResult {
    code: string;
    map: Rollup.SourceMapInput | null;
}

/**
 * Transform Exodra JSX/TSX into `h()` calls via `babel-preset-exodra`'s shared
 * runner — the ONE canonical Exodra Babel pipeline AND its single invocation, so
 * Vite, esbuild, Rollup, Bun and Jest all compile identically with nothing to
 * drift. This wrapper only adapts the result to Rollup's source-map type.
 *
 * (esbuild's classic `jsxFactory: 'h'` mode is wrong for Exodra: it passes
 * children as positional args, but Exodra's `h(type, attrs, cacheKey)` takes a
 * cacheKey third — children live in the `static`/`bindableLists` buckets — and it
 * ignores `bind:`/`cache:` directives.)
 *
 * Returns null when there is nothing to emit.
 */
export async function transformExodraJsx(
    code: string,
    id: string
): Promise<ExodraTransformResult | null> {
    const result = await runExodra(code, id);
    if (!result) return null;
    return {
        code: result.code,
        map: (result.map as unknown as Rollup.SourceMapInput) ?? null,
    };
}
