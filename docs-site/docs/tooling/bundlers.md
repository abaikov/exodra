---
title: Bundlers
---

# Bundlers & build tools

Exodra JSX is compiled by a **Babel** plugin, so any tool that can run Babel can
compile it — through the [Babel preset](./babel-preset.md). Tools that do **not**
run Babel plugins (esbuild, SWC, Bun's native transpiler) each have a dedicated
plugin that hands the file to Babel; those wrap the same preset, so every path
compiles identically.

| Tool | How | Package |
| --- | --- | --- |
| Vite / Vitest | plugin | [`@exodra/vite-plugin`](./vite-plugin.md) |
| Jest | `babel-jest` + preset | [`babel-preset-exodra`](./babel-preset.md) |
| esbuild / tsup | plugin | `esbuild-plugin-exodra` |
| Rollup | plugin | `rollup-plugin-exodra` |
| Bun | plugin | `bun-plugin-exodra` |
| webpack | `babel-loader` + preset | *(no package — see below)* |
| Parcel | `.babelrc` + preset | *(no package — see below)* |
| SWC / Next.js | native Wasm plugin | [`swc-plugin-exodra`](./swc-plugin.md) |

Every one of these plugins intercepts `.jsx` / `.tsx` **before** the bundler's own
JSX handling. That is not a preference: esbuild, Bun and friends lower JSX to a
call per element at runtime, where the point of this dialect is that the shape is
built once at module load — and they throw on the namespaced `on:` listeners
outright.

## Vite

See [Vite Plugin](./vite-plugin.md). It also adds HMR and file-based routing.

## esbuild / tsup

```javascript
import * as esbuild from 'esbuild';
import { exodra } from 'esbuild-plugin-exodra';

await esbuild.build({
  entryPoints: ['src/main.tsx'],
  bundle: true,
  outfile: 'dist/main.js',
  plugins: [exodra()],
});
```

With tsup:

```javascript
// tsup.config.ts
import { defineConfig } from 'tsup';
import { exodra } from 'esbuild-plugin-exodra';

export default defineConfig({
  entry: ['src/main.tsx'],
  esbuildPlugins: [exodra()],
});
```

## Rollup

```javascript
// rollup.config.js
import { exodra } from 'rollup-plugin-exodra';

export default {
  input: 'src/main.tsx',
  output: { dir: 'dist', format: 'esm' },
  plugins: [exodra()],
};
```

## Bun

```javascript
import { exodra } from 'bun-plugin-exodra';

await Bun.build({
  entrypoints: ['./src/main.tsx'],
  outdir: './dist',
  plugins: [exodra()],
});
```

## Options

Each plugin accepts two:

| option | default | what it is |
| --- | --- | --- |
| `filter` (`include` for Rollup) | `/\.[jt]sx$/` | which files to compile |
| `schemaSource` | `'@exodra/core'` | where the compiled output imports `createExoSchema` from |

Both are forwarded to `babel-preset-exodra`'s runner unchanged — there is no
per-bundler behaviour to configure, because there is no per-bundler pipeline.

## webpack

No package needed — `babel-loader` runs the preset:

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.[jt]sx$/,
        use: { loader: 'babel-loader', options: { presets: ['exodra'] } },
      },
    ],
  },
  resolve: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
};
```

## Parcel

Parcel reads Babel config automatically:

```json
// .babelrc
{ "presets": ["exodra"] }
```

## SWC / Next.js

SWC does not run Babel plugins. Use the native [SWC plugin](./swc-plugin.md),
configured with `{ "mode": "schema" }`.
