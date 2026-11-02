# @exodra/introspect

Static analysis for Exodra projects: an ESLint plugin, and a ts-morph engine that
reads a project's TypeScript source and reports what is in it.

## Installation

```bash
npm install --save-dev @exodra/introspect
```

## What is actually measured

**Versions 0.1.0, 0.1.1 and 0.2.0 on npm invented findings about your code.**
`CodeAnalyzer.analyzeCode` returned the same three "vulnerabilities" for every
project it was pointed at — a `CWE-79` at `src/components/UserContent.tsx:25`, a
high-severity `CWE-521` "No password complexity requirements enforced" at
`src/auth/validation.ts:10`, a `CWE-200` at `src/utils/logger.ts:8` — plus
quality scores, 30-day "trends", a maintainability index and four design
patterns, all at fixed lines in files that need not exist. If you acted on output
from those versions, none of it was about your code. All of it is removed, along
with the CLI, the AI-provider registry, the plugin system, the Cursor
integration, the browser explorer and the analyzers that had no discovery pass.

What remains reads your source and nothing else.

## `ExoIntrospectionEngine`

```typescript
import { ExoIntrospectionEngine } from '@exodra/introspect';

const engine = new ExoIntrospectionEngine({
  projectRoot: './',
  analysis: { schema: true, performance: true },
});

const result = await engine.analyze();
// result.diagnostics, result.suggestions, result.metrics, result.summary
```

Per file it reports:

- **TypeScript diagnostics** — every error and warning the compiler produces.
- **`schema-built-per-call`** (`analysis.schema`) — a suggestion wherever
  `createExoSchema`, `createExoNamedSchema` or `createExoStatic` is called inside
  a function instead of at module scope. A schema numbers its ports when it is
  closed, so one built per call is a different program, not a slower one. `exoJsx`
  is exempt: the Babel plugin hoists it to module scope.
- **Counts** (`analysis.performance`):
  - `components` — calls to `createExoMachine` and `createExoStatic`.
  - `complexity` — `if` / `while` / `for` / `switch` count plus one, with a
    `high-complexity` warning above 20.

Per project it adds `total_files` and `total_lines`.

`analyzeFilePath(path)` runs the same pass over one file; `analyzeProject(root)`
re-points the engine at another directory. A folder without a `tsconfig.json` is
analysed as plain TypeScript.

Callees are matched by their text, not by resolving imports, so an aliased
import (`createExoSchema as build`) is not recognised. That direction reports
nothing rather than something wrong.

## `eslintPlugin`

```js
import { eslintPlugin } from '@exodra/introspect';

export default [
  {
    plugins: { exodra: eslintPlugin },
    rules: eslintPlugin.configs.recommended.rules,
  },
];
```

Rules (`recommended` warns or errors as listed; `strict` makes all of them errors):

| rule | recommended | what it reports |
|---|---|---|
| `exodra/no-schema-in-function` | warn | a schema builder called inside a function (`exoJsx` exempt) |
| `exodra/schema-validation` | error | `exoJsx()` given anything but a function literal |
| `exodra/no-inline-objects` | warn | an object literal inside a JSX expression or a schema builder call |

## License

MIT

---

📖 Full documentation: **[exodra.org](https://exodra.org)**
