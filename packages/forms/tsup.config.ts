import { defineConfig } from 'tsup';
import { browserGlobal } from '../browser-tsup.mjs';

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
        keepNames: true,
        tsconfig: 'tsconfig.tsup.json',
    },
    // CDN <script> global: window.Exodra.forms (self-contained, no runtime deps)
    browserGlobal({ globalName: 'Exodra.forms' }),
]);
