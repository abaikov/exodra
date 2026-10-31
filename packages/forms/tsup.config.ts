import { defineConfig } from 'tsup';
import { browserGlobal, browserModule } from '../browser-tsup.mjs';

export default defineConfig([
    {
        entry: ['src/index.ts'],
        format: ['esm', 'cjs'],
        dts: true,
        sourcemap: true,
        clean: true,
        outDir: 'dist',
        splitting: false,
        treeshake: false,
        // No minification here, so function names survive anyway — `keepNames` only adds esbuild
        // `__name` wrappers, emitted as bare unannotated top-level calls that a bundler is
        // entitled to read as a side effect and keep alive against tree-shaking.
        keepNames: false,
        tsconfig: 'tsconfig.tsup.json',
    },
    // CDN <script> global: window.Exodra.forms. Nothing here imports anything at runtime, so both
    // browser builds are self-contained.
    browserGlobal({ globalName: 'Exodra.forms' }),
    browserModule(),
]);
