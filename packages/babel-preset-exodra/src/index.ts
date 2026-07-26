// The canonical Exodra Babel integration, in one place.
//
//  - `default` export: a Babel PRESET that bundles the full pipeline (JSX syntax
//    with `throwIfNamespace: false` so `bind:`/`cache:` survive, the
//    `@exodra/babel-plugin-jsx` transform, and preset-typescript). This is the
//    Jest / babel.config.js entry point:
//
//      // babel.config.js
//      module.exports = { presets: ['exodra'] };
//
//  - `transformExodraJsx(code, filename)`: a small imperative RUNNER that applies
//    that preset via `@babel/core`. It is the single source of truth every
//    bundler plugin (Vite / esbuild / Rollup / Bun) calls, so there is exactly
//    ONE copy of the pipeline AND its invocation — no drift between how tools
//    compile Exodra JSX.
//
// ts-jest / @swc/jest do NOT run Babel plugins and so cannot compile Exodra JSX —
// use `babel-jest` with the preset.

import * as babel from '@babel/core';
import type { ConfigAPI, PluginItem } from '@babel/core';

// @babel/plugin-syntax-jsx and @babel/preset-typescript ship no type
// declarations, and @exodra/babel-plugin-jsx ships as CommonJS with an empty
// `export {}` .d.ts — so pull all three runtime values via require.
/* eslint-disable @typescript-eslint/no-var-requires */
const syntaxJsx = require('@babel/plugin-syntax-jsx') as PluginItem;
const presetTypescript = require('@babel/preset-typescript') as PluginItem;
const exodraJsxPlugin = require('@exodra/babel-plugin-jsx') as PluginItem;
/* eslint-enable @typescript-eslint/no-var-requires */

export interface ExodraPresetOptions {
    /** Module the auto-imported `h`/`text` come from. Default `@exodra/core`. */
    importSource?: string;
    /** Compile-time clone-cache for static subtrees. Default `true`. */
    hoistStatic?: boolean;
    /**
     * Include `@babel/preset-typescript` so `.ts`/`.tsx` sources are stripped of
     * types. Default `true` — turn off if your pipeline already handles TS.
     */
    typescript?: boolean;
    /**
     * 'dom' (default) compiles JSX to h() schemas for the client renderer; 'ssr'
     * compiles to HTML-string functions for the server (see @exodra/babel-plugin-jsx).
     */
    mode?: 'dom' | 'ssr';
}

function babelPresetExodra(
    api: ConfigAPI,
    options: ExodraPresetOptions = {}
): { presets: PluginItem[]; plugins: PluginItem[] } {
    api.assertVersion(7);

    const {
        importSource = '@exodra/core',
        hoistStatic = true,
        typescript = true,
        mode = 'dom',
    } = options;

    const presets: PluginItem[] = [];
    if (typescript) {
        presets.push([
            presetTypescript,
            { isTSX: true, allExtensions: true },
        ]);
    }

    return {
        presets,
        plugins: [
            // Parse JSX; keep namespaced directives (`bind:value`, `cache:key`)
            // instead of throwing, so the Exodra plugin can lower them.
            [syntaxJsx, { throwIfNamespace: false }],
            [exodraJsxPlugin, { importSource, hoistStatic, mode }],
        ],
    };
}

export default babelPresetExodra;

/** Result of {@link transformExodraJsx}: emitted code plus a raw source map. */
export interface ExodraTransformResult {
    code: string;
    /** Babel's raw source map object; cast to your bundler's map input type. */
    map: object | null;
}

/** Options for {@link transformExodraJsx}, forwarded to the preset. */
export interface ExodraTransformOptions {
    importSource?: string;
    hoistStatic?: boolean;
    /**
     * Run preset-typescript. Defaults to `true` for `.tsx` files and `false`
     * otherwise (a `.jsx` file has no types and must not be parsed as TSX).
     */
    typescript?: boolean;
    /** 'dom' (default) or 'ssr' — see ExodraPresetOptions.mode. */
    mode?: 'dom' | 'ssr';
}

/**
 * Compile one Exodra JSX/TSX source through the preset. The single invocation
 * every bundler plugin shares. Returns `null` when Babel emits nothing.
 */
export async function transformExodraJsx(
    code: string,
    filename: string,
    options: ExodraTransformOptions = {}
): Promise<ExodraTransformResult | null> {
    const typescript = options.typescript ?? filename.endsWith('.tsx');

    const result = await babel.transformAsync(code, {
        filename,
        babelrc: false,
        configFile: false,
        sourceMaps: true,
        presets: [
            [
                babelPresetExodra as PluginItem,
                {
                    typescript,
                    importSource: options.importSource,
                    hoistStatic: options.hoistStatic,
                    mode: options.mode,
                },
            ],
        ],
    });

    if (!result || result.code == null) return null;
    return { code: result.code, map: (result.map as object | null) ?? null };
}
