import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [
    svelte(),
    solid({
      // Only transform files that import from solid-js
      include: ['**/*.tsx', '**/*.ts'],
      exclude: ['node_modules/**', '**/*.svelte'],
    }),
  ],
  server: {
    port: 3001,
    open: false, // Don't open browser automatically
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
  optimizeDeps: {
    exclude: [
      '@exodra/core',
      '@exodra/dom',
      '@exodra/reactivity',
    ],
  },
});

