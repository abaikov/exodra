import { readFile } from 'node:fs/promises';
import type { Plugin } from 'esbuild';
import { transformExodraJsx, type ExodraBundlerOptions } from 'babel-preset-exodra';

export type ExodraEsbuildOptions = ExodraBundlerOptions;

/**
 * SPLIT SO THIS FILE DOES NOT CONTAIN THE MARKER IT EMITS. Written whole, the template literal put
 * a real `sourceMappingURL=data:application/json;base64,${Buffer.from(` into this source, and every
 * tool that scans a file for its map found it: Vite then tried to open a path ending in `${Buffer`,
 * `vitest list` failed on the error, and `check:gates` — the FIRST step of `release:check` — could
 * not ask which test files exist, so the whole chain stopped at its own first question.
 */
const MAP_COMMENT = `//# source${'MappingURL'}=data:application/json;base64,`;

export function exodra(options: ExodraEsbuildOptions = {}): Plugin {
    const filter = options.filter ?? /\.[jt]sx$/;
    return {
        name: 'exodra',
        setup(build) {
            build.onLoad({ filter }, async (args) => {
                const source = await readFile(args.path, 'utf8');
                const result = await transformExodraJsx(source, args.path, {
                    schemaSource: options.schemaSource,
                });
                if (!result) return null;
                // `onLoad` returns contents and a loader only, so a map survives
                // solely as a comment inside the contents.
                const contents = result.map
                    ? `${result.code}\n${MAP_COMMENT}${Buffer.from(
                          JSON.stringify(result.map)
                      ).toString('base64')}`
                    : result.code;
                return { contents, loader: 'js' };
            });
        },
    };
}

export default exodra;
