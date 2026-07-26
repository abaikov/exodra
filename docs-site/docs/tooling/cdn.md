---
title: CDN / no build
---

# Using Exodra from a CDN

Every runtime package is published to npm and mirrored by the public CDNs
(jsDelivr, unpkg, esm.sh), so you can use Exodra in a plain HTML file with **no
build step**. There are two ways in, depending on whether you want ES modules or a
classic `<script>`.

The browser-relevant packages are `@exodra/core`, `@exodra/reactivity`,
`@exodra/dom`, `@exodra/router`, `@exodra/forms`. (`@exodra/jsx` is a compile-time
helper — you don't need it if you write `h()` by hand; `@exodra/ssr` and
`@exodra/string` are server-side.)

Approximate gzip sizes of the `<script>` globals: core 0.4 KB, reactivity 1.6 KB,
dom 5 KB, router 4.8 KB, forms 0.25 KB.

## ES modules (recommended)

Each package has an ESM endpoint on jsDelivr — append `/+esm`. jsDelivr rewrites
the internal `@exodra/*` imports to pinned `/+esm` URLs, so a shared dependency
(core, reactivity) resolves to **one** instance no matter how many packages you
load — a single reactive runtime, no duplication.

```html
<script type="module">
  import { h, text }          from 'https://cdn.jsdelivr.net/npm/@exodra/core@0.1/+esm';
  import { mount }            from 'https://cdn.jsdelivr.net/npm/@exodra/dom@0.1/+esm';
  import { bindable, derive } from 'https://cdn.jsdelivr.net/npm/@exodra/reactivity@0.1/+esm';

  const count = bindable(0);
  mount(h('div', { static: { children: [
    h('button', {
      static: { children: text('+') },
      handlers: { onClick: () => count.setValue(count.getValue() + 1) },
    }),
    h('span', { bindables: { textContent: derive(count, c => `Count: ${c}`) } }),
  ]}}), document.body);
</script>
```

For a bigger app, an **import map** lets you keep bare specifiers (and pins every
version in one place):

```html
<script type="importmap">
{ "imports": {
  "@exodra/core":       "https://cdn.jsdelivr.net/npm/@exodra/core@0.1/+esm",
  "@exodra/reactivity": "https://cdn.jsdelivr.net/npm/@exodra/reactivity@0.1/+esm",
  "@exodra/dom":        "https://cdn.jsdelivr.net/npm/@exodra/dom@0.1/+esm",
  "@exodra/router":     "https://cdn.jsdelivr.net/npm/@exodra/router@0.1/+esm",
  "@exodra/forms":      "https://cdn.jsdelivr.net/npm/@exodra/forms@0.1/+esm"
}}
</script>
<script type="module">
  import { mount } from '@exodra/dom';
  import { Route, Routes } from '@exodra/router';
  // ...
</script>
```

## Classic `<script>` globals

For no-module pages, each package also ships a self-contained minified IIFE that
attaches to a single `window.Exodra` namespace. jsDelivr serves it from the bare
package URL (via the package's `jsdelivr` field):

```html
<!-- load the shared runtime FIRST, then the pieces that use it -->
<script src="https://cdn.jsdelivr.net/npm/@exodra/core@0.1"></script>
<script src="https://cdn.jsdelivr.net/npm/@exodra/reactivity@0.1"></script>
<script src="https://cdn.jsdelivr.net/npm/@exodra/dom@0.1"></script>
<script>
  const { h, text }          = Exodra.core;
  const { bindable, derive } = Exodra.reactivity;
  const { mount }            = Exodra.dom;

  const count = bindable(0);
  mount(h('div', { static: { children: [
    h('button', {
      static: { children: text('+') },
      handlers: { onClick: () => count.setValue(count.getValue() + 1) },
    }),
    h('span', { bindables: { textContent: derive(count, c => `Count: ${c}`) } }),
  ]}}), document.body);
</script>
```

`window.Exodra.dom` and `window.Exodra.router` reference `window.Exodra.core` /
`window.Exodra.reactivity` — they do **not** re-bundle the runtime, so the
reactive instance stays shared. **Load order matters**: `core` and `reactivity`
before `dom` / `router` / `forms`.

| package | global |
| --- | --- |
| `@exodra/core` | `Exodra.core` — `h`, `text`, `defineComponent`, `createContextKey` |
| `@exodra/reactivity` | `Exodra.reactivity` — `bindable`, `derive`, `list`, `persist`… |
| `@exodra/dom` | `Exodra.dom` — `mount`, `hydrate` |
| `@exodra/router` | `Exodra.router` — `Route`, `Routes`, `Outlet`, `Link`, `RouterProvider` |
| `@exodra/forms` | `Exodra.forms` — `bindText`, `bindNumber`, `bindChecked`, `bindSelect` |

## Versions

CDNs serve exactly what's **published to npm**. Pin a version (`@exodra/core@0.1.2`)
for production so a future release can't shift under you; use a range (`@0.1`) to
follow patch/minor. Whatever code is on the CDN is the last published version — to
get a change onto the CDN, publish a new version to npm.
