/**
 * Architecture rules, enforced. The package graph in the docs is generated from
 * this same crawl (`npm run graph`), so the picture cannot drift from the code.
 *
 * Two classes of rule live here:
 *  - LAYERING: who is allowed to depend on whom. These encode decisions that are
 *    otherwise only in people's heads (core is zero-dep; the renderers do not know
 *    about each other; build-time tooling never leaks into the runtime).
 *  - HONESTY: what a package imports must be what its package.json declares.
 *    Every dependency bug found in this repo so far was a mismatch between the
 *    two — a published package importing something it never declared.
 */
// A cross-package import resolves TWO ways in this repo: to source (the root
// tsconfig maps @exodra/* onto packages/*/src) or into node_modules (for packages
// with no path mapping, e.g. @exodra/reactivity-types). Every rule below must
// match both spellings, or it silently never fires — a rule that cannot fail is
// worse than no rule. `rules-fire.test.mjs` proves each one still bites.
const RUNTIME =
    '^packages/(core|reactivity-types|reactivity|dom|string|ssr|router|forms|attrs|style|jsx)/src';
const BUILD_TOOLING =
    '(^packages/(babel-plugin-jsx|babel-preset-exodra|swc-plugin-exodra|esbuild-plugin-exodra|rollup-plugin-exodra|bun-plugin-exodra|vite-plugin-exodra|create-exodra|introspect)/' +
    '|node_modules/(@exodra/(babel-plugin-jsx|vite-plugin|introspect)|babel-preset-exodra|@babel/))';
const pkg = name => `(^packages/${name}/|node_modules/@exodra/${name}/)`;

module.exports = {
    forbidden: [
        {
            name: 'no-circular',
            severity: 'error',
            comment:
                'A cycle between modules makes initialisation order load-order dependent.',
            from: {},
            to: { circular: true },
        },
        {
            name: 'not-to-unresolvable',
            severity: 'error',
            comment: 'An import that does not resolve is a broken build waiting to happen.',
            from: {},
            to: { couldNotResolve: true },
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
                // A peer/optional dependency IS declared — it is just resolved
                // from the consumer's tree (or loaded lazily behind a friendly
                // "npm i -D …" message, as introspect does with playwright).
                dependencyTypesNot: ['npm-peer', 'npm-optional'],
            },
        },
        {
            name: 'core-is-zero-dep',
            severity: 'error',
            comment:
                '@exodra/core is the renderer-agnostic base: it must not depend on any ' +
                'other Exodra package, so any reactivity system can drive it.',
            from: { path: '^packages/core/src' },
            to: { path: '(^packages/(?!core/)[^/]+/|node_modules/@exodra/)' },
        },
        {
            name: 'contract-package-is-zero-dep',
            severity: 'error',
            comment:
                '@exodra/reactivity-types is the shared CONTRACT: types only, no deps, so ' +
                'both renderers and every adapter can depend on it without pulling anything.',
            from: { path: '^packages/reactivity-types/src' },
            to: { path: '(^packages/(?!reactivity-types/)[^/]+/|node_modules/)' },
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
            name: 'no-deprecated-core',
            severity: 'error',
            comment: 'Deprecated Node core modules will be removed.',
            from: {},
            to: { dependencyTypes: ['core'], path: '^(punycode|domain|sys)$' },
        },
    ],

    options: {
        doNotFollow: { path: 'node_modules' },
        // Tests and build output are not the architecture. The benchmark driver
        // scripts are excluded for a different reason: their `import()` calls sit
        // inside `page.evaluate()`, so they are BROWSER urls served by Vite
        // (`/src/…`), not Node module paths — resolving them here is meaningless.
        // NOTE the anchor on the build-output pattern. `/dist/` unanchored also
        // matches `node_modules/@exodra/<pkg>/dist/…`, which is where a
        // cross-package import lands whenever it is NOT covered by a tsconfig
        // path alias — so an unanchored pattern silently deleted every edge into
        // @exodra/reactivity-types (and would delete any future package's) from
        // both the rules and the generated diagram.
        exclude: {
            path: '(^packages/.*/dist/|\\.test\\.|\\.spec\\.|/test/|^packages/benchmarks/scripts/)',
        },
        // Each workspace is judged against ITS OWN package.json — that is the file a
        // consumer installs from. Rolling the root's dependencies in would hide
        // exactly the undeclared-dependency bugs this is here to catch.
        combinedDependencies: false,
        tsConfig: { fileName: 'tsconfig.depcruise.json' },
        tsPreCompilationDeps: true,
        enhancedResolveOptions: {
            exportsFields: ['exports'],
            conditionNames: ['import', 'require', 'types', 'default'],
            extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
        },
        reporterOptions: {
            // Collapse each package to ONE node: the useful picture is
            // package-to-package, not 400 modules.
            dot: { collapsePattern: '^packages/[^/]+' },
            archi: { collapsePattern: '^packages/[^/]+' },
        },
    },
};
