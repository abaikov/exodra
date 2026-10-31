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
  // A CDN PAIR, because this package is composed BY THE PAGE —
  // `withExoComputedMachine(createExoMachineBuilder(SCHEMA))` is application code, so a no-build
  // page with `m.field` / `m.derive` needs a browser artifact to load.
  //
  // CORE IS EXTERNAL IN BOTH, for the reason `packages/browser-tsup.mjs` gives: a second core on a
  // page is a second runtime. The IIFE resolves it to the global core has already assigned; the
  // ESM leaves the bare specifier for the page's import map.
  browserGlobal({
    globalName: 'Exodra.computed',
    externals: { '@exodra/core': 'globalThis.Exodra.core' },
  }),
  browserModule({ externals: ['@exodra/core'] }),
]);
