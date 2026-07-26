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
  // CDN <script> global: window.Exodra.core (self-contained, no deps)
  browserGlobal({ globalName: 'Exodra.core' }),
]);

