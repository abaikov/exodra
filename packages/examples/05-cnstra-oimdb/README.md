# Project Workspace — Exodra × oimdb × cnstra

The flagship example: a real, editable **10-entity project workspace** — a Kanban
board, full CRUD across tasks/projects/people/taxonomy, an audit feed, and a
10,000-row virtual list — server-rendered, hydrated, and code-split, on top of the
whole stack:

- **[Exodra](../../)** — schema-first UI. Reactivity is explicit: every prop
  declares its bucket (`static` / `bindable` / `bindableList` / `handlers`), so the
  compiler knows what can change and the renderer never diffs a virtual DOM.
- **[@oimdb/core](https://github.com/abaikov/oimdb)** — the reactive store:
  normalized collections, derived + ordered + global indexes, stable slots.
- **[@cnstra/core](https://github.com/abaikov/cnstra)** — orchestration: commands
  flow through a neuron graph (validation → store mutation → optimistic persist →
  settle/rollback → activity log).

Everything is real code, exercised by smoke tests — the numbers below are measured,
not aspirational.

## What it is

| | |
|---|---|
| Domain entities | **10** — Team, Member, Project, Milestone, Status, Tag, Label, Task, Comment, Activity |
| Seeded rows | **45** (deterministic seed) |
| Store | 10 collections + 9 derived indexes; a global ordered index for the virtual list |
| Orchestration | **4 cnstra neurons, 17 command handlers** — add/move/assign/tag/delete tasks, archive project (cascade), optimistic persist with rollback, activity log |
| Pages | **7**, each its own lazy chunk over a shared core |
| Rendering | SSR of the board + **real hydration** (same DOM nodes reused), CSR for the rest |
| App source | ~2.8k LOC |

### Pages

| Route | Demonstrates |
|---|---|
| `/` Board | Kanban; CNS-driven moves; per-card reactivity; SSR + hydration |
| `/tasks` | Full task editing (status/assignee/tags/priority) flowing through cnstra |
| `/projects` | Project + milestone editing; **archive cascade** (deletes tasks + comments) |
| `/people` | Teams → members, grouped editable lists |
| `/taxonomy` | Tags & labels inline swatch editor |
| `/activity` | Live audit feed appended by the activity neuron |
| `/virtual` | **10,000-row virtual list** — windowed render, live filter, shared viewport in a global oimdb reactive object read by a decoupled on-screen readout |

## One list primitive

Every list on every page goes through a single helper, [`keyedList`](src/app/keyed-list.ts):
it maps an ordered source of items to identity-stable child schemas (cached by key)
and drives them through a `bindable<schema[]>`. The renderer reconciles by identity,
so a **field edit is a no-op** (same keys → same schema refs → focus kept) while a
real add/move/remove only touches the diff. Rows that own a subscription return
`{ schema, dispose }` and are torn down when they leave the list.

```tsx
const rows = keyedList({
  items: () => store.tasks.collection.getAll(),
  key: t => t.id,
  render: taskRow,
  subscribe: refresh => [store.tasks.collection.subscribeOnAnyUpdate(refresh)],
});
// <ul bindable={{ children: rows.children }} />  +  onExoMount/onExoUnmount = rows.mount/unmount
```

Reach for a command stream (`bindableList` + fine-grained ops) only when a producer
emits the exact mutation and you need O(delta) updates. The virtual list shows the
other end of the spectrum: a scroll is O(1) (write one shared viewport value), the
window render is O(window), and the filter recomputes only per query — never per
scroll.

## Weight (measured, gzip)

The shared core is the **entire stack** — Exodra runtime, router, oimdb, cnstra, the
app's store/CNS/runtime:

| Chunk | gzip |
|---|---|
| **Core** (Exodra + oimdb + cnstra + store + orchestration) | **31.0 KB** |
| board (entry page) | 1.6 KB |
| virtual / tasks / projects / taxonomy / people / activity | 0.7–1.7 KB each |
| `keyed-list` (shared) | 0.4 KB |
| `index.html` | 0.3 KB |

- **First load (`/`):** core + board + shared helper + html ≈ **33 KB gzip**.
- **Whole app, all 7 pages:** ≈ **39 KB gzip**.
- Each additional page streams in as **~1 KB gzip**.

For context, `react-dom` alone (view layer only, no store or orchestration) is
~40 KB gzip. This whole workspace — view **+** normalized reactive store **+** CNS
orchestration **+** router **+** SSR/hydration — is smaller.

### Server render

| Route | SSR HTML (gzip) | render |
|---|---|---|
| `/` (board, all cards) | ~2.7 KB | ~1.5 ms |
| other routes | ~1.9 KB | ~0.2 ms |

The serialized store snapshot (~1.5 KB gzip) rides in the page so the client
hydrates the same data with no round-trip. Board hydration walks the SSR DOM and
wires bindings in well under a millisecond (jsdom upper bound).

## Run it

```bash
npm run dev      # dev server (SSR + HMR)
npm run build    # tsc + client + SSR bundles
npm run serve    # production server
npm run typecheck
```

### Tests (smokes)

```bash
npx vite-node scripts/smoke-flagship.ts   # 17 — mount, edit-keeps-focus, CNS move, cascade
npx vite-node scripts/smoke-hydrate.ts    #  9 — SSR→hydrate reuses nodes, stays interactive
npx vite-node scripts/smoke-virtual.ts    # 14 — windowing, O(1) scroll, global-state fan-out
npx vite-node scripts/smoke-persist.ts    #  5 — localStorage round-trip + restore + reset
```

Each claimed property (focus preservation, node reuse on hydrate, "scroll never runs
the filter", global-state fan-out) has an assertion behind it.
