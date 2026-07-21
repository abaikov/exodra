# @exodra/ssr

Server-side rendering for Exodra applications.

## Installation

```bash
npm install @exodra/ssr @exodra/core @exodra/string
```

## Overview

`@exodra/ssr` renders Exodra schemas to HTML on the server and helps you carry
server state across to the client for hydration. It is built on top of
`@exodra/string`: the core class `ExoNodeSsr` **extends** `ExoNodeString` and adds
document `<head>` collection, response headers, HTTP status, and a serializable
state map.

What it provides:

- **`ExoNodeSsr`** — the SSR renderer. Construct it with a schema, then call
  `renderBody()`, `renderDocument()`, or `renderStateScript()`.
- **Components** — `Head`, `Header`, `State`, `Status` collect head tags, response
  headers, transferable state, and the HTTP status from inside your tree.
- **`useSsr(context)`** — read the SSR context from inside a component.
- **Persistor helpers** — `renderPersistorScript`, `renderHydrationScript`,
  `renderPersistorHydration` embed a `@exodra/reactivity` persistor for the client.

> Plain HTML string rendering (`renderToString`) lives in `@exodra/string`, not
> here. There is **no** `renderToStream` in Exodra.

## Basic Usage

```typescript
import { ExoNodeSsr } from '@exodra/ssr';
import { h, text } from '@exodra/core';

const app = h('div', {
  static: {
    id: 'app',
    children: [
      h('h1', { static: { children: text('Hello from Server') } }),
      h('p', { static: { children: text('This is server-rendered') } }),
    ],
  },
});

const ssr = new ExoNodeSsr(app);

// Just the markup for your root container:
const body = ssr.renderBody();
// <div id="app"><h1>Hello from Server</h1><p>This is server-rendered</p></div>

// Or a full HTML document (doctype + <html><head><body>):
const html = ssr.renderDocument({ lang: 'en', rootId: 'app' });
```

`new ExoNodeSsr(schema)` renders synchronously on construction (it initializes the
subtree immediately). `renderBody()` returns the body markup; `renderDocument()`
wraps it in `<!doctype html><html><head>…</head><body><div id="…">…body…</div>…</body></html>`,
including any collected head tags and the embedded state script.

## Express Integration

```typescript
import express from 'express';
import { ExoNodeSsr } from '@exodra/ssr';
import { App } from './App';

const server = express();

server.get('*', (req, res) => {
  const ssr = new ExoNodeSsr(App(req.url));

  // Apply any status/headers the tree requested via <Status> / <Header>.
  res.status(ssr.getStatus());
  for (const { name, value } of ssr.getHeaders()) {
    res.append(name, value);
  }

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>My App</title>
        ${ssr.renderHead()}
      </head>
      <body>
        <div id="root">${ssr.renderBody()}</div>
        ${ssr.renderStateScript()}
        <script type="module" src="/entry-client.js"></script>
      </body>
    </html>
  `);
});
```

`renderDocument()` does the same wrapping for you if you prefer not to hand-write
the shell:

```typescript
res.send(ssr.renderDocument({ rootId: 'root' }));
```

## State Transfer & Hydration

The most common pattern: collect a snapshot of your store on the server, embed it
as a `<script>`, and read it back on the client before hydrating the DOM in place.

### Server

```typescript
import { ExoNodeSsr } from '@exodra/ssr';

const ssr = new ExoNodeSsr(App());

// Stash any serializable data under a key:
ssr.setState('workspace', takeSnapshot(store));

const bodyHtml = ssr.renderBody();
const stateScript = ssr.renderStateScript(); // <script id="__EXODRA_STATE__" type="application/json">…</script>
```

`renderStateScript()` emits a `<script id="__EXODRA_STATE__" type="application/json">`
tag containing `getStateSnapshot()` as escaped JSON (or an empty string when no
state was set). You can override the `id` and add a CSP `nonce`:
`ssr.renderStateScript({ id: '__MY_STATE__', nonce })`.

### Client

```typescript
import { hydrate } from '@exodra/dom';
import { App } from './App';

function readState() {
  const el = document.getElementById('__EXODRA_STATE__');
  if (!el?.textContent) return undefined;
  try {
    return JSON.parse(el.textContent);
  } catch {
    return undefined;
  }
}

const root = document.getElementById('root');
if (root) {
  // Rebuild your store from the snapshot, then HYDRATE the existing DOM in place
  // (no teardown, no flash). hydrate() returns { node, element, dispose }.
  const { dispose } = hydrate(App(readState()), root);
}
```

## Persistor-based Hydration

If you use a `@exodra/reactivity` persistor, the package can embed and restore it
for you. `renderPersistorHydration` combines the JSON `<script>` and the inline
script that copies it onto `window.__EXODRA_STATE__`.

### Server

```typescript
import { ExoNodeSsr, renderPersistorHydration } from '@exodra/ssr';
import { getPersistor, persist, bindable } from '@exodra/reactivity';

const user = bindable({ name: 'John' });
persist(user, 'user'); // register the bindable on the global persistor

const persistor = getPersistor();

const ssr = new ExoNodeSsr(App());

res.send(`
  <div id="root">${ssr.renderBody()}</div>
  ${renderPersistorHydration(persistor)}
  <script type="module" src="/entry-client.js"></script>
`);
```

### Client

```typescript
import { hydrate } from '@exodra/dom';
import { autoHydrate } from '@exodra/reactivity';
import { App } from './App';

// Restore persisted state. autoHydrate() looks for window.__EXODRA_STATE__ first,
// then a <script id="__EXODRA_PERSISTOR__"> tag, and feeds it to the persistor.
autoHydrate();

hydrate(App(), document.getElementById('root')!);
```

`hydrateFromWindow(windowKey?, persistor?)` and
`hydrateFromScript(scriptId?, persistor?)` are the lower-level variants if you want
to target a specific source. These hydration helpers are exported from
**`@exodra/reactivity`**, not from `@exodra/ssr`.

## Head, Headers, Status & State Components

Inside your tree you can drive the SSR context declaratively. Each of these is a
real Exodra component; props go in the `static` bucket (`exo:schema` / `static`
in JSX). They render nothing into the body — they only mutate the SSR context.

```typescript
import { h } from '@exodra/core';
import { Head, Header, State, Status } from '@exodra/ssr';

function App() {
  return h('div', {
    static: {
      children: [
        // Push tags into <head> — children are arbitrary schemas:
        h(Head, {
          static: {
            children: [
              h('title', { static: { children: 'My Page Title' } }),
              h('meta', {
                static: { name: 'description', content: 'Page description' },
              }),
              h('link', {
                static: { rel: 'canonical', href: 'https://example.com' },
              }),
            ],
          },
        }),

        // Set the HTTP status (e.g. a 404 page):
        h(Status, { static: { code: 200 } }),

        // Set / append a response header:
        h(Header, {
          static: { name: 'Cache-Control', value: 'no-store' },
        }),

        // Add a key to the transferable state map:
        h(State, { static: { name: 'user', value: { id: 1 } } }),

        h('main', { static: { children: 'Page content' } }),
      ],
    },
  });
}

const ssr = new ExoNodeSsr(App());
ssr.getStatus();        // 200
ssr.renderHead();       // "<title>My Page Title</title><meta …><link …>"
ssr.getHeaders();       // [{ name: 'Cache-Control', value: 'no-store' }]
ssr.getState('user');   // { id: 1 }
```

`<Header>` accepts an optional `append` prop (`static={{ name, value, append: true }}`)
to add a header instead of replacing existing values for that name.

### Reading the SSR context from a component

```typescript
import { useSsr } from '@exodra/ssr';

function SetMeta(context) {
  useSsr(context)?.addHead(
    h('meta', { static: { name: 'robots', content: 'noindex' } })
  );
  return [];
}
```

`useSsr(context)` returns the `TExoSsrContext` (the `ExoNodeSsr` instance) or
`undefined` when not rendering under SSR.

## Splitting Shell and Page (advanced)

The flagship example renders the shell (with an empty outlet) and the matched page
as two independent `ExoNodeSsr` trees and splices them — mirroring how the client
hydrates them as two `ExoNodeDom` trees:

```typescript
import { ExoNodeSsr } from '@exodra/ssr';

const shellSsr = new ExoNodeSsr(shellView(router));
shellSsr.setState('workspace', takeSnapshot(store));

let appHtml = shellSsr.renderBody();
const pageHtml = new ExoNodeSsr(boardPage()).renderBody();
appHtml = appHtml.replace(EMPTY_OUTLET, withPage(pageHtml));

return { appHtml, stateScript: shellSsr.renderStateScript() };
```

## API Reference

### `ExoNodeSsr` (class, extends `ExoNodeString`)

Construct with `new ExoNodeSsr(schema, options?)`. `options` (`TExoSsrNodeOptions`):
`status`, `headers`, `head`, `state`.

Rendering:
- `renderBody(): string` — body markup for your root container.
- `renderDocument(options?): string` — full HTML document. Options
  (`TExoSsrDocumentOptions`): `doctype`, `lang`, `rootId`, `nonce`, `head`,
  `htmlAttributes`, `bodyAttributes`.
- `renderHead(): string` — collected `<head>` tags as HTML.
- `renderStateScript(options?): string` — the `<script id="__EXODRA_STATE__">`
  state tag. Options: `id`, `nonce`.

Status & headers:
- `getStatus()` / `setStatus(code)`
- `getHeaders()` / `getHeader(name)` / `getHeaderValues(name)`
- `setHeader(name, value)` / `appendHeader(name, value)`

State:
- `setState(key, value)` / `getState(key)` / `getStateSnapshot()`
- `addHead(schema | schema[])`

### Components
- `Head` — `static={{ children }}`; pushes schemas into `<head>`.
- `Header` — `static={{ name, value, append? }}`; sets/appends a response header.
- `Status` — `static={{ code }}`; sets the HTTP status.
- `State` — `static={{ name, value }}`; adds a key to the transferable state map.

### Context
- `useSsr(context): TExoSsrContext | undefined`
- `ssrContextKey` — the context key for the SSR context.

### Persistor / hydration scripts
- `renderPersistorScript(persistor, options?)` — `<script id="__EXODRA_PERSISTOR__"
  type="application/json">` with serialized persistor state. Options: `id`, `nonce`,
  `variableName`.
- `renderHydrationScript(options?)` — inline script that copies the JSON into a
  window variable (default `window.__EXODRA_STATE__`).
- `renderPersistorHydration(persistor, options?)` — both of the above combined.

Client-side hydration helpers (`hydrateFromWindow`, `hydrateFromScript`,
`autoHydrate`) are exported from **`@exodra/reactivity`**.

## License

MIT

---

📖 Full documentation: **[exodra.org](https://exodra.org)**
