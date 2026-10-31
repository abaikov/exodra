import { readFile } from 'node:fs/promises';
import { transformExodraJsx, type ExodraBundlerOptions } from 'babel-preset-exodra';

// Local types for the slice of Bun's plugin API used here: the package must not
// depend on `bun-types`.
interface BunOnLoadArgs {
    path: string;
}
interface BunOnLoadResult {
    contents: string;
    loader: 'js' | 'jsx' | 'ts' | 'tsx';
}
interface BunPluginBuilder {
    onLoad(
        constraints: { filter: RegExp; namespace?: string },
        callback: (args: BunOnLoadArgs) => Promise<BunOnLoadResult | undefined>
    ): void;
}
export interface BunPlugin {
    name: string;
    setup(build: BunPluginBuilder): void | Promise<void>;
}

export type ExodraBunOptions = ExodraBundlerOptions;

/**
 * SPLIT SO THIS FILE DOES NOT CONTAIN THE MARKER IT EMITS — see the twin note in
 * `packages/esbuild-plugin-exodra/src/index.ts`. Written whole, it made Vite try to open a path
 * ending in `${Buffer`, which killed `vitest list` and with it `check:gates`.
 */
const MAP_COMMENT = `//# source${'MappingURL'}=data:application/json;base64,`;

export function exodra(options: ExodraBunOptions = {}): BunPlugin {
    const filter = options.filter ?? /\.[jt]sx$/;
    return {
        name: 'exodra',
        setup(build) {
            build.onLoad({ filter }, async (args) => {
                const source = await readFile(args.path, 'utf8');
                const result = await transformExodraJsx(source, args.path, {
                    schemaSource: options.schemaSource,
                });
                if (!result) return undefined;
                // A loader hook returns contents and a loader name only, so a map
                // survives solely as a comment inside the contents.
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
