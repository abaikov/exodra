# No build

Two HTML files that run an Exodra application with nothing installed and nothing
compiled — no bundler, no bundler plugin, no Babel, no codegen, no `npm install`.
They exist to make the framework's central claim checkable instead of stated.

**Status: neither page has been opened in a browser in its current form.** Both
build one `withExoChildList(withExoCompiler(new ExoDomBackend()))` at the top level — `render`
exists only on a backend composed with `withExoCompiler`, and `c.childList`, which the
reconciled rows open, only on one composed with `withExoChildList` — and call `backend.render(APP, root)`, which mounts one
instance and hands back its disposer. Each page carries the same note.

## How to open them

ES modules are subject to CORS, so a `file://` page cannot import them. Serve the
folder over HTTP:

```sh
cd path/to/exodra          # the REPO ROOT, not this folder
python3 -m http.server 8000
# then open http://localhost:8000/packages/examples/no-build/esm.html
```

Then open:

- <http://localhost:8000/packages/examples/no-build/esm.html>
- <http://localhost:8000/packages/examples/no-build/global.html>

The pages load the framework from this repository's own `dist/`, so the machine
does NOT need to be online — see the last section for why that is deliberate and
not a shortcut. Nothing else is required: there is no install step for this
folder and no `package.json`, because there is nothing to install.

## What each page proves

**`esm.html`** — the ES-module path. One `<script type="module">` with three
`import` statements by BARE NAME, resolved by an `importmap`:

```
/packages/core/dist/exodra.esm.js             (mapped from the bare name `@exodra/core`)
/packages/context/dist/index.js               (mapped from `@exodra/context`, which core's and dom's `index.js` import)
/packages/dom/dist/exodra.esm.js              (mapped from the bare name `@exodra/dom`)
/packages/list-reconcile/dist/exodra.esm.js   (mapped from the bare name `@exodra/list-reconcile`)
```

`exodra.esm.js` and **not** `index.js`: `index.js` is the unminified copy a
bundler consumes, and a no-build page importing it is the slowest way to load this
library — which would make the demonstration argue against itself. `exodra.esm.js`
is the minified module build, the same file a CDN serves.

`@exodra/dom`'s module leaves `import … from '@exodra/core'` as a bare specifier
rather than inlining a second copy, and the import map above is what resolves it —
so `@exodra/core` is fetched once and the two packages that use it share one
runtime instance. That is why the map has an entry for every package any of them imports.

**`global.html`** — the classic-script path. Three plain `<script src>` tags
loading the minified IIFE builds, which attach to one `window.Exodra` namespace:

```
/packages/core/dist/exodra.global.js            →  Exodra.core
/packages/dom/dist/exodra.global.js             →  Exodra.dom
/packages/list-reconcile/dist/exodra.global.js  →  Exodra.listReconcile
```

Load order is not cosmetic: `@exodra/dom`'s global does **not** re-bundle the
runtime, it references `globalThis.Exodra.core` (the `externals` map in
`packages/dom/tsup.config.ts`), so `core` must be on the page first.
`@exodra/list-reconcile` is self-contained and needs no ordering. The paths name `dist/exodra.global.js`
outright, which is also what a CDN would serve from the BARE package URL
(`https://cdn.jsdelivr.net/npm/@exodra/core@…`), because that is where each
package's `jsdelivr` / `unpkg` field points — the same file, served from here
instead of over the network.

**Both pages run the same application.** Below the import block the two files are
identical, on purpose: the program does not know or care which of the two ways it
arrived.

The application is deliberately not a counter. It has:

- a five-line store (`getValue` / `setValue` / `onChange`) written in the page, holding the
  tasks and a cleared count; every machine that shows it follows it with an effect that draws
  first and then subscribes;
- a list reconciled by item identity: `createInitialState` opens `c.childList(port)` once, and a
  plain function the effect runs calls `reconcileExoOrder(rows, shown, want, want, (item) => c.build(TASK, item))`,
  each row receiving its item as its wire's params;
- event handlers on three different buttons, declared on the machines (`withExoHandlers(m, (on) => on(port, handler))`);
- one stat schema behind two machines (`STAT_OPEN`, `STAT_CLEARED`), each mounted with `c.one`
  and showing a different value of the store through its own function;
- a build counter stamped into every row. Press **Move last to first**: the
  numbers travel with their rows, which is the visible evidence that the
  reconciler moved existing elements instead of rebuilding them.

## What these pages deliberately do not use

- **No JSX.** Not as a stylistic choice — it is impossible here. `@exodra/jsx` is
  a types package; its `jsx`, `jsxs` and `jsxDEV` exports are all one function
  that throws (`packages/jsx/src/schema/jsx-runtime.ts`), because an element in
  that dialect is compiled away into a `b.el(…)` line in a schema and machine code
  that writes ports, and there is no runtime that could interpret one. Without a
  compiler you write the two halves yourself, which is what `createExoSchema(build)`
  and `createExoMachine(schema)` with its `withExo*` decorators take.
- **No `@exodra/babel-plugin-exodra-schema`**, no `@exodra/vite-plugin-exodra`,
  no `create-exodra`, no `npm`, no `node`.
- **No `@exodra/router` and no `@exodra/forms`.** They are CDN-installable the
  same way; leaving them out keeps the pages down to the three packages the claim
  actually needs.

## The one trap

Every `createExoSchema(…)` call in these pages is at the **top level of the script**,
and that is load-bearing rather than tidy. `createExoSchema` builds a schema on the
spot and numbers its ports; every backend then keys its
prepared plan on the schema's **identity**. So a component built inside a function
— a factory, a helper, a handler — produces a *new* schema on every call, and a
new schema means a new compile, a new prototype and a new plan every time. That is
not a slower version of the same program; it is a different program, and nothing
warns you. The Babel plugin removes the hazard by construction: it always emits
the schema as a module-level `const` and moves only the wiring function
(`packages/babel-plugin-exodra-schema/src/index.ts`, "HOISTING IS NOT AN
OPTIMISATION HERE"). Writing by hand, you keep that rule yourself: schemas at
module scope, once, and per-instance work in the machine.


## Why these load from this repository and not from a CDN

Both pages resolve the three packages against this repository's own `dist/` —
`esm.html` through a `<script type="importmap">`, `global.html` through plain
paths — and that is deliberate, not a shortcut.

**Nothing of the current library has ever been published.** The newest version on
npm is `0.2.0`, and `@exodra/core@0.2.0` exports `h`, `text`, `defineComponent`,
`walkSchema` and `createContextKey` — the three-props renderer that was deleted.
A CDN URL on these pages would load a different program that happens to share a
name, and the demonstration would prove nothing about the library it claims to
demonstrate.

**Nothing else about the claim changes.** An import map is a browser feature, not
a build step: the specifiers still say `@exodra/core`, and nothing rewrites them.
The moment the current packages are published, swap the map targets for
`https://cdn.jsdelivr.net/npm/@exodra/core@<version>/+esm` and the rest of both
files is untouched.

**Serve from the repository root**, because the map targets are absolute paths
into `packages/*/dist/`. Serving this folder alone gives a blank page and
404s in the network tab.
