# Exodra Benchmarks

This private workspace contains browser benchmarks used while tuning Exodra.
They are not part of the published package set.

## Start here — what is in this folder

`src/benchmarks/` holds **132 files in eight directories**, and the directory a file sits in says
what kind of thing it is. Counted off disk:

| directory | how many | what is in it |
|---|---|---|
| `axes/` | **39** `.ts`/`.tsx` → **41 axis names** | a measurement you can run; prints a table. Five families: `app/` 5, `list/` 6, `floors/` 8, `phases/` 8, `mechanism/` 12 |
| `participants/` | **30** | one competitor's implementation of one scene, wired to the harness; never run directly. Nine directories: `exodra/` 5, `lit/` 5, `sinuous/` 5, `uhtml/` 5, `stage0/` 4, `mikado/` 2, `floor/` 2, `bundled/` 1, `angular/` 1 |
| `apps/` | **36** (14 `.tsx`, 3 `.ts`, 19 `.md`) | each participant's **app itself** and its notes. Twelve directories: eleven participants' — `exodra/` `lit/` `marko/` `mikado/` `react/` `sinuous/` `solid/` `stage0/` `svelte/` `uhtml/` `voby/` — plus `scene/`, which is the app data nobody owns |
| `shared/` | **7** | the scene spec, the drivers, the counters — imported by axes and participants alike |
| `gates/` | **3** | proves a participant's markup matches the reference before anything is timed |
| `profilers/` | **2** | fired by `scripts/profile-*.mjs`, not by the axis runner |
| `marko/` | **8** (7 `.marko`, 1 `.ts`) | the Marko participant's apps, in its own language, plus its flush helper |
| `svelte/` | **7** `.svelte` | the Svelte participant's apps, in its own language |

By extension that is **99 `.ts`/`.tsx`**, 19 `.md`, 7 `.marko` and 7 `.svelte`. Eighty-one of the
99 are the five kinds the file map further down enumerates (39 + 30 + 7 + 3 + 2); the other 18 are
the 17 app files under `apps/` and `marko/flush.ts`. `src/harness.ts` and `src/main.ts` sit outside
`src/benchmarks/` entirely.

**The rule that decides everything: a file is an axis if and only if `scripts/run-one-axis.js`
names it.** Directory is a strong hint and not the rule. `axes/list/toggle.tsx`,
`axes/list/reconcile.tsx`, `axes/list/list-reconcile.tsx` and `axes/list/list-replace.tsx` look like
scenes but are axes; `participants/floor/app.ts` and `participants/floor/toggle.ts` look like axes
but are participants (they are the native-floor rows).

**`apps/` against `participants/` is the split that makes the line count mean something.** An app
directory holds the components, state and handlers and nothing else; its counterpart under
`participants/` (`participants/lit/app.tsx` for `apps/lit/lit.tsx`) is the **mount adapter** — it
wires that app to the harness, runs the byte gate, and reports the census. The split exists so
`shared/app-files.ts` can say what each participant's app cost in lines without arguing about which
half of a mixed file counts.

## Commands

Every axis runs the same way. One at a time — running several in one browser session runs the
machine out of memory:

```bash
npm run axis --workspace=@exodra/benchmarks -- <axis> [rounds] [batch] [cycleFactor]
# or: node scripts/run-one-axis.js <axis>
```

`node scripts/run-one-axis.js` with no argument prints the full axis list. Every run records to
`measurements/<axis>.latest.json` unless `--record=<label>` or `--no-record` is given; `--only=a,b`
narrows the field to named participants (field axes only — see the table).

```bash
npm run build --workspace=@exodra/benchmarks
npm run dev   --workspace=@exodra/benchmarks   # the browser UI, index.html → src/main.ts (10 axes)
npm run bench --workspace=@exodra/benchmarks   # headless, the curated subset
```

**This package is type-checked, and by the release gate.** It cannot join `tsconfig.build.json` —
it compiles competitors, and Solid's `jsxImportSource`, the Angular app and the Marko one each want
options that contradict that graph's — so it carries its own `tsconfig.typecheck.json`, which
excludes the competitor participants and checks everything else. `npm run typecheck:benchmarks` at
the repo root runs it, and `release:check` runs that.

## The axes

41 names, 39 files. `list-replace.tsx` serves three names; every other file serves one.

**Participants are read from the axis files, not from prose.** They were read at the timestamp
noted under the table — the five app axes are being edited as this is written, so re-check those
rows before quoting them.

### The app axes — the 10-deck / 80-card todo app

The shared scene. Every participant builds the identical DOM and is diffed byte for byte before
anything is timed.

| axis | the question | participants | notes |
|---|---|---|---|
| `initial-render` | what does mounting the app cost across the field? | `exodra` · `solid` `svelte` `react` `voby` `lit` `mikado` `stage0` `uhtml` `sinuous` `marko` | the headline mount table |
| `exodra-initial-render` | the same mount, narrowed to this renderer's variants against the reactive field | `exodra` · `solid` `lit` `mikado` `mikadoReactive` `marko` | |
| `app-update` | what does one update round cost, **handlers called directly**? | `exodra` · `solid` `svelte` `react` `voby` `lit` `mikado` `uhtml` `sinuous` · `floor` | no `MouseEvent`, no `dispatchEvent`. **Run `app-update 100 40`** — give both numbers or neither |
| `exodra-app-update` | the same round **fired by a click**, with a real `MouseEvent` | `exodra` · `solid` `lit` `mikado` `mikadoReactive` `marko` · `floor` | the only app axis that still dispatches events; ~61% of what it prints is the browser delivering them. Rows here may **not** be pasted beside `app-update` rows |
| `component-split` | does Solid's template advantage survive being split into components? | `exodra` `exodraMono` `solid` `svelte` | |
| `mount-phases` | what share of a mount is the clone, the walk, the insertion, the wire? | one renderer: `clone` `clone+walk` `clone+walk+ins` `walk` `mount` | not a framework comparison; `batch` ignored |
| `mount-floor` | how much headroom is left above a program with no abstraction at all? | `exodra` vs `clone` `clone+refs` `create` `create+refs` `html`(×5 doors) + twins | **the native floor.** Says no framework can be more than X% faster at mounting this app |
| `update-floor` | what is the floor for five specific transitions? | `floor·told` `floor·diff` `floor·bound` `floor·wire` … vs `exodra` `exodraOps` `exodra·children` `exodra·kept` + twins | rows pair only inside a contract (`told` vs `derive`) |
| `hydrate-floor` | is serve-then-hydrate cheaper than clone-and-build on a big list? | `parse` `parse+hydrate` `hydrate` `mount` + twins, at 3 censuses | prints two answers; neither may be quoted as the other |
| `teardown-floor` | what does the cheapest possible teardown of this app cost? | `exodra` vs `dom·*` `book·*` `cycle·*` `scale·*` | two tables; **`CYCLE` is the honest one**. Run `teardown-floor 100 2 64` |
| `teardown-phases` | one renderer's teardown split into its phases | `dispatch only` `textContent` `clear region` `unmount loop` `registry evict` `run disposers` `drop per child` | on the 200-panel block `toggle` hides |
| `child-mark` | what does associating data with a DOM element cost — expando vs `WeakMap`? | `clone+rec+slot` `clone+rec+weak` `pool·slot·*` `pool·weak·*` `read·*` `walk·*` | ladder is a **bound only**; the answer comes from the `pool` family |
| `context-cost` | what do `provide` / `inject` cost? | `push` · `inject·1/2/8` + miss, against an independent twin chain | **carries no floor** and says so |

### The list axes

| axis | the question | participants | notes |
|---|---|---|---|
| `list-update` (`list-reconcile.tsx`) | imperative `move` / `insert` / `remove` on 300 rows | `exodra` `exodraOps` + twins · `solid` `svelte` `react` `lit` `mikado` `mikadoKeyed` `stage0` `uhtml` `sinuous` `marko` | **run `list-update 100 32`** — at batch 1 the fastest rows land on the clock's 0.1 ms clamp |
| `reconcile` | declarative replace (keyed diff) | `exodra` · `solid` `svelte` `react` `lit` `mikado` `stage0` `uhtml` `sinuous` `marko` | |
| `refetch` (`list-replace.tsx`) | full replace, **same ids as fresh objects** — an extracted key matches, identity does not | `floor` `floor·twin` `floor·rebuild` `exodra` `exodra·ops` `exodra·positional` `exodra·targeted` `solid·for` `solid·slots` `react·keyed` | three axes share this file on purpose: one copy of the participants |
| `pagination` (`list-replace.tsx`) | full replace, **different ids** — only a positional strategy keeps its nodes | same field | |
| `rewire` (`list-replace.tsx`) | where does re-writing every position overtake diffing? | same field | five tables, k ∈ {1, 5, 25, 100, 500} of 500 |
| `virtual-list` | what happens when a row **re-enters** a window? | `exodra` `solid` and the window drivers | four tables: WIDE, REORDER, plus one-way controls |
| `reactive-update` | one signal write per row | `exodra` `exodraDirect` + twin · `solid` `svelte` `react` `lit` `mikado` `uhtml` `sinuous` `marko` | |
| `toggle` | tear a 200-panel block out of the document and build a different one, ×20 | `exodra` `exodraDelegated` `exodraKept` `exodraKeptWarm` `exodraPlaced*` `exodraDetached*` `exodraChildren` · `floor·rebuild(+owned/frag/twin)` `floor·kept(+owned)` · `solid` `svelte` `react` `voby` `lit` `mikado` `mikadoPooled` `stage0` `uhtml` `sinuous` `marko` | the widest field here. `exodraKept` / `mikadoPooled` are **diagnostics** — read against `exodra` / `mikado` alone. The three `exodraBank*` rows are **gone with the node bank**, so no Exodra row here reuses an element. The native floor lives in `participants/floor/toggle.ts` |

### The mechanism axes — one backend, no framework comparison

Each is registered as an axis only to reuse the runner (Vite + headless Chromium + the recorder).
None of them ranks libraries. Each owns its own `PROGRAMS` array and its own table printer, so
**`--only` does not reach them.**

| axis | the question | programs |
|---|---|---|
| `clone-threshold` | how big must a template be before cloning beats `createElement`? | `clone` `manual`, at 6 sizes |
| `import-node-trade` | where do page-owned and template-owned prototypes cross over? | synthetic 1–64-node flat and chain shapes, 4 cells each. **Never recorded** |
| `schema-build` | **source not in the tree** (never committed; only `measurements/schema-build.published.json` survives) — what does constructing a schema cost? | `literal` `+number` `+builder` `+checks` `createExoSchema` `checks·parts` `spec·cold/warm` + twins |
| `keystroke-floor` | what does one keystroke in a controlled 50-field form cost? | `driver` `floor` `floor·per-el` `floor·root` `exodra` `exodra·deleg` `exodra·free` + twin |
| `op-click-floor` | how much room is there below a shared handler — one module-level function plus a per-position subject — at one click on one row of 200, and what does the delegated pack cost against the direct one? | `driver` `floor·per-el` `floor·root` `exodra·closure` `exodra·op` `exodra·op·deleg` + twin |
| `handler-count` | does a wire care that each instance makes 1, 4 or 16 functions? | `floor` `wire` `machine` `driver` × n1/n4/n16 + twins, `dom·A16` |
| `attr-floor` | what does writing a non-text attribute cost, and how much room is below it? | `driver` `floor` `floor+cell` `exodra` `exodra·writers` + twin |
| `door-count` | what does a per-instance door cost — a wire that allocates one per door vs a machine that allocates none? | `floor` `wire` `machine` ladders (`@exodra/string`, 1000 rows) |
| `door-shape` | nine ways to reach a port and write it, head on, against a floor | `floor` `walk` `prototype` `ctor` families |
| `port-write-doors` | is a writer that resolved its node once cheaper than one that resolves on every write? | `floor` `set` `bound` + twins (`@exodra/dom`) |
| `write-ladder` | does a direct port reference beat an index into an array at 1, 4, 16 writes? | `floor` `indexed` `held` × n1/n4/n16. Imports nothing from `@exodra/*` |
| `receiver-spelling` | four spellings of one per-instance receiver | `protoLiteral` `ctor` and their in-object variants. Imports nothing from `@exodra/*` |
| `receiver-maps` | what does the number of receiver maps cost a shared body's field reads? | `maps1` `maps2` `maps4` … `free`. Imports nothing from `@exodra/*` |
| `walk-record` | cheapest way to walk a freshly cloned subtree and record its nodes | `clone` `+inline` `+tape` `+closures` + twins |
| `one-and-static` | `createExoStatic` and `createExoOne` — the two core entry points no axis had loaded | `native` `native·swap` `inline` `bindOne` `one·slot` `static` `swap·same` `empty·wire` `driver` + twins |
| `plugin-compose` | what does composing a backend out of plugin packs cost, at declaration and at call? | plain / merged / wrapped at 1, 4, 12, 32 packs |
| `plugin-price` | what do `withExoChildrenWalk` and `attachExoKeyedList` cost against the shipped default? **Neither exists any more** — this axis cannot be asked until it is re-pointed at a pack that does | `shipped(+all/op)` `keyed(+walk)` `walk` `native(+find/held/rebuild)` `store·bound` + twins |
| `machine-vs-cells` | three ways to write a component's per-instance update path, on four scenes | `floor` `machine` `wire·n1/n4/n16` and the push/direct programs |
| `ssr-floor` | `@exodra/string` vs a hand-written program producing the same 140 kB | 14 rungs: `floor` `esc` `+vals` `+head` `+wr` `+fill` `+reset` `+set` `+call` `+wire` `+frame` `+try` `+stack` `exodra` |

*Participants above are read off the axis files, not off prose. Re-read them before quoting a row.*

## The file map — the 81 runnable and supporting files

The five kinds below are 81 of the 99 `.ts`/`.tsx` under `src/benchmarks/`; the other 18 are the
app files in `apps/` and `marko/flush.ts`, listed under *the sibling directories* at the end.

`c/k` is comment lines ÷ code lines. **26 of these 81 carry more comment than code**; those rows
are marked ⚠ and are the target list for a prose sweep.

### AXIS — 39 files, registered in `scripts/run-one-axis.js`

| file | axis name(s) | c/k |
|---|---|---|
| `axes/app/initial-render.tsx` | `initial-render` | ⚠ 1.50 |
| `axes/app/exodra-initial-render.tsx` | `exodra-initial-render` | ⚠ 1.70 |
| `axes/app/app-update.tsx` | `app-update` | 0.83 |
| `axes/app/exodra-app-update.tsx` | `exodra-app-update` | ⚠ 1.94 |
| `axes/list/list-reconcile.tsx` | `list-update` | 0.74 |
| `axes/list/reconcile.tsx` | `reconcile` | 0.58 |
| `axes/list/list-replace.tsx` | `refetch`, `pagination`, `rewire` | 0.54 |
| `axes/list/reactive-update.tsx` | `reactive-update` | 0.69 |
| `axes/list/toggle.tsx` | `toggle` | 0.90 |
| `axes/list/virtual-list.tsx` | `virtual-list` | 0.22 |
| `axes/app/component-split.tsx` | `component-split` | 0.81 |
| `axes/phases/clone-threshold.tsx` | `clone-threshold` | 0.43 |
| `axes/phases/mount-phases.ts` | `mount-phases` | 0.64 |
| `axes/phases/child-mark.ts` | `child-mark` | 0.57 |
| `axes/phases/context-cost.ts` | `context-cost` | 0.61 |
| `axes/phases/teardown-phases.tsx` | `teardown-phases` | 0.62 |
| `axes/phases/import-node-trade.ts` | `import-node-trade` | 0.70 |
| `axes/floors/mount-floor.ts` | `mount-floor` | 0.63 |
| `axes/floors/update-floor.ts` | `update-floor` | 0.56 |
| `axes/floors/hydrate-floor.ts` | `hydrate-floor` | 0.69 |
| `axes/floors/ssr-floor.ts` | `ssr-floor` | 0.74 |
| `axes/floors/teardown-floor.ts` | `teardown-floor` | 0.77 |
| `axes/floors/keystroke-floor.ts` | `keystroke-floor` | 0.86 |
| `axes/floors/op-click-floor.ts` | `op-click-floor` | 0.90 |
| `axes/mechanism/handler-count.ts` | `handler-count` | 0.36 |
| `axes/mechanism/door-count.ts` | `door-count` | 0.31 |
| `axes/floors/attr-floor.ts` | `attr-floor` | 0.71 |
| `axes/mechanism/plugin-compose.ts` | `plugin-compose` | 0.49 |
| `axes/mechanism/one-and-static.ts` | `one-and-static` | 0.51 |
| `axes/mechanism/plugin-price.ts` | `plugin-price` | 0.61 |
| `axes/mechanism/machine-vs-cells.ts` | `machine-vs-cells` | 0.46 |
| `axes/mechanism/port-write-doors.ts` | `port-write-doors` | 0.61 |
| `axes/mechanism/door-shape.ts` | `door-shape` | 0.30 |
| `axes/mechanism/receiver-spelling.ts` | `receiver-spelling` | 0.18 |
| `axes/mechanism/walk-record.ts` | `walk-record` | 0.15 |
| `axes/mechanism/receiver-maps.ts` | `receiver-maps` | 0.15 |
| `axes/mechanism/write-ladder.ts` | `write-ladder` | 0.09 |

### PARTICIPANT — 30 files, mount adapters; never run directly

| file | belongs to (axes that import it) | c/k |
|---|---|---|
| `participants/exodra/app.tsx` | **mounts the markup reference** (`apps/exodra/exodra.tsx`). `app-update`, `component-split`, `mount-*`, `update-floor`, `hydrate-floor`, `teardown-floor`, `child-mark` + every participant's byte gate | 0.56 |
| `participants/exodra/inline.tsx` | `initial-render`, `app-update` | 0.18 |
| `participants/exodra/machine.tsx` | `initial-render`, `exodra-initial-render`, `app-update`, `exodra-app-update` | 0.14 |
| `participants/bundled/todo-app.tsx` | loads **solid, react, voby, svelte, marko** — `initial-render`, `exodra-initial-render`, `app-update`, `exodra-app-update` | 0.17 |
| `participants/floor/app.ts` | the native floor of the clicked app axes — `app-update`, `exodra-app-update` | ⚠ 1.75 |
| `participants/floor/toggle.ts` | the native floor of `toggle` (dynamic import) | ⚠ 1.96 |
| `participants/angular/app.ts` | **nothing — unreachable, see the dead list** | 0.72 |
| `participants/lit/app.tsx` | `initial-render`, `exodra-initial-render`, `app-update`, `exodra-app-update` | 0.31 |
| `participants/lit/list.tsx` | `list-update` | ⚠ 6.10 |
| `participants/lit/reactive.tsx` | `reactive-update` | ⚠ 3.20 |
| `participants/lit/reconcile.tsx` | `reconcile` | ⚠ 3.41 |
| `participants/lit/toggle.tsx` | `toggle` | ⚠ 2.88 |
| `participants/mikado/app.tsx` | `initial-render`, `exodra-initial-render`, `app-update`, `exodra-app-update` | 0.18 |
| `participants/mikado/reactive.tsx` | `exodra-initial-render`, `exodra-app-update` | 0.35 |
| `participants/sinuous/app.tsx` | `initial-render`, `app-update` | 0.17 |
| `participants/sinuous/list.tsx` | `list-update` | ⚠ 1.44 |
| `participants/sinuous/reactive.tsx` | `reactive-update` | ⚠ 1.09 |
| `participants/sinuous/reconcile.tsx` | `reconcile` | ⚠ 1.16 |
| `participants/sinuous/toggle.tsx` | `toggle` | ⚠ 1.22 |
| `participants/stage0/app.tsx` | `initial-render`, `app-update` | 0.17 |
| `participants/stage0/list.tsx` | `list-update` | ⚠ 1.84 |
| `participants/stage0/reconcile.tsx` | `reconcile` | ⚠ 1.47 |
| `participants/stage0/toggle.tsx` | `toggle` | ⚠ 1.45 |
| `participants/uhtml/app.tsx` | `initial-render`, `app-update` | 0.26 |
| `participants/uhtml/list.tsx` | `list-update` | ⚠ 2.67 |
| `participants/uhtml/reactive.tsx` | `reactive-update` | ⚠ 2.85 |
| `participants/uhtml/reconcile.tsx` | `reconcile` | ⚠ 3.12 |
| `participants/uhtml/toggle.tsx` | `toggle` | ⚠ 2.71 |

### SHARED — 7 files, in `shared/`

| file | what it is | imported by | c/k |
|---|---|---|---|
| `shared/todo-spec.ts` | the scene (80 cards, 10 decks, 5 users) + the two DOM helpers every participant is exercised with | **43 files**, the most-imported file here | 0.40 |
| `shared/card-driver.ts` | how a card is advanced **without** a synthetic event — the registry `app-update` is built on | 22 files | ⚠ 2.41 |
| `shared/app-files.ts` | which source files each participant's app is, as data | `shared/app-lines.ts` **and `vite.config.ts`** | 0.80 |
| `shared/app-lines.ts` | counts those files' lines at run time for the LOC column | 7 axes | 0.80 |
| `shared/exo-machine.ts` | Form B's machinery (numbered fields, masks, transitions) | `axes/mechanism/machine-vs-cells.ts` only | ⚠ 2.69 |
| `shared/machine-state-shapes.ts` | the two state shapes `@exodra/core` does not ship | `axes/mechanism/machine-vs-cells.ts` only | ⚠ 1.52 |
| `shared/exo-inline-computed.ts` | the wire-shaped derivation API, built from the shipped machine | `apps/exodra/exodra.tsx` only | ⚠ 1.64 |

### GATE — 3 files, in `gates/`

| file | what it gates | imported by | c/k |
|---|---|---|---|
| `gates/markup-gate.ts` | the byte-for-byte markup diff every axis shares, one copy — the gate the other two build on | 26 files | 0.79 |
| `gates/svelte-marko-gate.ts` | the two **compiled** participants; owns their synchronous flush | `initial-render`, `app-update`, `participants/exodra/inline.tsx`, `gates/solid-react-voby-gate.ts` | ⚠ 1.80 |
| `gates/solid-react-voby-gate.ts` | the three participants that were ungated until it existed | `initial-render`, `app-update` | ⚠ 10.58 — the worst ratio here |

### PROFILER — 2 files, in `profilers/`, not axes

| file | fired by | c/k |
|---|---|---|
| `profilers/profile-app.tsx` | `scripts/profile-app.mjs` (`npm run profile:app`) | 0.86 |
| `profilers/profile-list-ops.tsx` | `scripts/profile-list-ops.mjs` (`npm run profile:list-ops`) | 0.38 |

### Not in the 81 — the sibling directories

| path | what it is |
|---|---|
| `src/benchmarks/apps/` | 36 files, twelve directories: each participant's **app itself** plus a `.md` of its notes, an `apps/README.md`, and `apps/scene/` holding `spec.ts` (the scene) and `slot.ts` (the door Solid and React hand their round out through). `apps/exodra/` holds `exodra.tsx` — the one Exodra app, an imperative machine — plus `exodra-shared.tsx`, the two leaf components it renders |
| `src/benchmarks/marko/`, `src/benchmarks/svelte/` | the compiled participants' apps, in their own languages; `marko/flush.ts` is the one `.ts` among them |
| `src/harness.ts` | `abBench` — the shared sampler, rotation, null-control and recorder contract |
| `src/main.ts` | the browser UI's axis list (10 of the 41) |
| `ssr/` | a **separate suite**: Exodra vs Solid vs Qwik through a throttled network, prod builds, Playwright + CDP. Not run by `run-one-axis.js` |
| `bench/`, `dom-bench/` | the isolated Angular build, and a standalone 1000-row DOM page |
| `measurements/`, `.gate/` | recordings. `measurements/<axis>.<label>.json` is the published set; `.gate/` holds working labels |

## Known broken

- **`participants/angular/app.ts` is unreachable and deliberately so** — see the dead list. It is
  the only entry left here.

### ⚠️ Most of this suite does not compile against the current runtime

This is the largest entry in this section and it is not a participant-by-participant list, because
the breakage is one shape repeated: **the names these sources import do not exist in the current
runtime.** Counted off the tree:

| deleted name | files still importing it | what it is now |
|---|---|---|
| `withExoBinding` | 26 | nothing — following data is a transition writing the `attr`/`text`/`unsafeHtml` doors a bare backend already answers, run by an effect that draws first and then subscribes to the data source |
| `TExoDomWire` | 23 | `createExoMachineBuilder<TExoDomNode>`, from `@exodra/core` |
| `TExoBindingApi` | 10 | nothing — there is no binding pack to intersect into an exonode type |
| `TExoBindingWiring` | 3 | nothing, same reason |
| `withExoNodeBank` | 2 | nothing — the node bank is gone, which the `toggle` row already says |
| `TExoStrWire` | 1 | `createExoMachineBuilder<TExoStrNode>` |
| `withExoChildrenWalk`, `withExoKeyedList`, `attachExoKeyedList` | 1 each | `withExoChildrenWalk`: nothing; the keyed list is `EXO_KEYED_LIST_VOCABULARY` / `createExoKeyedList` in `@exodra/list-reconcile` |

`c.bindList`, `c.bindChildren`, `c.bindOne`, `c.bindMany` and `c.set` are gone with them: the write
doors are `attr`, `text`, `html` and `on`, a fixed list is `c.list(port, C, count)` taking a
**count**, and a reactive list is `c.childList(port)` opened in the initial state and handed to
`reconcileExoOrder(kids, shown, keys, want, build)` from `@exodra/list-reconcile` by a transition. An initial state is `(enode, index)` and there are no props anywhere.

**Repairing the sources is a separate piece of work and this README is not it.** Until it is done,
treat the axis table below as a description of what each axis WAS WRITTEN TO ASK, not of something
you can run today, and treat every number in `measurements/` as a recording of a renderer whose
source no longer compiles. `createExoSchema` and `createExoMachineBuilder` from `@exodra/core`,
`createExoStatic` and `createExoOne` have already landed in several axis files, so the repair is partly done and partial
in a way that cannot be read off a file name.

`ssr-floor` used to sit in this list as *dead at load*, on two reasons: an import of
a per-schema helper `@exodra/string` does not export, and five rungs calling `c.reset()`,
which the string exonode does not have. **Neither reason holds against the file on disk**, and
nothing in it calls `reset`. It is nevertheless in the table above: it imports `TExoStrWire`, which
`@exodra/string` no longer exports. Its other imports are real — `escapeExoAttributeValue` and
`escapeExoText`, `createExoSchema` and `createExoMachineBuilder` from `@exodra/core`,
and `ExoStrBackend`, `exoStrSchemaOf`, `renderExoStrInstance`
from `@exodra/string`. That is read off the source, not from a run; the axis has not been
re-recorded since, so
`measurements/ssr-floor.published.json` is still the only recording of it.

## The one Exodra participant

There is exactly ONE Exodra renderer in this suite: the SCHEMA CORE — machines built with
`createExoSchema` and `createExoMachineBuilder` from `@exodra/core`, rendered by `ExoDomBackend.render` from `@exodra/dom` and by
`ExoStrBackend.render` from `@exodra/string` on the server. A backend is
built ONCE, at module level, in every participant: it is the schema cache key and is compared by
pointer, so one built inside a timed loop would recompile every declaration on every iteration and
the axis would be measuring the compiler.

**THE ROW LABELLED `exodra` — THE BINDABLE SPELLING — IS OUT OF THE COMPARATIVE TABLES.** The
renderer is now presented as the two spellings it is meant to be read as: **`exodraDirect`** (the
WIRE — `c.attr` / `c.text` at wire time, children ports held as child lists the handlers command)
and
**`exodraMachine`** (the STATE MACHINE — the card's values, state and children compiled into one
program, advanced by transitions). The bindable app — a cell per card per varying thing, a reactive
list per children port, a click writing a cell — has been taken off `initial-render`,
`exodra-initial-render` and `exodra-app-update`.

It has NOT been deleted, and the reason is structural rather than sentimental.
`apps/exodra/exodra.tsx` is still (a) the MARKUP REFERENCE every other participant is diffed
against before anything is
timed, (b) one half of `app-update`'s NULL PAIR (`exodra` ↔ `exodra·twin`), which is where that
axis's resolution floor — and therefore its right to publish any gap as a QUANTITY — comes from,
and (c) the measurement SUBJECT of six floor/phase diagnostics: `mount-floor`, `mount-phases`,
`teardown-floor`, `child-mark`, `hydrate-floor` and `component-split`. Moving any
of those onto a surviving row changes what it measures; none of it is a rename.

The three-props renderer that used to hold the name `exodra`, and the `@exodra/cursor`
prototype that used to sit beside it, have both been deleted from the repository. Any older
table with an `exodra` row next to a `schema` row is comparing two renderers, one of which no
longer exists; those numbers are not reproducible here.

Rows carrying the same prefix are that SAME renderer under a different configuration, and
unless the entry says otherwise they are DIAGNOSTICS: read them only against `exodra`, never
against the third-party field. The one exception is marked as such — `exodraDelegated` competes,
because it rebuilds exactly as `exodra` does and passes the same identity gate every
third-party row passes.

| row | axis | what it is |
|---|---|---|
| `exodraOps` | `list-update` | the same list told WHAT CHANGED instead of handed a new array |
| `exodraDelegated` | `toggle` | **a COMPETING row, not a diagnostic.** The same block, the same 200 panels and the same 40 transitions, rendered with `createExoDelegatedEvents(['click'])` instead of the default `EXO_DIRECT_EVENTS` — so a show writes two properties per panel where `exodra` calls `addEventListener` 200 times. It differs from `exodra` in TWO things and the axis header names both: the event pack, and the fill that pack REQUIRES (a shared handler plus a subject, because the delegated strategy refuses a fill with no subject). So its delta against `exodra` is "delegation + subject", never delegation alone; the third row that would isolate delegation — the direct pack with the same shared handler and subject — is not on this axis, and `op-click-floor` is the axis written to carry that pair (`exodra·op` against `exodra·op·deleg`). Its delegated root is the scenario's own container — where `backend.render` installs the pack — in the bubble phase, against Mikado's `window` in capture |
| `exodraKept` | `toggle` | the block's 200 panels built once in setup, kept alive across the hide (each child's `unmount` overridden — the documented `exoNodeDom` extension point) and re-filled with the next generation's text instead of rebuilt: a pool with a hit rate of 1. Its counterpart on that axis is `mikadoPooled` (Mikado with `{ recycle: true, pool: true }`), which is Mikado's own answer to the same question and is likewise a diagnostic, read against `mikado` alone |
| `exodraMono` | `component-split` | the whole 80-card app as ONE schema instead of four |
| ~~`exodraOimdb`~~ | **REMOVED** | the identical renderer reading an oimdb store instead of `exoBindable()`. **Gone from the suite**: it was a bindable Exodra app and it had gone stale (its tag entity predates `TCardTag.chars`, so `TAG`'s wire read `undefined.getValue()`). Its app files and its participant module are all gone from the tree. `exodraOimdb − exodra` was the suite's only measurement of what a real store costs, and nothing measures that now |
| ~~`exodraBanked`~~ | **REMOVED** | the very same `APP` value the `exodra` row renders, handed to a backend with the node bank composed. **Gone from the suite**: it re-declared no app at all, so it could not outlive the bindable participant it rendered. Its app files and its participant module are all gone from the tree. Re-pointing it at `exodraDirect` would be a NEW row whose hit rate nobody has measured, not a rename. The asymmetry it closed is back: every Exodra row on `app-update` and `initial-render` builds a BARE backend while `mikado` beside them runs `{ pool: true, cache: true }` |

## How participants are compiled

Two mechanisms, and which one a participant uses is a deliberate choice.

**Compiled by the shared dev server.** Exodra, Solid, Svelte, React, voby, Marko,
Lit, Mikado, stage0, uhtml and sinuous all go through the one `vite.config.ts`. Their production settings are stated there explicitly —
`process.env.NODE_ENV` forced to `production`, Solid's `dev: false` **and
`hot: false`**, Svelte's `dev: false` **and `hmr: false`**, Marko's
`optimize: true`, and export conditions that keep Solid off `dist/dev.js`. Those
lines are load-bearing: this suite measured React and Solid on their DEBUG builds
for its whole life because those settings were left to somebody else's default.

**And `NODE_ENV` is not the lever it looks like.** It is set here as a Vite
`define`, which is a string replacement performed on client code — the Node
process running the dev server never sees it, so anything a plugin decides from
`config.isProduction` or `config.mode` decides it as *development*. That is how
two more participants stayed on development machinery long after the React/Solid
fix went in: Svelte kept `compilerOptions.hmr` on (the HMR wrapper around every
component, plus the loss of the `is_standalone` markup optimisation), and Solid
kept `solid-refresh` injected into every `.tsx` — not only its own, since the
plugin transforms them all and the refresh pass wraps any top-level PascalCase
function component it finds. Each needed its plugin's own switch, named above.

**So the question is asked by the suite, not remembered by a person.**

```bash
npm run check:build-modes --workspace=@exodra/benchmarks
```

`scripts/check-build-modes.mjs` starts a dev server, fetches every participant
module at the URL the browser would use, and searches the returned JavaScript for
markers only a development transform emits; then it reads
`node_modules/.vite/_svelte_metadata.json` (vite-plugin-svelte's own record of the
compiler options it resolved) and `node_modules/.vite/deps/_metadata.json` plus
the emitted `deps/*.js.map` to prove which build of each dependency is being
served. `scripts/run-one-axis.js` runs the same check immediately after it starts
its dev server and refuses the axis if anything fails; `--no-build-check` skips
it, in a run that then cannot claim to have checked.

**Angular is set up but NOT INSTALLED, so no axis runs it.** Its participant, its
build script and its app are all here; `@angular/*` is not in this package's
dependencies, because that toolchain pulled a second Vite into the workspace and
broke every other participant. Nothing below describes a row you will see in a
run today — it describes how to bring one back. Re-add the packages, the
`BUILT_PARTICIPANTS` entry in `scripts/run-one-axis.js`, the participant lines in
the two axes and their titles, in one change.

**Built on its own.** Angular. `bench/apps/angular/app.ts` is compiled by
`bench/build/build-angular.mjs` into a single self-contained ES module,
`public/bench/angular.js`, which the page loads at runtime:

```bash
npm run build:angular --workspace=@exodra/benchmarks
```

Angular is separated because its toolchain does not fit beside anybody else's:
compiling it needs `@analogjs/vite-plugin-angular`, which needs
`@angular/compiler-cli` and `@angular/build`, and `@angular/build` depends on a
pinned Vite of its own. In the shared config that made every other participant
hostage to Angular's upgrade schedule. Behind a build script it is hostage to
nobody — and if Angular ever needs a Vite the rest of the suite cannot have, that
script can be given its own `package.json` and `node_modules` without a single
other participant moving.

This is the same arrangement the SSR half already uses (`ssr/build/build-*.mjs`
writes `ssr/dist/<name>/`, and the measure scripts load the built artifact), and
it is why that half is unaffected by whatever the shared install is doing.

**What a built participant costs.** It does not hot-reload: editing
`bench/apps/angular/app.ts` while the dev server is up changes nothing until the
build is re-run. `scripts/run-one-axis.js` is written to re-run it before the two
axes that would use Angular, because a loader can detect a MISSING artifact but
not a stale one, and a benchmark quietly measuring last week's code is worse than
one that fails — but its `BUILT_PARTICIPANTS` map is EMPTY while the packages are
uninstalled, so nothing is rebuilt today. Re-adding the entry is part of the same
one change described above.

`public/bench/` is build output and is not tracked.

## The app the axes share

`src/benchmarks/shared/todo-spec.ts` holds the app's numbers (10 decks × 8 cards = 80 cards,
the tag pool, the five users, the update rule) and the two DOM helpers every participant
is exercised with. It imports no framework, so a participant that is built in isolation can
take it without taking the whole field with it.

**The app is THREE deep: decks → cards → tags.** A deck carries a name (its own state,
renamed by a `.ren` click every round), an author (one of the five users, whose name it
renders as a constant) and a creation date rendered at the precision its author's shared
setting asks for. That last one is why the third level is there: advancing ONE user's
setting now moves 40 tag texts at depth three and 2 deck dates at depth one, and the date
is the app's first value with real formatting cost rather than a slice or a concat. The
middle level is the point — a row of a list that is itself a parent, with its own ports,
its own state and its own handler. What the scene deliberately does NOT measure is a list
DIFF inside a list DIFF: a deck's eight cards are fixed at the mount.

**Scale, and what it does to older recordings.** 10 × 8 = 80 keeps the card population and
every card's index exactly as they were, so every per-card formula and the whole users
argument are untouched; the tree went from 801 to 861 elements (+7.5%) and a round gained
10 renames and 2 date re-formats. No ABSOLUTE time from before that change may be pasted
beside one from after it on any axis that mounts or updates this app. Rankings and ratios
WITHIN one recording still cross the line, because every participant got the same
deepening in the same round. `apps/exodra/exodra.md` carries the full arithmetic.

`src/benchmarks/apps/exodra/exodra.tsx` is the REFERENCE implementation — Exodra's own — and every
other participant's markup is diffed against the tree it mounts, at mount and after one update
round, before a single number is read. It is the reference only; it is no longer a participant on
the comparative axes (see above). `src/benchmarks/participants/bundled/todo-app.tsx` is the LOADER
for the third-party field (Solid, Svelte, React, voby, Marko); it re-exports everything in the spec,
so `import { IDX } from '../bundled/todo-app'` keeps working.

## What the app cost each participant, in lines

Every axis that mounts this app prints an **`app LOC`** column beside the medians. A renderer that
is ten percent faster and takes twice the code has not won, and until this column existed the suite
printed only the half of that trade it could time. The participants implement the identical app and
are gated byte for byte before anything is measured, which is exactly the condition under which a
line count means something: same job, so the only thing the number can be about is what the library
made its author write.

**It counts whole files, and never a rule about line ranges.** Each participant's app lives in
`src/benchmarks/apps/<name>/` and holds the app and nothing else — components, state, handlers,
render entry. The mount adapter, the byte gate, the census reporter and the driver plumbing live in
the participant module (`participants/exodra/app.tsx`, `participants/mikado/app.tsx`, …) and are not
counted. `src/benchmarks/shared/app-files.ts` lists the files per participant; a shared file
(`apps/scene/spec.ts` — the scene; `apps/exodra/exodra-shared.tsx` — the tag and details block five
Exodra rows render unchanged) is counted for **every** participant that imports it, so the row that
reuses does not look smaller than the row that copies.

**It is counted at run time, not written down.** `scripts/app-sloc.mjs` hands each file to
TypeScript's own parser and counts the lines that carry a token, so comments and blank lines drop
out and a `//` inside a string stays part of the string. A `.svelte` file's `<script>` blocks go
through the same parser; its markup and a `.marko` file are counted line-wise, and that half
**throws** rather than guessing if a `//` ever appears anywhere but at the start of a line. Vite
computes the numbers in Node and hands them to the page as `virtual:app-sloc`; the axes read them
through `src/benchmarks/shared/app-lines.ts`.

**`—` means unmeasured, never small.** A floor row, a null control, a variant declared inside an
axis file and a participant whose files could not be read all print `—`, and the run prints a
refusal naming them.

Every axis carrying the column also states its own rows on `##ROWS##` and carries `appLines` into
the recording, so a reader of the JSON gets the whole trade rather than the half that can be timed.

`mount-floor` prints the figure as a census line instead of a column, and only for `exodra`: every
other program in that table is a straight-line mount written inside the axis file, so there is no
app file to count and none is invented.

## The three "template plus wiring" neighbours

`stage0`, `uhtml` and `sinuous` are the closest architectural relatives of the schema core —
all of them build the markup once, find the holes and write into them — and each is registered
on every axis where it can honestly express the scenario. Their participants live beside Lit's,
one file per framework per axis (`participants/stage0/app.tsx`, `participants/uhtml/list.tsx`, …),
and every one of those files states what it uses, what it deliberately does not, and what it
puts in the DOM that the reference does not.

| row | what it is | how to read it |
|---|---|---|
| `stage0` | the idea with nothing on top: clone a prepared node, keep the references the one walk found, write directly | a **CEILING**, not a competitor — every other row is this program plus what its library does for you, and none of it is transferable (the update path is written out by hand, per element) |
| `uhtml` | the `parts` model in its lightest form: one parse per call site, each hole reached by a recorded PATH rather than by re-walking the clone | a competing row |
| `sinuous` | template plus fine-grained reactivity, and the only member of the family with NO prepared template — `h()` builds the tree element by element | a competing row |

**`stage0` is not on `reactive-update`.** It has no reactivity, so the scenario would have to be
written imperatively and the measured region would be a thousand `node.nodeValue = v` writes with
no dispatch in front of them. That is this axis's floor, not a participant, and a row that
cannot lose is not a comparison.

## Covered Areas

See **The axes** at the top of this file — it is the list, with the participants each one actually
runs. This section used to carry a prose summary that named no axes and went stale.

## Diagnostics (not axes)

These are tools, not published comparisons. Each drives a real Chromium through Playwright and
prints an attribution table; none of them is part of `npm run bench`.

```bash
npm run profile:app --workspace=@exodra/benchmarks -- 300 exodra mount
npm run profile:app --workspace=@exodra/benchmarks -- 300 mikado update
```

`profile:app` takes a V8 CPU profile of the 80-card app being mounted or flipped by ONE
participant (`exodra`, `mikado`, `marko`, `solid`, `floor`) and aggregates it by self time per
function. `floor` is the app's markup with no framework behind it, flipped the same way — what
every row pays before its renderer is reached.

```bash
npm run profile:list-ops --workspace=@exodra/benchmarks -- 20
```

`profile:list-ops` does the same for the list op path: 300 rows, 200 rounds of
{move, insert, remove, append}, attributed by function.

```bash
npm run verify:structure --workspace=@exodra/benchmarks
```

`verify:structure` mounts every participant once and counts the structural nodes against the
app's spec — the coarsest honesty check in the repo, and the one to run first when a number
looks impossible.

```bash
npm run dom-bench --workspace=@exodra/benchmarks
```

`dom-bench` bundles `dom-bench/entry.ts` into `dom-bench/bundle.js` (`build:dom-bench` on its
own does just that step) and then serves `dom-bench/page.html` in headless Chromium through
`scripts/run-page.mjs`. The page times a first render of 1000 rows against a hand-written
floor, and it times ITSELF in batches because Chromium coarsens `performance.now()` to 100 µs —
the size of the whole answer. The bundle is build output and is not tracked; it is rebuilt on
every run, so it cannot go stale against a `npm run build` at the repo root.

```bash
npm run probe --workspace=@exodra/benchmarks -- toggle 2
```

`probe` runs ONE axis with a tiny round count and forwards every browser console line, which is
how "slow" is told apart from "hung".

```bash
npm run detached-memory --workspace=@exodra/benchmarks
```

`detached-memory` measures what N detached DOM subtrees cost in bytes — the question behind any
proposal to cache rows instead of rebuilding them. Read its header first: `performance.memory`
sees the JS heap only, so its figure is a LOWER bound and the exact node count comes from CDP
alongside it.

```bash
npm run axis --workspace=@exodra/benchmarks -- mount-phases
```

`mount-phases` splits ONE renderer's mount of the 80-card app into its phases — the clone, the
per-instance WALK REPLAY, the insertions, and the wiring call with its plumbing — and prints each
as ms per mount and as a share of the measured mount. It is registered as an axis only to reuse
that runner; it compares no frameworks. It exists to answer one question with a number before a
design that would remove part of the walk is proposed, so it prints the walk TWICE: once as
`(clone+walk) − clone` and once as the loop measured alone over pre-made clones. The two bracket
the answer, and the run says so out loud when they disagree. Its `mount` row is the same work as
the `exodra` row of `exodra-initial-render` and should read like it; if it does not, nothing else
in the output means anything. Read its header before its numbers — especially the six things it
states it CANNOT separate, of which the first (the walk warms exactly the nodes the setters then
write, so removing it may MOVE cost rather than remove it) is the one that decides how much the
answer is worth.

AN AXIS THIS SUITE NO LONGER HAS: `bank-vs-clone`. It priced one prototype acquired four ways —
`clone`, `bank pop`, `pop + port reset`, `pop + full reset`, plus the `ports + listeners`, `ports +
regions` and `ports + record` rungs of the reset ladder — against the node bank `@exodra/dom` used
to ship. The bank has been removed from the package, so the axis has no subject and its file is
gone. Nothing in this suite measures node reuse now; the recordings it left in `measurements/` and
`.gate/` describe a renderer that no longer exists and are not a bound on anything here.

```bash
npm run axis --workspace=@exodra/benchmarks -- teardown-phases 100 1
```

`teardown-phases` is `mount-phases` for the other direction: it splits ONE renderer's TEARDOWN into
its phases. It exists because the two recorded tables disagree — the schema core is 26% ahead of
Solid on the mount (`initial-render`) and 11% behind it on the repeat show (`toggle`), and a mount
tears nothing down while a toggle tears down as many panels as it builds, so the loss has to live
in the half nothing here measured.

It measures the `toggle` axis's block — 200 panels in a children port — and NOT the 80-card app,
because the 80-card app has no whole-app teardown to split: `AppHandle.teardown` is the render's
disposer, a card owns its own subscriptions, and the app's cards are a static list, so that call
removes no nodes and unmounts no child. A hide of the toggle block is the real thing, 20 times per
`toggle` sample.

A hide is split into the notification and remap, the DOM clear, and the per-child `unmount` loop —
and inside that loop into the registry eviction and the ending of subscriptions. **Each of the last
three is printed twice**, once by ladder subtraction and once measured alone, because a ladder
attributes every measurement error to its last rung; the two are a bracket, and the run prints `❌`
when they disagree by more than 4×. The per-child `dropExoChild` path is priced beside the owned
region's one-assignment clear, so what owning the parent buys is a number. Two rungs call the
renderer's own exported `clearOwnedExoChildList` and `dropExoChild`; the rest are copies, and the header
says which and what that costs.

Three gates run before any timing: the children port provably OWNS its element (read off
`schema.ownsElement`, so the hide provably takes the one-call clear and not the per-child path), the
two wirings whose difference IS the subscription cost build byte-identical markup, and every rung
provably leaves 0 panels standing, 0 registry entries and 0 live subscriptions — the last proved by
writing to all 200 sources after the teardown and requiring that not one detached panel answered.

Unlike `mount-phases`, it HONOURS the third positional: `batch` multiplies every
phase's repetition factor, and the run's refusal line names the batch to re-run with when a timed
region lands under three ticks of the clock it observed. Read the header's nine caveats before the
numbers — especially the first, which is the one that decides what the answer is worth: Blink
defers most of a detach past the end of the timed region, so every DOM figure here is a lower bound
and the `toggle` axis pays the remainder on its next show.

**There is no longer an axis that measures two backends of one core.** `dom-vs-stage0-phases` ran
the same five component variants through `@exodra/dom` and through a second in-repo DOM backend,
rung by rung, and `initial-render` carried an `exodraViaStage0` row beside it. Both went when that
backend did, together with every recording of either. Nothing in the map now prices the schema core
anywhere but in a browser through `@exodra/dom`, and the phase ladder that survives —
`mount-phases` — is hand-written replicas of ONE backend's internals, which is why a second backend
could never have been another rung in it.

```bash
npm run axis --workspace=@exodra/benchmarks -- import-node-trade 100 1
```

`import-node-trade` is the narrowest diagnostic here: it measures ONE LINE of `@exodra/dom`, and it
is the axis that settled that line. The compiler now ends with `const instanceProto = proto`
(`packages/dom/src/dom/compileExoDomSchema.ts:877`): the prototype is left in the inert
template-contents owner document the parser built it in. It used to read
`document.importNode(proto, true)`, guarded by a `hasAdoptingSteps` predicate, so nearly every
prototype was moved out of that document into the page's, once per schema. That was a **trade**: it
bought the DOM's "adopt node into parent's node document" walk — a walk of the whole inserted
subtree — never running on any insertion, and it cost whatever cloning a page-owned prototype costs
over cloning a template-owned one. The predicate's own header quoted 380 → 240 ns per insertion for
the half it bought, and said outright that those were the change author's numbers and that nothing
in this repository reproduced them.

**Why it was a second axis.** The deleted phase axis measured both halves in one run, but only at
the 80-card app's own subtree sizes — APP is 1 node,
CARD 8, DETAILS 2, TAG 2, and TAG is 200 of the 321 instances — so it priced the trade at about 3.5
nodes per instance, at one shape: about 95 ns of penalty per clone against about 26 ns saved per
insertion. **Those two rates can no longer be replayed off disk**, because that axis and every
recording of it went with the backend it compared against. The saving is a walk of the whole
inserted subtree and must grow
with node count; the penalty may or may not grow at the same rate. So the question this axis was
built to answer was not "is the trade wrong", it was **where is the crossover** — the subtree size
above which the import pays for itself, if there is one. Had there been one, the answer would have
been a size threshold in the predicate rather than a removal. **This axis has never been recorded
either**, so it is now the only surviving instrument for a decision with nothing on disk behind it.

It sweeps synthetic prototypes of 1, 2, 4, 8, 16, 32 and 64 nodes with **four cells at every size**
— clone page-owned, clone template-owned, insert page-owned, insert template-owned — the last two
into a container appended to the **live document**, because adoption is triggered by the parent's
node document differing from the child's and a detached parent measures the opposite of the
question. Each repetition inserts its own fresh clones, since a node appended once is page-owned
afterwards. It prints penalty, saving and net as **ns per instance and per node**, and names the
crossover size or states there is none in the swept range. A second shape — a nested chain against
the flat fan, same node count, same tags — is swept at three of the sizes, because the adoption
walk visits every node either way while cloning a chain and cloning a fan may not cost the same.

**Its control is a null whose true value is known to be zero**: at every flat rung a second
page-owned prototype, parsed and imported independently from the same markup, is cloned in its own
phase and inserted in its own phase. The larger of those two differences is that size's resolution
floor — what the instrument returns when there is nothing there — and every net is printed against
it and refused by name when it lands under it. The two sides of each 2×2 are **checked** identical,
markup and node count and owner document, and the run throws before timing anything if they are
not.

It **commits a falsifiable prediction in its header**, written before the first run — no crossover
anywhere in 1..64 nodes, because both halves are per-node walks of the same subtree — and prints
all four of its falsifiers mechanically at the end, so none of them can be chosen afterwards. It
honours the third positional as `teardown-phases` does. Read the header before the numbers,
especially caveats (C) and (D): the ladder is elements only and carries one attribute per node,
and both omissions push a real component's trade further into loss than the table shows.

**The prediction held, and the line went.** The sweep found no crossover anywhere in the range, with
the loss GROWING at about 14.9 ns per node over seven rungs, so there was no size for a threshold to
be set at and the import was removed rather than guarded. The removal was recorded at −9.2% on the
mount axis, 0.413 → 0.375 ms against a ±3.3% floor — but that −9.2% came from `import-node-trade`
and from a second axis since deleted with the backend it priced, and **neither was ever promoted
into `measurements/`**, so it is quoted reasoning rather than a recorded run. The pair that survives
in `measurements/` is `mount-floor`'s `CENSUS/clone` and `CENSUS/clone·page`, 0.2175 against 0.2387
with a null control reading 0.0000. `packages/dom/src/dom/tests/proto-ownership.test.ts` pins both
directions, so a reintroduction now fails a test rather than a benchmark.

```bash
npm run axis --workspace=@exodra/benchmarks -- update-floor 100 1
```

`update-floor` is `mount-floor`'s sibling and answers the same question about the other half of a
renderer's life. That axis bounds **mounting** and forbids itself from being quoted about updates,
for a reason worth repeating: **a program with no reactivity does not update, it rebuilds**, so
"the same program without the framework" does not exist for an update.

**What does exist is a floor for a specific transition.** Fix a before-state and an after-state and
there is a minimum set of DOM operations that takes one to the other — a `.data` store, an
`insertBefore`, a `remove` — and that set is a fact about the two states and the browser, not about
anybody's software. This axis writes that program for **five transitions taken from axes this suite
already publishes**: one text value on one row of a thousand and then all thousand
(`reactive-update`), a 200-row shuffle (`reconcile`), a 300-row list gaining and losing rows
(`list-update`), and the 80-card app's whole flip (`app-update`). Each is measured against
`@exodra/dom` performing the same transition through its reactive machinery, in the same session,
interleaved, in **microseconds per transition**.

**The gap has a precise meaning and it is not a defect.** The floor is handed the diff for free; the
framework has to *discover* what changed and to have kept, since the mount, the bookkeeping that
makes discovery possible at all. That discovery is what a framework is for, so the gap is **the
price of not having to write the update by hand** — the product, priced. Every row therefore
declares a **contract** — `told` (handed exactly what changed: a value, an op, a mover set) or
`derive` (handed the new state and left to work it out) — and every headline pairs rows that were
given the same information. The cross-contract ratio is printed beside it as the wider, weaker,
safer bound.

**The reorder floor is built twice**, because "may the floor know the minimum move set in advance,
or must it compute it?" has two defensible answers and they are different numbers. `floor·told` is
handed a flag per position, computed at module load; `floor·diff` is handed only the new array and
computes the same set inside the timed region, ending in **the same moves**. The difference between
them is the price of discovery with the DOM work held identical.

**The asymmetry that cannot be removed is measured rather than argued about.** The framework also
runs the subscription that told it to update at all, and the floor is called directly by a loop. So
two transitions carry a `floor·bound` row — the identical floor program, subscribed to the identical
source, fired by the identical `setValue` — which prices the dispatch (and the closure a
subscription needs in order to have something to call) and gives the ratio with the asymmetry handed
to the floor.

**Nothing is timed until every program has been stepped beside the renderer one transition at a
time**, with the markup diffed after every step. Not only at the end: three of these transitions are
cycles that return to their starting DOM, and an end-state check would pass a program that did
nothing at all. The `wide` transition is gated **twice**, because its renderer row is a
re-declaration of the card with its state hoisted — the real card keeps its state inside its own
machine instance, so driving `mountExodraApp` means 160 dispatched clicks, and
`participants/floor/app.ts` measured that
harness at 42% of an `app-update` round. The hoisted app is mounted beside the real one and both are
flipped four times, with the markup diffed after each flip.

Every transition carries **its own null** — a second, independently declared copy of its floor, with
its own function object and its own DOM, whose true difference is zero by construction — reported as
bias *and* paired noise, and as a percentage of that transition's own floor. The text transitions
additionally carry a `loop` control, the identical loop with the DOM write deleted, so that a floor
of a few tens of nanoseconds is read against the cost of iterating rather than against zero; the run
refuses its own attribution when the floor is not clear of it.

It **commits a falsifiable prediction in its header** which *disagrees on purpose* with the one
prior it was handed (that the DOM write is ~86% of the update path, implying every ratio near
1.16) — it expects that to hold for the structural transitions and to fail badly for the text ones,
because a `.data` store on a hot node is tens of nanoseconds and the path around it is six or seven
operations. All seven falsifiers are printed mechanically at the end. It honours the third
positional as `teardown-phases` does. **Its milliseconds are not `app-update`'s**: four of the five
transitions are fired by writing to a source, with no click harness inside the timed region.

```bash
npm run axis --workspace=@exodra/benchmarks -- hydrate-floor 100 2
```

`hydrate-floor` is the third of the floor family and the only one that is not a floor. The other
two bound a renderer with a program that has no framework in it at all; there is no such program
for hydration, because hydration is a *contract about what the server already computed* and a
hand-written walk of a hand-written string would bound "walking a tree" and bound nothing about it.
So this axis compares **two real paths through one renderer**, and that is all it does.

**The question is whether a server string plus hydration beats cloning a mountain of elements** —
is *serve the markup, then hydrate* cheaper than *clone and build on the client*, for a big list?
`packages/benchmarks/ssr/` does not answer it: that instrument is Exodra against Solid and Qwik,
production builds, Playwright with Fast-3G plus 4× CPU throttling, TTI defined as the first
*working* click. It answers "who wins a page load, against competitors, in wall-clock". This one
removes the network, the bundle, the compiler and the field, and asks what the same renderer costs
doing the same job two ways.

**The starting point is already measured and it is not what people assume.** `mount-floor` timed all
five parser doors on this app's 641 elements against cloning them: `innerHTML` **0.2763 ms** against
`clone+refs` **0.2288 ms**, with the whole parser family spread across 0.0075. **The parse is 21%
dearer than the clone.** Whatever hydration wins here, it does not win by parsing being cheap, and
any argument that begins "but the browser's parser is fast" has already been measured and has
already lost.

**It prints two answers and neither may ever be quoted as the other.** That is the whole design, and
it exists because the parse's *place on the clock* is the trap. In a real page the parse is not an
`innerHTML` call after load — it is the initial document parse, streamed, overlapping the network,
finished before the framework's JavaScript has run at all. The identical CPU work sits somewhere
completely different.

- **Question 1 — CPU total.** `parse+hydrate` against `mount`, both fully inside the timed region.
  This is the one that says which path does less work. It is the right question for a worker, a
  second render into an existing page, or any argument about battery and heat, and the **wrong**
  question for a cold page load.
- **Question 2 — what is left after the document is already parsed.** `hydrate` alone against
  `mount`, with the parse moved into the untimed prep. This models a real page load. It **charges
  hydration nothing for the parse**, which is realistic rather than generous *only* because a real
  browser genuinely does that parse off the framework's clock — and the parse is still real CPU on
  the user's, and it is still 21% dearer than cloning would have been.

**Three censuses, because the question says "big list".** One instance of `APP` (641 elements — the
exact tree `mount-floor` measured, and the *nested* adoption path a real server-rendered page has:
one top-level row, then `adoptExoList` for the 80 cards, then a region per card); the same 80 cards as
flat `CARD` rows (640 elements, the *flat* path, one wrapper element fewer); and 640 `CARD` rows
(5120 elements, **exactly 8× in every count**, because the app's spec is periodic with period 4).
The interesting quantity is whether the **ranking changes with size**, so the run prints
nanoseconds-per-element for every row at every size — this app grows by adding *instances*, every
term in both programs is per-instance, and a row whose ns/element moves has a term that is not, which
is the finding. `APP` cannot be asked for more than 80 cards without re-declaring it, so the sweep
runs on the flat form and the `app` row sits beside `rows·80` to price what the nesting costs
instead of assuming it.

**Its gate is the sharpest in this suite, and it has to be**: the point of hydration is that the
served bytes and the client-built tree are the same thing, and a hydration that silently adopted
nothing would be very fast, completely wrong, and would produce a perfectly plausible ratio. Four
checks per census, all before anything is timed, all throwing — (1) the served bytes are
byte-identical to a client mount, through the shared `markupOf`; (2) the post-hydration DOM is
byte-identical to both; (3) **hydration adopted the served nodes by identity** — every element
captured in document order before the call and compared object-by-object after it, so a hydration
that rebuilt the tree and happened to emit identical bytes passes every string compare in the file
and fails this one; and (4) **a port is live** — a real bubbling click toggles a region inside the
*same served card element*, and a second click restores the tree byte for byte, which proves at once
that the listener was attached, that the region's anchors survived adoption, and that the reconciler
can still find it.

**Its null is weaker than `mount-floor`'s and says so in the output.** Every program here is a call
into a published package, and this file may not carry a second copy of a package's source — so the
twins are separately declared wrappers over the same entry point, each with its own container and
its own independently produced copy of the served string, rather than two independently declared
programs. They share the library's inline caches, which a real null does not, so **this run's
resolution floor is a lower bound on the true one**. One null per family per census, reported as
bias *and* paired noise at six decimals and as a percentage of the thing being measured.

It **commits a falsifiable prediction in its header** — the owner's (hydration loses on CPU total,
wins question 2) and mine, which agrees on both directions, disagrees on both sizes with the
mechanism named, and adds a third claim that the ranking is scale-invariant on this app by
construction. Every falsifier is printed mechanically at the end. It honours the third positional as
`teardown-phases` does. **What it does not answer**: page load, TTI, or any wall-clock quantity
(that is `ssr/`); updates; teardown; memory; or any shape but this app's.

```bash
npm run axis --workspace=@exodra/benchmarks -- ssr-floor 100 1
```

`ssr-floor` is the fourth of the floor family and the only one on the **server** side:
`@exodra/string` rendering 1000 rows of one 5-port component, against a hand-written program that
produces the same 140 kB of markup with no framework in it at all.

**Its floor is cleaner than `mount-floor`'s, and that is the design question it had to answer
first.** That axis has to argue about *addressability*: a DOM with no reachable nodes is the
cheapest way to produce those bytes as nodes and is not a floor for any renderer, so it prints two
floors and spends a section on which may be quoted for what. A server render has no such
requirement — **the string is the whole product.** Nothing has to stay reachable, nothing will be
updated, nothing will be torn down. So there is **one** floor here, and the only thing it may not
skip is **escaping**: a renderer that prints a value into a text position unescaped is not a faster
renderer, it is an injection. The floor calls the *shipped* `escapeExoText` and
`escapeExoAttributeValue`, and the row that skips them is in the table as a **bound on the
concatenation work alone**, labelled as one everywhere it appears.

**Escaping is most of that floor** — and the SHARE depends on which floor, which is the whole of a
contradiction this file used to state as a fact. The owner's probe measured 0.063 ms of 0.077,
**82%**. The RECORDED axis (`measurements/ssr-floor.published.json`) gives `CENSUS/esc` 0.1125 and
`CENSUS/floor` 0.0575, so 0.0550 of 0.1125 — **48.9%**. Both are right, about different denominators:
the probe measured an unflattened rope and the axis measures a flat string, and `CENSUS/esc` minus
`CENSUS/esc·noflat` (0.1125 − 0.0875 = 0.0250) prices exactly that flatten on two rows running the
SAME function. **82% is unreachable on this axis by construction.** What DID reproduce is the
absolute cost: 0.0550 against 0.063, 13% apart. Quote the absolute figure, or quote a share with its
denominator attached; never the bare 82%.
The floor may know the *shape* — every static piece is a string literal, which is what a compiled
template is — and may **not** bake the *data*: every rung computes `data-id`, the href, the title
and the author from the row index inside its own timed region.

**What it exists to split is the 0.134 ms** between that floor and `@exodra/string` with a
stateless wire (0.211 ms). The obvious probe,
calling `schema.fillMarkup` directly, **has been tried and the seam is not there**: the fill takes
values the exonode has *already* written, so the escaping and the writer indirection live inside
`TExoStrNode.set`, and the attempt produced different markup.

**So the axis is a ladder of fourteen whole programs**, each producing all 1000 rows, consecutive
rungs differing by **one mechanism** — the event port's empty slot, the value array, the attribute
head moving out of the static markup and into the writer, the writer table, the shipped
`fillMarkup`, the per-row reset, the shipped `set`, the wire call, the context frame, the
`try/finally`, the connector stack, and `renderExoStrInstance` — and the price of a mechanism is the
difference between the two rungs that bracket it. **Every rung from `+set` upward is the package's
own code**, reached through a public entry point; nothing here re-implements a schema, a writer or a
filler. One of them (`+head`) measures the single claim `exo-writer-for-port` makes and explicitly
marks *unmeasured*.

It **commits ten falsifiable predictions in its header**, including **two predictions of zero** —
the context frame and the `try/finally`, both adopted on the argument that they cost nothing — and
prints every verdict mechanically at the end. `+call` against `exodra·flat` is a **control that
should be zero** (one schema lookup separates them); when it is not, the run refuses the whole ladder
by name, because the difference is then the module boundary and every rung inherits the doubt.

**Two things in it that no other axis here has.** Every timed region **flattens its result inside
the region**, because `+=` hands back a rope and a run that never read the string would charge `+=`
nothing for a copy `Array.join` pays eagerly — which would rig the `+=`-versus-`join` rung this
repository has now asserted three times in source comments without a number in the file. (`esc` −
`esc·noflat` prices the flatten itself, so today's un-flattened numbers can still be reconciled
with these.) And there is a **second two-row census on data that actually needs escaping**, because
the main census's data has to be escape-free — an unescaped row can only be gated byte-for-byte
when escaping is a no-op — so any escaping share quoted here is a statement about the escaper's
**fast path**. Measured while auditing this: zero of the 1000 rows carry an escapable character, so
all 4000 calls take the test-and-return path. `CENSUS/esc·dirty` is 0.8550, **7.6×** `CENSUS/esc`,
which is what the other end of that scale costs.

**Read caveat (1) before quoting the gap.** `@exodra/string` is not in `optimizeDeps.exclude` where
`@exodra/core` and `@exodra/dom` are, so Vite pre-bundles it with esbuild
while the hand-written rungs go through the dev server. That asymmetry **favours the library rows**,
which makes the reported gap a *lower* bound. **What it does not answer**: page load or any
wall-clock quantity (that is `ssr/`), hydration (`hydrate-floor`), other server renderers — there is
no third-party row in it at all — memory, Node, or any shape but this one component's.

```bash
npm run axis --workspace=@exodra/benchmarks -- teardown-floor 100 2 64
```

**Four positionals, because this axis has two repetition knobs and they pull opposite ways.** The
third is **Table 1's batch** and it is bounded by **memory**: every repetition of a `dom·*`/`both·*`/
`exodra` row holds one separately mounted 641-element app and all of them stand at once, so batch 2
is ~51,000 live elements and batch 8 will thrash. The fourth is **Table 2's cycle factor**, applied
on top of the batch, and it is bounded by **time alone** — a cycle builds its subject and drops it
*inside* the timed span, so a region of any length holds one app. Table 2's binding constraint is the
heap (a cycle region has to demand more allocation than the nursery holds, or V8 collects nothing
inside it and the table is Table 1 with a mount attached), and serving that through the batch is what
made the axis ask for batch 128 — 5120 standing apps. One command serves both tables, which is the
point: nothing this axis reports is ever compared across two runs taken under different conditions.
Both refusals name the number for their own knob, and the cycle rows cost ~7 minutes at factor 64.

`teardown-floor` is the fifth of the floor family and the direction the other four forbid
themselves from answering — `mount-floor` ends its header with "IT SAYS NOTHING ABOUT TEARDOWN",
and `update-floor` and `hydrate-floor` say the same. It measures the 80-card app, against programs
with **no framework in them at all**, and asks what the cheapest possible teardown of that app
costs. It is **not** `teardown-phases`: that axis splits one renderer's teardown into its own
internals on the 200-panel block `toggle` hides, and every rung of it is a hand-written replica of
`@exodra/dom`'s code.

**Reading the code changed the question before anything was timed, and it corrects something this
file already says above.** `mountExodraApp(c).teardown` **does no DOM work at all** — it is
`exoTeardownScope`'s closure running the render's disposers, the list disposer it calls unmounts
children, and `DISPOSE_SELF` explicitly does not touch the element. That much the `teardown-phases`
section above has right. What it gets wrong is the next sentence: *"a card owns its own
subscriptions … that call unmounts no child"*. It does not, and the chain is four hops of code —
`ExoDomBackend.render` passes `ownerChild = null` into `mountExoInstance`; `wireExoInstance` writes
it onto the instance record as `child`; `TExoDomNode.list` reads `owner = this.child` and passes
**that** down, so
every card is wired with `child = null` too; and a card mounted through `mountExoInstance` is not a
`TExoDomChild` at all, because only `buildExoChild` makes one. So all **320** `exoOnTeardown` calls take
the ambient-scope branch, and the app's whole-app disposer runs 320 closures and **240** child
`unmount`s. It still removes no node, which is the half that was right.

**So every row carries two contracts**, and headlines pair only inside one (`update-floor`'s rule):
what the program promises about the **document** (`detach` — nodes out and unreferenced; `drop` —
the container leaves with the tree still inside it and wholly reachable; `none`) and what it
promises about the renderer's own **state** (`full` — subscriptions ended *and* records released,
which is what `@exodra/dom` does; `unsub`; `none`). "The renderer versus `textContent = ''`" is a
comparison of two programs that share no part of the job, and the run says so every time it prints
it. The contract claim is **checked in a throwing gate**, not asserted: markup byte-identical
across `teardown()`, and a real bubbling click on all 80 toggles afterwards that must move
*nothing*, where the same click on a live app moves the markup and a second click restores it.

**It prints two tables and says which may be quoted for what, and that is the part it exists for.**
A teardown's cost is partly *deferred*: Blink defers the detached subtree's destruction to a
lifecycle update no page can observe, and the shared runner forces a GC *before* every timed region
— so the garbage a region makes is collected outside every timed region, **by construction**. A
stop-the-clock-at-`dispose()` table therefore measures exactly the half that is cheap to make look
good, and `book·drop` (**one store**, and the whole graph becomes unreachable) sits in it as the
proof. **The honest table is `CYCLE`**: N complete mount → teardown → drop cycles inside one region
with no GC in it, so whatever V8 collects to keep going is inside the measurement. It prints the JS
heap delta across each cycle region and **refuses the table by name** when the heap grew by a whole
region's worth of garbage — which means no collection happened inside and the row has not yet done
its job. Even then it is a *lower* bound: a collection V8 defers past the end of a region is
charged to the next region's untimed pre-GC.

**Eleven falsifiers** are committed in the header before the programs were written — two of them
the owner's own priors, both predicted to fire — and all are printed mechanically at the end. It
honours the third positional as `teardown-phases` does, and **batch 2 is the one to run for a
reason that is memory and not the clock**: every repetition of a DOM row holds one separately
mounted 641-element app and all of them stand at once, so batch 2 is ~51,000 live elements, the
same set `mount-floor` carries at its own recommended batch. **What it does not bound**: mounting
or updating; the `toggle` axis's loss (a toggle's teardown is the reconciler's full-clear branch on
a live region, a different program); memory as a quantity (the heap column is an instrument check);
Blink's deferred destruction; or any shape but this app's.

## Output

Each result reports median, average, min, max, and operation count. Treat these
numbers as comparative development signals, not as a formal performance claim.

## The layout, and the ten places that pin it

`src/benchmarks/` splits by **kind** at the top, and inside `participants/` by **framework**.

**Why framework and not scene inside `participants/`.** Scene grouping would read better — a
`toggle/` directory holding every framework's toggle — but `tsconfig.typecheck.json`'s exclude list
is the package's OURS-versus-THEIRS classification, and per-framework directories collapse it to one
glob per framework (`src/benchmarks/participants/lit/**`, and the matching `src/benchmarks/apps/lit/**`
for that framework's app half). That keeps the gate's failure mode pointing the right way: the list
is an EXCLUDE, so a new file is checked by default and a new unclassified competitor fails loudly.
Scene grouping would scatter each framework across five directories and make the list five times
longer.

```
src/
  harness.ts                    # abBench — the sampler, rotation, null control, recorder contract
  main.ts                       # browser UI axis list — 10 of the 41
  benchmarks/
    axes/
      app/          initial-render.tsx  exodra-initial-render.tsx  app-update.tsx
                    exodra-app-update.tsx  component-split.tsx
      list/         list-reconcile.tsx  reconcile.tsx  list-replace.tsx
                    reactive-update.tsx  virtual-list.tsx  toggle.tsx
      floors/       mount-floor.ts  update-floor.ts  hydrate-floor.ts  ssr-floor.ts
                    teardown-floor.ts  keystroke-floor.ts  op-click-floor.ts  attr-floor.ts
      phases/       mount-phases.ts  teardown-phases.tsx  child-mark.ts  context-cost.ts
                    import-node-trade.ts  clone-threshold.tsx  clone-vs-create.ts
      mechanism/    handler-count.ts  door-count.ts  door-shape.ts  port-write-doors.ts
                    write-ladder.ts  receiver-spelling.ts  receiver-maps.ts  walk-record.ts
                    one-and-static.ts  plugin-compose.ts  plugin-price.ts  machine-vs-cells.ts
    participants/
      exodra/       app.tsx
      floor/        app.ts              # the clicked and driver floors
                    toggle.ts           # the toggle axis's 2x2 of native floors
      lit/          app.tsx  list.tsx  reactive.tsx  reconcile.tsx  toggle.tsx
      mikado/       app.tsx  reactive.tsx
      sinuous/      app.tsx  list.tsx  reactive.tsx  reconcile.tsx  toggle.tsx
      stage0/       app.tsx  list.tsx  reconcile.tsx  toggle.tsx
      uhtml/        app.tsx  list.tsx  reactive.tsx  reconcile.tsx  toggle.tsx
      bundled/      todo-app.tsx        # solid + react + voby + svelte + marko loader
      angular/      app.ts              # unreachable — see the dead list
    gates/          markup-gate.ts  svelte-marko-gate.ts  solid-react-voby-gate.ts
    shared/         todo-spec.ts  card-driver.ts  app-files.ts  app-lines.ts
                    exo-machine.ts  machine-state-shapes.ts  exo-inline-computed.ts
    profilers/      profile-app.tsx  profile-list-ops.tsx
    apps/           one directory per participant: its app, its notes, and apps/scene/
    marko/          the Marko apps + flush.ts
    svelte/         the Svelte apps
```

`markup-gate.ts` lives in `gates/` rather than `shared/` — it is the gate the other two build on,
and 26 files import it.

### The ten places that hard-code a path — move a file without editing these and it breaks

| what holds the path | what it holds |
|---|---|
| `scripts/run-one-axis.js` — the `AXES` map | all 39 axis paths, spelled out, one per axis name |
| `src/main.ts` | 10 dynamic `import('./benchmarks/<family>/<name>')` calls |
| `scripts/run-benchmarks-headless.js` | `initial-render`, `app-update`, `list-reconcile`, `reconcile`, `reactive-update`, `toggle` |
| `scripts/probe-svelte.js` | `list-reconcile`, `reconcile`, `reactive-update`, `toggle` |
| `scripts/profile-app.mjs`, `scripts/profile-list-ops.mjs` | one `MODULE` path each, into `src/benchmarks/profilers/` |
| `scripts/verify-structure.mjs` | evaluates `import('/src/benchmarks/participants/bundled/todo-app.tsx')` and `.../participants/exodra/app.tsx` **inside the page** — absolute URLs, not resolved by the bundler |
| **`vite.config.ts`** | **statically imports `./src/benchmarks/shared/app-files`** — a build-time import, so a bad path breaks `npm run dev` outright |
| **`tsconfig.typecheck.json`** | its whole `exclude` list, as directory globs under `participants/`, `apps/`, `marko/` and `svelte/` |
| `src/benchmarks/shared/app-files.ts` (contents) | package-relative path **strings** to `apps/*`, `marko/*`, `svelte/*` — data, not imports, so nothing type-checks them |
| `bench/apps/angular/app.ts` | `../../../src/benchmarks/shared/todo-spec` |

Nothing in `measurements/*.json` or `.gate/*.json` carries a file path — recordings key on the
**axis name** only, so no recording is invalidated by a move. Axis names must not change.

## Unreachable files

Not registered, not imported by any registered axis, not named by any script. **None of it is
deleted — the owner decides.**

| file | evidence |
|---|---|
| `participants/angular/app.ts` | zero importers anywhere in `src/`, `scripts/`, `vite.config.ts` or `bench/`. It is named only inside comments. **Deliberate:** `@angular/*` was removed from the workspace after their toolchain pulled a second Vite in and broke every other participant, so the loader's app is out of the workspace and only `.dependency-cruiser.cjs`'s two exemptions keep the graph gate quiet about it; the loader, its isolated build (`bench/build/build-angular.mjs`) and its app (`bench/apps/angular/`) were all left in place. `axes/app/exodra-initial-render.tsx` carries the revival procedure — re-add the packages, the `BUILT_PARTICIPANTS` entry, the participant lines and the title **in one change**. `tsconfig.typecheck.json` already excludes it, so nothing notices it is dead |
| `axes/phases/import-node-trade.ts` | registered and loadable, but **never recorded** — there is no `import-node-trade.*.json` on disk, so three of its four falsifiers are unjudgeable. Kept as the instrument for a future ownership question, not because the question is open |
