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
    external: ['react', 'react-dom', 'react-dom/client', '@exodra/core'],
    tsconfig: 'tsconfig.tsup.json',
});
