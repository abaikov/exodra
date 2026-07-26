// esbuild plugin that compiles Exodra JSX/TSX. esbuild's own JSX handling is
// wrong for Exodra (positional children, ignores `bind:`/`cache:` directives), so
// this delegates to `babel-preset-exodra`'s shared runner — the same pipeline
// Vite/Rollup/Jest use. Makes Exodra usable with esbuild and tsup.

import { readFile } from 'node:fs/promises';
import type { Plugin } from 'esbuild';
import { transformExodraJsx } from 'babel-preset-exodra';

export interface ExodraEsbuildOptions {
    /** Which files to compile. Default: `.jsx` and `.tsx`. */
    filter?: RegExp;
    /** Module the auto-imported `h`/`text` come from. Default `@exodra/core`. */
    importSource?: string;
}

export function exodra(options: ExodraEsbuildOptions = {}): Plugin {
    const filter = options.filter ?? /\.[jt]sx$/;
    return {
        name: 'exodra',
        setup(build) {
            build.onLoad({ filter }, async args => {
                const source = await readFile(args.path, 'utf8');
                const result = await transformExodraJsx(source, args.path, {
                    importSource: options.importSource,
                });
                if (!result) return null;
                // Inline the source map so esbuild threads it through — onLoad has
                // no separate map field.
                const contents = result.map
                    ? `${result.code}\n//# sourceMappingURL=data:application/json;base64,${Buffer.from(
                          JSON.stringify(result.map)
                      ).toString('base64')}`
                    : result.code;
                return { contents, loader: 'js' };
            });
        },
    };
}

export default exodra;
