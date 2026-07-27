import { build } from 'esbuild';
import { transformAsync } from '@babel/core';
import { gzipSync } from 'zlib';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

// esbuild loader that compiles Solid JSX with babel-preset-solid in the given
// mode ('ssr' for the server render, 'dom' for the hydrating client).
export function solidPlugin(generate) {
  return {
    name: 'solid',
    setup(b) {
      b.onLoad({ filter: /\.jsx$/ }, async (args) => {
        const src = readFileSync(args.path, 'utf8');
        const out = await transformAsync(src, {
          filename: args.path,
          presets: [['babel-preset-solid', { generate, hydratable: true }]],
        });
        return { contents: out.code, loader: 'js' };
      });
    },
  };
}

export const sizes = (buf) => ({ raw: buf.length, gz: gzipSync(buf).length });

export function writeIndex(dir, { head = '', body = '', script = './client.js' }) {
  mkdirSync(dir, { recursive: true });
  const html =
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${head}</head>` +
    `<body><div id="app">${body}</div><script type="module" src="${script}"></script></body></html>`;
  writeFileSync(`${dir}/index.html`, html);
  return sizes(Buffer.from(html));
}

export async function bundle(opts) {
  await build({ bundle: true, minify: true, format: 'esm', target: 'es2020', legalComments: 'none', ...opts });
  return sizes(readFileSync(opts.outfile));
}
