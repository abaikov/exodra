# @exodra/to-react

Translate Exodra source — `exoJsx` schemas and the machines built on them — into
plain React components that render the same DOM.

```bash
npm install --save-dev @exodra/to-react
```

```ts
import { translateExoToReact } from '@exodra/to-react';

declare const source: string;
const { code, runtime, unsupported } = translateExoToReact(source, 'Counter.tsx');
```

- `code` — the React module.
- `runtime` — source of the plain-React helper module it imports (`./exo-react-runtime`), or `null`.
- `unsupported` — every construct that has no React form; the output is complete only when this is empty.

Guide: https://exodra.org/docs/guides/to-react
