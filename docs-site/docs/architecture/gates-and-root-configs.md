---
title: Why the gates are shaped this way
description: The reasoning behind the root configs — the release chain, the typecheck graph, the architecture crawl and the lint rules — kept out of the configs themselves.
---

# Why the gates are shaped this way

The root configs — `package.json`, `tsconfig.json`, `tsconfig.build.json`,
`tsconfig.depcruise.json`, `.dependency-cruiser.cjs` and `eslint.config.js` —
carry only what a reader of those files needs in order not to break them. The
reasoning that produced their present shape is here, because it is history and
argument rather than meaning, and a config file is the wrong place to keep
either.

## A gate that nothing invokes looks exactly like a gate that runs

This is the failure this repository keeps having, and it is why
`npm run check:gates` exists at all.

Checks found written and unwired, each discovered by accident, months apart, by
somebody looking at something else:

- `test:packed` asserted the API of a renderer that had been **deleted**. It
  could not have passed since the deletion, so the release path was unguarded.
- `check-bundle-size.mjs` was wired into nothing, failed on most packages it
  covered, and budgeted the raw bytes of an unminified file rather than what a
  page pays.
- Prettier was rewriting the markup of benchmark participants, which silently
  killed the fairness gate on the mount axis.
- `graph:check` sat in `package.json`, in no workflow and in no other script —
  nothing had ever cruised the package graph in CI.
- `graph:verify` existed and passed, and was likewise invoked by nothing, so the
  published architecture diagram was free to drift, and had: the generated page
  was missing an entire package until it was regenerated.
- `atlas:verify` had the same shape.

The pattern is not carelessness about any one check. It is that **a check's
wiring is invisible**: the file exists, it looks maintained, it has a header
explaining what it protects, and no process executes it. A comment claiming a
property is not a check of it — which is the sentence `check-llms.mjs` already
writes about the docs digest, applied to the checks themselves.

`check:gates` now asks three questions: is every `*.test.ts` on disk actually
collected by the default test run; is every `scripts/check-*.mjs` reachable from
an npm script; and is every gate-shaped npm script inside `release:check`.

## Why `graph:check` stayed out of the chain for so long

Not neglect — it could not pass. It reported a large majority of its errors as
phantoms produced by the rule's own mis-specification, plus a handful of
unresolvable imports that were two config omissions and one deliberately
uninstalled benchmark participant.

The mis-specification is worth stating because the two options read as
synonyms. On a `circular` rule, `dependencyTypesNot` filters only the single
edge from `from` to `to` — it says nothing about the hops the cycle passes
*through*. `viaOnly` constrains **every** hop, which is what "survives type
erasure" actually means. With `tsPreCompilationDeps` on, an `import type` is an
edge, so the undivided rule was reporting cycles that exist in no emitted
output: a chain whose first hop is a value import and whose remaining hops are
all erased was still an error. Measured on this tree: thirty-seven errors under
`dependencyTypesNot`, seventeen under `viaOnly`.

Standing violations nobody can act on are how a gate stops being read, and a new
runtime cycle would have arrived as one more line among the unreadable ones.

There was also a sentence in `.dependency-cruiser.cjs` claiming a test proved
each rule still bites. There was no such file — not under that name, not under
any other. The one claim in that file promising the rules were tested was the
one thing nothing backed, in a file whose whole subject is gates that quietly
stop firing.

## Where the typecheck writes, and why it is not `dist/`

Every project referenced from `tsconfig.build.json` is `composite`, and a
composite project **must** emit — TypeScript rejects `noEmit` on a referenced
project outright. So `tsc -b` writes real files, and where it writes them is a
packaging decision.

`dist/` belongs to tsup and to nobody else: it is what `files: ["dist"]`
publishes. tsup emits one self-contained bundle per entry with its declarations
beside it. tsc emits its own per-file output — a barrel full of extensionless
relative re-exports, which Node's ESM resolver refuses to load. Pointed at the
same directory the two pipelines overwrite each other and the published package
is whichever ran last. `npm run test:packed` caught exactly that, as
`ERR_MODULE_NOT_FOUND` on a deep path inside a published package.

So every referenced project emits to `./.tsbuild` — gitignored, in no `files`
array, published by nothing — and cross-package type resolution during the
typecheck goes through each project's `paths` into `../<pkg>/.tsbuild`, tsc's
own fresh output. `npm run typecheck` is therefore self-sufficient on a clean
checkout, before anything has been built. The `paths` in each package's
`tsconfig.tsup.json` point at `dist/` instead, because that is the input tsup's
declaration build legitimately consumes: the dependency's published bundle,
produced earlier in the build order.

`introspect` is the one documented exception and keeps `outDir: "./dist"`,
because tsc *is* its publisher — no tsup writes there, so there is nothing for
its output to collide with.

### Why some projects are referenced by file and not by directory

Those packages' `tsconfig.json` is their **build** config, and the two cannot be
the same file:

- The packages whose build is `tsc && mv dist/index.js dist/index.cjs` would
  gain `incremental` along with `composite`. A second build then skips its emit
  — against a `dist/index.js` the previous run had already moved away, or a
  `dist` the script had just deleted — and ships whatever was left behind.
- The packages with no `tsconfig.tsup.json` have `tsconfig.json` as the file
  tsup reads. `composite` there reaches tsup's declaration pass, which is handed
  an entry list rather than the config's `include`, and answers TS6307 "not
  listed within the file list of project".

Each therefore keeps its build config untouched and carries a
`tsconfig.typecheck.json` beside it, emitting to `.tsbuild` like everything
else.

### One project graph, and why the root `references` has a single entry

`tsconfig.json` used to carry its own list of references — seven of them, while
`tsconfig.build.json` carried twenty-five. Both are solution configs, both are
built with `tsc -b`, and nothing kept the two lists in step: `npm run typecheck`
is `tsc -b tsconfig.build.json`, while a person at a terminal types `tsc -b` and
gets the root file.

That difference cost a day. `tsc -b --force` was green over a source file that
had been truncated mid-expression — twelve syntax errors, in a package that was
in the other list and not in this one. The list now lives in exactly one place
and the root file points at it, so all three invocations cover identical
projects.

Referencing a solution config (`files: []` plus `references`) is a first-class
case in tsc's build mode, not a trick: it reports such a project as
`ContainerOnly`, builds nothing for it, and recurses into its references.

### What `tsconfig.build.json` deliberately does not contain

`packages/benchmarks` is the one `packages/*` entry no typecheck of any kind
covered for a long time, which is how a reference app's wires came to be typed
browser-only for months. It cannot join the build graph — it compiles
competitors, and Solid's `jsxImportSource`, an Angular app and a Marko one each
want options that contradict that graph's. It now has its own
`tsconfig.typecheck.json`, invoked by `npm run typecheck:benchmarks`, which
excludes the competitor participants and checks everything else, so a new axis
is covered by default and a new unclassified participant fails loudly.

Membership is decided by whether something else already checks the package, not
by whether it is interesting: a package the typecheck cannot see has
declarations that can go wrong with nothing saying so.

`packages/test-utils` used to be listed as deliberately absent too. Privacy was
never the criterion — being checked by something else is, and nothing else
checked it, while every DOM suite in the repo imports its helpers through the
vitest alias and vitest transpiles without checking types. It is referenced now.

`@exodra/conformance`, the cross-backend suite, is mapped in the root
`tsconfig.json` and deliberately **not** referenced from the build graph. Its
entry point states the reason in its own header: every expectation in it was
derived by reading the backends, never by running them. The project reference
goes in once that stops being true.

## `typecheck:tests`, and what it found

No configuration in this repository ever handed a **test** file to the compiler.
`tsconfig.build.json` ends by excluding `*.test.ts` and `*.spec.ts`, and so does
every package config, because those projects are `composite`, a composite
project must emit, and a compiled test file in `.tsbuild` or `dist` is output
nobody wants. Correct for the build — and it left every test file in the repo
checked by nothing.

What that cost, once: a field on the schema type was renamed, `tsc -b --force`
exited zero, and three suites were left red reading a field that no longer
existed.

Arming the gate was made conditional on reading its output first, and that
condition was met. The first sweep printed fifty-four errors over thirteen
packages, a second printed fifteen more over the seven the first had not
covered, and all of them were read, attributed and closed — none with `any`,
`@ts-ignore`, a loosened config or a deleted case. What they turned out to be is
the argument for keeping the gate: a third-party module shipping `main` and no
`types`; four test configs inheriting the `commonjs` target that describes their
package's shipped `dist/index.cjs` while vitest loads the suites as ESM; and the
rest stale hand-rolled type surfaces inside the tests themselves — a
two-parameter `on()` where the connector's has taken three for as long as it has
existed, a DOM-component annotation on a helper whose body is the server's
renderer, and a method pulled off its object and called bare so it lost `this`.
Every one was a test asserting against a shape the source had moved away from.

The implementation is one `tsconfig.tests.json` per package, each extending that
package's **own** typecheck config so a test resolves `@exodra/core` to the
identical declaration file its sources do. A single root project with a wildcard
`@exodra/*` map does not work: it produces type doppelgangers instead.

## `check:src-emit`, and the suite that lied

`tsc -b packages/benchmarks` wrote six hundred and fifty `.js`, `.js.map`,
`.d.ts` and `.d.ts.map` files into the `src/` directories of four runtime
packages. It resolves `@exodra/*` to the **sources**, so every library file it
read sat outside its `rootDir` and was written back beside itself. Vite resolves
a `.js` before the `.ts` next to it, so vitest ran the stale copies: a fix that
had landed was reported as still failing, with a stack frame pointing at a line
inside a JSDoc block. And `.gitignore` carried `**/src/**/*.js` plus three
siblings, so `git status` showed a clean tree the entire time.

All four ignore lines are gone and the emit is stopped at its config. The gate is
what makes the *next* emitter visible, because that class of failure announces
itself in no other way: every number and every test result taken off such a tree
is worthless and nothing goes red.

## Order inside `release:check`

The chain is ordered by what a step needs and by what it costs, not by
importance.

- `check:src-emit` runs second, before `lint`: after it, `prebuild` sweeps the
  stray files away at `build:all` and the evidence is gone.
- `graph:check` and `graph:verify` run third, before `typecheck`: they need
  nothing built, they are the cheapest things in the list that can fail, and a
  layering or undeclared-dependency break is worth hearing about before eleven
  minutes of build.
- The two tree-shaking gates and the docs gates need nothing built either, so
  they sit with the structural checks.
- `check:size` and `check:numbers` sit **after** `build:all`, because they gzip
  files in `dist/`. Before the build they would either brick a clean checkout or
  skip themselves silently, and a gate whose half no-ops is the exact failure
  three gates here were found to have.
- `typecheck:tests` sits immediately after `typecheck`, because the `paths` it
  inherits name `.tsbuild`, which that step is what produces.

"Release-only" is not what the chain's name suggests: `.github/workflows/ci.yml`
runs `npm run release:check` on every push to `main`/`master`, on every pull
request and on manual dispatch. Every gate in the chain is therefore a CI gate,
and the only thing left uncovered is a push to a side branch with no pull
request open.

## The lint and format globs

`lint` and `format:check` disagreed by one character and nobody had worked out
what it cost. `packages/*/src` is one directory level; `packages/**/src` is any.
The difference was exactly `packages/examples/*/src` — thirty-three files, nine
of them `.tsx` — which prettier had always checked and eslint never did. Both
globs read `packages/**/src` now; `format:check` additionally covers `.js` and
`.jsx`, which eslint's own flat config handles separately.

What **neither** covers, and what therefore no lint or format gate in this
repository sees: `packages/*/test/**`, every `tsup.config.ts`, `scripts/*.mjs`,
and the root configs themselves. Widen deliberately, not by accident.

## The naming rules, and the debt they exposed

`CLAUDE.md` has stated the prefixes since the first commit — every exported type
or interface is `TExo…`, every exported class `Exo…`, every exported enum
`EExo…` — and until the eslint rule existed nothing checked them. Which is how
a style package shipped an unbranded type name and `@exodra/introspect`
accumulated a hundred and sixty-three names that miss the convention.

The first three selectors left a hole: exported **constants** were not covered,
and four namespace tokens shipped unbranded with an `NS_` head that reads as
`xmlns` in a package that is nothing but DOM. All four are gone — renamed under
the rule and then deleted outright with the namespaced plugin registry they
belonged to, whose registered pieces are now plain members that plugins provide.
The rule outlives them, and is what stops the next one.

The temporary exemption blocks at the bottom of `eslint.config.js` are debt that
is counted rather than hidden: one package per block, each deleted the moment
its package is renamed. An override with no expiry condition is just the rule
turned off.

## Why `build:wasm` stays inside `release:check`

It is the last step of the chain, and moving it to a job of its own looks
tidier than it is. `npm run release` is `release:check && test:packed &&
publish:all`; `swc_plugin_exodra.wasm` is gitignored, and
`swc-plugin-exodra`'s `files` is exactly `["swc_plugin_exodra.wasm"]`.
Nothing else in that chain produces the artefact. A release whose gate
skipped the compile would publish a tarball holding a stale binary, or
none at all, and every other gate would still be green.

The step needs a Rust target the GitHub runner image does not install, so
CI adds `wasm32-wasip1` before running the chain. `build:wasm` itself
refuses to guess: it checks for cargo, then for rustup, then for the
installed-target list, and prints which of the three is missing.

## Why the release runs in Actions and not from a laptop

Every tarball carries a **provenance attestation** — a signed statement binding
the published bytes to this repository, this workflow and this commit. Minting
it needs an OIDC token, and that token exists in Actions and nowhere else. So a
publish from a developer machine would produce bytes nobody can trace, and
`publish.sh` leaves `NPM_CONFIG_PROVENANCE` unset locally because npm rejects
the flag outside CI.

The shape of the release itself is Changesets': it works out **what** to bump
from the changeset files in the commit, cascades the bump through every
dependent and rewrites the internal ranges. The workflow then publishes whatever
ended up with a version the registry does not have. Nobody edits a version by
hand and there is no separate release ceremony — which is also why merging a
changeset is not a step towards a release but *is* the release.

## The five test layers

Each catches what the one below it cannot see.

1. **UNIT** — `*.test.ts` in a `tests/` directory beside the code it covers, run
   from the root `vitest.config.ts`.
   Its aliases point every `@exodra/*` at SOURCE, so a test sees an edit without
   a build.
2. **CONTRACT** — the DOM renderer against the string renderer
   (`renderer-divergences`, `*.conformance`). The two deliberately share no code,
   so the shared part is the behaviour.
3. **TYPE** — `@exodra/type-tests`, for what no runtime assertion can reach.
4. **PACKAGED** — `scripts/test-packed.mjs` packs the release into a fresh
   project. It is the one place those aliases are absent, which is the point: it
   catches a wrong `exports` and a missing `files`.
5. **BROWSER**, where jsdom lies — `@exodra/monorepo-atlas`'s Playwright smoke
   over the published page.

Two conventions keep it navigable. A test file is named after the **concern** it
covers, not the class it pokes. One that needs a DOM says so on its own first
line with `// @vitest-environment jsdom`, so the fact is declared once and a
test cannot pass from its package and fail from the root.

## The `process` scan in `test:packed`, and the crash that bought it

`packages/core/dist/index.js` was verified in a real browser to throw
`ReferenceError: process is not defined` before a single element was built, and
**nothing in this repository caught it**: the vitest run and the packed-artifact
fixture both execute under Node, where `process` is a global that happens to
exist. The one environment the code is *for* was the one environment nothing
tested it in.

The rule the sources already state — `@exodra/core`'s `createExoSchema.ts`, under
"the two baskets" — is that a refusal surviving into the shipped `dist` must read

```ts
typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
```

and the guard cannot be dropped because **only a bundler substitutes
`process.env.NODE_ENV` textually**. A `<script type="module">` and a browser
`import` do not, so the bare form is a hard crash for exactly the consumers who
did not bundle.

The CDN build is deliberately not scanned: `packages/browser-tsup.mjs`
substitutes the whole member expression through esbuild's `define`, so nothing
named `process` survives into `dist/exodra.global.js`. What *is* scanned is the
ESM graph a browser would actually pull — the `exports["."].import` entry and
every relative module reachable from it. That traversal doubles as the check
that every relative specifier in the shipped graph resolves inside the tarball,
which is the other way a `files` list goes wrong.

The exemption list is a list and not a heuristic: every automatic test for "is
this package for a browser" reads a field the checked package's own author
controls, so an exemption would be self-granted.

## Why the root `tsconfig.json` references the build config

`npm run typecheck` is `tsc -b tsconfig.build.json`, but a person at a terminal
types `tsc -b` and gets the **root** config. When those two named different
project lists, `tsc -b --force` was green all day over a truncated file in a
package only the other list reached — the command a human runs and the command
the gate runs disagreed about what the repository contains.

So the root carries one entry and it points at the build config. Referencing a
solution config is first-class in build mode (TypeScript calls it
`ContainerOnly`), and `extends` never copies `references`, so that line is
inherited by nobody and has to be written where it is.
