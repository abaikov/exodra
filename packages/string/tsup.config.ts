import { defineConfig } from 'tsup';

export default defineConfig({
    // ONE ENTRY, NOT A GLOB OVER THE SOURCE TREE — see `packages/dom/tsup.config.ts` for the
    // measurement. With `splitting: false` every entry becomes a SELF-CONTAINED bundle, so a glob
    // emitted one copy of the whole import graph per source file, none of which any `exports`
    // subpath could reach. `dist/index.js` is byte-identical either way; that was verified by
    // building both and comparing, not assumed.
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    outDir: 'dist',
    splitting: false,
    treeshake: false,
    // No minification here, so function names survive anyway — `keepNames` only
    // added `__name(...)` wrappers that showed up as ~7% of SSR render CPU.
    keepNames: false,
    tsconfig: 'tsconfig.tsup.json',
});
