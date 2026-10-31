import type { Plugin, SourceMapInput } from 'rollup';
import { transformExodraJsx, type ExodraCompileOptions } from 'babel-preset-exodra';

// Not `ExodraBundlerOptions`: that names the field `filter`, after the esbuild and Bun
// host APIs. Rollup's convention for it is `include`.
export interface ExodraRollupOptions extends ExodraCompileOptions {
    include?: RegExp;
}

export function exodra(options: ExodraRollupOptions = {}): Plugin {
    const include = options.include ?? /\.[jt]sx$/;
    return {
        name: 'exodra',
        async transform(code, id) {
            if (!include.test(id)) return null;
            const result = await transformExodraJsx(code, id, {
                schemaSource: options.schemaSource,
            });
            if (!result) return null;
            return {
                code: result.code,
                map: (result.map as SourceMapInput | null) ?? null,
            };
        },
    };
}

export default exodra;
