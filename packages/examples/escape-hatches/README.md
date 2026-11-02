# Escape hatches

One page that runs two things most frameworks forbid, at the same time, in a real
browser:

1. **A vanilla hot spot.** One row of an ordinary list is built with
   `document.createElement`, `textContent` and `addEventListener` — no schema, no
   ports, no wiring function — and stands among schema-built siblings. It is
   reordered with them, removed with them, and put back with its own state intact.
2. **A foreign renderer.** A ~20-line canvas widget with its own state, its own
   `requestAnimationFrame` loop and its own teardown, which has never heard of
   Exodra. Exodra places it, moves it between schema-built cards, and disposes it;
   its `onUnmount` hook is what stops the loop, and the page shows the frame counter
   freezing when it does.

Both arrive through one function, `exoForeignNode(c, element, hooks?)` from
`@exodra/dom` (`packages/dom/src/foreign/exoForeignNode.ts`), and both are
placed by `reconcileExoOrder` from `@exodra/list-reconcile` over a
`c.childList(port)`, called from an effect with the identity as its build
step — the items are already nodes, so there is nothing to build them from.

The page exists because a capability is proven by something that runs. Nothing in
this folder is a claim; it is the thing itself, and if it does not work the page
says so on screen.

**Status: written against the source of `@exodra/core`, `@exodra/dom` and
`@exodra/list-reconcile`; not opened in a browser in its current form.** One
`withExoChildList(withExoCompiler(new ExoDomBackend()))` is built at the top level — it is
the schema cache key, compared by pointer, and `withExoChildList` is there because the
page's three reconciled regions open `c.childList` — and `backend.render(APP, root)` mounts one instance
and hands back its disposer. The page's data (the log, the two children arrays, the
widget's counters) lives in a five-line store the page writes itself; the app machine
follows each store with an effect that draws first and then subscribes. Read the
paragraph above as what the page is FOR: until somebody opens it, "it is the thing
itself" is exactly the claim it cannot yet settle.

## How to open it

The import map below points at **this repository's own `dist/`** with absolute
paths, so the server has to be started at the **repository root** — not in this
folder.

```sh
cd /path/to/exodra
python3 -m http.server 8000
```

Then open <http://localhost:8000/packages/examples/escape-hatches/index.html>.

ES modules are subject to CORS, so a `file://` page cannot import them. There is
no `package.json` here and nothing to install.

### What has to be built first

The page imports compiled output, not source:

```
@exodra/core            →  /packages/core/dist/index.js
@exodra/context         →  /packages/context/dist/index.js   (imported by core's and dom's dist)
@exodra/list-reconcile  →  /packages/list-reconcile/dist/index.js
@exodra/dom             →  /packages/dom/dist/index.js
```

`exoForeignNode` is recent, and `dist/` is older than `src/` whenever nobody has
rebuilt it. So the page uses a **namespace import** (`import * as exoDom`) rather
than `import { exoForeignNode }`: a named import against a build that lacks the
export is a module *link* error, which leaves a blank page and one line in the
console. The namespace import links regardless, and the page then checks for the
function and prints what to do — `npm run build --workspace=@exodra/dom` — into
the boot line.

### Why not a CDN URL

For the reason `../no-build/` gives: the last **published** `@exodra/core` is
`0.2.0`, which is the deleted three-props renderer. A CDN URL here would load a
different program that happens to share a name. `exoForeignNode` has never been
published at all.

## What you should see

- **Panel 1** — four rows. Three say `schema`, one says `vanilla` and is
  highlighted. Each carries a `#n` stamped when it was *built*.
  - **Move last to first** rotates the array. The stamps travel with their rows
    (so nothing was rebuilt) and the vanilla row's `mounts` counter **stays at 1**
    — a move is not a remount.
  - **poke** on the vanilla row increments its own tally. That button's listener
    is a plain `addEventListener`; Exodra's event strategy is not involved.
- **Panel 2** — two schema cards and a canvas drawing a moving wave. `frames
  drawn` climbs; `mounts` reads 1. **Move the pulse** cycles it through the three
  positions and `mounts` does not change, while the wave keeps animating.
- **Panel 3** — a log written entirely by the two things' `onMount`/`onUnmount` hooks.
  - **Remove both** takes them out of their arrays. Both `onUnmount` hooks fire and
    both report `still attached: true` — `dropExoChild` calls `unmount()` *before* it
    removes the node (`packages/dom/src/dom/dropExoChild.ts:34-39`). The frame
    counter **freezes**, which is the proof the rAF loop actually stopped and not
    merely that the canvas left the screen.
  - **Put both back** re-inserts the same child values. Both `onMount` hooks fire
    again, the vanilla row's `mounts` goes to 2, and the widget **resumes** its
    frame count instead of restarting from zero — the same objects came back, not
    new ones.

The first log line reads `in the document: false`, and that is correct rather
than a bug: `mountExoInstance` arms an instance and inserts it **afterwards**
(`packages/dom/src/dom/mountExoInstance.ts:42-51`), so the first mount of a
child happens inside a clone that is not on the page yet. `onMount` guarantees the
element has a **parent**, not that it is connected. Every later mount reports
`true`.

**It failed if**: the boot line stays and turns red (stale `dist`); the page is
blank (check the console — most likely the server was started in this folder
instead of at the repository root, so the import map's absolute paths 404); the
stamps re-sequence on **Move last to first** (rows were rebuilt, not moved); the
vanilla row's `mounts` climbs on a move; `frames drawn` keeps climbing after
**Remove both** (the `onUnmount` hook did not stop the loop); or removing something
throws.

## What does not work

Read from the source, not guessed. Each item names the file it is read from.

### Hydration: through `c.foreign`, and only through it

While hydrating, `c.childList(port)` opens an adoption cursor over the rows the server printed
(`packages/dom/src/dom/EXO_ADOPT_CURSOR.ts`): each `c.build` takes the next row and adopts it,
and what is left when the wire ends is removed. The cursor takes rows in order and compares
nothing, so a foreign node has to take its row off the cursor itself:

- **`exoForeignNode(c, element)` does**, whether it is called directly or from `t.createDom(c)`
  under `c.foreign(t)`: it removes the server's row for that position, so the fresh element stands
  there and the rows around it are adopted as usual
  (`packages/conformance/src/tests/a-foreign-node-in-a-hydrated-list.test.ts`). A backend that
  hydrates `c.foreign` must compose `EXO_DOM_FOREIGN_VOCABULARY` too, or the call throws `EXO0100`.
- **A child list standing directly behind another is refused**, because no walk can find where
  the first one ends (`assertExoPluginChildList`).

`c.one`, `c.list` and `c.build` cannot carry one at all — all three are handed a
**machine** and build their children themselves, so there is nowhere to pass a node
in. A `c.childList(port)` filled with nodes the caller built — here through
`reconcileExoOrder` with the identity as its build step — is the only door.

### The server backend cannot carry one

The server's child list (`TExoStrNode.childList`,
`packages/string/src/node/EXO_STR_NODE_VOCABULARY.ts`) concatenates its children as **strings**, because a `TExoNode` on that
backend *is* a string of markup. Handing it a foreign node once put the literal
text `[object Object]` into the served markup with nothing thrown. It is a
**compile error**: `exoForeignNode` returns `TExoNode<TExoDomMark>` and that
list takes `TExoNode<TExoStrMark>`, two marks declared in two packages that
never mention each other and assignable in neither direction. Nothing changed at
runtime — there is still no element on the server to hand anybody.

That means a wiring function importing `exoForeignNode` is **pinned to the
browser**. A wire that must run on every backend asks the exonode instead:
`c.foreign(t)` — a pack each backend composes (`EXO_DOM_FOREIGN_VOCABULARY`,
`EXO_STR_FOREIGN_VOCABULARY`) — takes one object with one field per backend and each
backend reads its own — `createDom` here, `createStr` on the server, where the value to
hand back comes from `exoForeignMarkup(markup)`. `exoBackendCompatible(BACKENDS,
'foreign', t)` checks that `t` has a half for every backend the application lists. That one does **not** escape, and the
caller owns the string.

### The reparenting trap

**Removal climbs. Placement does not.** That asymmetry is the whole trap:

- `dropExoChild` walks `parentNode` upwards from `child.node` until it finds the node
  whose parent is the region's parent, and removes that
  (`packages/dom/src/dom/dropExoChild.ts:37-39`; `unmount()` first, on line 35). So a widget that wrapped its own
  root is removed **whole**.
- `placeExoChildren` addresses `child.node` **directly** —
  `parent.insertBefore(node, after)` on the node it was given
  (`packages/list-reconcile/src/placeExoChildren.ts:29-40`), and the append fast path
  in `attach-exo-children.ts` does the same. So the first reorder **yanks the
  element out of its wrapper** and leaves the empty wrapper standing.

Wrapping is therefore survivable in a list that never reorders and wrong in one
that does. **The shape that is always right** is the one this page uses: hand in
an element and render *inside* it, never moving or replacing the element itself.
`createPulse` returns `{ element: box, … }` and draws into a canvas *within* `box`.

There is a second half to it: if the widget moves its root **out of the region's
parent altogether** (a portal, `document.body`, a fresh root of its own), the
removal climb reaches `null` and **nothing is removed**. Exodra's books stay
consistent — `unmount` ran, `index` went to -1 — but whatever the widget put in
the document stays there. The `onUnmount` hook is the only thing that can clean that
up.

### No ports, no machine

A foreign node has no schema, so `c.text`, `c.attr`, `c.on` and every other
port-addressed call have nothing to address. What the element shows is the foreign
renderer's business start to finish; Exodra places it and forgets it. The two
hooks are the entire interface, which is why this page routes them into a
store the log list follows — that is how their lifecycle becomes visible instead of asserted.

### Context: neither, because a foreign node is not a wiring

A foreign node has no connector, so it does not provide and does not inject. A
context travels as a value on the connector and nothing is stored on an element,
so there is nothing to arrange here at all. A wire that wants the foreign
renderer to see a context value **injects it in the wire** and hands it over as
data — the only channel there has ever been for code that is not a wire.

### Refused outright

- **An element this door has already adopted** — one you handed to
  `exoForeignNode` before. Keep the child that first call returned and place that.
- **An element that is already in a tree** — including anything from
  `connector.build(...)` or `exoNodeDom(child).node` once a list has placed it.
  Pass the *child* to the list, not its element. Note the limit: a built child's
  element **before** it is placed, or after a list dropped it, is in no tree and is
  refused by neither door. It used to be caught by a mark on every built element;
  that mark was removed on 2026-08-30.
- **A `DocumentFragment`** — refused by the type. A fragment empties itself into
  its parent on insertion, leaving `node` pointing at something with no place in
  the tree.
- **The same child twice in one array.** One value resolves to one element and one
  element cannot be in two places — the same limit every identity-reconciled list
  in this project has.

### Child lists side by side

A child list hydrates through its adoption cursor, so reconciling one by hand over
`c.childList(port)` on a hydrated page works. The one shape refused is a children port
standing directly behind another with no static element between them: where the first
list ends cannot be read off the markup, and `openChildList` throws `EXO0035`
(`packages/dom/src/hydrate/asserts/assertExoPluginChildList.ts:4`). Put a static
element between them, use `c.list(port, component, rows)`, or render that component
on the client.

## What it costs

Read from the code rather than measured, and the point of stating it is that the
door is not a tax on anything that does not use it:

- **Per process / per module load**: the module's function objects plus **one
  empty `WeakSet`** — the set of elements this door has already adopted. No
  table, no registry, no listener, no other shared state.
- **Per component instance and per ordinary list row**: nothing. The file is
  imported by nothing inside `@exodra/dom` (only re-exported from `index.ts`),
  and no line in `attachExoChildren`, `exoNodeDom`, `dropExoChild` or
  `clearOwnedExoChildList` branches on it. A foreign child travels the same lines as every other child; the
  five insertion sites test `child.node === undefined` and find an element.
- **Per dispatched event**: nothing. It subscribes to nothing.
- **Per foreign node** — the only thing that pays: one `WeakSet` membership test
  for the guard and one `WeakSet` entry, then what any child costs (one
  `TExoDomChild` from the plan's `createChild`), **plus one closure if and only if
  an `onUnmount` hook was given**. An `onMount` hook is stored as-is and allocates nothing; `onUnmount` cannot
  be, because the shared default has to run after it.
- **Per hydrated port containing one**: see above — the tail of that port is
  re-rendered on the client, and adopted positions in front of it run their wire
  twice.

## The one trap this page shares with `../no-build/`

Every `exoComponent(…)` call is at the **top level of the script**. `exoComponent`
builds a schema on the spot and every backend keys its compiled plan on that
schema's **identity**, so a component built inside a function is a new schema, a
new prototype and a new plan on every call. That is a different program, not a
slower one, and nothing warns you.
