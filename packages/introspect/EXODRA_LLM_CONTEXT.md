# Exodra — LLM reference

Exodra is a schema-first reactive UI framework. There is **no virtual DOM**.
Reactivity is **explicit**: every prop is placed in a typed bucket, so the
compiler knows exactly what can change and the renderer only ever touches that.
JSX is compiled by `@exodra/babel-plugin-jsx` into `h(type, attrs, cacheKey?)`
calls — it is NOT React and NOT TypeScript's built-in JSX.

Read this before guessing. Most mistakes come from assuming React semantics.

## The five prop buckets (STRICT — this is the #1 gotcha)

A node's props are ONLY these buckets. There are **no flat attributes**. A flat
`class=`, `id=`, or `onClick=` is a **compile error** (the babel plugin throws),
not a silent no-op.

```jsx
<button
  static={{ class: 'btn', id: 'save' }}          // plain DOM attrs (never change)
  bindable={{ textContent: label }}              // reactive scalar values
  bindableList={{ children: rows }}              // reactive list of children
  handlers={{ onClick: (e) => save() }}          // DOM event handlers
  bindableHandlers={{ onClick: handlerSignal }}  // reactive event handlers
/>
```

- `static` — plain attributes + static children + lifecycle hooks (`onExoMount`,
  `onExoUnmount`). Values are constants set once.
- `bindable` — reactive scalars keyed by prop name (`textContent`, `value`,
  `class`, an attribute, or a single reactive child via `children`).
- `bindableList` — a reactive list of children (a `list()` / command source).
- `handlers` — typed DOM event handlers (`onClick(e: MouseEvent)`, …).
- `bindableHandlers` — a signal whose value is the current listener.

There is NO magic mapping of `onClick` → handlers. You put it in `handlers={{}}`
yourself. Types remove the escape hatch; the compiler enforces it.

## Reactivity primitives (`@exodra/reactivity`)

- `bindable(initial)` → `{ getValue(), setValue(v), subscribe(fn): () => void }`.
- `derive(source, fn)` → computed read-only bindable.
- `list(items)` → a bindable list with `snapshot()`, `subscribeOps(fn)`, and
  ops `insert/move/remove/set/reset`. Op shape is `TExoListOp<T>`.

## Children live in three places

`static.children` (static), `bindable.children` (a reactive single child OR a
reactive **array** of schemas), `bindableList.children` (a command/ops list).
If specified in more than one, last wins (like CSS).

## Lists & reconciliation (spend your attention here)

No vDOM. On a children update the renderer diffs the actual DOM against the new
child schemas **by reference identity**:

- same schema object as before → **same DOM node reused** (moved, not rebuilt)
- new schema object → node built
- schema gone → node removed, bindings disposed, `onExoUnmount` fired

**Consequence: a row keeps its DOM node (and input focus) only if you hand back
the SAME schema object.** Two ways to feed a reactive list:

1. `bindable<TExoSchema[]>` in `bindable={{ children }}` — set a new array, the
   renderer computes the delta (O(n) reference-diff, minimal DOM work). **Default.**
2. `bindableList` (`list()`) — you emit exact `insert/move/remove` ops (O(delta)).
   Use only when a producer already knows the mutation (command stream, drag).

**Focus-safe list pattern (use this for editable lists):** cache each row's
schema by a stable key, and only rebuild the array when the key SET changes — a
field edit doesn't change keys, so it's a reconcile no-op and the row's own
`bindable` updates in place (focus never moves). Encode structural content into
the key when a row must rebuild on it (e.g. `` `${id}:${pending}:${count}` ``).

## Lifecycle

`static.onExoMount(node)` / `static.onExoUnmount(node)` fire per node across the
subtree — and **also for nodes added by a later reactive update**, not just the
initial mount. So a row entering a reactive list runs `onExoMount` on insert and
`onExoUnmount` on removal. Subscribe in `onExoMount`, tear down in
`onExoUnmount` → only mounted rows hold subscriptions (O(visible), great for
virtual lists). Component-level cleanup: `ctx.onDispose(fn)`.

## SSR & hydration

- `@exodra/string` / `@exodra/ssr` render to HTML on the server. `snapshot()`
  must be synchronous — SSR reads the initial children with no flush.
- The client HYDRATES the SSR DOM (reuses the existing nodes, wires bindings) —
  it does not tear down and re-mount. Hydrate the shell and the page as separate
  trees if you want to swap the page without touching the shell.

## Components & typed props

`defineComponent(fn)` where `fn` is `(ctx) => schema`. Props are read from the
context by name: `ctx.getConstant('title')` (static bucket), `ctx.getBindable('n')`
(bindable bucket), `ctx.getBindableList('rows')`. Component cleanup: `ctx.onDispose(fn)`.

Optionally declare props for type-checking: `defineComponent<{ static: { title: string };
bindable: { count: TExoBindable<number> } }>(...)`. Then `<Comp static={{title}}
bindable={{count}}/>` is type-checked against that shape AND the context getters
infer their return types from it. Omit the generic and the component stays loose.

## Packages

- `@exodra/core` — schema (`h`, `text`, `defineComponent`, `TExoSchema`), base node.
- `@exodra/reactivity` — `bindable`, `derive`, `list`, persistence, hydrate helpers.
- `@exodra/dom` — the DOM renderer (`mount`, `hydrate`, identity reconcile).
- `@exodra/jsx` + `@exodra/babel-plugin-jsx` — JSX types + the compiler.
- `@exodra/router` — lazy routes (`lazy(() => import())`), history, guards.
- `@exodra/ssr` / `@exodra/string` — server rendering.
- `@exodra/forms` — form bindables (`bind:value` / `bind:checked` runtime).
- `@exodra/react` — render React components inside Exodra as islands:
  `reactIsland(Component, propsOrBindable)`. React is a peer dependency.
- `@exodra/vite-plugin` — Vite integration (file-based routing, JSX transform, HMR).
- `@exodra/profiler` — runtime profiling. `@exodra/introspect` — `exo-introspect`
  CLI for static analysis (schemas/components/routes/performance) + AI integration.
- `create-exodra` — `npm create exodra` scaffolding CLI.

## Gotchas (learned the hard way)

1. **Flat attrs are compile errors.** Every prop goes in a bucket.
2. **Rebuild the babel plugin's `dist`** before running examples — a stale
   `@exodra/babel-plugin-jsx/dist` mis-compiles JSX (e.g. `onClick` lands in
   `static` → dead buttons). Examples import the BUILT dist, not `src`.
3. **Identity-stable schemas = focus.** Rebuilding rows on every change loses
   input focus; cache schemas by key + a structural guard.
4. **Bridging a buffered command source (e.g. an oimdb ordered stream):** the
   consumer takes the initial state via `snapshot()` AND the source may deliver
   its buffered initial writes as "deltas" on the first flush after subscribe —
   settle the source (flush) BEFORE the renderer subscribes, or you double-apply
   the initial state.
5. `bindable={{ children }}` where the value is an **array** goes through the
   full identity reconcile — it is not limited to a single child.
