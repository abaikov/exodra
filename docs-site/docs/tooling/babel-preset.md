---
title: Babel Preset
---

# Babel Preset

`babel-preset-exodra` is the one-line way to compile Exodra JSX with Babel. It
bundles the whole pipeline — JSX syntax parsed with `throwIfNamespace: false` so
namespaced `on:event` listeners survive parsing, the JSX compiler
`@exodra/babel-plugin-schema`, and `@babel/preset-typescript` for `.ts` / `.tsx` — so you don't assemble those three
by hand.

It is the integration hub: [Jest](../guides/testing.md), webpack, Parcel, the
[Vite plugin](./vite-plugin.md) and the [bundler plugins](./bundlers.md) for
esbuild / Rollup / Bun all run through it, so every toolchain compiles Exodra JSX
**identically**.

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

Babel resolves the `exodra` shorthand to `babel-preset-exodra`.

## What comes out

The compiler turns an `exoJsx(…)` call into a **schema declaration** built once
when the module loads, with every port created under the name written after `$.`.
The machine that fills those ports is written in TypeScript around it.

```tsx no-check
import { exoJsx } from '@exodra/jsx';

const ROW_SCHEMA = exoJsx<TRowPorts>(($) => (
  <li class="row" data-id={$.id}>
    <span class="row__label">{$.label}</span>
    <button class="row__btn" onClick={$.toggle} />
  </li>
));
```

becomes:

```javascript no-check
import { createExoNamedSchema } from '@exodra/core';

const _s0 = createExoNamedSchema((_b0) => {
  _b0.el('li', { class: 'row' }, (_b1) => {
    _b1.port('data-id', 'id');
    _b1.el('span', { class: 'row__label' }, (_b2) => { _b2.textPort('label'); });
    _b1.el('button', { class: 'row__btn' }, (_b2) => { _b2.eventPort('click', 'toggle'); });
  });
});

const ROW_SCHEMA = _s0;
```

The declaration left the expression it was written in and landed at module
scope. That is not an optimisation with a switch behind it — every backend
indexes its prepared plan by the schema's ports, so a schema rebuilt per render
would be a different program, not a slower one. The compiled module imports
nothing but `@exodra/core`. The full dialect, with every refusal and a machine
for each sample, is in the [JSX guide](../guides/jsx.md).

For TypeScript, point JSX at the dialect's types:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@exodra/jsx/schema"
  }
}
```

### Options

```javascript
// babel.config.js
module.exports = {
  presets: [
    ['exodra', {
      typescript: true,             // include preset-typescript (off if TS is handled elsewhere)
      schemaSource: '@exodra/core', // where the schema factory is imported from
      schemaImport: 'createExoNamedSchema', // its exported name
      markerName: 'exoJsx',         // the marker call the compiler compiles away
    }],
  ],
};
```

| option | default | what it is |
| --- | --- | --- |
| `typescript` | `true` | include `@babel/preset-typescript` |
| `schemaSource` | `'@exodra/core'` | where the schema factory is imported from |
| `schemaImport` | `'createExoNamedSchema'` | the exported name of the schema factory |
| `markerName` | `'exoJsx'` | the marker call the compiler compiles away |
| `mode` | `'schema'` | which compiler runs — and there is only one, so this names it rather than choosing it |

`'schema'` is the only legal value of `mode`. Any other value — `'legacy'`,
`'dom'` and `'ssr'` included — makes the preset **throw** by name rather than
compile the file and fail later and further away.

## Programmatic runner

The preset also exports the single function every bundler plugin calls, so there
is one copy of the pipeline **and** its invocation:

```javascript
import { transformExodraJsx } from 'babel-preset-exodra';

const result = await transformExodraJsx(sourceCode, '/abs/path/File.tsx');
// -> { code, map } | null   (typescript defaults on for .tsx, off otherwise)
```

It takes the preset's options as a third argument, so anything in the table above
reaches a bundler plugin without a second list of field names to keep in step.

## Not with ts-jest / @swc/jest

`ts-jest` and `@swc/jest` do **not** run Babel plugins, so they cannot compile
Exodra JSX. Use `babel-jest` with this preset (see [Testing](../guides/testing.md)),
or the native [SWC plugin](./swc-plugin.md).
