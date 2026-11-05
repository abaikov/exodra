# @exodra/to-react

Translate Exodra source — `exoJsx` schemas and the machines built on them — into
React modules that render the same DOM. Machine code stays as written; it runs on a
small React runtime that gives the exonode `c` the methods the DOM backend has.

```bash
npm install --save-dev @exodra/to-react
```

```ts
import { translateExoToReact } from '@exodra/to-react';

declare const source: string;
const { code, runtime, unsupported } = translateExoToReact(source, 'Counter.tsx');
```

-   `code` — the React module; its `@exodra/*` imports point at the runtime (`./exo-react-runtime` by default).
-   `runtime` — source of that runtime module, or `null`.
-   `unsupported` — every construct that has no React form; the output is complete only when this is empty.

Guide: https://exodra.org/docs/guides/to-react
