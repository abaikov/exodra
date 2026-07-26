---
title: Babel Preset
---

# Babel Preset

`babel-preset-exodra` is the one-line way to compile Exodra JSX with Babel. It
bundles the whole pipeline — JSX syntax (with the namespaced `bind:` / `cache:`
directives), the [Babel plugin](./babel-plugin.md), and
`@babel/preset-typescript` for `.ts` / `.tsx` — so you don't assemble those three
by hand.

It is the integration hub: [Jest](../guides/testing.md), webpack, Parcel, and the
[bundler plugins](./bundlers.md) for esbuild / Rollup / Bun all run through it, so
every toolchain compiles Exodra JSX **identically**.

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

### Options

```javascript
// babel.config.js
module.exports = {
  presets: [
    ['exodra', {
      importSource: '@exodra/core', // where auto-imported h/text come from
      hoistStatic: true,            // compile-time clone-cache for static subtrees
      typescript: true,             // include preset-typescript (turn off if TS is handled elsewhere)
    }],
  ],
};
```

## Programmatic runner

The preset also exports the single function every bundler plugin calls, so there
is one copy of the pipeline **and** its invocation:

```javascript
import { transformExodraJsx } from 'babel-preset-exodra';

const result = await transformExodraJsx(sourceCode, '/abs/path/File.tsx');
// -> { code, map } | null   (typescript defaults on for .tsx, off otherwise)
```

## Not with ts-jest / @swc/jest

`ts-jest` and `@swc/jest` do **not** run Babel plugins, so they cannot compile
Exodra JSX. Use `babel-jest` with this preset (see [Testing](../guides/testing.md)),
or the native [SWC plugin](./swc-plugin.md).
