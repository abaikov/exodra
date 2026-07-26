// Bun plugin that compiles Exodra JSX/TSX via `babel-preset-exodra`'s shared
// runner — the same pipeline Vite/esbuild/Rollup/Jest use. Works with `Bun.build`
// and `bun --preload` (loader plugins).
//
// Bun's own JSX handling is wrong for Exodra (positional children, ignores
// `bind:`/`cache:` directives), so we intercept .jsx/.tsx and hand them to Babel.
//
// Minimal local types for the slice of Bun's plugin API we use, so this package
// needs no `bun-types` dependency.

import { readFile } from 'node:fs/promises';
import { transformExodraJsx } from 'babel-preset-exodra';

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
        callback: (
            args: BunOnLoadArgs
        ) => Promise<BunOnLoadResult | undefined>
    ): void;
}
export interface BunPlugin {
    name: string;
    setup(build: BunPluginBuilder): void | Promise<void>;
}

export interface ExodraBunOptions {
    /** Which files to compile. Default: `.jsx` and `.tsx`. */
    filter?: RegExp;
    /** Module the auto-imported `h`/`text` come from. Default `@exodra/core`. */
    importSource?: string;
}

export function exodra(options: ExodraBunOptions = {}): BunPlugin {
    const filter = options.filter ?? /\.[jt]sx$/;
    return {
        name: 'exodra',
        setup(build) {
            build.onLoad({ filter }, async args => {
                const source = await readFile(args.path, 'utf8');
                const result = await transformExodraJsx(source, args.path, {
                    importSource: options.importSource,
                });
                if (!result) return undefined;
                return { contents: result.code, loader: 'js' };
            });
        },
    };
}

export default exodra;
