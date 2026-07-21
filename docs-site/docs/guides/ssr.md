---
sidebar_position: 3
title: SSR & Hydration
---

# Server-Side Rendering & Hydration

Exodra renders to an HTML string on the server and **hydrates** the existing DOM
on the client (no teardown, no flash). Three packages cooperate:

- `@exodra/string` — turn a schema into an HTML string.
- `@exodra/ssr` — render a string **plus** SSR side-channels (head tags, status,
  headers, embedded state) via the `ExoNodeSsr` node and the `Head` / `Header` /
  `State` / `Status` components.
- `@exodra/dom` — `hydrate()` the server-rendered DOM on the client.
- `@exodra/reactivity` — `autoHydrate()` / `hydrateFromWindow()` to restore
  persisted reactive state.

## Plain string rendering

For a one-off HTML string with no head/state side-channels, use
`renderToString` from `@exodra/string`:

```typescript
import { renderToString } from '@exodra/string';
import { h, text } from '@exodra/core';

const html = renderToString(
  h('div', { static: { class: 'app', children: text('Hello SSR') } })
);
// → '<div class="app">Hello SSR</div>'
```

> `@exodra/string` exports `renderToString`, `createStringNode`, and
> `ExoNodeString`. There is **no** `renderToStream`.

## SSR with `ExoNodeSsr`

`ExoNodeSsr` (from `@exodra/ssr`) extends the string node with an SSR context.
Construct it with a schema, then read back the rendered body and any state the
tree collected through context-aware components.

```typescript
import { ExoNodeSsr } from '@exodra/ssr';

const ssr = new ExoNodeSsr(appSchema);

const body = ssr.renderBody();           // the app's HTML
ssr.setState('user', { name: 'Ada' });   // embed reactive/app state
const stateScript = ssr.renderStateScript(); // <script id="__EXODRA_STATE__">…</script>
```

Key methods:

| Method | Description |
| --- | --- |
| `renderBody()` | The app HTML string. |
| `renderDocument(options?)` | A full `<!doctype html>` document wrapping the body, head, and state script. |
| `renderHead()` | Collected `<head>` markup from `Head` components. |
| `setState(key, value)` / `getState(key)` | Read/write the embedded state map. |
| `renderStateScript(options?)` | A `<script id="__EXODRA_STATE__" type="application/json">` tag with the serialized state. |
| `setStatus(code)` / `getStatus()` | HTTP status (also settable via the `Status` component). |
| `setHeader(name, value)` / `appendHeader(...)` / `getHeaders()` | Response headers. |

### SSR components

These components write into the SSR context instead of rendering body content
(they render nothing in place). Pass their props through the `static` bucket.

```jsx
import { Head, Header, State, Status } from '@exodra/ssr';

function Page() {
  return (
    <>
      <Head static={{ children: <title static={{ children: 'Dashboard' }} /> }} />
      <Status static={{ code: 200 }} />
      <Header static={{ name: 'Cache-Control', value: 'no-store' }} />
      <State static={{ name: 'user', value: { name: 'Ada' } }} />
      <main static={{ class: 'page' }}>Dashboard</main>
    </>
  );
}
```

| Component | Effect |
| --- | --- |
| `Head` | Appends its children to the document `<head>`. |
| `Status` | Sets the HTTP status code. |
| `Header` | Sets (or, with `append: true`, appends) a response header. |
| `State` | Stores a value under `name` in the embedded state map. |

### useSsr()

Inside a component, `useSsr(context)` returns the SSR context (or `undefined`
when rendering on the client), letting you set head/state/status imperatively.

```typescript
import { defineComponent } from '@exodra/core';
import { useSsr } from '@exodra/ssr';

const Meta = defineComponent(context => {
  useSsr(context)?.setStatus(404);
  return [];
});
```

## A real server entry

This mirrors the flagship example
(`packages/examples/05-cnstra-oimdb/src/entry-server.ts`). The persistent shell
is rendered with an empty outlet, the matched page is rendered as a second tree,
and the two are spliced — exactly how the client hydrates them. The app snapshot
rides along in the embedded state script.

```typescript
import { ExoNodeSsr } from '@exodra/ssr';
import { createRouter, createMemoryHistory } from '@exodra/router';
import { routes } from './app/routes';
import { shellView } from './app/shell';
import boardPage from './pages/board';

const EMPTY_OUTLET = '<main id="outlet" class="outlet"></main>';

export function render(url = '/') {
  const router = createRouter(routes, { history: createMemoryHistory(url) });

  // Render the shell (with an empty outlet) and collect SSR state.
  const shellSsr = new ExoNodeSsr(shellView(router));
  shellSsr.setState('workspace', takeSnapshot());

  let appHtml = shellSsr.renderBody();

  // Render the matched page as a second tree and splice it into the outlet.
  if (url === '/' || url.startsWith('/?')) {
    const pageHtml = new ExoNodeSsr(boardPage()).renderBody();
    appHtml = appHtml.replace(
      EMPTY_OUTLET,
      `<main id="outlet" class="outlet">${pageHtml}</main>`
    );
  }

  return { appHtml, stateScript: shellSsr.renderStateScript() };
}
```

Note `createRouter(routes, { history: createMemoryHistory(url) })` — `routes` is
positional and `createMemoryHistory(url)` seeds the server-side location. See the
[Router API](../api/router.md) for details.

## Client hydration

On the client, read the embedded state, then `hydrate()` the server-rendered DOM
instead of mounting fresh. `hydrate` (from `@exodra/dom`) attaches reactivity to
the existing nodes and returns `{ node, element, dispose }`.

```typescript
import { hydrate, mount } from '@exodra/dom';
import { createRouter, createBrowserHistory } from '@exodra/router';
import { routes } from './app/routes';
import { shellView } from './app/shell';

const root = document.getElementById('app')!;
const router = createRouter(routes, { history: createBrowserHistory() });

// Hydrate the SSR'd shell against the existing DOM, or mount fresh when there
// was no SSR (pure client render).
const ssrShell = root.firstElementChild;
if (ssrShell) {
  hydrate(shellView(router), ssrShell);
} else {
  mount(shellView(router), root);
}
```

### Restoring persisted reactive state

If you registered observables with `persist()` (see the
[Reactivity API](../api/reactivity.md)), restore them before hydrating. The
easiest path is `autoHydrate()`, which tries `window.__EXODRA_STATE__` then the
`__EXODRA_PERSISTOR__` script tag:

```typescript
import { autoHydrate } from '@exodra/reactivity';

autoHydrate(); // no-op on the server; restores persisted state on the client
```

Use the lower-level helpers when you control the location explicitly:

```typescript
import { hydrateFromWindow, hydrateFromScript } from '@exodra/reactivity';

hydrateFromWindow('__EXODRA_STATE__');   // from window state
hydrateFromScript('__EXODRA_PERSISTOR__'); // from a script tag
```

### Emitting the hydration scripts on the server

To pair the persistor with the client helpers, emit both the serialized state
and an inline restore script with `renderPersistorHydration` (from
`@exodra/ssr`):

```typescript
import { getPersistor } from '@exodra/reactivity';
import { renderPersistorHydration } from '@exodra/ssr';

// After rendering, before sending the HTML:
const hydrationHtml = renderPersistorHydration(getPersistor());
// → <script id="__EXODRA_PERSISTOR__" …>{…}</script><script>…window.__EXODRA_STATE__…</script>
```

You can also use the pieces separately: `renderPersistorScript(persistor)` emits
just the JSON `<script>`, and `renderHydrationScript()` emits just the inline
script that copies it into `window.__EXODRA_STATE__`.

## Summary

1. **Server:** build a schema, render it with `ExoNodeSsr` (or `renderToString`
   for plain HTML), and embed state via `renderStateScript()` /
   `renderPersistorHydration()`.
2. **Client:** restore reactive state with `autoHydrate()`, then `hydrate()` the
   server-rendered DOM rather than re-mounting.
