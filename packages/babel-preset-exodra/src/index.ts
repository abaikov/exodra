import * as babel from '@babel/core';
import type { ConfigAPI, PluginItem } from '@babel/core';

// All three ship as CommonJS without usable type declarations, so the runtime
// values come in via require.
/* eslint-disable @typescript-eslint/no-require-imports */
const syntaxJsx = require('@babel/plugin-syntax-jsx') as PluginItem;
const presetTypescript = require('@babel/preset-typescript') as PluginItem;
const schemaPlugin = require('@exodra/babel-plugin-schema') as PluginItem;
/* eslint-enable @typescript-eslint/no-require-imports */

// The slice a bundler plugin forwards, never the whole preset: a plugin whose options accept a
// field it does not forward takes it with no error and no effect. `TExoSchemaPluginOptions`
// declares `schemaSource` too and is not reused — that package is upstream of this one.
export interface ExodraCompileOptions {
    schemaSource?: string;
}

// For hosts that call the file filter `filter` — esbuild's word and Bun's. Rollup's plugin
// spells the same field `include` after its own convention and so does not use this.
export interface ExodraBundlerOptions extends ExodraCompileOptions {
    filter?: RegExp;
}

export interface ExodraPresetOptions extends ExodraCompileOptions {
    typescript?: boolean;
    schemaImport?: string;
    markerName?: string;
}

function babelPresetExodra(
    api: ConfigAPI,
    options: ExodraPresetOptions = {}
): { presets: PluginItem[]; plugins: PluginItem[] } {
    api.assertVersion(7);

    const { typescript = true, schemaSource, schemaImport, markerName } = options;

    const presets: PluginItem[] = [];
    if (typescript) {
        presets.push([presetTypescript, { isTSX: true, allExtensions: true }]);
    }

    return {
        presets,
        plugins: [
            // Babel's parser throws on namespaced JSX names by default, and on: is one.
            [syntaxJsx, { throwIfNamespace: false }],
            [schemaPlugin, { schemaSource, schemaImport, markerName }],
        ],
    };
}

export default babelPresetExodra;

export interface ExodraTransformResult {
    code: string;
    map: object | null;
}

export type ExodraTransformOptions = ExodraPresetOptions;

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
                // `typescript` last: here it defaults off the file extension, not to the
                // preset's `true` — a `.jsx` file has no types and must not be parsed as TSX.
                { ...options, typescript },
            ],
        ],
    });

    if (!result || result.code == null) return null;
    return { code: result.code, map: (result.map as object | null) ?? null };
}
