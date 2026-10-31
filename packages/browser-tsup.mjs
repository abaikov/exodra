// Shared CDN builds, appended to each @exodra package's tsup config. There are
// TWO of them, because there are two ways a page with no build step reaches this
// library, and one file cannot serve both:
//
//   `dist/exodra.global.js`  IIFE  — `<script src=…>`, assigns `window.Exodra.<ns>`
//   `dist/exodra.esm.js`     ESM   — `<script type="module">`, `import { … } from …`
//
// BOTH ARE MINIFIED AND BOTH BAKE `NODE_ENV=production` (see the note on
// `CDN_DEFINE` below). Neither replaces `dist/index.js`, which stays unminified
// and unsubstituted because a consumer with a bundler minifies it themselves and
// decides their own `NODE_ENV`.
//
// NEITHER RE-BUNDLES A SHARED DEP. `@exodra/dom` references `@exodra/core`
// rather than inlining it, so a page that loads both ships ONE core — the same
// discipline in two dialects: the IIFE resolves it to `globalThis.Exodra.core`
// (load order follows the dep graph: core + reactivity first), the ESM leaves a
// BARE SPECIFIER that the page's import map resolves. The cost of each is
// spelled out where it is implemented.

// A tiny esbuild plugin that rewrites a bare import (e.g. `@exodra/core`) to a
// global expression instead of bundling it — esbuild has no built-in
// external→global mapping for the IIFE format, so we resolve the module to a
// virtual CJS shim that re-exports the global.
function externalGlobal(map) {
    const keys = Object.keys(map);
    const filter = new RegExp(
        '^(' + keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')$'
    );
    return {
        name: 'exodra-external-global',
        setup(build) {
            build.onResolve({ filter }, args => ({
                path: args.path,
                namespace: 'exodra-external-global',
            }));
            build.onLoad({ filter: /.*/, namespace: 'exodra-external-global' }, args => ({
                contents: `module.exports = ${map[args.path]};`,
                loader: 'js',
            }));
        },
    };
}

/**
 * THE ONE PLACE THIS REPOSITORY DECIDES `NODE_ENV` FOR ITSELF, shared by BOTH CDN builds,
 * and it does two jobs.
 *
 * IT KEEPS `process` OUT OF A BROWSER. The shipping packages guard their strippable
 * refusals with `typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'`
 * (the argument is in `@exodra/core`'s `exo-schema`, under "the two baskets"). esbuild
 * substitutes the MEMBER EXPRESSION textually, giving `typeof process !== 'undefined' &&
 * false && …`; `typeof` on an identifier reads no property and cannot throw, so the
 * surviving operand is side-effect-free, the whole `&&` folds to a known `false`, and the
 * `if` goes with it. That the fold really happens is checkable on the shipped file rather
 * than assumed: `grep -c process dist/exodra.global.js` and the same on
 * `dist/exodra.esm.js` must both print `0` — nothing named `process` may survive into
 * either bundle, because a `<script>` tag has no `process` and the bare member expression
 * threw `ReferenceError: process is not defined` out of the first schema the page built.
 *
 * AND IT STRIPS THE PROSE. With `"production"` substituted, every guarded block is an
 * `if (false)`, and `minify: true` deletes the condition, the message and the throw
 * together. That is the whole point of the exercise: an unminified `@exodra/core`
 * measured 22% error-message text, and a CDN bundle is the copy nobody bundles for
 * themselves.
 *
 * IT IS ONLY THESE TWO BUILDS. The published `dist/index.js` and `dist/index.cjs` keep the
 * expression unsubstituted, so a consumer's own bundler decides — full prose in their
 * development build, nothing in their production one, which is the contract every
 * framework on npm already has with them. Change this to `"development"` only if the
 * CDN copies should carry the messages, and accept the bytes with it.
 */
const CDN_DEFINE = { 'process.env.NODE_ENV': '"production"' };

// Build the extra tsup config entry for a package's browser global.
//   globalName: e.g. 'Exodra.dom' -> window.Exodra.dom
//   externals:  { '@exodra/core': 'globalThis.Exodra.core', ... }
export function browserGlobal({ globalName, externals = {} }) {
    return {
        entry: { 'exodra.global': 'src/index.ts' },
        format: ['iife'],
        globalName,
        minify: true,
        dts: false,
        sourcemap: false,
        clean: false, // never wipe the sibling esm/cjs build
        splitting: false, // one file is the whole point of a CDN artifact
        treeshake: true,
        define: CDN_DEFINE,
        outExtension: () => ({ js: '.js' }),
        tsconfig: 'tsconfig.tsup.json',
        esbuildPlugins:
            Object.keys(externals).length > 0 ? [externalGlobal(externals)] : [],
    };
}

/**
 * THE SAME BUILD FOR `<script type="module">`: minified ESM, `NODE_ENV` baked, emitted as
 * `dist/exodra.esm.js` beside the IIFE.
 *
 * WHY IT EXISTS. `dist/index.js` is not minified, correctly — a consumer with a bundler
 * minifies it themselves and wants readable sources on the way. But it is also the file a
 * NO-BUILD page imports directly, and for `@exodra/dom` that is 47.6 KB gzip against the
 * IIFE's 14.6 KB. "Works with no build step" is this framework's central claim and time to
 * first click is what that claim is judged on, so the module path cannot be the slowest way
 * to load the library while the `<script>` path is the fastest.
 *
 * HOW THE SHARED DEP IS EXPRESSED, AND WHAT IT COSTS. `externals` here is a LIST of bare
 * specifiers, left in the output verbatim: `import{…}from"@exodra/core"`. The three
 * candidates were:
 *
 *   - A BARE SPECIFIER (this). The page resolves it, which in practice means an
 *     `<script type="importmap">` — one block that pins every version in one place, which
 *     is what a page loading more than one package wants anyway, and what
 *     `docs-site/docs/tooling/cdn.md` now shows. It names no CDN, so the same published
 *     file works on jsDelivr, unpkg, esm.sh, a corporate mirror or a self-hosted copy.
 *     ITS COST IS REAL AND IS PAID BY EXACTLY ONE READER: someone who pastes the
 *     `@exodra/dom` URL into a `<script type="module">` with NO import map gets
 *     `Failed to resolve module specifier "@exodra/core"` and no application. That reader
 *     has two other doors — the import map, or the IIFE — and both are one paragraph away.
 *     `@exodra/core`, `@exodra/reactivity` and `@exodra/forms` externalise nothing, so
 *     their file loads from a bare URL with no import map at all.
 *   - A RELATIVE URL (`../../@exodra/core@0.3.0/dist/…`). Resolves only if the host lays
 *     its paths out the way the build guessed — jsDelivr's `/npm/` prefix makes it a
 *     different number of `..` segments than unpkg's — and bakes a version number into a
 *     file that a range URL is allowed to serve. Rejected.
 *   - AN ABSOLUTE CDN URL. Publishes one CDN's hostname inside an npm tarball and makes the
 *     other CDNs, the mirrors and the offline copy load a second core across the network.
 *     Rejected.
 *
 * WHAT IT IS NOT. This is an ADDITIONAL artifact. `exports["."]` still resolves to
 * `dist/index.js` for every bundler, and no `browser` field is declared, precisely so that
 * nothing redirects a bundler at this file behind its author's back.
 *
 *   externals: ['@exodra/core', ...] — bare specifiers the page's import map resolves
 */
export function browserModule({ externals = [] } = {}) {
    return {
        entry: { 'exodra.esm': 'src/index.ts' },
        format: ['esm'],
        // NOT the tsup default for ESM. Splitting would emit `chunk-*.js` beside the entry,
        // and a CDN artifact that is two files is a second round trip on the critical path.
        splitting: false,
        // EXPLICIT, because the default is not enough. tsup's dependency-derived externals do
        // not survive the Rollup treeshake pass — an IIFE inlines a declared peer it imports.
        // Harmless for a stateless helper; not harmless for `@exodra/core`, whose second copy on
        // a page is a second runtime.
        external: externals,
        minify: true,
        dts: false,
        sourcemap: false,
        clean: false, // never wipe the sibling esm/cjs build
        treeshake: true,
        define: CDN_DEFINE,
        outExtension: () => ({ js: '.js' }),
        tsconfig: 'tsconfig.tsup.json',
    };
}
