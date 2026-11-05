# Router and forms

Two pages, one per package that shipped with **no runnable demonstration at all**.

| Page          | Package          | What it shows                                                                                                                                                                                                                                                                  |
| ------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `router.html` | `@exodra/router` | one table, one outlet: a param route, a nested layout with a second boundary inside it, a redirecting guard, a lazy page arriving late, a two-way query parameter, and a path that matches nothing                                                                             |
| `forms.html`  | `@exodra/forms`  | one machine with one `input` port on the `<form>`: a text field, a number field, a checkbox, a radio group, a select, a live read-out written by the functions the handlers call, a submit read-out from `readExoControlValues`, and two buttons that set the fields from code |

Both packages were covered by tests before these pages existed and by nothing a person could
open.

## Status, plainly

**These two pages have not been opened in a browser, and both have since been rewritten.** They
were written against the source of `@exodra/router` and `@exodra/forms`, and every export they
import was checked against the built `dist/index.js` of each package rather than against the docs.
That is not the same as having run them, and `../plugin-slots/README.md` says the same thing about
its six for the same reason.

**What the rewrite changed.** Both pages are machines now and render from one backend built at
module level — `withExoCompiler(new ExoDomBackend())` in both `router.html` and `forms.html`. `render` exists only on a backend composed with `withExoCompiler`, and one built
per render or per route handler recompiles every schema. Each renders through `backend.render(Component, root)`, which mounts one instance and hands back its
disposer. `forms.html` uses the three functions `@exodra/forms` exports: `readExoControlValue`,
`readExoControlValues` and `writeExoChoice`.

**`router.html` shows the router's current shape:** a page that receives its match as the params
of its wire, `ExoOutlet` placed with `c.one`, `ExoLink` created with `c.createExoNode(ExoLink)`, wired with
`wireExoNode(link, { to, label })` and placed with `c.appendChild(port, link)`,
and `router.onChange` subscribed from a machine effect.

Each page checks every name it uses against the build before it runs anything, and prints which
export is missing and which `npm run build` fixes it.

## How to open them

The import maps point at **this repository's own `dist/`** with absolute paths, so the server has
to be started at the **repository root** — not in this folder.

```sh
cd /path/to/exodra
npm run build --workspace=@exodra/context
npm run build --workspace=@exodra/core
npm run build --workspace=@exodra/dom
npm run build --workspace=@exodra/router
npm run build --workspace=@exodra/forms
python3 -m http.server 8000
```

Then open <http://localhost:8000/packages/examples/router-and-forms/router.html> or
<http://localhost:8000/packages/examples/router-and-forms/forms.html>.

ES modules are subject to CORS, so a `file://` page cannot import them. There is no
`package.json` here and nothing to install. Not a CDN, for the reason `../no-build/README.md`
gives: the last _published_ `@exodra/core` is a renderer that has since been deleted.

## What these pages will NOT tell you

-   **`router.html` uses a MEMORY history, not the browser one.** That is one line
    (`createExoMemoryHistory('/')` → `createExoBrowserHistory()`) and nothing else on the page knows
    which it got — `TExoHistory` is the interface both of them sit behind. It is a memory history here
    because
    `python3 -m http.server` has no rewrite rule: with the browser history, the first reload after
    a navigation would 404 from the _server_, and the page would look broken for a reason that has
    nothing to do with Exodra. The cost is that the address bar never moves, so what a real
    application gets from an `<a href>` — a working reload, a shareable URL — is not on show here.
    The href itself is: hover a link and the status bar reads it.

-   **Neither page renders on the server or hydrates.** Both call
    `backend.render(Component, root)`, and nothing else — no
    `withExoHydration`, so neither backend even _has_ a `hydrate` method. So the claim that the
    same wiring function runs on all three
    backends is _not_ demonstrated here. For the router it is asserted, byte for byte, in
    `packages/router/src/tests/hydrated-routing.test.ts`, which compares `@exodra/string`'s output
    against the DOM's and then adopts it. For forms, `packages/forms/src/controls/tests/controls.test.ts`
    asserts the radio mark `writeExoChoice` serves from `@exodra/string`, and that
    `readExoControlValues` answers `undefined` there.

-   **`router.html` does not call `preloadExoPage`,** deliberately: warming the chunk would make
    the empty-then-filled moment invisible, and that moment is the thing worth seeing. Where that
    call belongs is before a _server_ render, since a synchronous render cannot await a chunk —
    `packages/router/src/pages/tests/lazy-pages.test.ts` is where both halves of that are pinned.

-   **A layout is a route.** The layout in `router.html` is a ROUTE with `children` and a second
    boundary inside its own markup; `TExoRoute` has no `layout` field.
