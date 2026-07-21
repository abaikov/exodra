# Design decisions — Project Workspace flagship

This document explains **why** the flagship (`05-cnstra-oimdb`) is built the way
it is. Every non-obvious choice is written as **Decision → Rationale →
Alternatives → Trade-offs**, so a reader can judge whether the same call fits
their app — and see the downsides honestly, not just the upside.

The app is one real thing: a 10-entity project workspace (Kanban board, CRUD over
tasks/projects/people/taxonomy, an audit feed, and a 10k-row virtual list),
server-rendered on entry, hydrated, and code-split — on top of Exodra (UI),
[@oimdb](https://github.com/abaikov/oimdb) (store), and
[@cnstra](https://github.com/abaikov/cnstra) (orchestration).

---

## 1. Folder structure & decomposition

```
src/
  domain/       types.ts, seed.ts            — the vocabulary: entities + a deterministic seed
  store/        workspace-store.ts           — the oimdb instance: collections + derived indexes
  cns/          collaterals.ts + *-neuron.ts — orchestration: channels + one file per domain neuron
  lib/          keyed-list.ts                — reusable, app-agnostic primitives
  app/          runtime, routes, shell,      — application wiring (composition root)
                mount-app, persistence, devtools
  pages/        board, tasks, …, virtual*    — one route component per file
  ui/           styles.ts                    — presentation assets
  entry-client.ts / entry-server.ts          — the two process entry points
```

**Rationale.** The layers are ordered by dependency, low to high: `domain` depends
on nothing; `store` shapes `domain`; `cns` orchestrates writes to `store`; `pages`
render from `store` and dispatch into `cns`; `app` wires it all together at the
composition root. A newcomer can read top-to-bottom and never jump "up" a layer.
Each concern has an obvious home, so "where does X go?" has one answer — which is
what keeps a growing app from turning into a pile of `utils`.

**Why this is convenient for the user.**
- **Findability by concern, not by type.** You look for a *domain* rule in
  `cns/task-neuron.ts`, not by grepping a giant `reducers.ts`. Data access is one
  greppable name (`oimdbInstance`) reachable only through `store/`.
- **Blast radius is bounded.** Changing how tasks persist touches
  `cns/task-persist-neuron.ts` and nothing else; changing the data shape touches
  `domain/` + `store/`.
- **`lib/` signals "extractable."** `keyed-list.ts` is framework-level, not
  workspace-specific — putting it in `lib/` (not `app/`) says "this could become a
  package," and keeps app wiring out of a reusable helper.

**Trade-offs / downsides (honest).**
- **`app/` is the widest folder** — runtime, routing, shell, persistence, devtools
  all live there. It is the "everything that isn't domain/store/cns/pages" bucket.
  Justified as *composition-root wiring*, but it is the folder most likely to need
  its own sub-structure as the app grows.
- **`ui/` holds a single `styles.ts`.** A folder for one file looks like
  over-structuring today; it earns its place only if presentation assets grow
  (themes, tokens, icons). We kept it to signal that intent, but a flat
  `styles.ts` would be equally defensible now.
- **Per-domain neuron files add file count.** Six neuron files for one CNS is more
  files to open than one `cns.ts`. We chose it because a single 380-line
  orchestration file hid the graph (see §3); the cost is more, smaller files.

---

## 2. Data layer — oimdb, named `oimdbInstance`

**Decision.** All app state lives in a single **oimdb** instance: normalized
collections (`tasks`, `projects`, …) plus derived indexes (`tasksByStatus`,
`commentsByTask`, …). The variable is named `oimdbInstance`, not `store`.

**Rationale.** oimdb is an **observable, in-memory, normalized database**:
entities are stored once by primary key; relationships are *derived indexes* that
stay correct automatically; and every read is subscribable at the granularity you
need (`subscribeOnKey(pk)`, `subscribeOnAnyUpdate`). That maps directly onto
Exodra's fine-grained reactivity — a card subscribes to *its* task's key, so an
edit re-renders one card, not a list. The **subscription granularity is used all
the way up**: each board column subscribes to its own `tasksByStatus` *key*
(`subscribeOnKey(statusId)`), not to the whole collection — so a field edit fires
no column, and a move fires exactly the two affected columns. Reaching for
`subscribeOnAnyUpdate` on the collection would re-check every column on every
change; the per-key subscription is the point of a keyed index. `oimdbInstance`
(not `store`) because "store" is generic; the distinctive name is greppable and
honest about what it is.

**Alternatives.**
- **Plain objects + manual events** — smallest, but you hand-roll normalization,
  indexes, and per-key subscriptions (exactly what oimdb provides), and they drift.
- **Redux Toolkit** (`createEntityAdapter` + reselect) — normalized collections +
  memoized selectors, but subscriptions are component-level (re-run selectors),
  not per-entity keys, and there is no ordered-list command stream.
- **MobX** — fine-grained reactivity, but not normalized collections/indexes out of
  the box; you build the relational layer yourself.

**Trade-offs.** oimdb is a specific dependency and a specific mental model
(collections + derived indexes + a flush queue). In exchange you get O(1) keyed
reads, auto-maintained relationships, and subscription granularity that a
no-vDOM renderer needs. Naming the instance after the library couples the variable
name to oimdb — deliberate here (a showcase), but in a library-agnostic app you
might keep it `db`.

---

## 3. Orchestration — cnstra, one neuron per domain

**Decision.** State-changing commands flow through a **cnstra neuron graph**:
`task` / `comment` / `project` neurons turn commands into store mutations + events;
a `task-persist` saga does optimistic-add → settle/rollback; an `activity` neuron
listens to every event and writes the audit log. Each neuron is its own file, built
by a factory `create*Neuron(oimdbInstance, …deps)`.

**Rationale.** The interesting behavior of this app *is* the orchestration:
"adding a task is optimistic, persists async, and either settles or rolls back,
and every settled command appends an activity record." A neuron graph makes that
graph **explicit and deterministic** — you can read the wiring (which collateral
feeds which neuron) instead of chasing imperative calls across files. Splitting by
domain means each file is cohesive: `task-neuron.ts` is *only* task commands.

**Why the split (this was a real fix).** The orchestration started as one
380-line file with a `commandNeuron` that handled task **and** comment **and**
project commands — a grab-bag whose name lied. Splitting per domain makes the
graph legible and gives each concern a bounded file.

**Alternatives.**
- **Write to the store directly from event handlers** — fewest moving parts, but
  the "saga" (optimistic → async persist → settle/rollback) and the cross-cutting
  activity log become tangled imperative code with no single place that describes
  the flow.
- **Redux-saga / thunks** — similar orchestration power; cnstra's difference is the
  deterministic neuron-graph traversal and typed collateral channels.
- **One big neuron / one file** — fewer files, but hides the graph (what we moved
  away from).

**Trade-offs.** A neuron graph is a concept to learn, and simple CRUD (the
tags/labels/members edits) does *not* go through it — those are direct
`oimdbInstance` writes via `runtime.createEntity/patchEntity/removeEntity`, because
routing a plain field edit through a saga would be ceremony. So the app has **two
write paths on purpose**: orchestrated (task lifecycle, cascades) vs direct
(reference-data CRUD). That is a deliberate boundary, not an inconsistency —
documented here so it does not read as one.

### 3a. Collaterals: one per emitter, arrays on the receiver

**Decision.** A rejection is **three** collaterals — `taskRejected`,
`commentRejected`, `taskPersistRejected` — one per emitting neuron, not one shared
`validationFailed`. A consumer that wants all of them takes them as an array
(`dendrite({ collateral: [a, b, c] })`) or, as the runtime does, checks membership.

**Rationale.** In cnstra a collateral belongs to exactly one neuron's **axon** (its
output set). A single collateral emitted by three neurons belongs to no axon — it
breaks the "each neuron owns its outputs" model and muddies devtools/persistence
naming. Splitting keeps ownership clean; the array form on the receiver keeps the
consumer concise.

**Trade-offs.** Three collaterals for "an error" is more declarations than one. The
payoff is a truthful graph (you can see *which* neuron rejected) and per-emitter
routing if you ever need it.

### 3b. Dependencies via factory closures (not a cnstra concern)

**Decision.** Each neuron is `create*Neuron(oimdbInstance, now, newId)` — a plain
function closing over its dependencies — assembled in `workspace-cns.ts`.

**Rationale.** The neuron needs the `oimdbInstance` (and `now`/`newId` for
determinism/testability). A closure injects them without a DI container. Keeping
this in the app — not in cnstra — is deliberate: baking "what a store is / how deps
are passed" into the framework would couple cnstra to one opinion.

**Alternatives / possible standardization.** The one repetition worth noticing is
that neurons are listed twice in the composition root (`new CNS([...])` **and**
`createPersistRegistry({...})`). A cnstra-level `composeNeurons(namedMap) → { cns,
registry }` could dedupe that and hand devtools stable names for free — a naming/
assembly convention that would **not** own DI. Left as a documented idea, not
implemented, because it is a framework change, not an app fix.

---

## 4. Rendering — Exodra, strict prop buckets

**Decision.** UI is Exodra schemas authored in JSX. Props are the five typed
buckets only — `static` / `bindable` / `bindableList` / `handlers` /
`bindableHandlers`. There is **no** flat `class=` / `onClick=`; those are compile
errors.

**Rationale.** No virtual DOM means the renderer must know, at author time, what
can change. The buckets encode exactly that: `static` never changes (hoisted once),
`bindable` is a reactive value, `handlers` is an event listener. The compiler and
the types make the static/reactive/event split explicit, so the renderer never
diffs a tree — it wires each reactive prop to its one DOM operation.

**Alternatives.** React-style flat props (`<button onClick=…>`) are more familiar,
but they hide reactivity: the framework must diff to discover what changed. Exodra
trades familiarity for an explicit, diff-free model.

**Trade-offs.** More verbose than React, and a hard error if you write flat props
(intentional — see the [JSX guide](https://exodra.org/docs/guides/jsx)). The payoff
is fine-grained updates with no reconciler on the hot path.

---

## 5. Lists — one primitive, `keyedList`

**Decision.** Every list (board columns, task list, people, taxonomy, activity)
renders through `lib/keyed-list.ts`: it maps ordered items to **identity-stable**
child schemas (cached by key) driven through a `bindable<TExoSchema[]>`, with a
structural guard so a field edit is a no-op.

**Rationale.** The renderer reconciles children **by reference identity** — same
schema object ⇒ same DOM node reused. So the whole game is handing back stable
schemas: cache each row by key, recompute the array only when the *key set*
changes. A field edit (which does not change keys) is then a reconcile no-op and
the focused input keeps focus; a real add/move/remove touches only the diff. One
primitive means every list page reads the same way.

**Alternatives (the three list models — all valid, different jobs).**
1. **`bindable<TExoSchema[]>` + identity reconcile** — hand the current array, the
   renderer computes the delta (O(n) reference diff). This is what `keyedList` wraps.
2. **`bindableList` + `subscribeOps`** — emit exact `insert/move/remove` ops
   (O(delta)); for producers that already know the mutation (drag, a command
   stream). Overkill when you just have "the current set."
3. **`list()` + `.reset()`** — rebuild all rows on change. Simple, but loses focus
   unless guarded, and rebuilds unrelated rows. This is what the pages used
   *before* `keyedList` — replaced because it was a second pattern doing the same
   job worse.

**Trade-offs.** `keyedList` re-diffs the visible array on each structural change
(O(n)); a command stream would be O(delta). For normal lists O(n) is nothing and the
code is far simpler, so it is the default. See §9 for the case where the array model
is wrong (huge lists) and §5-note for when to reach for ops.

**Note — why not command streams everywhere.** Command streams (`bindableList`) win
only when a producer emits the exact mutation and you need O(delta). For "here is
the current set," making the producer compute a delta the renderer can compute
itself is ceremony. So `keyedList` is the default and command streams are the
specialist tool — the flagship uses `keyedList` for all lists and reaches for the
array-window in the virtual list (§9).

---

## 6. Per-row lifecycle — subscribe in `onExoMount`

**Decision.** A row that watches its entity subscribes in `onExoMount` and disposes
in `onExoUnmount`.

**Rationale.** Those hooks fire when a node enters/leaves the DOM — *including*
nodes added by a later reactive update. So only currently-mounted rows hold
subscriptions: in the virtual list that is O(visible), not O(total). It also means
teardown is automatic — a dropped row's subscription dies with its node.

**Trade-offs.** You must remember to dispose (a leaked closure would keep a
subscription alive). The pattern is uniform across the app precisely so it is
muscle memory. (A framework-level fix made this session ensures `onExoMount` fires
for dynamically-inserted rows, which is what makes the virtual list's per-row
subscriptions correct.)

---

## 7. SSR + hydration — two trees, board-only entry SSR

**Decision.** The server renders the **shell** (with an empty `#outlet`) and the
**board** as two independent trees, splices the board HTML into the outlet, and
embeds the full store snapshot in a `<script>`. The client **hydrates** both trees
(reusing the SSR DOM nodes, not re-mounting) and takes over. Non-board routes render
client-side after their chunk loads.

**Rationale.** Two independent trees mean a page can be disposed and swapped on
navigation without touching the shell — SPA navigation with a server-rendered first
paint. Real hydration (reuse the nodes) avoids a flash and keeps first paint cheap.
The embedded snapshot lets the client hydrate the *same* data with no round-trip.

**Alternatives.**
- **No SSR (pure SPA)** — simplest, but a blank first paint until JS runs.
- **Full SSR of every route** — best first paint everywhere, but the entry must
  resolve and render the matched (lazy) route on the server for all routes.
- **Re-mount instead of hydrate** (`replaceChildren`) — simpler, but throws away the
  SSR DOM and flashes.

**Trade-offs (the honest limitation).** **Only the board SSRs.** Deep-linking
directly to `/tasks` yields a server-rendered *shell* with an empty outlet; the
tasks page paints once its chunk loads client-side. This is a deliberate scoping
choice — the entry statically imports only `boardPage`. The clean next step is to
render the **matched** route on the server (import the pages server-side, render the
one the URL matches) so every route SSRs; it is a feature addition, not a bug fix,
and is called out here rather than hidden.

---

## 8. Code-splitting — lazy routes over a shared core

**Decision.** Each page is a `lazy(() => import(...))` route → its own vite chunk;
the shared core (Exodra + oimdb + cnstra + store/cns/runtime) loads once.

**Rationale.** First load pulls the core (~31 KB gzip) + the entry page (~1.5 KB
gzip); every other page streams in as ~1 KB on navigation. You pay for what you
visit. See the [README](./README.md) for measured sizes.

**Trade-offs.** A tiny navigation latency on first visit to a route (chunk fetch),
and the router must resolve lazily. For a multi-page app that is the right default;
a single-screen app would not bother.

---

## 9. The virtual list — array window + shared viewport

**Decision.** 10k rows, only the visible slice mounted. The scroll **viewport**
(`{start, end, total}`) lives in a shared oimdb `OIMReactiveObject`; scrolling
writes one value and two decoupled parts of the UI (the window + an "on screen"
readout) subscribe. The window is a `bindable<TExoSchema[]>` over the visible slice.

**Rationale / costs (measured by the smoke).** `getSlots()` is an O(1) cached
reference; the filter recomputes **once per query change, never per scroll**; a
scroll is O(1) (compute `[start,end)`, write the viewport); rendering a viewport
change is O(window); per-row subscriptions are O(window). The shared viewport
demonstrates that global reactive state can fan out to disparate UI with no
prop-drilling and no perf cost.

**Alternatives.**
- **Render all 10k rows** — trivial code, dies on DOM size.
- **A virtualization library** — works, but hides the mechanism a flagship exists to
  show.
- **`keyedList` (§5) for the window** — you *could*, but the window is a
  scroll-derived slice; the array model is exactly right and needs no per-key cache
  beyond the visible set.

**Trade-offs.** Fixed row height (the math assumes `ROW_H`), and the window rebuild
is O(window) per scroll tick (fine — the window is ~25 rows). A command stream would
be O(delta), but for a windowed slice O(window) is already tiny and the code is far
simpler. This page is deliberately split into `virtual-data.ts` (the synthetic
dataset) / `virtual-row.tsx` (presentational) / `virtual.tsx` (the technique) so the
windowing logic is not buried under fake-data generation.

---

## 10. A global runtime singleton (`getRuntime()`)

**Decision.** The store + CNS + command helpers are held in a module singleton;
pages call `getRuntime()` instead of receiving them as props.

**Rationale.** Lazy page chunks cannot easily receive a constructor argument; a
singleton set once by the entry is the pragmatic seam, and there is exactly one
runtime per app. Pages stay parameter-free and testable (the smokes just call
`setRuntime` first).

**Trade-offs.** A singleton is global state — you could not run two independent
apps in one JS context without extra care. For a single SPA that is a non-issue,
and it keeps page signatures clean. (The router is *not* a singleton — it is
returned from `mountApp` — because nothing except the entry needs it.)

---

## 11. Testing — vite-node smokes, one per concern

**Decision.** The example is covered by six standalone `scripts/smoke-*.ts` run via
`vite-node`, each targeting a distinct layer: `store` (indexes + snapshot),
`saga` (CNS orchestration), `flagship` (SSR-less UI + CNS integration), `hydrate`
(SSR → hydrate reuses nodes), `virtual` (windowing + O(1) scroll), `persist`
(localStorage round-trip).

**Rationale.** These flows need a full jsdom + SSR environment and real cross-layer
wiring; a smoke script that boots the whole stack and asserts observable behavior is
the most honest test of "does the app actually work." Each smoke owns one concern,
so a failure points at a layer. Every claimed property (focus preserved, node reused
on hydrate, "scroll never runs the filter", rollback on persist failure) has an
assertion behind it.

**Alternatives.** `vitest` unit tests (used by the framework packages) — better for
pure functions, but heavier to set up for full SSR/hydration/DOM flows and less
representative of the integrated app.

**Trade-offs.** Smokes are integration-level (slower, coarser) and are run manually
/ in CI rather than in a watch loop. That is the right granularity for "the flagship
still works end to end"; fine-grained logic is unit-tested inside the framework
packages instead. (Ten stale smokes from an earlier TODO-domain version were removed
this session — dead tests are worse than none.)

---

## 12. Known limitations & possible improvements

Written down so they read as *conscious* boundaries, not oversights. Ordered by
value.

- **Entry SSR is board-only (§7).** The clear next step: render the *matched* route
  on the server (import pages server-side, render the one the URL matches) so every
  route paints server-side, not just `/`. This is a feature, not a bugfix.
- **The virtual list is not screen-reader-complete.** A windowed list mounts ~25 of
  10 000 rows, so assistive tech cannot perceive the full set. Doing it *right*
  needs `role="list"` + per-row `aria-setsize={total}` / `aria-posinset`, kept in
  sync as the filter changes total. It was left out rather than half-added
  (misleading ARIA is worse than none) — a real, self-contained improvement.
- **The runtime is a global singleton (§10), not framework context.** Exodra has a
  context system (`createContextKey` / provide-inject); providing the runtime
  through it would be more idiomatic and multi-instance-safe. The catch is that
  pages call `getRuntime()` at *build* time (before mount), where context is not yet
  resolved — so the singleton is the pragmatic seam today. Worth revisiting if
  Exodra grows a build-time context read.
- **Reference-data CRUD lists re-check all keys per edit.** The single-list pages
  (`tasks`, etc.) subscribe to a whole collection and let `keyedList`'s guard no-op
  unchanged edits — correct, but the guard still recomputes O(list) keys per edit.
  The board avoids this with per-status-key subscriptions (§2); the single-list
  pages could too if partitioned, but a flat list has no natural partition key, so
  the O(list) guard is the honest cost.
- **The virtual window renders through the async viewport (§9).** Routing the list
  render through the shared oimdb object adds a microtask hop per scroll frame
  (imperceptible, and it buys the decoupled readout). A latency-critical list could
  render synchronously on scroll and update the viewport only for the readout.
- **`keyedList`'s structural guard is a `keys.join('|')` string** — O(n) allocation
  per recompute. Fine at list sizes here; a huge list could compare the previous key
  array element-wise instead.

## Summary

The through-line: **make what can change explicit** (bucketed props, typed
collaterals, keyed lists) and **give every concern one home** (layered folders,
per-domain neurons, one list primitive, one store name). The honest soft spots and
where the design could go next are listed in §12 — deliberate boundaries, written
down so the reader can weigh them rather than discover them.
