import type { Rollup } from 'vite';
import { transformExodraJsx as runExodra, type ExodraCompileOptions } from 'babel-preset-exodra';

export interface TExoTransformResult {
    code: string;
    map: Rollup.SourceMapInput | null;
}

export type TExoTransformSettings = ExodraCompileOptions;

// Runs `babel-preset-exodra`'s shared runner; this wrapper only adapts the result to
// Rollup's source-map type.
export async function transformExodraJsx(
    code: string,
    id: string,
    settings: TExoTransformSettings = {}
): Promise<TExoTransformResult | null> {
    const result = await runExodra(code, id, {
        schemaSource: settings.schemaSource,
    });
    if (!result) return null;
    return {
        code: result.code,
        map: (result.map as unknown as Rollup.SourceMapInput) ?? null,
    };
}
