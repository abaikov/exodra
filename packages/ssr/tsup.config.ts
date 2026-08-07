import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/*.spec.ts'],
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
});
