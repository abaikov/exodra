import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    client: 'src/client.ts'
  },
  format: ['esm'],
  dts: true,
  clean: true,
  external: ['vite', '@exodra/core', '@exodra/jsx', '@exodra/dom', '@exodra/router']
});