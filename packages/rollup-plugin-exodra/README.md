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

- `include` — `RegExp` of files to compile. Default `/\.[jt]sx$/`.
- `importSource` — where the auto-imported `h`/`text` come from. Default `@exodra/core`.
