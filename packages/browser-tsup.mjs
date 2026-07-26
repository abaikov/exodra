// Shared "browser global" build for CDN <script> usage, appended to each
// @exodra package's tsup config. Each package emits a self-contained, minified
// `dist/exodra.global.js` (IIFE) that assigns to `window.Exodra.<ns>`. Shared
// runtime deps (core / reactivity) are NOT re-bundled — they are referenced as
// `globalThis.Exodra.*`, so loading several packages on a page keeps ONE runtime
// instance (like Preact/React UMD globals). Load order follows the dep graph:
// core + reactivity before dom/router/forms.

// A tiny esbuild plugin that rewrites a bare import (e.g. `@exodra/core`) to a
// global expression instead of bundling it — esbuild has no built-in
// external→global mapping for the IIFE format, so we resolve the module to a
// virtual CJS shim that re-exports the global.
function externalGlobal(map) {
    const keys = Object.keys(map);
    const filter = new RegExp(
        '^(' + keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')$'
    );
    return {
        name: 'exodra-external-global',
        setup(build) {
            build.onResolve({ filter }, args => ({
                path: args.path,
                namespace: 'exodra-external-global',
            }));
            build.onLoad({ filter: /.*/, namespace: 'exodra-external-global' }, args => ({
                contents: `module.exports = ${map[args.path]};`,
                loader: 'js',
            }));
        },
    };
}

// Build the extra tsup config entry for a package's browser global.
//   globalName: e.g. 'Exodra.dom' -> window.Exodra.dom
//   externals:  { '@exodra/core': 'globalThis.Exodra.core', ... }
export function browserGlobal({ globalName, externals = {} }) {
    return {
        entry: { 'exodra.global': 'src/index.ts' },
        format: ['iife'],
        globalName,
        minify: true,
        dts: false,
        sourcemap: false,
        clean: false, // never wipe the sibling esm/cjs build
        treeshake: true,
        outExtension: () => ({ js: '.js' }),
        tsconfig: 'tsconfig.tsup.json',
        esbuildPlugins:
            Object.keys(externals).length > 0 ? [externalGlobal(externals)] : [],
    };
}
