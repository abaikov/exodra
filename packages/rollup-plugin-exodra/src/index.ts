// Rollup plugin that compiles Exodra JSX/TSX via `babel-preset-exodra`'s shared
// runner — the same pipeline Vite/esbuild/Jest use, so there is nothing to drift.

import type { Plugin, SourceMapInput } from 'rollup';
import { transformExodraJsx } from 'babel-preset-exodra';

export interface ExodraRollupOptions {
    /** Which files to compile. Default: `.jsx` and `.tsx`. */
    include?: RegExp;
    /** Module the auto-imported `h`/`text` come from. Default `@exodra/core`. */
    importSource?: string;
}

export function exodra(options: ExodraRollupOptions = {}): Plugin {
    const include = options.include ?? /\.[jt]sx$/;
    return {
        name: 'exodra',
        async transform(code, id) {
            if (!include.test(id)) return null;
            const result = await transformExodraJsx(code, id, {
                importSource: options.importSource,
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
