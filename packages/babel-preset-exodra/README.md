# babel-preset-exodra

Babel preset that compiles Exodra JSX in one line — JSX syntax with namespaced
`on:event` listeners left intact by the parser,
the [`@exodra/babel-plugin-schema`](../babel-plugin-exodra-schema) transform, and
`@babel/preset-typescript` for `.ts`/`.tsx`.

## Installation

```bash
npm install --save-dev babel-preset-exodra
```

## Usage

```javascript
// babel.config.js
module.exports = {
  presets: ['exodra'],
};
```

### Options

```javascript
// babel.config.js
module.exports = {
  presets: [
    ['exodra', {
      schemaSource: '@exodra/core',  // where the schema factory is imported from
      schemaImport: 'createExoNamedSchema', // its exported name
      markerName: 'exoJsx',          // the marker call that is compiled away
      typescript: true,              // include preset-typescript (turn off if TS is handled elsewhere)
    }],
  ],
};
```

### One compiler

There is **one** Exodra JSX compiler,
[`@exodra/babel-plugin-schema`](../babel-plugin-exodra-schema). A literal
attribute is markup and every port is named where it stands — `data-id={$.id}`,
`{$.label}`, `onClick={$.toggle}`, `ref={$.box}`, `unsafeHtml={$.body}`,
`<$.rows />`. Each `exoJsx(…)` declaration compiles to a module-level
`createExoNamedSchema()` call whose ports the machine fills by name; the output
imports nothing but `@exodra/core`.

The preset forwards `schemaSource`, `schemaImport` and `markerName` to the
compiler. For TypeScript, the
dialect also has its own types — point JSX at them with
`"jsxImportSource": "@exodra/jsx/schema"`.

## Testing with Jest

This preset is what makes Exodra component tests runnable under Jest. Jest **can**
compile Exodra JSX — through `babel-jest` (Jest's default Babel transform), which
picks up `babel.config.js` automatically. `ts-jest` and `@swc/jest` do **not** run
Babel plugins and so cannot compile Exodra JSX.

```javascript
// babel.config.js
module.exports = { presets: ['exodra'] };
```

That is all Jest needs — component tests then compile the same way Vite compiles
them.

> If Jest reports an unexpected token on `<`, or "namespace tags are not
> supported" on `on:click`, you are almost certainly on `ts-jest` / `@swc/jest`.
> Switch the transform to `babel-jest` and add the preset above.

## Other bundlers & runners

Exodra JSX is compiled by a **Babel** plugin, so any tool that can run Babel can
compile it — via this preset. Tools that do **not** run Babel plugins (esbuild,
SWC, Bun's native transpiler) need a dedicated plugin that hands the file to
Babel; those wrap this same preset, so every path compiles identically.

| Tool | How | Package |
| --- | --- | --- |
| **Vite / Vitest** | plugin | [`@exodra/vite-plugin`](../vite-plugin-exodra) |
| **Jest** | `babel-jest` + this preset | `babel-preset-exodra` |
| **esbuild / tsup** | plugin | [`esbuild-plugin-exodra`](../esbuild-plugin-exodra) |
| **Rollup** | plugin | [`rollup-plugin-exodra`](../rollup-plugin-exodra) |
| **Bun** | plugin | [`bun-plugin-exodra`](../bun-plugin-exodra) |
| **webpack** | `babel-loader` + this preset | *(no package — see below)* |
| **Parcel** | `.babelrc` + this preset | *(no package — see below)* |
| **SWC / Next.js / `swc-loader`** | native Wasm plugin (full parity) | [`swc-plugin-exodra`](../swc-plugin-exodra) |

### webpack

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.[jt]sx$/,
        use: {
          loader: 'babel-loader',
          options: { presets: ['exodra'] },
        },
      },
    ],
  },
  resolve: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
};
```

### Parcel

Parcel reads Babel config automatically:

```json
// .babelrc
{ "presets": ["exodra"] }
```

### SWC / Next.js (default), `@swc/jest`

SWC does not run Babel plugins, so this preset cannot drive it. Use the native
Wasm plugin [`swc-plugin-exodra`](../swc-plugin-exodra) instead.

## Programmatic runner

Every bundler plugin above calls one shared function, exported here, so there is a
single copy of the pipeline **and** its invocation:

```javascript
import { transformExodraJsx } from 'babel-preset-exodra';

const result = await transformExodraJsx(sourceCode, '/abs/path/File.tsx');
// -> { code, map } | null   (typescript defaults on for .tsx, off otherwise)
```

`map` is Babel's raw source map object — cast it to your bundler's map input type.

### Option types for plugin authors

- `ExodraCompileOptions` — `{ schemaSource }`, the slice every bundler plugin
  forwards. A plugin's options should extend this and nothing wider: a field a
  plugin accepts but does not forward is taken with no error and no effect.
- `ExodraBundlerOptions` — that plus `filter`, for hosts whose own convention
  names the file filter `filter` (esbuild, Bun). Rollup's plugin spells the same
  field `include`, after Rollup's convention, so it extends
  `ExodraCompileOptions` directly; Vite's plugin has no filter at all.
- `ExodraPresetOptions` / `ExodraTransformOptions` — the full preset options; the
  second is an alias of the first, differing only in how `typescript` is
  defaulted (see above).

`@exodra/babel-plugin-schema` declares its own `schemaSource` in
`TExoSchemaPluginOptions` and does not reuse these: it is upstream of this
package, so the import would run against the dependency arrow.
