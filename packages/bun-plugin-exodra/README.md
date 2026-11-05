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

-   `filter` — `RegExp` of files to compile. Default `/\.[jt]sx$/`.
-   `schemaSource` — where the schema factory (`createExoNamedSchema`) is imported from. Default `@exodra/core`.

Bun's own JSX handling is wrong for Exodra — it lowers JSX to a call per element
at runtime and throws on the namespaced `on:` listeners — which is why `.jsx` / `.tsx` are intercepted and handed to Babel.
See [`babel-preset-exodra`](../babel-preset-exodra) and
[`@exodra/babel-plugin-schema`](../babel-plugin-exodra-schema).
