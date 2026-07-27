import { qwikVite } from '@builder.io/qwik/optimizer';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
const MANIFEST = resolve(process.cwd(), 'ssr/dist/qwik/manifest.json');
export default {
  build: { minify: true },
  plugins: [qwikVite({
    srcDir: 'ssr/apps/qwik',
    client: {
      input: 'ssr/apps/qwik/app.jsx',
      outDir: 'ssr/dist/qwik', emptyOutDir: false,
      manifestOutput: (m) => writeFileSync(MANIFEST, JSON.stringify(m)),
    },
  })],
};
