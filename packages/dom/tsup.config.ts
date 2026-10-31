import { defineConfig } from 'tsup';
import { browserGlobal, browserModule } from '../browser-tsup.mjs';

export default defineConfig([
    {
        // ONE ENTRY, NOT A GLOB OVER THE SOURCE TREE.
        //
        // This used to be `['src/**/*.ts', '!src/**/*.test.ts', '!src/**/*.spec.ts']`. With
        // `splitting: false`, esbuild emits every entry as a SELF-CONTAINED bundle, so each of the
        // 276 source files became its own copy of its whole import graph:
        // `dist/hydrate/adopt-one.js` alone was 169 657 bytes. Measured on 2026-08-19:
        //
        //   dist/                          36 MB on disk, 828 files
        //   duplicate JS                   5 141 748 B beyond dist/index.js
        //   sourcemaps                     28 437 513 B
        //   npm pack --dry-run             35.4 MB unpacked, 831 files
        //
        // NOTHING COULD REACH ANY OF IT. `exports` declares exactly `.` and `./browser`, with no
        // wildcard subpath, so Node and every exports-aware bundler refuse a deep import — and a
        // grep across this whole repository finds no importer of one either. It was 35 MB shipped
        // to every `npm install` for a 17.7 kB runtime.
        //
        // `dist/index.js` is UNCHANGED by this: with splitting off it was already self-contained,
        // and `outbase` still resolves it to the same path. Verified by diffing the artifact
        // before and after — if that diff is ever non-empty, this comment is wrong and the change
        // is not the free one it claims to be.
        entry: ['src/index.ts'],
        format: ['esm', 'cjs'],
        dts: true,
        sourcemap: true,
        clean: true,
        outDir: 'dist',
        splitting: false,
        treeshake: false,
        // No minification here, so function names survive anyway — `keepNames` only
        // added esbuild `__name` wrappers as pure overhead in the shipped dist.
        keepNames: false,
        tsconfig: 'tsconfig.tsup.json',
    },
    // CDN <script> global: window.Exodra.dom; core is referenced as a global
    // (shared runtime), NOT re-bundled — load @exodra/core's global first.
    browserGlobal({
        globalName: 'Exodra.dom',
        externals: { '@exodra/core': 'globalThis.Exodra.core' },
    }),
    // CDN <script type="module">: dist/exodra.esm.js. Core stays a BARE SPECIFIER
    // the page's import map resolves — one core on the page, not two.
    browserModule({ externals: ['@exodra/core'] }),
]);
