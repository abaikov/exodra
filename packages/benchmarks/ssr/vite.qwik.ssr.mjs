import { qwikVite } from '@builder.io/qwik/optimizer';
export default {
  build: { ssr: true, outDir: 'ssr/dist/qwik/server', minify: false,
    rollupOptions: { input: 'ssr/apps/qwik/entry.ssr.jsx' } },
  plugins: [qwikVite({ srcDir: 'ssr/apps/qwik', ssr: { input: 'ssr/apps/qwik/entry.ssr.jsx' } })],
};
