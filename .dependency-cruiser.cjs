// Architecture rules, enforced; `npm run graph` draws the docs' package graph from this same crawl.
// A cross-package import resolves TWO ways here: to SOURCE (the root tsconfig maps @exodra/* onto
// each package's src) or into node_modules (no path mapping). Every
// rule must match both spellings or it silently never fires, and NO TEST ASSERTS THAT ONE DOES.
// Why these gates are shaped as they are: docs-site/docs/architecture/gates-and-root-configs.md

// EVERY published package belongs to exactly one of these, split on "does this code reach a
// browser". A package in NEITHER is checked by no rule below, silently — so adding a package
// means adding it here.
const RUNTIME =
    '^packages/(context|core|computed|list-reconcile|dom|string|ssr|router|forms|jsx' +
    '|react|react-mount|react-compat|dom-profiler)/src';
const BUILD_TOOLING =
    '(^packages/(babel-plugin-exodra-schema|babel-preset-exodra|swc-plugin-exodra|esbuild-plugin-exodra|rollup-plugin-exodra|bun-plugin-exodra|vite-plugin-exodra|create-exodra|introspect|monorepo-atlas|to-react)/' +
    '|node_modules/(@exodra/(babel-plugin-schema|vite-plugin|introspect|monorepo-atlas)|babel-preset-exodra|@babel/))';
const pkg = (name) => `(^packages/${name}/|node_modules/@exodra/${name}/)`;

// Backend node-file ⇄ render-function cycles, exempted by EXACT PATH. EMPTY: every ring is closed,
// and an entry for a cycle that no longer exists silently allows a NEW one through the same file.
const BACKEND_RECURSION = [];

module.exports = {
    forbidden: [
        {
            // `viaOnly`, NOT `dependencyTypesNot`: the latter filters only the ONE edge from `from`
            // to `to`, never the hops the cycle passes THROUGH, and `tsPreCompilationDeps` below
            // makes an `import type` an edge. MEASURED: 37 errors under it, 17 under `viaOnly`.
            //
            // A count here is a FLOOR: dependency-cruiser stores ONE depth-first path per edge and
            // `viaOnly` tests that single path, so a runtime cycle can hide behind a type-routed
            // one and reordering imports can move the number.
            name: 'no-circular',
            severity: 'error',
            comment:
                'A cycle whose edges survive type erasure makes initialisation order load-order dependent.',
            from: { pathNot: BACKEND_RECURSION },
            to: { circular: true, viaOnly: { dependencyTypesNot: ['type-only'] } },
        },
        {
            // The rings the rule above exempts, still PRINTED at `info`: fewer lines than last
            // time means a ring broke and its `BACKEND_RECURSION` entry is now dead weight.
            name: 'backend-recursion-circular',
            severity: 'info',
            comment:
                "A backend's exonode and its instance renderer naming each other. Inert: no ring " +
                'member reads a ring binding at module evaluation. See BACKEND_RECURSION.',
            from: { path: BACKEND_RECURSION },
            to: { circular: true, viaOnly: { dependencyTypesNot: ['type-only'] } },
        },
        {
            // Reported so nobody mistakes the silence above for "no cycles at all".
            //
            // `viaOnly` for the reason the rule above has it: `to.dependencyTypes` filters the one
            // reported edge, so a ring whose FIRST hop is `import type` matched here whatever its
            // other hops were. MEASURED: 55 rings under that, 21 under `viaOnly`.
            //
            // A MIXED RING IS REPORTED BY NEITHER RULE. One type-only hop is erased at build, so
            // the ring does not close at runtime and no initialisation order depends on it.
            name: 'type-only-circular',
            severity: 'info',
            comment: 'A cycle that exists only in types. Erased at build; reported, not fatal.',
            from: {},
            to: { circular: true, viaOnly: { dependencyTypes: ['type-only'] } },
        },
        {
            name: 'not-to-unresolvable',
            severity: 'error',
            comment:
                'An import that does not resolve is a broken build waiting to happen. ' +
                'EXCEPT a Vite virtual module: `virtual:app-sloc` is produced by the plugin at ' +
                'packages/benchmarks/vite.config.ts:31 and exists only inside a Vite build, so a ' +
                'crawler that reads the filesystem cannot resolve it and never will. The ' +
                'exemption is that ONE specifier and not the `virtual:` scheme, so a second ' +
                'virtual module has to be added here deliberately.',
            from: {},
            to: { couldNotResolve: true, pathNot: '^virtual:app-sloc$' },
        },
        {
            name: 'no-undeclared-dep',
            severity: 'error',
            comment:
                'Imported but NOT in this package.json. It works in the monorepo (hoisted ' +
                'node_modules) and breaks for whoever installs the published package.',
            from: { path: '^packages/[^/]+/src' },
            to: {
                dependencyTypes: ['npm-no-pkg', 'npm-unknown'],
                // A peer/optional dependency IS declared — it is just resolved from the
                // consumer's tree, or loaded lazily.
                dependencyTypesNot: ['npm-peer', 'npm-optional'],
            },
        },
        {
            name: 'core-names-only-context',
            severity: 'error',
            comment:
                '@exodra/core names ONE Exodra package, @exodra/context, and no other — not even ' +
                'a types-only one. THE ONE NAME IT MAY SPEAK is the context chain, which core ' +
                'CALLS in exo-base-node-pack.ts; context-is-zero-dep below is the other half of ' +
                'that statement, and it is what keeps the pair acyclic. ' +
                'THE WORD "RENDERER-AGNOSTIC" STOOD HERE AND WAS FALSE TWICE: this rule reads ' +
                'the IMPORT GRAPH, and a module knows the DOM without importing anything. ' +
                'src/list/ called insertBefore under it for months (now @exodra/list-reconcile), ' +
                'and events/ typed a handler Event and Element, which made @exodra/term cast a ' +
                'fabricated object through a type it could not satisfy. What core actually is: ' +
                'the SCHEMA VOCABULARY, plus the HTML facts every backend re-derives otherwise — ' +
                'void elements, raw-text elements, escaping, and which attributes have a ' +
                'property form. Those are markup knowledge and they stay; @exodra/term ignores ' +
                'the last one by name (exoTermWriterForPort.ts). The gate for what this one ' +
                'cannot see is packages/core/src/tests/coreNamesNoDom.test.ts.',
            from: { path: '^packages/core/src' },
            to: {
                path:
                    '(^packages/(?!core/|context/|bench-harness/)[^/]+/' +
                    '|node_modules/@exodra/(?!context/|bench-harness/))',
            },
        },
        {
            name: 'bench-harness-is-bench-only',
            severity: 'error',
            comment:
                '@exodra/bench-harness is a private, never-published measuring instrument — the ' +
                'interleaved runner, the clock-grain probe and the null-pair resolution report ' +
                'the package benches share. core-names-only-context, computed-names-only-core and ' +
                'context-is-zero-dep each ' +
                'exempt it by name, which would be a hole in each if anything but a bench could ' +
                'name it. This rule is what closes that: the ONLY files allowed to import it are ' +
                'the ones under a `bench/` directory, so a shipped module borrowing the harness ' +
                'fails here rather than sliding through an exemption written for something else.',
            from: { pathNot: '(/bench/|^packages/bench-harness/)' },
            to: { path: '(^packages/bench-harness/|node_modules/@exodra/bench-harness/)' },
        },
        {
            name: 'context-is-zero-dep',
            severity: 'error',
            comment:
                '@exodra/context is a frame of three fields, a token of one, and the walk that ' +
                'reads a chain. @exodra/core imports it, so an import in the other direction ' +
                'would close a cycle through the package every backend links first. It names no ' +
                'Exodra package and no DOM name either, which is what lets @exodra/term and the ' +
                'server renderer link the whole of it. THE ONE EXEMPTION is ' +
                '@exodra/bench-harness, which src/bench/ names and nothing published does: it is ' +
                "private, it is excluded from this package's emit by tsconfig.json, and " +
                'bench-harness-is-bench-only above is what holds it to bench files.',
            from: { path: '^packages/context/src' },
            to: {
                path:
                    '(^packages/(?!context/|bench-harness/)[^/]+/' +
                    '|node_modules/@exodra/(?!bench-harness/))',
            },
        },
        {
            name: 'computed-names-only-core',
            severity: 'error',
            comment:
                '@exodra/computed is the DECLARATIVE half of a machine — fields, derivations, ' +
                'transitions, the pending word. It sits on top of the imperative builder that ' +
                'stays in @exodra/core, so the direction is computed -> core and never back; ' +
                'core-names-only-context above is the other half of the same statement. It names no ' +
                'backend either: a field is a bit and a derivation is a function, and the one ' +
                'thing written at the end goes through connector.set, which every backend answers.',
            from: { path: '^packages/computed/src' },
            to: {
                path:
                    '(^packages/(?!computed/|core/|bench-harness/)[^/]+/' +
                    '|node_modules/@exodra/(?!core/|bench-harness/))',
            },
        },
        {
            name: 'list-reconcile-is-zero-dep',
            severity: 'error',
            comment:
                '@exodra/list-reconcile holds the passes that CALL DOM APIs — insertBefore, ' +
                'removeChild — which is exactly why they are not in @exodra/core. It names no ' +
                'Exodra package in return, so the direction is dom -> reconcile -> nothing and ' +
                'a backend with no document links none of it.',
            from: { path: '^packages/list-reconcile/src' },
            to: { path: '(^packages/(?!list-reconcile/)[^/]+/|node_modules/@exodra/)' },
        },
        {
            name: 'backends-do-not-know-the-reconciler',
            severity: 'error',
            comment:
                'THE OTHER DIRECTION, and the one that was never checked. `list-reconcile-is-zero-dep` ' +
                'above proves reconcile -> nothing; this proves backend -> nothing-reconcile. ' +
                'Reconciling is a layer over two doors a backend already has — `build` to make a row ' +
                'and the child list to place one — so a backend that imported it would be a backend ' +
                'with one list strategy welded in, and a second strategy could no longer be a second ' +
                'FUNCTION. Tests reach it freely — `options.exclude` drops them from the crawl — and ' +
                'they are where the composition a user would write is driven. ' +
                'The older comment above says "the direction is dom -> reconcile"; no runtime file in ' +
                'any backend has named it for some time, and this rule is what keeps that true. ' +
                'BOTH SPELLINGS, per the header: the alias resolves to packages/list-reconcile/src, ' +
                'and with no alias the import lands on the node_modules symlink.',
            from: { path: '^packages/(core|dom|string|term)/src' },
            to: { path: '(^packages/list-reconcile/|node_modules/@exodra/list-reconcile)' },
        },
        {
            name: 'renderers-do-not-know-each-other',
            severity: 'error',
            comment:
                'The live (dom) and snapshot (string) renderers deliberately share only ' +
                'core primitives — never each other.',
            from: { path: '^packages/dom/src' },
            to: { path: '(^packages/string/|node_modules/@exodra/string/)' },
        },
        {
            name: 'renderers-do-not-know-each-other-reverse',
            severity: 'error',
            comment: 'The other direction of the same rule.',
            from: { path: '^packages/string/src' },
            to: { path: pkg('dom') },
        },
        {
            // `src/index.ts` IS EXEMPT AND MUST BE: it is the barrel, and a named ESM re-export is
            // what the tree-shaker follows, not what defeats it. Everything else under `src/` is
            // retained by some render path. The reverse direction is deliberately open.
            //
            // `from` IS EVERY PACKAGE, not just dom's own. Restricted to `^packages/dom/src/` it
            // caught only the intra-package route and left the one the sentence below forbids by
            // name — another package reaching past the barrel into `hydrate/` — matching nothing.
            // `to` carries the node_modules spelling for the reason this file's header states: a
            // cross-package import lands there whenever no tsconfig alias covers it.
            name: 'hydration-is-a-leaf',
            severity: 'error',
            comment:
                'Nothing outside @exodra/dom hydrate/ may import from it except the package ' +
                'barrel — one value import from an always-retained module welds hydration ' +
                'into every client-only bundle.',
            from: {
                path: '^packages/',
                pathNot: '^packages/dom/src/(hydrate/|index\\.ts$)',
            },
            to: { path: '(^packages/dom/src/hydrate/|node_modules/@exodra/dom/src/hydrate/)' },
        },
        {
            name: 'runtime-does-not-import-build-tooling',
            severity: 'error',
            comment:
                'Compilers, plugins and scaffolding run at BUILD time. A runtime package ' +
                'importing one would ship it to the browser.',
            from: { path: RUNTIME },
            to: {
                path: BUILD_TOOLING,
            },
        },
        {
            // `resolveJsonModule` is on, so ONE value import of the registry inlines every
            // stripped explanation back into a bundle and nothing looks wrong. This rule reaches
            // only what the crawl resolves; the one with teeth is
            // `packages/core/src/tests/errorCodeRegistry.test.ts`.
            name: 'error-registry-does-not-ship',
            severity: 'error',
            comment:
                'Nothing a package publishes may import from scripts/ — the error-code registry ' +
                'there holds exactly the explanations a production build strips.',
            from: { path: '^packages/[^/]+/src' },
            to: { path: '^scripts/' },
        },
        {
            name: 'no-deprecated-core',
            severity: 'error',
            comment: 'Deprecated Node core modules will be removed.',
            from: {},
            to: { dependencyTypes: ['core'], path: '^(punycode|domain|sys)$' },
        },
    ],

    options: {
        doNotFollow: { path: 'node_modules' },
        // NOTE THE ANCHOR: `/dist/` unanchored also matches `node_modules/@exodra/<pkg>/dist/`,
        // where a cross-package import lands whenever no tsconfig alias covers it, and would
        // delete every edge into such a package.
        // THE LAST TWO PATHS ARE THE ANGULAR PARTICIPANT, whose `@angular/*` is out of the
        // workspace (its toolchain pulls in a second Vite), so those two files resolve nothing.
        // Exact paths, not a directory pattern, which would swallow the next such participant.
        exclude: {
            path:
                '(^packages/.*/dist/|^packages/.*/\\.tsbuild/|\\.test\\.|\\.spec\\.|/tests/|^packages/benchmarks/scripts/' +
                '|^packages/benchmarks/bench/apps/angular/app\\.ts$' +
                '|^packages/benchmarks/bench/build/build-angular\\.mjs$)',
        },
        // Each workspace is judged against ITS OWN package.json — the file a consumer installs
        // from. Rolling the root's in would hide the undeclared-dependency bugs this catches.
        combinedDependencies: false,
        tsConfig: { fileName: 'tsconfig.depcruise.json' },
        tsPreCompilationDeps: true,
        enhancedResolveOptions: {
            exportsFields: ['exports'],
            conditionNames: ['import', 'require', 'types', 'default'],
            extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
        },
        reporterOptions: {
            dot: { collapsePattern: '^packages/[^/]+' },
            archi: { collapsePattern: '^packages/[^/]+' },
        },
    },
};
