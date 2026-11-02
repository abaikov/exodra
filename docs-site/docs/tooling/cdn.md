---
title: CDN / no build
---

# Using Exodra from a CDN

:::danger `0.3.0` is not on npm yet — every URL on this page 404s today

This page is written for the release that is being prepared, and its version pins
say `0.3.0` because that is the version in this repository. **Nothing of the
current library has been published.** The newest thing on npm under these names is
the `0.2.0` line, which is the DELETED three-props renderer — it exports `h`,
`text`, `defineComponent`, `walkSchema` and `createContextKey`, and not one call
on this page exists in it. So there is no URL that works right now: `@0.3.0` is a
404 and `@0.2.0` is a different program that happens to share a name.

Two consequences while this box is here. Every code sample below is **correct
against the source in this repository** and can be run today against the
repository's own `dist/` — `packages/examples/no-build/` does exactly that. And
`npm run check:docs` cannot catch this class of error: it checks each pin against
the version in the repository, never against the registry.

**Delete this box the moment `0.3.0` of the five packages is published.** Nothing
else on the page needs to change.

:::

Every runtime package publishes to npm, and npm is mirrored by the public CDNs
(jsDelivr, unpkg, esm.sh), so you can use Exodra in a plain HTML file with **no
build step**. There are two ways in, depending on whether you want ES modules or a
classic `<script>`.

Both ways in are demonstrated by a runnable pair of pages in the repository —
`packages/examples/no-build/` (`esm.html` and `global.html`, one application,
identical below the import block). Serve that folder over HTTP and open them; its
README says why a local server is needed and what each page proves.

The browser-relevant packages are `@exodra/core`, `@exodra/list-reconcile`,
`@exodra/dom`, `@exodra/router`, `@exodra/forms` — and those five are exactly the
ones that ship the two browser builds below. (`@exodra/ssr` and `@exodra/string`
are server-side.)

Each of the five publishes **three** files a browser can load (`dist/index.cjs` is
the fourth and is for Node), and picking the right one is the whole of this page:

| file | for | minified |
| --- | --- | --- |
| `dist/index.js` | anyone with a bundler — this is what `import '@exodra/dom'` resolves to | no, deliberately: your bundler minifies it and decides your own `NODE_ENV` |
| `dist/exodra.esm.js` | `<script type="module">` on a page with no build step | yes, and `NODE_ENV` is baked to `production` |
| `dist/exodra.global.js` | classic `<script src>`, no modules | yes, and `NODE_ENV` is baked to `production` |

**Do not import `dist/index.js` from a CDN.** It is the readable, un-minified
copy, and for `@exodra/dom` that is 55.7 KB gzip against `exodra.global.js`'s
17.2 KB (measured 2026-08-16 with `gzip -9` on the built files; the figures
here were 47.6 and 14.6 until then, understating both by about 17%). The two `exodra.*` files exist so that the no-build path is not the
slowest way to load this library.

**There is no JSX without a build step, and that is not a limitation of the CDN.**
`@exodra/jsx` is a types package: its `jsx` / `jsxs` / `jsxDEV` exports are one
function that throws, because an element in that dialect is compiled away into a
`b.el(…)` line inside a schema and a `c.text(…)` / `c.attr(…)` line inside a
machine's `wire`, and no runtime can interpret one. On a page with no
compiler you write those two halves yourself — `exoPorts({ … })` with
`createExoSchema(ports, build)`, and `createExoMachine(schema)` with its decorators — which is
what every example below does.

## ES modules (recommended)

The module build is `dist/exodra.esm.js`, named outright in the URL:

```
https://cdn.jsdelivr.net/npm/@exodra/dom@0.3.0/dist/exodra.esm.js
https://unpkg.com/@exodra/dom@0.3.0/dist/exodra.esm.js
```

**Use an import map.** `@exodra/dom` and `@exodra/router` do not re-bundle the
runtime — `@exodra/dom`'s module leaves `import … from '@exodra/core'` as a bare
specifier, exactly as the source wrote it, so a page that loads both ships **one**
core rather than two. Nothing rewrites that specifier for you; the import map is
what resolves it, and it pins every version in one place as a bonus:

```html
<script type="importmap">
{ "imports": {
  "@exodra/core":       "https://cdn.jsdelivr.net/npm/@exodra/core@0.3.0/dist/exodra.esm.js",
  "@exodra/context":    "https://cdn.jsdelivr.net/npm/@exodra/context@0.3.0/dist/index.js",
  "@exodra/dom":        "https://cdn.jsdelivr.net/npm/@exodra/dom@0.3.0/dist/exodra.esm.js",
  "@exodra/router":     "https://cdn.jsdelivr.net/npm/@exodra/router@0.3.0/dist/exodra.esm.js",
  "@exodra/forms":      "https://cdn.jsdelivr.net/npm/@exodra/forms@0.3.0/dist/exodra.esm.js",
  "@exodra/list-reconcile": "https://cdn.jsdelivr.net/npm/@exodra/list-reconcile@0.3.0/dist/exodra.esm.js"
}}
</script>
<script type="module">
  import {
    EXO_PORT_EVENT,
    EXO_PORT_TEXT,
    composeExoMachine,
    createExoMachine,
    createExoSchema,
    exoPorts,
    withExoHandlers,
    withExoWire,
  } from '@exodra/core';
  import { ExoDomBackend, withExoCompiler } from '@exodra/dom';

  const backend = withExoCompiler(new ExoDomBackend());

  const CounterPorts = exoPorts({ click: EXO_PORT_EVENT, text: EXO_PORT_TEXT });

  const counterSchema = createExoSchema(CounterPorts, b => {
    b.el('div', null, div => {
      div.el('button', { type: 'button' }, btn => {
        btn.eventPort(CounterPorts.click, 'click');
        btn.text('+');
      });
      div.el('span', null, span => { span.textPort(CounterPorts.text); });
    });
  });
  const counterMachine = composeExoMachine(
    createExoMachine(counterSchema, {
      createInitialState: () => ({ count: 0 }),
    }),
    m => withExoWire(m, c => {
      c.text(CounterPorts.text, `Count: ${c.state.count}`);
    }),
    m => withExoHandlers(m, on => {
      on(CounterPorts.click, c => {
        c.state.count++;
        c.text(CounterPorts.text, `Count: ${c.state.count}`);
      });
    }),
  );

  backend.render(counterMachine, document.body);
</script>
```

The import map is a browser feature, not a build step — it needs no tooling and
works in every browser that supports modules at all.

### Without an import map

`@exodra/core`, `@exodra/forms` and `@exodra/list-reconcile` reference nothing, so
their `exodra.esm.js` loads straight from a URL:

```html
<script type="module">
  import { reconcileExoOrder } from 'https://cdn.jsdelivr.net/npm/@exodra/list-reconcile@0.3.0/dist/exodra.esm.js';
</script>
```

`@exodra/dom` and `@exodra/router` will not: without a map the browser stops at
`Failed to resolve module specifier "@exodra/core"`. That is the deliberate cost
of not shipping a second core — add the map above, or use the `<script>` globals
further down.

### The subpath name

The same file is reachable by name rather than by path, which is what to write if
some tool is resolving package exports for you: `@exodra/dom/browser`. Do **not**
reach for it from an application you bundle — it is a pre-minified copy with
`NODE_ENV` already baked, and a bundler that sees both `@exodra/dom` and
`@exodra/dom/browser` puts two copies of the package in your output.

### `/+esm` is jsDelivr's file, not this repository's

jsDelivr also answers `…/@exodra/dom@0.3.0/+esm`. That is jsDelivr's own transform
of `dist/index.js`, produced on their servers — it resolves the internal
`@exodra/*` imports for you, so it needs no import map, but it is not a file this
repository publishes, measures or can promise anything about. `dist/exodra.esm.js`
is. Prefer it.

### Routing

```html
<script type="module">
  // A page is a machine, the router is provided by a call inside a
  // machine, and the route boundary is the `ExoOutlet` machine.
  // `@exodra/router` references core, so it needs the import map above.
  // The outlet opens a child list, so the backend composes withExoChildList.
  import { ExoDomBackend, withExoChildList, withExoCompiler } from '@exodra/dom';
  import {
    createExoRouter,
    createExoBrowserHistory,
    exoOutlet,
    provideExoRouter,
    ExoLink,
  } from '@exodra/router';

  const backend = withExoChildList(withExoCompiler(new ExoDomBackend()));
  // ...
</script>
```

## Classic `<script>` globals

For no-module pages, each of those five packages also ships a minified IIFE that
attaches to a single `window.Exodra` namespace. jsDelivr serves it from the bare
package URL (via the package's `jsdelivr` / `unpkg` field, which points at
`./dist/exodra.global.js`); naming that path outright —
`…/@exodra/core@0.3.0/dist/exodra.global.js` — works too and does not depend on
the CDN resolving the field.

Those two manifest fields keep pointing at the IIFE now that there is a module
build beside it, and on purpose: a bare package URL is the URL a `<script src>`
has no way to make more specific, while a module URL is written out in an import
map anyway. Pointing them at ESM would turn every existing `<script src>` on the
internet into `Uncaught SyntaxError: Unexpected token 'export'`.

```html
<!-- load the shared runtime FIRST, then the pieces that use it -->
<script src="https://cdn.jsdelivr.net/npm/@exodra/core@0.3"></script>
<script src="https://cdn.jsdelivr.net/npm/@exodra/dom@0.3"></script>
<script>
  const {
    EXO_PORT_EVENT,
    EXO_PORT_TEXT,
    composeExoMachine,
    createExoMachine,
    createExoSchema,
    exoPorts,
    withExoHandlers,
    withExoWire,
  } = Exodra.core;
  const { ExoDomBackend, withExoCompiler } = Exodra.dom;

  const backend = withExoCompiler(new ExoDomBackend());

  const CounterPorts = exoPorts({ click: EXO_PORT_EVENT, text: EXO_PORT_TEXT });

  const counterSchema = createExoSchema(CounterPorts, b => {
    b.el('div', null, div => {
      div.el('button', { type: 'button' }, btn => {
        btn.eventPort(CounterPorts.click, 'click');
        btn.text('+');
      });
      div.el('span', null, span => { span.textPort(CounterPorts.text); });
    });
  });
  const counterMachine = composeExoMachine(
    createExoMachine(counterSchema, {
      createInitialState: () => ({ count: 0 }),
    }),
    m => withExoWire(m, c => {
      c.text(CounterPorts.text, `Count: ${c.state.count}`);
    }),
    m => withExoHandlers(m, on => {
      on(CounterPorts.click, c => {
        c.state.count++;
        c.text(CounterPorts.text, `Count: ${c.state.count}`);
      });
    }),
  );

  backend.render(counterMachine, document.body);
</script>
```

These globals do **not** re-bundle the runtime — they reference it, so one
instance is shared no matter how many packages a page loads. Both browser builds
draw the same lines, in the two dialects; each package's `tsup.config.ts` is where
they are declared:

| package | `exodra.global.js` references | `exodra.esm.js` imports |
| --- | --- | --- |
| `@exodra/dom` | `Exodra.core` | `@exodra/core` |
| `@exodra/router` | `Exodra.core` | `@exodra/core` |
| `@exodra/core`, `@exodra/forms`, `@exodra/list-reconcile` | nothing — self-contained | nothing — self-contained |

**Load order matters** for the two that reference something: put `core` on the
page before `dom` / `router`. Loading all of
them with `core` first and the rest after it is always safe. The module
build has no such rule — the browser resolves the import graph itself — which is
the one thing it is strictly easier about than the globals.

What each namespace holds:

| package | global |
| --- | --- |
| `@exodra/core` | `Exodra.core` — `createExoSchema`, `createExoMachine`, `withExoTransitions`, `withExoWire`, `withExoHandlers`, `withExoEffects`, `composeExoMachine`, `createExoNamedSchema`, `createExoStatic`, `exoPorts`, the `EXO_PORT_*` kinds, `withExoSchemaAsserts`, `composeExoPlugins` |
| `@exodra/dom` | `Exodra.dom` — `ExoDomBackend`, `withExoCompiler`, `withExoHydration`, `exoForeignNode` |
| `@exodra/router` | `Exodra.router` — `createExoRouter`, `createExoBrowserHistory`, `provideExoRouter`, `injectExoRouter`, `ExoOutlet`, `exoOutlet`, `ExoLink` |
| `@exodra/list-reconcile` | `Exodra.listReconcile` — `reconcileExoOrder`, `createExoKeyedList`, `EXO_KEYED_LIST_VOCABULARY` |
| `@exodra/forms` | `Exodra.forms` — `readExoControlValue`, `readExoControlValues`, `writeExoChoice` |

## Versions

CDNs serve exactly what's **published to npm**. Pin an exact version (`@exodra/core@0.3.0`)
for production so a future release can't shift under you; use a range (`@0.3`) to
follow patch/minor. Whatever code is on the CDN is the last published version — to
get a change onto the CDN, publish a new version to npm.

The five browser packages are at `0.3.0` in this repository, which is the version
every pin above names.

`packages/examples/no-build/` does **not** use a CDN URL, and that is deliberate
rather than an oversight: it maps the four bare specifiers to this repository's
own `/packages/*/dist/` builds (and loads the same files by path in the
`<script>` page), so the two pages run the code in the working tree and need no
network at all. The moment `0.3.0` is published, swapping those four paths for
the jsDelivr URLs above is the whole change — nothing else in either page moves.
