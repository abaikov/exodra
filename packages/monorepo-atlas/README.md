# @exodra/monorepo-atlas

An architecture atlas for a TypeScript repository, generated from the code.

Two levels of one question — *how is this thing put together?*

1. **The packages** and how they depend on each other: which edges survive to
   runtime and which are erased `import type`, how many imports stand behind
   each one, whether `package.json` admits to the dependency, and which
   architecture rules are broken.
2. **What is inside a package**: its classes, functions and types as a UML class
   diagram — members, visibility, statics, and who calls, constructs, extends or
   implements whom, with the descriptions the author already wrote.

Nothing is drawn by hand and nothing is maintained separately from the code, so
the picture cannot quietly go out of date — and `--check` fails a build when it
has.

It works on a monorepo (npm, yarn or pnpm workspaces) and on a repository with a
single package.

## Use it

```sh
npm i -D @exodra/monorepo-atlas
npx exo-atlas --out public/atlas
```

That writes everything the page needs. Point a page at it:

```html
<link rel="stylesheet" href="/atlas/graph.css" />
<div id="exo-graph"></div>
<script type="module" src="/atlas/graph.js"></script>
```

The script finds `#exo-graph`, renders the drawing, and fetches a package's
insides only when a reader opens one.

### Options

| Flag | What it does |
| --- | --- |
| `--root <dir>` | The repository to read. Defaults to the working directory. |
| `--out <dir>` | Where to write the artefacts. Defaults to `<root>/public/graph`. |
| `--check` | Write nothing; exit non-zero when the artefacts are out of date. For CI. |
| `--modules` | Draw modules instead of packages — the useful level in a single-package repository. |
| `--include-external` | Include the npm packages the workspace depends on. |
| `--ts-config <path>` | The tsconfig to resolve imports with (this is where path aliases live). |

Architecture rules come from the repository's **own**
[dependency-cruiser](https://github.com/sverweij/dependency-cruiser)
configuration — `.dependency-cruiser.cjs` and friends. A repository without one
still gets its graph; it simply has no rules to report, which is the honest
result. A repository with one gets every violation marked on the drawing, with
the rule's own comment quoted in the panel.

## Reading it

- **Left to right** is dependency order.
- **Dashed** edges are `import type`, **dotted** are dynamic `import()`,
  thickness is how many imports stand behind the edge.
- **A red dashed ring** is a broken rule.
- Inside a package the notation is UML: a hollow triangle is *extends*, the same
  triangle on a dashed line is *implements*, a filled diamond is *constructs*, an
  open arrow is *calls*, and an open arrow on a dashed line is *names in a type*.
  A legend next to the drawing says so too.
- A box shows the first few members and counts the rest; selecting it opens a
  card with all of them, in full, with their documentation. Type names in a
  signature are links to their own boxes.

Type a name to find it. Enter goes to the first match.

| Key | |
| --- | --- |
| arrows | pan (with <kbd>Shift</kbd>, further) |
| <kbd>+</kbd> / <kbd>-</kbd> | zoom |
| <kbd>0</kbd> | fit the whole drawing |
| <kbd>Enter</kbd> | open the selected package |
| <kbd>Esc</kbd> | clear the selection and the search |

The address bar follows the reader — `#atlas=@scope/pkg:Declaration` — so a
diagram somebody is looking at can be sent to somebody else.

## Embedding it yourself

For a framework page, mount it by hand instead of using the script tag:

```js
import { mountFromUrl } from '@exodra/monorepo-atlas';

const atlas = await mountFromUrl(element, '/atlas/graph.json');
// atlas.dispose() when the component goes away.
```

React, Vue and Svelte all work the same way — this is a plain element, not a
component; in React, call it from an effect and return `dispose`.

If you already have the data, `mountExplorer(element, { model, layout })` skips
the fetching entirely, and `buildArtifacts`, `buildModel`, `extractEntities` and
`layoutModel` are exported for anything more unusual.

## Colours

The graph paints every mark from CSS custom properties and ships defaults, so a
host restyles it in its own stylesheet and nothing needs to be passed anywhere:

```css
.exo-graph {
    --exo-kind-runtime: var(--brand-primary);
    --exo-kind-tooling: var(--brand-warning);
    --exo-kind-app: var(--brand-success);
    --exo-surface: var(--page-bg);
    --exo-ink: var(--page-fg);
}
```

That is the whole theming API, and it follows a site's own light/dark switch for
free. Defaults are declared at zero specificity, so a plain selector always wins
without `!important`.

Colours can also be passed to `mountExplorer({ colors })`, which additionally
checks them: two node kinds nobody can tell apart — including under the common
forms of colour blindness — or a colour lost against the background is reported
in the console during development.

## What it does not do

- It reads **static imports**, not runtime behaviour.
- Declarations are matched **by name**: two same-named declarations in different
  files of one package collapse into one box.
- A type from another package is shown in full but is not a link — its box is not
  on that diagram.
- TypeScript and JavaScript only.

## Licence

MIT
