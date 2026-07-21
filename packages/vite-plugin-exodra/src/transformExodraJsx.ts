import * as babel from '@babel/core';
import type { Rollup } from 'vite';
import exodraJsxPlugin from '@exodra/babel-plugin-jsx';

export interface ExodraTransformResult {
    code: string;
    map: Rollup.SourceMapInput | null;
}

/**
 * Transform Exodra JSX/TSX into `h()` calls using `@exodra/babel-plugin-jsx` —
 * the ONLY correct Exodra JSX transform. (esbuild's classic `jsxFactory: 'h'`
 * mode is wrong for Exodra: it passes children as positional args, but Exodra's
 * `h(type, attrs, cacheKey)` takes a cacheKey third — children must live in the
 * `static`/`bindableLists` buckets — and it ignores `bind:`/`cache:` directives.)
 *
 * `throwIfNamespace: false` keeps namespaced directives (`bind:value`,
 * `cache:key`) parseable so the plugin can lower them.
 *
 * Returns null when there is nothing to emit.
 */
export async function transformExodraJsx(
    code: string,
    id: string
): Promise<ExodraTransformResult | null> {
    const isTsx = id.endsWith('.tsx');

    const presets: babel.PluginItem[] = [];
    if (isTsx) {
        presets.push([
            '@babel/preset-typescript',
            { isTSX: true, allExtensions: true },
        ]);
    }

    const result = await babel.transformAsync(code, {
        filename: id,
        babelrc: false,
        configFile: false,
        sourceMaps: true,
        presets,
        plugins: [
            ['@babel/plugin-syntax-jsx', { throwIfNamespace: false }],
            [
                exodraJsxPlugin,
                { importSource: '@exodra/core', hoistStatic: true },
            ],
        ],
    });

    if (!result || result.code == null) return null;
    // babel types `map` loosely as `object`; it is structurally a raw sourcemap.
    const map = (result.map as unknown as Rollup.SourceMapInput) ?? null;
    return { code: result.code, map };
}
