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
    // added `__name(...)` wrappers that showed up as ~7% of SSR render CPU.
    keepNames: false,
    tsconfig: 'tsconfig.tsup.json',
});
