---
title: AI-Assisted Development
---

# AI-Assisted Development

Exodra is unusually friendly to AI tools, and that's not an accident — it falls
out of the core design. This guide covers _why_, and the tooling built to lean
into it.

## Why Exodra is analyzable

A React component's behavior lives inside a function body that runs at runtime —
what's reactive, what re-renders, and why is opaque until it executes. Exodra is
the opposite:

-   **The shape is separate from the behaviour.** A component is a **schema** built
    once and a **wiring function** run per instance. The schema is a straight-line
    builder — `el`, `text`, `port`, `eventPort`, `textPort`, `childrenPort` — so
    what markup a component produces is readable without running it.
-   **How a value is filled is written, never inferred.** `c.attr` / `c.text` is a
    value written by the wire or a transition, an effect that runs a transition and
    then subscribes is one that keeps up with a source, `c.list` is a fixed run and
    a reconciler from `createExoChildrenReconciler`, called where the data changes, is a
    reconciled one. [JSX](./jsx.md) declares the schema only: a literal attribute is
    markup, and every port is named where it stands (`data-id={$.id}`, `{$.label}`,
    `onClick={$.toggle}`, `<$.rows />`) for the machine to fill. A tool sees exactly what can change and what can't — no dataflow
    guessing.
-   **No virtual DOM, no hidden magic.** There's no diffing black box to model: a
    render is a clone, a walk plan and one call per port.

The practical upshot: static analysis (and an LLM) can answer "what does this
component render, what's reactive, where are the perf risks?" from the source
alone. That's what the tooling below is built on — `createExoSchema`,
`createExoNamedSchema`, `createExoStatic` and `exoJsx` are the schema calls its
analysis looks for, and `createExoMachine` / `createExoStatic` are what it
counts as components.

## `@exodra/introspect` — analyze the tree

```bash
npm install --save-dev @exodra/introspect
```

The package has no CLI. It exports two things, both reading only your source:

```ts
import { ExoIntrospectionEngine, eslintPlugin } from '@exodra/introspect';

const result = await new ExoIntrospectionEngine({
  projectRoot: '.',
  analysis: { schema: true, performance: true },
}).analyze();

// result carries: metrics, diagnostics, suggestions, summary
console.log(JSON.stringify(result, null, 2));
```

`ExoIntrospectionEngine` reports TypeScript diagnostics, schemas built inside a
function instead of at module scope, and per-file counts of components,
reactive sources and control-flow complexity. `eslintPlugin` reports the same
schema-scope mistake in the editor. The JSON result is structured enough to hand
to an assistant or gate in CI. See the [Introspect page](../tooling/introspect.md)
for the full list, and for what earlier versions invented and why it was removed.

## The canonical LLM reference

The single most useful thing to give any coding assistant is Exodra's LLM
reference — a compact, correct description of the schema/wiring split, the
JSX dialect, transitions and effects, list reconciliation, and the gotchas that trip up
React-trained models:

**[exodra.org/llms.txt](https://exodra.org/llms.txt)**

Paste it into your assistant's context (or your `.cursorrules` / project rules)
before asking it to write Exodra code. Most AI mistakes come from assuming React
semantics — flat props, `.value` signals, a virtual DOM keyed by `key` — and this
file corrects all of them up front.

There is a second failure mode, and the file ends with a section for it: **a model
whose training data contains an older Exodra.** The three-props renderer
(`h(type, attrs)`, the `static` / `bindable` / `bindableList` buckets,
`defineComponent`, `mount`/`hydrate`, `subscribe`, `@exodra/babel-plugin-jsx`) has
been **deleted** — `@exodra/core` and `@exodra/dom` both say so in their own
barrels. An assistant that produces any of it is not guessing at React, it is
recalling a program that no longer exists. The "What does NOT exist" section at the
bottom of `llms.txt` is written to be pasted for exactly that.

## A typical loop

1. Scaffold with `npm create exodra`.
2. Give the assistant **exodra.org/llms.txt** so it writes idiomatic Exodra
   (a schema plus a wiring function, `getValue`/`setValue`, identity-stable
   lists).
3. Run `ExoIntrospectionEngine` to get a structured report of TypeScript
   diagnostics, schemas built per call, and component / reactive-source counts.
4. Feed that report back to the assistant to review, refactor, or gate in CI.

Because the shape is declared once and every fill says how it fills, every step is
something a tool can read precisely — not something it has to guess by running
your app.
