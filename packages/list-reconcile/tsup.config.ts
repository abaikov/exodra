import { defineConfig } from 'tsup';
import { browserGlobal, browserModule } from '../browser-tsup.mjs';

export default defineConfig([
  {
    // ONE ENTRY, NOT A GLOB OVER THE SOURCE TREE — the measurement is in
    // `packages/dom/tsup.config.ts`. With `splitting: false` every entry becomes a
    // SELF-CONTAINED bundle, so a glob emits one copy of the whole import graph per source
    // file, none of which any `exports` subpath could reach.
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    outDir: 'dist',
    splitting: false,
    treeshake: false,
    keepNames: false,
    tsconfig: 'tsconfig.tsup.json',
  },
  browserGlobal({ globalName: 'Exodra.listReconcile' }),
  browserModule(),
]);
