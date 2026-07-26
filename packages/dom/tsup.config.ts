import { defineConfig } from 'tsup';
import { browserGlobal } from '../browser-tsup.mjs';

export default defineConfig([
    {
        entry: ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/*.spec.ts'],
        format: ['esm', 'cjs'],
        dts: true,
        sourcemap: true,
        clean: true,
        outDir: 'dist',
        splitting: false,
        treeshake: false,
        keepNames: true,
        tsconfig: 'tsconfig.tsup.json',
    },
    // CDN <script> global: window.Exodra.dom; core is referenced as a global
    // (shared runtime), NOT re-bundled — load @exodra/core's global first.
    browserGlobal({
        globalName: 'Exodra.dom',
        externals: { '@exodra/core': 'globalThis.Exodra.core' },
    }),
]);
