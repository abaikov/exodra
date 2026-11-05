# @exodra/monorepo-atlas

An architecture atlas for a TypeScript repository, generated from the code. It
answers two questions:

1. **How do the packages depend on each other?** Which edges reach runtime and
   which are `import type` only, how many imports stand behind each edge, whether
   `package.json` declares the dependency, and which architecture rules are broken.
2. **What is inside a package?** Its classes, functions and types: members,
   visibility, statics, and who calls, constructs, extends or implements whom, with
   the descriptions the author wrote.

It works on npm, yarn and pnpm workspaces and on single-package repositories.

This version writes the data and the stylesheet only; it does not ship a drawn
picture or a browser viewer.

## Use it

```sh
npm i -D @exodra/monorepo-atlas
npx exo-atlas --out public/atlas
```

That writes:

```
public/atlas/graph.json           model + layout
public/atlas/graph.css            theme variables + structural rules
public/atlas/insides/index.json   which packages have an inside to open
public/atlas/insides/<pkg>.json   one per package
```

Stale `insides/*.json` files from an earlier run are removed.

### Options

| Flag                 | What it does                                                               |
| -------------------- | -------------------------------------------------------------------------- |
| `--root <dir>`       | The repository to read. Defaults to the working directory.                 |
| `--out <dir>`        | Where to write. Defaults to `<root>/public/graph`.                         |
| `--check`            | Write nothing; exit `1` when the files in `--out` are out of date. For CI. |
| `--modules`          | Model modules instead of packages, useful in a single-package repository.  |
| `--include-external` | Include the npm packages the workspace depends on.                         |
| `--ts-config <path>` | The tsconfig used to resolve imports (path aliases).                       |
| `--help`, `-h`       | Print the options.                                                         |

Exit codes: `0` success, `1` out of date (with `--check`) or no packages found, `2`
an unknown or incomplete option.

When the extractor cannot resolve a member's type, it still writes the model,
marks those members as unresolved, and reports the count on stderr.

Architecture rules come from the repository's own
[dependency-cruiser](https://github.com/sverweij/dependency-cruiser) configuration
(`.dependency-cruiser.cjs` and friends). A repository without one gets a model
with no rule violations.

## The data

Each node carries its kind, its module count, the declarations it exports and the
rules it breaks; each edge carries its weight, its kinds (`value`, `type-only`,
`dynamic`), the evidence behind it and its violations. The layout gives every node
a box and every edge a routed polyline, so a consumer can draw it without a layout
engine.

The same steps are available programmatically:

```js
import { buildArtifacts, buildModel, layoutModel, extractEntities } from '@exodra/monorepo-atlas';
```

The package also exports `serialiseData`, `collectPackages`, `classify`,
`fileNameFor`, `filterNodes`, `withoutExternal`, `EXO_UNRESOLVED_TYPE`,
`renderGraphCss`, `colorReport`, `renderThemeCss`, `applyColors`, `resolveMode`,
`defaultPalette`, `EXO_GRAPH_KINDS`, and the model, layout and palette types.

## Colours

`renderGraphCss()` emits every mark's rules against CSS custom properties with
defaults, so a host restyles the atlas from its own stylesheet:

```css
.exo-graph {
    --exo-kind-runtime: var(--brand-primary);
    --exo-kind-tooling: var(--brand-warning);
    --exo-kind-app: var(--brand-success);
    --exo-surface: var(--page-bg);
    --exo-ink: var(--page-fg);
}
```

Defaults are declared at zero specificity, so a plain selector wins without
`!important`. `colorReport` flags two node kinds that cannot be told apart
(including under common forms of colour blindness) and colours lost against the
background.

## Limits

-   It reads **static imports**, not runtime behaviour.
-   Declarations are matched **by name**: two same-named declarations in different
    files of one package collapse into one box.
-   TypeScript and JavaScript only.

## Licence

MIT
