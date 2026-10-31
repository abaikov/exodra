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

// `@marko/compiler` is a heavy babel-based module and only `build-marko.mjs` needs
// it, so it is loaded on first use rather than at module scope — the other build
// scripts and `sweep.mjs` import this file too and should not pay for it.
//
// It is reached for directly, as a transitive dependency of `marko` (which IS
// declared in packages/benchmarks/package.json), exactly the way the client
// suite's `vite.config.ts` already does. Not via `@marko/vite`: that plugin pins
// vite 8 and this workspace is held at vite 7 by Qwik — and nothing here uses vite
// anyway.
let markoCompiler;
const loadMarkoCompiler = async () => (markoCompiler ??= await import('@marko/compiler'));

// esbuild loader that compiles `.marko` files with Marko's own compiler in the
// given mode ('html' for the server render, 'dom' for the resuming client) — the
// exact counterpart of `solidPlugin` above, with the same production settings the
// client suite compiles Marko under (`optimize: true`, which is what selects the
// minified `marko/dom` runtime over `marko/debug/dom`).
export function markoPlugin(output) {
  return {
    name: 'marko',
    setup(b) {
      b.onLoad({ filter: /\.marko$/ }, async (args) => {
        const { compile } = await loadMarkoCompiler();
        const { code } = await compile(readFileSync(args.path, 'utf8'), args.path, {
          output,
          optimize: true,
          modules: 'esm',
        });
        return { contents: code, loader: 'js' };
      });
    },
  };
}

/**
 * The id a Marko template's resumed page waits on — `initEmbedded(<id>)` in the
 * client entry must match the id the server compilation serialised, or the page
 * parses, paints and then never wakes up.
 *
 * It is read out of the compiler's OWN hydrate entry rather than re-derived from
 * the template path, so it cannot drift from whatever Marko decides the id is.
 * `output: 'hydrate'` for a single-file template emits exactly:
 *
 *     import { initEmbedded } from "marko/dom";
 *     import "./app.marko";
 *     initEmbedded("<id>");
 *
 * and we keep only the id. NOTE: the id is derived from the template's path
 * relative to the package root, so the client and the server halves must be built
 * in one run from one cwd — which `build-marko.mjs` does.
 */
export async function markoReadyId(templatePath) {
  const { compile } = await loadMarkoCompiler();
  const { code } = await compile(readFileSync(templatePath, 'utf8'), templatePath, {
    output: 'hydrate',
    optimize: true,
    modules: 'esm',
    // Only present because the compiler refuses `output: 'hydrate'` without it.
    // The Marko 6 translator's entry builder never calls it for a single-file
    // template, and the generated code is thrown away after the id is read.
    resolveVirtualDependency: (_from, { virtualPath }) => virtualPath,
  });
  const found = /initEmbedded\(\s*(["'])(.*?)\1/.exec(code);
  if (found === null) {
    throw new Error(
      `marko: could not read the ready id out of the hydrate entry for ${templatePath}. ` +
        'Either the template stopped being interactive (no event handlers left) or Marko ' +
        `changed the shape of its hydrate entry. Generated:\n${code}`
    );
  }
  return found[2];
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
