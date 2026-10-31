import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts', 'src/jsx-runtime.ts', 'src/client.ts', 'src/names.ts', 'src/server.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    outDir: 'dist',
    splitting: true,
    treeshake: false,
    keepNames: false,
    external: ['@exodra/context', '@exodra/core', '@exodra/dom', '@exodra/list-reconcile'],
    tsconfig: 'tsconfig.tsup.json',
});
