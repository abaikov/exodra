# @exodra/ssr

Server-side rendering for Exodra applications: the full HTML document, the HTTP
status, the response headers, the `<head>`, and the state transfer to the client.

`new ExoStrBackend().render(App)` from `@exodra/string` returns the instance's
markup and nothing else. This package is the rest of the response: `renderExoPage`
runs a component through that backend with the request installed as a context, and
hands back the markup plus everything the wiring said about the response — status,
headers, `<head>`, and the state script the client reads back.

If you want _only_ markup, you do not need this package at all:
`new ExoStrBackend().render(App)` is the whole of it.

## renderExoPage

`new ExoStrBackend().render(App)` returns the instance's markup and nothing else —
no doctype, no `<html>`, no `<head>`, no state script, no status and no headers.
`renderExoPage` is the rest of the response.

```ts
import { EXO_PORT_TEXT, createExoMachine, createExoSchema, exoPorts, withExoWire } from '@exodra/core';
import { renderExoPage, EXO_SSR_RESPONSE } from '@exodra/ssr';
import type { TExoStrNode } from '@exodra/string';

declare const res: {
    status(code: number): void;
    append(name: string, value: string): void;
    send(body: string): void;
};

const AppPorts = exoPorts({ title: EXO_PORT_TEXT });

const appSchema = createExoSchema(AppPorts, b => {
    b.el('main', { class: 'page' }, main => {
        main.el('h1', null, h1 => { h1.textPort(AppPorts.title); });
    });
});
// The machine's type argument names the exonode.
const appBase = createExoMachine<TExoStrNode, { title: string }>(appSchema);
const App = withExoWire(appBase, (c, params) => {
    // The request, reached the ordinary way: it is a context, provided by
    // `renderExoPage` and read with `inject`, anywhere in the tree.
    const ssr = c.inject(EXO_SSR_RESPONSE)!;
    ssr.setStatus(200);
    ssr.setHeader('cache-control', 'no-store');
    ssr.addHead('<title>' + params.title + '</title>');
    ssr.setState('user', { id: 7 });

    c.text(AppPorts.title, params.title);
});

// In the request handler. `renderExoPage(machine, options?)` — there is no
// instance count: it renders ONE root, and rows that vary are a list inside it.
// `params` reaches the machine's `wire`, as `backend.render(machine, parent, params)` does.
const page = renderExoPage(App, { head: '<meta charset="utf-8">', params: { title: 'Home' } });
res.status(page.status);
for (const { name, value } of page.headers) res.append(name, value);
res.send(page.renderDocument({ rootId: 'app' }));
```

`renderDocument()` emits

```html
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Home</title></head>
<body><div id="app">…the instances…</div><script id="__EXODRA_STATE__" type="application/json">…</script></body></html>
```

### Hydrating it

`backend.hydrate` takes the element whose **element children are the instances** —
that is the container `renderDocument` emitted, and **not** its first child.
Handing it the first child adopts one level too deep: every port lands on the
wrong node and nothing throws.

```ts
import { ExoDomBackend, withExoHydration } from '@exodra/dom';
import type { TExoDomMachine } from '@exodra/dom';
import { readExoStateScript } from '@exodra/ssr';

declare const App: TExoDomMachine;

// ONE backend, at module level. `hydrate` exists only because this composes the
// plugin — a backend built without it has no such method, in the type or at runtime.
const backend = withExoHydration(new ExoDomBackend());

const state = readExoStateScript();                  // what setState transferred
backend.hydrate(App, document.getElementById('app')!);   // the CONTAINER
```

There is no count to keep in step. `renderExoPage` renders one root and `hydrate`
adopts one root, so the two cannot disagree about how many there were. What they
_can_ disagree about is the composition, which is why the browser's backend should
compose the same plugins the server's did, for every name that exists on both
sides — see below.

**A reconciled list adopts the rows it was served.** A machine calls its reconciler
(made once with `createExoChildrenReconciler` from `@exodra/list-reconcile`) with its
items from an effect that draws first; hydration hands the served rows to the rows it
creates in document order, sweeps the ones the client no longer wants and builds the
ones it wants past them. The one shape it refuses is a list standing behind another with only static markup
between them: there the first row of the list behind cannot be told from a surplus
of the one in front.

**A value that moved between the response and the hydration is repaired, whatever
wrote it.** An adopting fill compares what the server printed against what it is
handed and writes only on disagreement, so a plain `c.text(AppPorts.title, title)` whose
value the client computes differently is corrected on adoption. Following a data
source afterwards is an effect: it draws once, synchronously, and subscribes.

### State transfer

`setState` builds a flat map; `renderStateScript` serialises it into
`<script id="__EXODRA_STATE__" type="application/json">`, with `<`, `>`, `&`,
U+2028 and U+2029 written as `\uXXXX` escapes so the payload can neither end the
script element nor be re-parsed as anything else. `readExoStateScript()` reads it
back on the client:

```ts
import { readExoStateScript } from '@exodra/ssr';

const state = readExoStateScript() as { user?: { id: number } } | undefined;
```

### Why an injected object instead of `<Head>` / `<Status>` / …

Frameworks usually spell this as components that render nothing and exist only to
be found by a walker over the rendered tree.

**The component form is not expressible here.** A component is a schema plus a
machine, and a schema is rooted at an element — `compileExoStrSchema`'s `emit` opens
`'<' + tag` before anything else can happen. There is no schema that renders
nothing, so `<Status/>` would have to print a tag into the body. Nor is there a
walk to find it in: children are attached because a machine _called_ `c.one` /
`c.list`, so a "component that only writes to the context" would have to be
invoked by the very machine that could have written to the context itself.

**The four were always one thing.** Each read one or two constants off itself and
forwarded them to one method on the request. What that bought was JSX spelling;
what it cost was four names, four prop vocabularies (`code`, `name`+`value`+
`append`, `name`+`value`, `children`) and four casts —
`context.getConstant<number>('code') as number` where `setStatus(404)` is checked
by the compiler.

**Order becomes visible.** Two `<Status>` in a tree resolve by document order of a
walk that runs somewhere else; two `setStatus` calls resolve by the order they are
written, in one function you are already reading. Likewise `setHeader` overriding
against `appendHeader` accumulating: `append` is a different _method_ rather than
a boolean prop.

**It composes with things that are not markup.** A router deciding a 404, a data
layer setting `cache-control`, a loader stashing state — none of these are JSX,
and with the component form each had to arrange to have a component rendered on
its behalf.

**What the component form was genuinely better at**, and it is `<Head>` alone: its
children were authored as markup, in JSX, and the walker rendered them. `addHead`
takes a string, so a head entry is now either a literal
(`ssr.addHead('<title>Home</title>')`) or a component rendered on the spot
(`ssr.addHead(strBackend.render(Title))`). That is a real loss of authoring
comfort for a page with a large head, and it is the one place a future
`<Head>`-shaped primitive would earn its keep.

Nothing is provided by default: `c.inject(EXO_SSR_RESPONSE)` outside `renderExoPage` is
`undefined`. A component rendered by a client render has no request to talk to,
and a silent no-op object would hide that.

### What this package exports

-   `renderExoPage(component, options?): TExoSsrPage` — the server entry point. It
    renders **one** root; there is no instance count, because rows that vary are a
    list inside the component rather than a repetition of it.
    `options` (`TExoSsrPageOptions`): `backend`, `status`, `headers`, `head`, `state`,
    `context`, `params`. `params` is handed to the page machine's `wire`. `context` is a frame the request's own is chained under, for a caller that
    already has something to provide — a router handing the page its route. It is **passed
    to `render`**, never installed in a module holder, so two requests rendering at once
    cannot see each other's.
    `backend` is the `ExoStrBackend` this page renders from — the object the
    application composed. Left out, the page runs on a backend composed with
    nothing. Build your own **once**, at module level, and pass the same object every
    request: a schema is cached per backend by pointer, so one built per request
    recompiles every declaration on every request.
    `TExoSsrPage` carries `html`, `status`, `headers`, `head`, `stateScript`,
    `state` and `renderDocument(options?)`.
-   `EXO_SSR_RESPONSE` — the context token a machine injects to reach the request. What it
    resolves to is a `TExoSsrResponse`: `setStatus`, `setHeader`, `appendHeader`,
    `addHead`, `setState`, and the getters behind them.
-   `ExoSsrResponse` — that object as a class, for a caller that drives the render
    itself instead of going through `renderExoPage`.
-   `readExoStateScript()` — the client end of the state protocol.
-   `renderExoJsonScript(json, { id, nonce })` / `escapeExoJsonForScript(json)` — the one
    emitter of a `<script type="application/json">` payload in this package, and its
    escaper. The state script goes through it.

## Installation

```bash
npm install @exodra/ssr @exodra/core @exodra/string
```

---

# License

MIT

---

📖 Full documentation: **[exodra.org](https://exodra.org)**
