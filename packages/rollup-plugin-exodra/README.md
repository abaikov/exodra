# rollup-plugin-exodra

Rollup plugin that compiles Exodra JSX/TSX, delegating to
[`babel-preset-exodra`](../babel-preset-exodra)'s shared runner — the same
pipeline Vite, esbuild, and Jest use.

## Installation

```bash
npm install --save-dev rollup-plugin-exodra
```

## Usage

```javascript
// rollup.config.js
import { exodra } from 'rollup-plugin-exodra';

export default {
  input: 'src/main.tsx',
  output: { dir: 'dist', format: 'esm' },
  plugins: [exodra()],
};
```

### Options

-   `include` — `RegExp` of files to compile. Default `/\.[jt]sx$/`.
-   `schemaSource` — where the schema factory (`createExoNamedSchema`) is imported from. Default `@exodra/core`.

The dialect — `exoJsx(($) => <markup/>)` schema declarations, literal attributes
as markup and every port named where it stands (`data-id={$.id}`, `{$.label}`,
`onClick={$.toggle}`, `<$.rows />`) — compiles to a module-level
`createExoNamedSchema()` whose ports the machine fills.
See [`babel-preset-exodra`](../babel-preset-exodra) and
[`@exodra/babel-plugin-schema`](../babel-plugin-exodra-schema).
