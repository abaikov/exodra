# esbuild-plugin-exodra

esbuild plugin that compiles Exodra JSX/TSX. esbuild's built-in JSX handling is
wrong for Exodra — it lowers JSX to a call per element at runtime and throws on
the namespaced `on:` listeners the dialect uses — so this delegates to [`babel-preset-exodra`](../babel-preset-exodra)'s
shared runner, the same pipeline Vite, Rollup, and Jest use.

## Installation

```bash
npm install --save-dev esbuild-plugin-exodra
```

## Usage

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

### tsup

```javascript
// tsup.config.ts
import { defineConfig } from 'tsup';
import { exodra } from 'esbuild-plugin-exodra';

export default defineConfig({
  entry: ['src/main.tsx'],
  esbuildPlugins: [exodra()],
});
```

### Options

- `filter` — `RegExp` of files to compile. Default `/\.[jt]sx$/`.
- `schemaSource` — where the schema factory (`createExoNamedSchema`) is imported from. Default `@exodra/core`.

The dialect — `exoJsx(($) => <markup/>)` schema declarations, literal attributes
as markup and every port named where it stands (`data-id={$.id}`, `{$.label}`,
`onClick={$.toggle}`, `<$.rows />`) — compiles to a module-level
`createExoNamedSchema()` whose ports the machine fills.
See [`babel-preset-exodra`](../babel-preset-exodra) and
[`@exodra/babel-plugin-schema`](../babel-plugin-exodra-schema).
