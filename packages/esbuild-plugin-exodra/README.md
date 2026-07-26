# esbuild-plugin-exodra

esbuild plugin that compiles Exodra JSX/TSX. esbuild's built-in JSX handling is
wrong for Exodra (positional children, ignores `bind:` / `cache:` directives), so
this delegates to [`babel-preset-exodra`](../babel-preset-exodra)'s shared runner
— the same pipeline Vite, Rollup, and Jest use.

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
- `importSource` — where the auto-imported `h`/`text` come from. Default `@exodra/core`.
