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
    // `__name` wrappers as pure overhead in the shipped dist: 3 wrappers, 275 raw / 101 gzip
    // bytes off `dist/index.js` and 275 / 66 off `dist/index.cjs`. They are also emitted as
    // bare unannotated top-level calls, which a bundler is entitled to read as a side effect.
    keepNames: false,
    // `@exodra/dom` joins the list because the island now registers its teardown through that
    // package's `own` — a peer, like React itself, never bundled into this one.
    external: [
        'react',
        'react-dom',
        'react-dom/client',
        'react-dom/server',
        '@exodra/core',
        '@exodra/dom',
    ],
    tsconfig: 'tsconfig.tsup.json',
});
