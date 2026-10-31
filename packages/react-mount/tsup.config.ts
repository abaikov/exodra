import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    outDir: 'dist',
    splitting: false,
    treeshake: false,
    // No minification here, so function names survive anyway — `keepNames` only added esbuild
    // `__name` wrappers as pure overhead in the shipped dist: 2 wrappers, 195 raw / 64 gzip
    // bytes off `dist/index.js` and 195 / 30 off `dist/index.cjs`. They are also emitted as
    // bare unannotated top-level calls, which a bundler is entitled to read as a side effect.
    keepNames: false,
    // Peers, never bundled: the host app supplies exactly one copy of each, so an
    // Exodra tree mounted from here is the SAME runtime as everything else it
    // talks to.
    external: ['react', '@exodra/core', '@exodra/dom'],
    tsconfig: 'tsconfig.tsup.json',
});
