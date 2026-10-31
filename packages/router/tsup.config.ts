import { defineConfig } from 'tsup';
import { browserGlobal, browserModule } from '../browser-tsup.mjs';

export default defineConfig([
    {
        // ONE ENTRY, NOT A GLOB OVER THE SOURCE TREE — see `packages/dom/tsup.config.ts` for the
        // measurement. With `splitting: false` every entry becomes a SELF-CONTAINED bundle, so a
        // glob emitted one copy of the whole import graph per source file, none of which any
        // `exports` subpath could reach. `dist/index.js` is byte-identical either way; that was
        // verified by building both and comparing, not assumed.
        entry: ['src/index.ts'],
        format: ['esm', 'cjs'],
        dts: true,
        sourcemap: true,
        clean: true,
        outDir: 'dist',
        splitting: false,
        treeshake: false,
        // No minification here, so function names survive anyway — `keepNames` only added
        // esbuild `__name` wrappers as pure overhead in the shipped dist. This package carried
        // the most of them by far: 60 wrappers, 3 178 raw / 583 gzip bytes in `dist/index.js`
        // and 3 178 / 587 in `dist/index.cjs`, measured by stripping the `__defProp`/`__name`
        // preamble and the wrapper calls out of the built artifact and re-gzipping it.
        //
        // The bytes are the smaller half. Each wrapper is emitted as a BARE top-level statement
        // — `__name(injectExoRouter, "injectExoRouter");` — with no `/* @__PURE__ */` on it and
        // a reference to the function inside. Rollup honours this package's `"sideEffects":
        // false` and drops the lot, but a bundler that reads unannotated top-level calls as
        // side effects has 60 reasons to keep every wrapped function alive, which is the whole
        // of the router.
        keepNames: false,
        tsconfig: 'tsconfig.tsup.json',
    },
    // CDN <script> global: window.Exodra.router; core is a shared global (load it first), NOT
    // re-bundled.
    browserGlobal({
        globalName: 'Exodra.router',
        externals: {
            '@exodra/core': 'globalThis.Exodra.core',
        },
    }),
    // CDN <script type="module">: dist/exodra.esm.js. Core stays a BARE SPECIFIER the page's
    // import map resolves — one core on the page.
    browserModule({ externals: ['@exodra/core'] }),
]);
