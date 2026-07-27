import { qwikVite } from '@builder.io/qwik/optimizer';
export default { build: { ssr: true, outDir: 'ssr/dist/qwik-heavy/server', minify: false, rollupOptions: { input: 'ssr/apps/qwik/entry.ssr-heavy.jsx' } },
  plugins: [qwikVite({ srcDir: 'ssr/apps/qwik', ssr: { input: 'ssr/apps/qwik/entry.ssr-heavy.jsx' } })] };
