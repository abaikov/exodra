# bun-plugin-exodra

Bun plugin that compiles Exodra JSX/TSX, delegating to
[`babel-preset-exodra`](../babel-preset-exodra)'s shared runner — the same
pipeline Vite, esbuild, Rollup, and Jest use.

## Installation

```bash
bun add --dev bun-plugin-exodra
```

## Usage

`Bun.build`:

```javascript
import { exodra } from 'bun-plugin-exodra';

await Bun.build({
  entrypoints: ['./src/main.tsx'],
  outdir: './dist',
  plugins: [exodra()],
});
```

Runtime loader (`bunfig.toml` preload):

```javascript
// preload.ts
import { plugin } from 'bun';
import { exodra } from 'bun-plugin-exodra';
plugin(exodra());
```

```toml
# bunfig.toml
preload = ["./preload.ts"]
```

### Options

- `filter` — `RegExp` of files to compile. Default `/\.[jt]sx$/`.
- `importSource` — where the auto-imported `h`/`text` come from. Default `@exodra/core`.
