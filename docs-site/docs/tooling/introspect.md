---
title: Introspect
---

# Introspect

[`@exodra/introspect`](https://www.npmjs.com/package/@exodra/introspect) is
static analysis for Exodra projects: an ESLint plugin, and a ts-morph engine
(`ExoIntrospectionEngine`) that reads a project's TypeScript source and reports what
is in it. There is no CLI.

:::danger Versions 0.1.0, 0.1.1 and 0.2.0 reported findings that were not about
your code

`CodeAnalyzer.analyzeCode` returned the same three "security vulnerabilities" for
every project: a `CWE-79` at `src/components/UserContent.tsx:25`, a
high-severity `CWE-521` "No password complexity requirements enforced" at
`src/auth/validation.ts:10`, and a `CWE-200` at `src/utils/logger.ts:8` — files
that need not exist in the project being analysed. Quality scores, a
maintainability index, 30-day "trends", design-pattern locations, component
lists, performance hotspots and route analytics (`frequency: 1500`,
`bounceRate: 25`) were fixed values too, and the `ai.ts` providers returned
canned strings such as `'Code explanation from Claude'` without contacting a
model.

Nothing from those versions was a measurement. If you acted on a finding from
them, discard it. All of it has been removed — and so have the
`exo-introspect` CLI, the AI-provider registry, the plugin system, the Cursor
integration, the browser explorer and the four analyzers that had no discovery
pass behind them.
:::

## Installation

```bash
npm install --save-dev @exodra/introspect
```

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

What it reports, per file:

- **TypeScript diagnostics** — every error and warning the compiler produces.
- **Schema scope** (`analysis.schema`) — a `schema-built-per-call` suggestion
  wherever `createExoSchema`, `createExoNamedSchema` or `createExoStatic` is
  called inside a function. A schema numbers its ports when it is closed and
  every backend indexes its prepared plan by those numbers, so a schema built
  inside a function is not a slower program but a different one. `exoJsx` is
  exempt, because the compiler hoists it to module scope wherever it was written.
- **Counts** (`analysis.performance`):
  - `components` — calls to `createExoMachine` and `createExoStatic`;
  - `complexity` — control-flow statements plus one, with a `high-complexity`
    warning above 20.

Per project it adds `total_files` and `total_lines`. `analyzeFilePath(path)`
runs the same pass over a single file, and a folder without a `tsconfig.json`
is analysed as plain TypeScript.

Callees are matched by their text rather than by resolving the import, so an
aliased import (`createExoSchema as build`) is missed — the direction that
reports nothing rather than something wrong.

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

| rule | recommended | what it reports |
|---|---|---|
| `exodra/no-schema-in-function` | warn | a schema builder called inside a function (`exoJsx` exempt) |
| `exodra/schema-validation` | error | `exoJsx()` given anything but a function literal |
| `exodra/no-inline-objects` | warn | an object literal inside a JSX expression or a schema builder call |

`configs.strict` makes every rule an error.

## Links

- npm: [`@exodra/introspect`](https://www.npmjs.com/package/@exodra/introspect)
- GitHub: [`packages/introspect`](https://github.com/abaikov/exodra/tree/master/packages/introspect)
