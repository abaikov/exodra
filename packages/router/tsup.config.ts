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
    // CDN <script> global: window.Exodra.router; core + reactivity are shared
    // globals (load their globals first), NOT re-bundled.
    browserGlobal({
        globalName: 'Exodra.router',
        externals: {
            '@exodra/core': 'globalThis.Exodra.core',
            '@exodra/reactivity': 'globalThis.Exodra.reactivity',
        },
    }),
]);
