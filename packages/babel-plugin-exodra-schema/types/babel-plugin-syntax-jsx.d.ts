// `@babel/plugin-syntax-jsx` SHIPS NO TYPES, AND THIS SAYS SO IN A SHAPE RATHER THAN LETTING THE
// IMPORT BECOME `any`.
//
// ── WHOSE ABSENCE THIS STANDS IN FOR ────────────────────────────────────────────────────────────
//
// `node_modules/@babel/plugin-syntax-jsx/package.json` declares `"main": "./lib/index.js"` and no
// `types` and no `typings`, and there is no `@types/babel__plugin-syntax-jsx` published to install
// in its place. That is the one gap in this package's Babel surface: `@babel/core` has
// `@types/babel__core` and `@babel/types` has `@types/babel__types`, both devDependencies here,
// and the line below reads `PluginTarget` out of the first of them.
//
// Five test files import the plugin — `tests/directive-table.test.ts`, `tests/hoisting.test.ts`,
// `tests/refusals.test.ts` and `tests/schema-and-wire.test.ts` in this package, plus
// `packages/swc-plugin-exodra/tests/parity.test.ts` — and every one of them answered TS7016.
// The error is the smaller half of the problem: the diagnostic also says the import "implicitly
// has an 'any' type", so a program that silenced it by installing nothing would be compiling five
// suites with a hole where the syntax plugin stands.
//
// ── IT DESCRIBES SOMEBODY ELSE'S MODULE, AND THIS REPOSITORY SHIPS NONE OF IT ────────────────────
//
// Nothing here implements, wraps or re-exports `@babel/plugin-syntax-jsx`. This file is a
// description of a third-party package written from the outside, it emits no JavaScript, and it
// leaves the published tarball alone — this package's `files` names `dist` and only `dist`, and
// `types/` is neither in it nor in the `include` of `tsconfig.json` or `tsconfig.typecheck.json`,
// so no build reads it. It is reached by exactly two projects, both of which name it explicitly:
// `tsconfig.tests.json` here (via `types/**/*.ts`) and `packages/swc-plugin-exodra`'s (via
// `files`, because that project's root is a different package). If a third suite ever imports the
// plugin, it adds this path rather than a second copy of the declaration.
//
// ── WHY `PluginTarget` AND NOT A HAND-WRITTEN PLUGIN SHAPE ──────────────────────────────────────
//
// All five call sites do the same thing with the value and nothing else:
//
//     plugins: [[syntaxJsx, { throwIfNamespace: false }], [plugin, {}]]
//
// so what has to be true of it is that Babel accepts it in a `plugins` entry — which is the type
// `@types/babel__core` already has a name for. `PluginItem` covers the whole entry (including the
// `[target, options]` tuple written above); `PluginTarget` is the first half of that tuple, and it
// is what this value is. Referencing it means the declaration cannot drift from what Babel takes:
// when those types change, this changes with them.
//
// The alternative was to re-derive the module's own signature — Babel's `declare()` helper returns
// `(api, options, dirname) => PluginObj` — and that is a guess about the internals of a package
// this repository does not own, written from a `.js` file with no declaration beside it. Typing
// the POSITION the value is used in is a fact about this code; typing the function's inside would
// be a claim about theirs.
declare module '@babel/plugin-syntax-jsx' {
    import type { PluginTarget } from '@babel/core';

    /**
     * The plugin, as Babel's `plugins` array takes it. It carries no options of its own that any
     * caller here reads — `{ throwIfNamespace: false }` is the option every one of the five passes
     * and it is Babel's, not the plugin's — so there is nothing else about this value that a type
     * could usefully state.
     */
    const syntaxJsx: PluginTarget;
    export default syntaxJsx;
}
