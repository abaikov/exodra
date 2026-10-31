import { defineConfig } from 'tsup';
import { browserGlobal, browserModule } from '../browser-tsup.mjs';

export default defineConfig([
  {
    // ONE ENTRY, NOT A GLOB OVER THE SOURCE TREE — see `packages/dom/tsup.config.ts` for the
    // measurement. With `splitting: false` every entry becomes a SELF-CONTAINED bundle, so a glob
    // emitted one copy of the whole import graph per source file, none of which any `exports`
    // subpath could reach. `dist/index.js` is byte-identical either way; that was verified by
    // building both and comparing, not assumed.
    entry: { index: 'src/index.ts', 'style/index': 'src/style/index.ts' },
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
  // CDN <script> global: window.Exodra.core (self-contained, no deps)
  browserGlobal({ globalName: 'Exodra.core' }),
  // CDN <script type="module">: dist/exodra.esm.js. Nothing external — this file
  // loads from a bare URL with no import map.
  browserModule(),
]);

