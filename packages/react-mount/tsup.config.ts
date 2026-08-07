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
    keepNames: true,
    // Peers, never bundled: the host app supplies exactly one copy of each, so an
    // Exodra tree mounted from here is the SAME runtime as everything else it
    // talks to.
    external: ['react', '@exodra/core', '@exodra/dom'],
    tsconfig: 'tsconfig.tsup.json',
});
