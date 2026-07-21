---
title: AI-Assisted Development
---

# AI-Assisted Development

Exodra is unusually friendly to AI tools, and that's not an accident — it falls
out of the core design. This guide covers *why*, and the tooling built to lean
into it.

## Why Exodra is analyzable

A React component's behavior lives inside a function body that runs at runtime —
what's reactive, what re-renders, and why is opaque until it executes. Exodra is
the opposite:

- **The UI is plain data.** Every node is `{ type, attrs, cacheKey? }`. A tree is
  a value you can read, walk, and reason about without running it.
- **Reactivity is explicit and bucketed.** `static` vs `bindable` vs
  `bindableList` vs `handlers` is declared, not inferred. A tool can see exactly
  what can change and what can't — no dataflow guessing.
- **No virtual DOM, no hidden magic.** There's no diffing black box to model; the
  renderer touches only the reactive buckets.

The practical upshot: static analysis (and an LLM) can answer "what does this
component render, what's reactive, where are the perf risks?" from the source
alone. That's what the tooling below is built on.

## `@exodra/introspect` — analyze the tree

```bash
npm install --save-dev @exodra/introspect
```

The CLI is `exo-introspect`. Point it at a project and it produces **structured**
analysis (schemas, components, routes, performance) — the kind of report you can
hand straight to an LLM.

```bash
npx exo-introspect quick-check              # fast health check
npx exo-introspect analyze                  # full project analysis
npx exo-introspect components               # component patterns & complexity
npx exo-introspect schemas                  # schema definitions & relationships
npx exo-introspect routes                   # route / navigation structure
npx exo-introspect performance              # hotspots & bottlenecks
npx exo-introspect explain <file>           # AI explanation of one file
npx exo-introspect check-thresholds <file>  # gate analysis against quality thresholds
npx exo-introspect explore                  # launch the app + AI analysis
```

### Programmatic API

Everything the CLI does is available as a function returning structured data —
ideal for feeding an agent or a CI gate:

```ts
import { introspect, quickIntrospect, formatResults } from '@exodra/introspect';

const result = await introspect({ projectRoot: '.', analysis: {
  schema: true, components: true, performance: true, ai: false,
} });

// result carries: schemas, metrics, diagnostics, suggestions, summary
console.log(formatResults(result, 'markdown'));
```

There are also composable analyzers — `SchemaAnalyzer`, `ComponentAnalyzer`,
`PerformanceAnalyzer`, `ExoRouterAnalyzer`, `CodeAnalyzer` — if you want one
dimension.

## Editor / agent integration

```bash
npx exo-introspect setup           # zero-config: detects AI providers, writes integration files
npx exo-introspect setup-cursor    # Cursor (Claude Code) integration
npx exo-introspect ai providers    # list detected AI providers
npx exo-introspect ai test         # test a provider connection
```

`setup` auto-detects providers from your environment (OpenAI, Anthropic, GitHub
Copilot) and drops integration files so an assistant can call the analysis tools
against your project. `ai:false` in the programmatic API keeps everything local
and deterministic; flip it on to enrich reports with provider insights.

## The canonical LLM reference

The single most useful thing to give any coding assistant is Exodra's LLM
reference — a compact, correct description of the buckets, reactivity, list
reconciliation, and the gotchas that trip up React-trained models:

**[exodra.org/llms.txt](https://exodra.org/llms.txt)**

Paste it into your assistant's context (or your `.cursorrules` / project rules)
before asking it to write Exodra code. Most AI mistakes come from assuming React
semantics — flat props, `.value` signals, vDOM keys — and this file corrects all
of them up front.

## A typical loop

1. Scaffold with `npm create exodra`.
2. Give the assistant **exodra.org/llms.txt** so it writes idiomatic Exodra (typed
   buckets, `getValue`/`setValue`, identity-stable lists).
3. Run `exo-introspect analyze` (or the programmatic API) to get a structured
   report of components, schemas, routes, and perf hotspots.
4. Feed that report back to the assistant to review, refactor, or gate in CI.

Because the tree is data and the reactivity is explicit, every step is something a
tool can read precisely — not something it has to guess by running your app.
