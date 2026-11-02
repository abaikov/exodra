// Packed-package integration test — the ONLY gate in this repository that installs what a
// release actually ships.
//
// The root vitest run cannot do this job: `vitest.config.ts` aliases every `@exodra/*` to that
// package's `src/`, so a wrong `main`/`module`/`types`/`exports`, a missing `files` entry, or a
// package that simply does not resolve once installed is invisible to it. This script:
//
//   1. `npm pack`s the packages a consumer installs, in dependency order (derived — see below),
//   2. installs those tarballs into a fresh temp project with a real `npm install`,
//   3. checks what every manifest PROMISES against what the tarball actually carries, and that
//      no shipped ESM module reaches for `process` unguarded (see "packaging", below),
//   4. compiles a fixture application with the INSTALLED compiler, and
//   5. runs it against the INSTALLED runtimes.
//
// STEP 3 IS NEW AND IT IS HERE BECAUSE STEPS 4 AND 5 CANNOT SEE ANY OF IT. Importing a bare
// specifier from Node exercises exactly one condition of one entry point in one runtime; it
// never looks at `unpkg`, at `types`, at `require`, or at whether the code it just loaded could
// have run in a browser.
//
// THERE ARE THREE FIXTURE RUNNERS, and they are three because a release ships three different
// KINDS of package and each kind breaks differently:
//
//   `schema-runner.mjs`   THE APPLICATION, on the one renderer there is — the SCHEMA core. It
//       compiles the JSX dialect through `babel-preset-exodra`
//       from a real `babel.config.js`, renders it on the server with `@exodra/string`, wraps
//       that render in a document with `@exodra/ssr`, mounts it in jsdom with `@exodra/dom`
//       while `@exodra/dom-profiler` is patched over the connector, and then HYDRATES it out
//       of the server's own bytes with node identity asserted.
//
//   `bundler-runner.mjs`  THE BUILD TOOLS. Each bundler plugin is driven through the hook its
//       bundler would call, on a real `.tsx` file, and the emitted code is read. No bundler is
//       installed to do it and none is needed: all four import only their bundler's TYPES, so
//       what runs here is the plugin itself, which is the part this repository ships.
//
//   `scaffold-runner.mjs` THE FIRST FIVE MINUTES. It runs the installed `create-exodra` binary
//       non-interactively, then COMPILES AND RUNS the application that binary just wrote,
//       against the very tarballs this release would publish.
//
// THE `require` CONDITION IS NOW PARTLY EXECUTED, AND ONLY PARTLY. It used to be exercised by a
// second fixture that drove the deleted three-props dialect as a CommonJS consumer; when that
// renderer went, so did the coverage, and for a while this gate executed the `import` condition
// and nothing else. The scaffolded app is compiled to CommonJS in order to be run (its own
// modules import each other extensionlessly, which is what a `.ts` toolchain does and what Node
// ESM will not resolve), so `@exodra/core` and `@exodra/string` are LOADED
// through `exports["."].require` there. Every other package's `require` entry, and every `types`
// entry in the repository, is still only checked as a promised FILE by step 3 — nothing here
// typechecks a `.d.ts`. Said out loud rather than papered over — the same way the packages left
// out of `PACKED` are, below.
//
// PREREQUISITE — THE OWNER RUNS THIS, NOT THE SCRIPT. `npm pack` runs `prepack`/`prepare` and
// NOT `prepublishOnly`, and several of these packages build in `prepublishOnly`. So every
// package must already be BUILT before this runs:
//
//     npm run build:all && npm run test:packed
//
// `npm run release` already sequences it that way (`release:check` builds, then `test:packed`).
// A stale or absent `dist` shows up here as a resolution failure inside the temp project.

import { execSync } from 'node:child_process';
import {
    mkdtempSync,
    mkdirSync,
    writeFileSync,
    readFileSync,
    existsSync,
    statSync,
    rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publishOrder, readPackages } from './publish-order.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * WHAT A CONSUMER OF THIS RELEASE INSTALLS, by published name.
 *
 * The set is stated here and the ORDER is not: a hand-kept order drifts the moment a package
 * gains a dependency, and this repository has already paid for that twice (see
 * `publish-order.mjs`'s header). The order comes from the manifests, below.
 *
 * THREE PACKAGES ARE STILL OUTSIDE IT, each for a reason that is about the GATE and not about the
 * package. A gate that fails for environmental reasons gets switched off, which is worse than an
 * honest gap:
 *
 *   `swc-plugin-exodra`     its tarball is one `.wasm` file, compiled from Rust by `build:wasm`,
 *       and it is not in the working tree — its own `.gitignore` is `target/` and `*.wasm`, so it
 *       exists only where cargo and the `wasm32-wasip1` target are installed. Packing it on a
 *       machine without them fails with a missing file that says nothing about the release.
 *       (Along the release path it would in fact be free — `release:check` runs `build:wasm`
 *       before `test:packed`, and the plugin's two peers are both `optional`, so npm installs
 *       nothing extra — so adding it here is one line if the owner is willing to make cargo a
 *       hard prerequisite of `npm run test:packed` on its own. Loading the wasm is a different
 *       matter and stays out: that needs `@swc/core`, a native binary per platform.)
 *   `@exodra/introspect`    installing it pulls `ts-morph` and `glob` into the fixture, and
 *       what it DOES is analyse a repository — a fixture
 *       worth writing would have to hand it a source tree to walk, which is a static-analysis
 *       test, not a packaging one.
 *   `@exodra/monorepo-atlas` same shape and worse: `dependency-cruiser` plus `ts-morph` plus
 *       `dagre`, and it needs a WORKSPACE to walk before it does anything at all. It is also the
 *       one tool here whose only user is the author of this repository, so a defect in it costs
 *       one person one command.
 *
 * WHAT AN ADDED NAME BUYS, so the next person can weigh the same trade: a name in `PACKED` gets
 * the packaging checks (every promised file present in the tarball, the ESM graph complete, no
 * unguarded `process`) for the cost of installing that package and its non-optional peers. Only
 * EXECUTING it needs a fixture written.
 *
 * THE THREE PARAGRAPHS ABOVE ARE DECISIONS, NOT THE COVERAGE REPORT — do not audit against them.
 * What is and is not covered is DERIVED from the manifests below and printed on every run, which
 * is the same lesson this file's header teaches about the publish order, learned a second time:
 * the enumeration that used to sit in this comment had drifted in both directions at once, naming
 * `@exodra/attrs` (removed from the repository at the time) and never mentioning
 * `swc-plugin-exodra` (added after it was written). Anyone auditing against it would have been
 * wrong about two packages. If a name is dropped from `PACKED` and its reason is not written above, the printed
 * line is still right and this comment is still the thing that lied.
 */
const PACKED = new Set([
    // Runtime — the schema core and everything a page built on it imports.
    // A NON-OPTIONAL PEER OF `@exodra/core`, which CALLS `exoContextFrame` and `readExoContext`
    // from its base node pack — so a fixture installing the core tarball without it resolves the
    // peer from the registry and 404s. Every backend names it too.
    '@exodra/context',
    '@exodra/core',
    '@exodra/string',
    // The reconciler a page composes over `c.childList(port)`; `@exodra/dom` does not depend on it.
    '@exodra/list-reconcile',
    '@exodra/dom',
    '@exodra/jsx',
    '@exodra/forms',
    '@exodra/router',
    '@exodra/ssr',
    // Build time — the JSX compiler, the preset that runs it, and every bundler plugin that
    // calls that preset. The four plugins are one function's worth of code each and all four
    // delegate to `babel-preset-exodra`'s runner; what is at risk in them is not the transform
    // but the PACKAGING (`tsc && mv dist/index.js dist/index.cjs` is their whole build) and the
    // hook shape, which is why the fixture drives the hook rather than the function.
    '@exodra/babel-plugin-schema',
    'babel-preset-exodra',
    '@exodra/vite-plugin',
    'esbuild-plugin-exodra',
    'rollup-plugin-exodra',
    'bun-plugin-exodra',
    // The first thing a new user runs, and the thing they run it into.
    'create-exodra',
    // Development tools that ship to users' machines.
    '@exodra/dom-profiler',
    // The React interop pair. They are here for the PACKAGING checks and their fixture coverage
    // is deliberately uneven, which is stated at each of them in `schema-runner.mjs`: the
    // Exodra-in-React direction is only imported, because driving it means a React root and
    // `act()` in a gate that is not a React test suite.
    '@exodra/react',
    '@exodra/react-mount',
    // React's API on machines, and the target `@exodra/babel-plugin-schema/react` compiles to.
    '@exodra/react-compat',
]);

/**
 * DEPENDENCIES FIRST, worked out from the manifests by the same function the release uses.
 *
 * `publishOrder` walks each manifest's `dependencies` + `peerDependencies` depth-first, so a
 * package is only reached after everything it needs — which is exactly the constraint packing
 * has, for the same reason publishing has it: the fixture's `package.json` lists every tarball
 * by `file:` path, and npm satisfies a tarball's own `@exodra/*` edges from those entries.
 *
 * Reusing it rather than sorting a second list here is the point. A package added to `PACKED`
 * lands in the right place with nothing to remember, and a package whose dependencies change
 * moves on its own.
 */
const PKGS = publishOrder(readPackages(ROOT)).filter(pkg => PACKED.has(pkg.name));

const missing = [...PACKED].filter(name => !PKGS.some(pkg => pkg.name === name));
if (missing.length > 0) {
    throw new Error(
        `test-packed: these packages are named in PACKED but no manifest under packages/ ` +
            `has that name (renamed? gone private?): ${missing.join(', ')}`
    );
}

/**
 * WHAT THIS RUN DOES NOT COVER, said before it says anything it does.
 *
 * It is a REPORT and not a failure, deliberately: a package outside `PACKED` is a gap somebody
 * decided to accept, and turning every one of them into a red release would only teach people to
 * stop reading. What it must never be is invisible — a release that publishes fourteen packages
 * on the strength of a gate that installed ten should say so in its own log, at the top, where
 * the person watching it is looking.
 */
const uncovered = publishOrder(readPackages(ROOT))
    .filter(pkg => !PACKED.has(pkg.name))
    .map(pkg => pkg.name);
console.log(
    `covering ${PKGS.length} of ${PKGS.length + uncovered.length} publishable packages.\n` +
        `NOT covered — these publish with no packaging check and nothing installing them:\n` +
        `  ${uncovered.join(', ')}\n`
);

// ────────────────────────────────────────────────────────────── the fixture project's files

/**
 * ONE jsdom, installed as globals BEFORE any renderer is loaded.
 *
 * It is a module of its own so that both runners can put it FIRST in their import list: ESM
 * evaluates the graph in the order the imports are written, so `import './dom-env.mjs'` ahead
 * of `import '@exodra/dom'` is a guarantee and not a hope. (`@exodra/dom` touches no DOM at
 * module scope today — it parses its prototypes inside `compileDomPlan` — but a gate should not
 * rest on that staying true.)
 */
const DOM_ENV = `
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
export const window = dom.window;

for (const key of [
    'Event', 'CustomEvent', 'MouseEvent', 'KeyboardEvent', 'FocusEvent', 'SubmitEvent',
    'Node', 'Element', 'Text', 'Comment', 'DocumentFragment', 'HTMLElement',
    'HTMLInputElement', 'HTMLSelectElement', 'HTMLTextAreaElement', 'HTMLButtonElement',
    'requestAnimationFrame', 'cancelAnimationFrame',
]) {
    globalThis[key] = window[key];
}
globalThis.window = window;
globalThis.document = window.document;
`;

/**
 * The user's Babel configuration, written exactly as a user writes it: a root `babel.config.js`
 * naming the preset by its published name. Nothing in the runner passes plugins by hand — if
 * the preset does not resolve, the compile fails here.
 *
 * `mode: 'schema'` is spelled out even though it is now the default and the only value, because
 * a user who wrote it back when there were two compilers must keep working. This is the gate
 * that says so.
 */
const BABEL_CONFIG = `
module.exports = {
    presets: [['babel-preset-exodra', { mode: 'schema' }]],
};
`;

/**
 * THE APPLICATION — `exoJsx` declarations and the machines that fill them, in a real `.tsx` module
 * with real types, so the preset's TypeScript half and the declaration compiler have to coexist.
 *
 *   - a plain attribute (`class`) is markup, baked into the schema;
 *   - `data-id={$.id}` and `{$.label}` are named ports the machine fills with `attr` / `text`;
 *   - `on:click={$.bump}` is the event port, the one thing markup cannot carry and therefore the
 *     one thing hydration must attach;
 *   - `<$.badge />` is filled with `one` and `<$.rows />` with a fixed `list`, so both region
 *     calls are driven on all three backends;
 *   - one label carries an `&`, so the escaping is in the asserted bytes.
 */
const APP_TSX = `
import { exoJsx } from '@exodra/jsx';
import { composeExoMachine, createExoMachine, withExoHandlers } from '@exodra/core';
import type { TExoAttrPort, TExoChildrenPort, TExoEventPort, TExoTextPort } from '@exodra/core';

const ROWS: readonly { id: string; label: string }[] = [
    { id: 'r1', label: 'Alpha & Omega' },
    { id: 'r2', label: 'Beta' },
];

const heading = 'Packed';
export const clicks = { count: 0 };
const badgeText = 'new';

export function bump(): void {
    clicks.count += 1;
}

const ROW_SCHEMA = exoJsx<{ id: TExoAttrPort; label: TExoTextPort }>(($) => (
    <li class="row" data-id={$.id}>
        <span class="row__label">{$.label}</span>
    </li>
));
const ROW = createExoMachine(ROW_SCHEMA, {
    createInitialState: (c, row: { id: string; label: string }) => {
        c.attr(ROW_SCHEMA.ports.id, row.id);
        c.text(ROW_SCHEMA.ports.label, row.label);
        return null;
    },
});

const BADGE_SCHEMA = exoJsx<{ text: TExoTextPort }>(($) => <em class="badge">{$.text}</em>);
const BADGE = createExoMachine(BADGE_SCHEMA, {
    createInitialState: (c) => {
        c.text(BADGE_SCHEMA.ports.text, badgeText);
        return null;
    },
});

const APP_SCHEMA = exoJsx<{
    heading: TExoTextPort;
    badge: TExoChildrenPort;
    rows: TExoChildrenPort;
    bump: TExoEventPort;
    count: TExoTextPort;
}>(($) => (
    <section class="app">
        <h1 class="title">{$.heading}</h1>
        <p class="slot"><$.badge /></p>
        <ul class="list"><$.rows /></ul>
        <button class="bump" on:click={$.bump}>{$.count}</button>
    </section>
));
const P = APP_SCHEMA.ports;
export const APP = composeExoMachine(
    createExoMachine(APP_SCHEMA, {
        createInitialState: (c) => {
            c.text(P.heading, heading);
            c.one(P.badge, BADGE);
            c.list(P.rows, ROW, ROWS);
            c.text(P.count, clicks.count);
            return null;
        },
    }),
    (m) => withExoHandlers(m, (on) => on(P.bump, () => bump())),
);
`;

/**
 * THE SCHEMA FIXTURE RUNNER — an ESM consumer, resolving only out of the temp project's own
 * `node_modules` (i.e. the installed tarballs).
 *
 * Every runtime import below is a BARE SPECIFIER through the package's public entry point, so a
 * broken `exports` map fails here rather than in somebody's application. The runtime halves are
 * imported as ESM (the `import` condition); the build-time halves are CommonJS-only packages and
 * are reached with `createRequire`, which is how Babel itself loads them.
 */
const SCHEMA_RUNNER = `
// FIRST, and that is load-bearing: ESM evaluates the graph in the order the imports are
// written, so the jsdom globals are in place before any renderer module is evaluated.
import { window } from './dom-env.mjs';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// PUBLIC ENTRY POINTS, one named import from each installed runtime package.
//
// EVERY NAME HERE WAS READ OUT OF THE PACKAGE'S OWN \`src/index.ts\`. This list is the thing
// that rots, and it has rotted TWICE. First it still asked for \`bindable\`, \`renderRows\`,
// \`hydrateRows\`, \`bindText\` and a \`Fragment\` — the surface of the DELETED three-props
// renderer. Then it asked for \`renderExoRows\`, \`hydrateExoRows\`, \`exoNamespace\` and three
// \`EXO_PLUGIN_SLOT_*\` symbols, which is the surface of the free-function entry points and the
// runtime slot registry that BOTH backends stopped having when a backend became an object you
// construct. Either way the gate could not have passed against any source in this repository,
// and \`npm run release\` ran unguarded. A missing name here is a resolution error at module
// evaluation, which is why the imports are named rather than namespace imports.
import { composeExoMachine, createExoMachine, createExoSchema, withExoHandlers } from '@exodra/core';
import { exoStyle } from '@exodra/core/style';
import { ExoStrBackend } from '@exodra/string';
import { ExoDomBackend, withExoCompiler, withExoHydration } from '@exodra/dom';
// THREE NAMES FROM @exodra/forms, and the list is the check: a named import that the built
// module does not export is a module-evaluation error, so a helper whose file never made it
// into the build is caught here.
import { readExoControlValue, readExoControlValues, writeExoChoice } from '@exodra/forms';
import { createExoMemoryHistory, createExoRouter } from '@exodra/router';
import { profileDom } from '@exodra/dom-profiler';
import { renderExoPage, readExoStateScript, EXO_SSR_RESPONSE } from '@exodra/ssr';
// The DEFAULT import, deliberately: React 18 ships CommonJS, and while Node's named-export
// detection usually copes, a gate should not rest on a lexer's opinion of somebody else's build.
import React from 'react';
import { reactIsland } from '@exodra/react';
// IMPORTED AND NOT DRIVEN, and that is the whole of what this line proves: that
// @exodra/react-mount's entry point resolves and evaluates out of its tarball, with the two
// names it advertises on it. Both are React API — ExoMount is a component and useExoMount a
// hook — so exercising either means a React root, an act() and the async commit that comes
// with it, inside a gate whose job is packaging. The Exodra-in-React direction is therefore
// covered here at the manifest level ONLY: nothing below mounts anything through it.
import { ExoMount, useExoMount } from '@exodra/react-mount';

const require = createRequire(import.meta.url);
const assert = (condition, message) => {
    if (!condition) throw new Error('ASSERT FAILED: ' + message);
};

// ───────────────────────────────────────────── 5. every packed package, through its bare name

assert(typeof createExoSchema === 'function', '@exodra/core exports createExoSchema');
assert(typeof createExoMachine === 'function', '@exodra/core exports createExoMachine');
assert(typeof composeExoMachine === 'function', '@exodra/core exports composeExoMachine');

// ───────────────────── the two backends, as CLASSES, composed ONCE for the whole of this fixture
//
// AN ENTRY POINT IS AN OBJECT YOU CONSTRUCT, so "the package exports this function" became TWO
// questions and both are asked here: the package exports the CLASS, and an INSTANCE composed the
// way an application composes carries the METHOD. A tarball can fail either one on its own — a
// build that dropped the class file fails the first, a barrel that re-exported the class but not
// the pack fails the second — and nothing else in this repository asks the second against a
// packed artefact.
//
// ONE OF EACH, AT MODULE SCOPE, because a backend is the key a compiled plan is cached under and
// the comparison is by POINTER. A backend built per render is a new key every render, and every
// schema is recompiled with its markup parsed again. The gate composes the way the packages tell
// users to compose, so that this file is also an example of the advice.
assert(typeof ExoStrBackend === 'function', '@exodra/string exports the ExoStrBackend class');
assert(typeof ExoDomBackend === 'function', '@exodra/dom exports the ExoDomBackend class');
assert(typeof withExoHydration === 'function', '@exodra/dom exports withExoHydration');

const EXO_STR = new ExoStrBackend();
const EXO_DOM = withExoHydration(withExoCompiler(new ExoDomBackend()));
assert(typeof EXO_STR.render === 'function', 'an ExoStrBackend instance carries render()');
assert(typeof EXO_DOM.render === 'function', 'an ExoDomBackend instance carries render()');
assert(
    typeof EXO_DOM.hydrate === 'function',
    '@exodra/dom: a backend composed with withExoHydration() carries hydrate() — the pack ' +
        'installed nothing, so a server-rendered page has no way to adopt its own markup'
);

// AND THE NEGATIVE, WHICH IS THE WHOLE REASON HYDRATION IS A PACK AND NOT A METHOD.
//
// \`hydrate\` is not on the class. It is a name a pack WRITES ONTO THE INSTANCE that composed it,
// because a value import of the hydration path from a module every client render already reaches
// would weld the walk, the adopters and the shape checks — 3.2 kB gzipped, measured — into every
// client-only bundle, where a barrel re-export is shaken out instead. If this assertion ever
// fails, that weight is back in every page that only renders, and the type-level capability check
// that makes calling \`hydrate\` on an uncomposed backend a COMPILE error has become decoration
// over a method that was there all along.
//
// It is asserted against the PACKED artefact and not in a unit test on purpose: what could put
// \`hydrate\` back on the class is a build — a bundler that inlined the pack, a barrel that
// re-exported it as a method, a \`dist\` emitted from a different source than \`src/\`.
const EXO_DOM_UNCOMPOSED = new ExoDomBackend();
assert(
    EXO_DOM_UNCOMPOSED.hydrate === undefined,
    '@exodra/dom: new ExoDomBackend(), composed WITHOUT withExoHydration(), carries hydrate ' +
        '— so the hydration path is welded into every client-only bundle'
);
// And composing one backend did not hand the capability to every other one: a pack writes an OWN
// property, never the shared prototype. \`EXO_DOM\` above was composed BEFORE this line runs, so a
// pack that reached the prototype would already show here.
assert(
    Object.getPrototypeOf(EXO_DOM_UNCOMPOSED).hydrate === undefined,
    '@exodra/dom: withExoHydration() wrote hydrate onto the SHARED PROTOTYPE rather than the ' +
        'instance that composed it — every backend in the process now hydrates, and the ' +
        'capability check means nothing'
);

for (const [name, fn] of [
    ['readExoControlValue', readExoControlValue],
    ['readExoControlValues', readExoControlValues],
    ['writeExoChoice', writeExoChoice],
]) {
    assert(typeof fn === 'function', '@exodra/forms exports ' + name);
}
assert(typeof createExoRouter === 'function', '@exodra/router exports createExoRouter');
assert(typeof createExoMemoryHistory === 'function', '@exodra/router exports createExoMemoryHistory');
assert(typeof profileDom === 'function', '@exodra/dom-profiler exports profileDom');
assert(typeof renderExoPage === 'function', '@exodra/ssr exports renderExoPage');
assert(typeof readExoStateScript === 'function', '@exodra/ssr exports readExoStateScript');

// ────────────── the plugin-slot registry: GONE, and what became of the question it was asking
//
// WHAT STOOD HERE. Three symbols out of @exodra/dom — EXO_PLUGIN_SLOT_EVENTS,
// EXO_PLUGIN_SLOT_CHILDREN_RECONCILER, EXO_PLUGIN_SLOT_CHILD_PROTOCOL — asserted to be
// Symbol.for(<their name>), plus @exodra/core's exoNamespace() refusing an unqualified name. The
// property was IDENTITY ACROSS COPIES: a slot was minted through the GLOBAL symbol registry so
// that two copies of one package in a consumer's tree resolved to ONE slot, and a build step that
// turned a slot into a fresh Symbol() (or a bundler that inlined the constant) would look
// identical to every test inside this repository — where the vitest run aliases every @exodra/* to
// a single src/ and a second copy cannot exist. So this really was the only place it could be
// asked, and it was asked here for that reason.
//
// NONE OF THOSE FOUR NAMES EXISTS ANY MORE. The runtime slot map was deleted when a backend became
// an object you construct: a capability is no longer a symbol keyed into a process-wide registry,
// it is a NAME a pack writes onto the backend instance a caller built (mergeExoPlugins(this,
// ...packs)). There is no registry left to split in half — two copies of @exodra/dom in a tree give
// two independent backend classes, which is the same thing an application already gets when it
// deliberately constructs two backends, and nothing is expected to be shared between them.
//
// SO THE QUESTION DIED WITH THE MECHANISM, and it is written down rather than deleted quietly. The
// nearest LIVE questions at the same boundary — does composition work at all out of a tarball, and
// is a capability present exactly when it was composed and absent when it was not — are asserted
// directly above, on ExoDomBackend and withExoHydration.

// ─────────────────────────────────────── exoStyle, from the @exodra/core/style subpath
//
// Its output IS its behaviour: the px rule, the unitless exception, custom properties untouched,
// and a raw string appended verbatim with its trailing semicolon dropped. Four rules, one call.
const styled = exoStyle({ marginTop: 4, opacity: 0, '--gap': 8 }, 'color:red;');
assert(
    styled === 'margin-top:4px;opacity:0;--gap:8;color:red',
    'exoStyle built the expected declaration string\\n  actual: ' + styled
);

// @exodra/jsx IS TWO ENTRY POINTS AND NEITHER OF THEM RENDERS ANYTHING, so what it owes is
// stated here rather than by importing a name.
//
// Its main entry is TYPES ONLY — TExoEvent, TExoRegionProps, the JSX namespace — so there is
// nothing to typeof. This gate used to assert Fragment, which is not a name that has merely
// been renamed: jsx-runtime.ts says there is deliberately NO Fragment, because a fragment has
// no place in a schema and the compiler refuses one. That assertion is DELETED rather than
// repaired — it guarded a concept this dialect does not have.
//
// The jsx-runtime entry is what jsxImportSource points at, and its three exports exist ONLY to
// REFUSE: they are reached exactly when a module was never compiled, and a release that
// shipped them silently returning undefined would turn every such module into a page that
// renders nothing and reports nothing. The refusal IS the feature, so it is asserted.
const jsxTypes = await import('@exodra/jsx');
assert(jsxTypes !== null && typeof jsxTypes === 'object', '@exodra/jsx resolves through its public entry');
const jsxRuntime = await import('@exodra/jsx/schema/jsx-runtime');
for (const name of ['jsx', 'jsxs', 'jsxDEV']) {
    assert(typeof jsxRuntime[name] === 'function', '@exodra/jsx/schema/jsx-runtime exports ' + name);
    let refusal = null;
    try {
        jsxRuntime[name]('div', {});
    } catch (error) {
        refusal = error;
    }
    assert(
        refusal !== null,
        '@exodra/jsx/schema/jsx-runtime ' + name + '() throws when JSX reaches the runtime ' +
            '— it RETURNED instead, so an uncompiled module would render nothing and say nothing'
    );
    assert(
        String(refusal.message).includes('never compiled'),
        '@exodra/jsx/schema/jsx-runtime ' + name + '() names the missing compiler in its ' +
            'message\\n  actual: ' + String(refusal.message)
    );
}

// The build-time packages, reached the way Babel reaches them.
const presetMod = require('babel-preset-exodra');
assert(typeof (presetMod.default ?? presetMod) === 'function', 'babel-preset-exodra exports the preset');
assert(typeof presetMod.transformExodraJsx === 'function', 'babel-preset-exodra exports transformExodraJsx');
const schemaPluginMod = require('@exodra/babel-plugin-schema');
assert(typeof (schemaPluginMod.default ?? schemaPluginMod) === 'function', '@exodra/babel-plugin-schema exports the plugin');
const { exoJsx } = require('@exodra/jsx');
assert(typeof exoJsx === 'function', '@exodra/jsx exports exoJsx');
console.log('  public entry points OK: one name from every packed package');

// ───────────────────────────────────── 1. compile the dialect through the user's babel.config

const babel = require('@babel/core');
const here = process.cwd();
const compiled = babel.transformFileSync(join(here, 'app.tsx'), { root: here, cwd: here });
assert(compiled != null && typeof compiled.code === 'string', 'babel.config.js compiled app.tsx');
assert(compiled.code.includes('createExoNamedSchema('), 'the schema compiler emitted createExoNamedSchema()');
assert(compiled.code.includes('from "@exodra/core"'), 'the schema factory is imported from @exodra/core');
assert(!compiled.code.includes('exoJsx('), 'the schema compiler replaced every exoJsx() call');
const compiledPath = join(here, 'app.compiled.mjs');
writeFileSync(compiledPath, compiled.code);
const app = await import(pathToFileURL(compiledPath).href);
assert(app.APP != null && typeof app.APP.createInitialState === 'function', 'the compiled module exports a machine');
assert(app.APP.declaration != null && typeof app.APP.declaration === 'object', 'the machine carries its schema declaration');
console.log('  schema JSX compiled through babel-preset-exodra (mode: schema)');

// ──────────────────────────────────────────────────────── 2. the server, and the exact bytes

const EXPECTED =
    '<section class="app">' +
        '<h1 class="title">Packed</h1>' +
        '<p class="slot"><em class="badge">new</em></p>' +
        '<ul class="list">' +
            '<li class="row" data-id="r1"><span class="row__label">Alpha &amp; Omega</span></li>' +
            '<li class="row" data-id="r2"><span class="row__label">Beta</span></li>' +
        '</ul>' +
        '<button class="bump">0</button>' +
    '</section>';

const serverHtml = EXO_STR.render(app.APP);
assert(serverHtml === EXPECTED, 'server markup is byte-exact\\n  expected: ' + EXPECTED + '\\n  actual:   ' + serverHtml);
console.log('  @exodra/string rendered the expected bytes');

// ───────────────────────────────────────────────── 3. the browser, and the SAME tree, from DOM

const domHost = document.createElement('div');
document.body.appendChild(domHost);

// PROFILED WHILE IT RENDERS — @exodra/dom-profiler wraps the node methods ON THE BACKEND OBJECT it
// is handed, so it can only report anything at all if that object is the one this render used.
// THAT is what makes it worth running here rather than in a unit test: @exodra/dom-profiler
// declares @exodra/dom as a DEPENDENCY, and if npm ever resolved it to a second copy — a
// version range that stopped matching, a tarball that did not dedupe — the profiler would patch
// a backend nobody renders through, return an empty report, and tell its user their render costs
// nothing. The profiler's reach is per OBJECT, not per process: it wraps what it was handed and
// nothing else, so a second copy of the package — or simply a different composition — would be
// invisible to it. That is exactly why the object below is the same EXO_DOM the render uses.
// Every method below is one the machines call: attr for data-id, text for the text ports, on for
// the event port, one for the badge, list for the rows.
//
// IT IS THE SAME BACKEND THE HYDRATION STEP BELOW USES, deliberately: render and hydrate are two
// methods on ONE composition, and when they were two free entry points each taking their own
// composition argument an application could compose one thing for the client and silently get the
// shipped default on a server-rendered page. This fixture composes once and drives both.
const profiler = profileDom(EXO_DOM);
const disposeDom = EXO_DOM.render(app.APP, domHost);
const profile = profiler.stop();
const profiled = new Map(profile.map(entry => [entry.method, entry]));
for (const method of ['attr', 'text', 'on', 'one', 'list']) {
    const entry = profiled.get(method);
    assert(
        entry !== undefined && entry.count > 0,
        '@exodra/dom-profiler timed TExoDomNode.' + method + ' during a real render ' +
            '— it saw: ' + (profile.map(e => e.method).join(', ') || '(nothing at all)')
    );
}
assert(
    profile.every(entry => entry.avgMs >= 0 && entry.maxMs >= 0 && entry.totalMs >= 0),
    '@exodra/dom-profiler reported non-negative timings'
);

assert(domHost.innerHTML === serverHtml, 'a client render produces the server bytes\\n  server: ' + serverHtml + '\\n  client: ' + domHost.innerHTML);
assert(domHost.querySelectorAll('li.row').length === 2, 'the fixed-list region built both rows');
assert(domHost.querySelector('em.badge').textContent === 'new', 'the single-instance region built the badge');
disposeDom();
domHost.remove();
console.log('  @exodra/dom built the same tree, and @exodra/dom-profiler timed ' + profile.length + ' connector method(s) doing it');

// ───────────────────────────── 4. hydration: the server's OWN nodes, claimed rather than remade

const hydHost = document.createElement('div');
document.body.appendChild(hydHost);
hydHost.innerHTML = serverHtml;

// Everything the server sent, by identity, before anything adopts it.
const before = Array.from(hydHost.querySelectorAll('*'));
const buttonBefore = hydHost.querySelector('button.bump');

// The CONTAINER is handed over, not the instance: hydrate adopts \`parent\`'s first ELEMENT child.
const disposeHydration = EXO_DOM.hydrate(app.APP, hydHost);

const after = Array.from(hydHost.querySelectorAll('*'));
assert(after.length === before.length, 'hydration created or removed no elements (' + before.length + ' → ' + after.length + ')');
for (let i = 0; i < before.length; i++) {
    assert(after[i] === before[i], 'element ' + i + ' (<' + before[i].tagName.toLowerCase() + '>) is the SERVER\\'s node, not a rebuilt one');
}
assert(hydHost.innerHTML === serverHtml, 'hydration rewrote no markup');
console.log('  hydration adopted ' + before.length + ' server elements by identity');

// The listener is the one thing markup cannot carry, so it is the one thing hydration owes.
buttonBefore.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
assert(app.clicks.count === 1, 'the click reached the handler hydration attached');
assert(hydHost.querySelector('button.bump') === buttonBefore, 'the button is still the server\\'s element after the click');

disposeHydration();
hydHost.remove();
console.log('  hydrated page is live: the listener hydration attached fired');

// ────────────────────────── React source, compiled by ./react and run by @exodra/react-compat

const reactPlugin = require('@exodra/babel-plugin-schema/react');
const reactCompiled = babel.transformSync(
    "import { useState } from '@exodra/react-compat';\\n" +
        'export function Counter() {\\n' +
        '    const [n, setN] = useState(0);\\n' +
        '    return <p className="n"><b>{n}</b><button onClick={() => setN(n + 1)}>+</button></p>;\\n' +
        '}\\n',
    {
        filename: join(here, 'counter.jsx'),
        babelrc: false,
        configFile: false,
        plugins: [require.resolve('@babel/plugin-syntax-jsx'), reactPlugin.default ?? reactPlugin],
    }
);
assert(reactCompiled.code.includes('createExoReactHost('), 'the React compiler emitted a host machine');
const reactPath = join(here, 'counter.compiled.mjs');
writeFileSync(reactPath, reactCompiled.code);
const reactApp = await import(pathToFileURL(reactPath).href);
const { createRoot: createReactRoot, act: reactAct } = await import('@exodra/react-compat');
const { jsx: reactJsx } = await import('@exodra/react-compat/jsx-runtime');
const reactHost = document.createElement('div');
document.body.appendChild(reactHost);
createReactRoot(reactHost).render(reactJsx(reactApp.Counter, {}));
assert(reactHost.innerHTML === '<p class="n"><b>0</b><button>+</button></p>', 'react-compat rendered the compiled component: ' + reactHost.innerHTML);
await reactAct(() => reactHost.querySelector('button').dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
assert(reactHost.querySelector('b').textContent === '1', 'the click reached the hook and re-rendered in place');
reactHost.remove();
console.log('  React source compiled by @exodra/babel-plugin-schema/react ran on @exodra/react-compat');

// ────────────────────────────────────── @exodra/router, driven with no browser at all

const router = createExoRouter(
    [
        { path: '/', component: app.APP },
        { path: '/rows/:id', component: app.APP },
    ],
    { history: createExoMemoryHistory('/') }
);
assert(router.getMatch()?.route.path === '/', 'the memory history matched the initial route');
const landed = await router.navigate('/rows/r2');
assert(landed.pathname === '/rows/r2', 'navigate resolved with the committed location');
assert(router.getMatch()?.params.id === 'r2', 'the route parameter was matched');
router.dispose();
console.log('  @exodra/router matched and navigated on a memory history');

// ─────────────────────────── @exodra/ssr: the whole document, and hydration OUT OF ITS BYTES
//
// WHAT THIS PACKAGE OWES AND NOTHING ELSE DOES: a doctype, a head, a hydration CONTAINER around
// the instances, a state script outside that container, and a status and headers the page itself
// asked for. Every one of those is a silent failure when it is wrong — a container emitted at the
// wrong depth hydrates onto the wrong nodes and throws nothing — so the fixture does not read the
// string it produced, it re-PARSES it with an HTML parser and hydrates what comes back.
//
// The page is hand-written rather than the compiled APP because the one thing worth driving here
// is a machine that INJECTS the request (\`c.inject(EXO_SSR_RESPONSE)\`), which is this package's entire
// authoring surface and has no spelling in the JSX dialect.
let pageClicks = 0;
const PAGE_SCHEMA = createExoSchema(b => {
    let title;
    let count;
    let click;
    b.el('main', { class: 'page' }, main => {
        main.el('h1', null, h1 => {
            title = h1.textPort();
        });
        main.el('button', null, button => {
            count = button.port('data-count');
            click = button.eventPort('click');
        });
    });
    return { title, count, click };
});
const PAGE = composeExoMachine(
    createExoMachine(PAGE_SCHEMA, {
        createInitialState: c => {
            const ssr = c.inject(EXO_SSR_RESPONSE);
            if (ssr !== undefined) {
                ssr.setStatus(201);
                ssr.setHeader('cache-control', 'no-store');
                ssr.addHead('<title>Packed</title>');
                ssr.setState('user', 'ada');
            }
            c.text(PAGE_SCHEMA.ports.title, 'Page');
            c.attr(PAGE_SCHEMA.ports.count, 0);
        },
    }),
    m => withExoHandlers(m, on => on(PAGE_SCHEMA.ports.click, () => {
        pageClicks += 1;
    })),
);

// NO COUNT: a page is ONE instance, and the second parameter is the options object. It used to be
// \`renderExoPage(PAGE, 1, {…})\`, which put \`1\` where the options go and dropped the head entry the
// assertion below reads.
const page = renderExoPage(PAGE, { head: '<meta charset="utf-8">' });
assert(page.status === 201, 'the wire set the response status through EXO_SSR_RESPONSE (got ' + page.status + ')');
assert(
    page.headers.some(h => h.name.toLowerCase() === 'cache-control' && h.value === 'no-store'),
    'the wire set a response header through EXO_SSR_RESPONSE'
);
assert(
    page.head === '<meta charset="utf-8"><title>Packed</title>',
    'the seeded head entry comes first and the page appended after it\\n  actual: ' + page.head
);
assert(page.state.user === 'ada', 'the wire put a value in the transferred state');

const documentHtml = page.renderDocument({ rootId: 'app' });
assert(
    documentHtml.includes('<div id="app">' + page.html + '</div>'),
    'renderDocument wrapped the instances in the hydration container and nothing else'
);
assert(
    documentHtml.indexOf('__EXODRA_STATE__') > documentHtml.indexOf('</div>'),
    'the state script is OUTSIDE the container — inside it, hydration would adopt it as an instance'
);

// THE BYTES THROUGH A REAL PARSER, which is the only way the container assertion means anything:
// a browser never sees the string, it sees what its parser made of it.
const parsedDocument = new window.DOMParser().parseFromString(documentHtml, 'text/html');
const transferred = readExoStateScript(undefined, parsedDocument);
assert(
    transferred !== undefined && transferred.user === 'ada',
    'readExoStateScript read back what renderStateScript wrote, through a parsed document'
);
const parsedContainer = parsedDocument.getElementById('app');
assert(parsedContainer !== null, 'the parsed document carries the container hydration is handed');

const liveContainer = document.importNode(parsedContainer, true);
document.body.appendChild(liveContainer);
const servedButton = liveContainer.querySelector('button');
const servedHtml = liveContainer.innerHTML;
const disposePage = EXO_DOM.hydrate(PAGE, liveContainer);
assert(liveContainer.innerHTML === servedHtml, 'hydrating the served document rewrote no markup');
assert(
    liveContainer.querySelector('button') === servedButton,
    'hydration adopted the parsed document own button rather than building one'
);
servedButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
assert(pageClicks === 1, 'the listener hydration attached to the served node fired');
disposePage();
liveContainer.remove();
console.log('  @exodra/ssr emitted a document whose container hydrated by identity');

// ────────────────────────────────── @exodra/react: a React component rendered by @exodra/string
//
// THE SERVER HALF ONLY, and deliberately: on a non-DOM connector \`reactIsland\` is one
// synchronous \`renderToString\` written into a children port, so it can be asserted with no React
// root, no \`act()\` and no async commit. The BROWSER half (createRoot / hydrateRoot, the reactive
// re-render, the disposer that unmounts the root) is NOT exercised here — it is covered by that
// package own vitest suite, and what this proves is that the shipped tarball can reach react-dom
// at all and writes its markup through unescaped.
function ReactLabel(props) {
    return React.createElement('span', { className: 'react-val' }, 'v=' + props.value);
}
const ISLAND_SCHEMA = createExoSchema(b => {
    let host;
    b.el('div', { class: 'island' }, d => {
        host = d.childrenPort();
    });
    return { host };
});
const ISLAND = createExoMachine(ISLAND_SCHEMA, {
    createInitialState: c => {
        reactIsland(c, ISLAND_SCHEMA.ports.host, ReactLabel, { value: 7 });
    },
});
const islandHtml = EXO_STR.render(ISLAND);
assert(
    islandHtml.includes('react-val') && islandHtml.includes('v=7'),
    '@exodra/react rendered a React component into the server markup\\n  actual: ' + islandHtml
);
assert(
    !islandHtml.includes('&lt;span'),
    '@exodra/react wrote MARKUP into the host, not escaped text'
);
assert(typeof ExoMount === 'function', '@exodra/react-mount exports ExoMount');
assert(typeof useExoMount === 'function', '@exodra/react-mount exports useExoMount');
console.log('  @exodra/react rendered an island on the server (@exodra/react-mount: imported only)');

console.log('  schema fixture OK: compile → server bytes → document → DOM tree → hydration by identity');
`;

/**
 * THE MODULE THE BUNDLER PLUGINS ARE GIVEN — one `.tsx` in the directive dialect, with a type
 * annotation on it so `preset-typescript` is in the path too.
 *
 * It is a SEPARATE file from `app.tsx` on purpose: `app.tsx` is compiled through a `babel.config.js`
 * and imported, so it must stay exactly what the byte-exact server assertion expects. This one is
 * only ever compiled, never run, and can therefore stay minimal.
 */
const VIEW_TSX = `
import { exoJsx } from '@exodra/jsx';
import type { TExoTextPort } from '@exodra/core';

export const CARD = exoJsx<{ title: TExoTextPort }>(($) => (
    <article class="card">
        <h2 class="card__title">{$.title}</h2>
    </article>
));
`;

/**
 * THE BUNDLER PLUGINS, each driven through the hook its own bundler would call.
 *
 * NO BUNDLER IS INSTALLED TO DRIVE THEM AND NONE IS NEEDED — every one of these four imports its
 * bundler for TYPES only (`import type { Plugin } from 'esbuild'`), which `tsc` erases, so the
 * shipped code has no runtime edge to it at all. What a bundler would contribute is calling a
 * function this file can call itself; what it would COST is a per-platform binary download inside
 * a release gate. So the hook is invoked directly, with the argument shape each bundler passes.
 *
 * (npm still installs `vite`, `esbuild` and `rollup` here, because they are declared as
 * non-optional PEERS and npm 7+ installs peers. That is the price of the packaging checks on
 * these four, and it is the largest single cost this gate has.)
 *
 * WHAT IS ACTUALLY AT RISK IN THESE PACKAGES, and it is why the assertions look the way they do:
 * three of them are built by `tsc && mv dist/index.js dist/index.cjs` and are `require`d out of a
 * `main` with no `exports` map at all, so "does the shipped file load in the module system its
 * manifest claims" is most of the question. The transform itself is one shared call into
 * `babel-preset-exodra`, already exercised by the schema fixture — what is NOT shared, and what is
 * checked here, is each plugin's own glue: its filter, its result shape, its options.
 */
const BUNDLER_RUNNER = `
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const assert = (condition, message) => {
    if (!condition) throw new Error('ASSERT FAILED: ' + message);
};

const here = process.cwd();
const viewPath = join(here, 'view.tsx');
const source = readFileSync(viewPath, 'utf8');

/** What every one of these owes, whatever hook it was reached through. */
const compiled = (code, who) => {
    assert(typeof code === 'string' && code.length > 0, who + ' returned code');
    assert(
        code.includes('createExoNamedSchema('),
        who + ' emitted a module-level createExoNamedSchema()\\n  got: ' + String(code).slice(0, 240)
    );
    assert(
        !code.includes('<h2'),
        who + ' compiled the JSX away — a surviving element is a syntax error downstream'
    );
};

// ─────────────────────────────────────────────────────────────────── @exodra/vite-plugin (ESM)
const viteMod = await import('@exodra/vite-plugin');
const vitePlugin = (viteMod.default ?? viteMod)();
assert(vitePlugin.name === 'vite-plugin-exodra', '@exodra/vite-plugin names itself to Vite');
assert(
    vitePlugin.enforce === 'pre',
    '@exodra/vite-plugin runs BEFORE Vite own esbuild transform — without this esbuild sees the directives first and throws'
);
assert(
    vitePlugin.config().esbuild.jsx === 'preserve',
    '@exodra/vite-plugin tells esbuild to leave JSX alone'
);
const viteOut = await vitePlugin.transform(source, viewPath);
compiled(viteOut.code, '@exodra/vite-plugin transform()');
// AND APPENDS NOTHING. This line once asserted the OPPOSITE, pinning a block that
// wrote an import.meta.hot.accept(...) into every transformed module and called
// window.__EXODRA_HMR__?.updateComponent(...) — a global defined nowhere in the repository.
// (No backticks in this comment on purpose: this whole runner is generated from a template
// literal, so one would close it and break the emitted file.)
// Optional-chained, so it threw nothing; it ACCEPTED the hot update and did nothing with it, and
// Vite stops propagating to the parent importer once a module accepts. So the glue actively
// suppressed the full reload that would have shown the change, and this gate was holding it in
// place. The plugin's README says to expect a full reload until HMR is answered on this core;
// appending nothing is what makes that true.
assert(
    !viteOut.code.includes('import.meta.hot'),
    '@exodra/vite-plugin appends no HMR glue — see the comment above before "fixing" this'
);
assert(
    (await vitePlugin.transform(source, join(here, 'node_modules', 'x', 'view.tsx'))) === null,
    '@exodra/vite-plugin leaves node_modules alone'
);
assert(
    (await vitePlugin.transform(source, join(here, 'view.css'))) === null,
    '@exodra/vite-plugin leaves a non-JSX file alone'
);

// The ./client subpath — the ONLY published way to reach the transform without the plugin, and
// a second exports entry that nothing else in this gate would resolve.
const viteClient = await import('@exodra/vite-plugin/client');
const viteClientOut = await viteClient.transformExodraJsx(source, viewPath);
compiled(viteClientOut.code, '@exodra/vite-plugin/client');
console.log('  @exodra/vite-plugin compiled a .tsx through transform(), and its ./client subpath resolved');

// ────────────────────────────────────────────────────── esbuild-plugin-exodra (CommonJS main)
const esbuildMod = require('esbuild-plugin-exodra');
const esbuildPlugin = (esbuildMod.exodra ?? esbuildMod.default ?? esbuildMod)();
let esbuildFilter = null;
let esbuildLoad = null;
esbuildPlugin.setup({
    onLoad: (options, callback) => {
        esbuildFilter = options.filter;
        esbuildLoad = callback;
    },
});
assert(typeof esbuildLoad === 'function', 'esbuild-plugin-exodra registered an onLoad handler');
assert(esbuildFilter.test(viewPath), 'esbuild-plugin-exodra default filter matches a .tsx file');
const esbuildOut = await esbuildLoad({ path: viewPath });
compiled(esbuildOut.contents, 'esbuild-plugin-exodra onLoad()');
assert(esbuildOut.loader === 'js', 'esbuild-plugin-exodra hands esbuild plain JS, not JSX');
assert(
    esbuildOut.contents.includes('sourceMappingURL=data:application/json;base64,'),
    'esbuild-plugin-exodra inlined the source map — onLoad has no field to return one in'
);
console.log('  esbuild-plugin-exodra compiled a .tsx through its onLoad hook');

// ─────────────────────────────────────────────────────── rollup-plugin-exodra (CommonJS main)
//
// This is the one driven with an OPTION, and schemaSource is the one worth driving: it is
// threaded plugin → preset → compiler through three packages, and a plugin that dropped it would
// emit an import of @exodra/core into a build that deliberately does not have it.
const rollupMod = require('rollup-plugin-exodra');
const rollupPlugin = (rollupMod.exodra ?? rollupMod.default ?? rollupMod)({
    schemaSource: 'my-own-core',
});
const rollupOut = await rollupPlugin.transform(source, viewPath);
compiled(rollupOut.code, 'rollup-plugin-exodra transform()');
assert(
    rollupOut.code.includes('my-own-core'),
    'rollup-plugin-exodra threaded schemaSource down to the compiler\\n  got: ' +
        String(rollupOut.code).slice(0, 240)
);
assert(rollupOut.map !== null, 'rollup-plugin-exodra returned a source map');
assert(
    (await rollupPlugin.transform(source, join(here, 'view.css'))) === null,
    'rollup-plugin-exodra skips what its include does not match'
);
console.log('  rollup-plugin-exodra compiled a .tsx through transform(), schemaSource honoured');

// ────────────────────────────────────────────────────────── bun-plugin-exodra (CommonJS main)
//
// Bun is not installed and is not needed: this plugin declares no bun dependency at all (it
// hand-writes the slice of the plugin API it uses), so the hook is the whole package.
const bunMod = require('bun-plugin-exodra');
const bunPlugin = (bunMod.exodra ?? bunMod.default ?? bunMod)();
let bunLoad = null;
bunPlugin.setup({
    onLoad: (_options, callback) => {
        bunLoad = callback;
    },
});
assert(typeof bunLoad === 'function', 'bun-plugin-exodra registered an onLoad handler');
const bunOut = await bunLoad({ path: viewPath });
compiled(bunOut.contents, 'bun-plugin-exodra onLoad()');
assert(bunOut.loader === 'js', 'bun-plugin-exodra hands Bun plain JS');
// THE SAME ASSERTION THE esbuild PLUGIN GETS, and it is here because the two are the same eight
// lines against the same host-API shape and had drifted: esbuild inlined the map, Bun returned
// contents alone and threw away a map the shared runner had already computed. A loader hook has
// no field to return one in, so a map that is not in the contents is a map that does not exist.
assert(
    bunOut.contents.includes('sourceMappingURL=data:application/json;base64,'),
    'bun-plugin-exodra inlined the source map — onLoad has no field to return one in'
);
console.log('  bun-plugin-exodra compiled a .tsx through its onLoad hook');

console.log('  bundler fixture OK: four plugins, four hooks, one compiled module each');
`;

/**
 * `create-exodra`, RUN AS A USER RUNS IT, and then the app it wrote is COMPILED AND EXECUTED.
 *
 * This is the package where a defect costs the most and is noticed by the most people: it is the
 * first command anybody types, it is typed by somebody who has never seen this framework, and
 * everything it goes on to produce is downstream of it. Nothing in this repository installed it
 * before now.
 *
 * WHY THE SCAFFOLD IS THE `--ssr` ONE: the CLI is only non-interactive when EVERY option is
 * answered by a flag (a missing one becomes a prompt and the run hangs forever inside a release),
 * and both answers are now spellable — `--ssr` and `--no-ssr`. This gate takes the SSR half
 * because it is the one whose output can be EXECUTED here: it writes plain TypeScript with no JSX,
 * and its only imports are packages this gate has already installed as tarballs, so its entry
 * point runs instead of merely existing. The SPA half is covered by `create-exodra`'s own
 * `scaffold.test.ts`, which runs both variants against the working tree; what only this file can
 * add is running one of them against the PACKED runtimes, and one is enough for that.
 *
 * WHY THE CHILD GETS A BROKEN `PATH`: `create-exodra` finishes by running `git init`, `git add`
 * and `git commit` in the directory it made. That is fine in a user's hands and wrong in a
 * release gate — it spawns three git processes per run for a repository nobody will ever look at,
 * and it makes the gate depend on git being installed and on the machine having a commit identity
 * configured. The CLI already wraps all three in a `try`/`catch` that treats failure as "no git,
 * never mind", so handing the child a `PATH` with no git on it takes that branch deliberately.
 * The scaffold is still complete; it simply is not a repository.
 *
 * WHAT IS COMPILED AND WHAT IS NOT. `src/app.ts` and `src/entry-server.ts` are compiled to
 * CommonJS and the server entry is CALLED, so the markup a first-time user gets on their first
 * `npm run dev` is asserted here. `src/entry-client.ts` is compiled but not called — it reads
 * `document` at module scope — and its imports are resolved instead. Nothing here TYPECHECKS the
 * scaffold: `preset-typescript` strips `import type { TExoConnector, TExoWire }` without ever
 * asking whether those names exist. A scaffold importing a type that has been renamed would pass
 * this and fail the user's first `npm run typecheck`.
 */
const SCAFFOLD_FLAGS = [
    '--ts',
    '--eslint',
    '--tailwind',
    '--src-dir',
    '--ssr',
    '--app',
    '--use-npm',
    '--import-alias',
    '@/*',
];

const SCAFFOLD_RUNNER = `
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const assert = (condition, message) => {
    if (!condition) throw new Error('ASSERT FAILED: ' + message);
};

const here = process.cwd();
// INSIDE the fixture project, so that Node resolves \`@exodra/*\` out of the fixture's own
// node_modules by walking up — which is to say, out of the installed tarballs.
const workdir = join(here, 'scaffold');
mkdirSync(workdir, { recursive: true });
const project = join(workdir, 'probe-app');

// THE BIN, not the main entry: \`npm create exodra\` and \`npx create-exodra\` both run this file,
// and a \`bin\` that points at something the tarball does not carry is a package that installs and
// cannot be run at all.
const bin = join(here, 'node_modules', '.bin', 'create-exodra');
assert(existsSync(bin), 'create-exodra installed its create-exodra bin into node_modules/.bin');

try {
    execFileSync(process.execPath, [bin, 'probe-app', ...${JSON.stringify(SCAFFOLD_FLAGS)}], {
        cwd: workdir,
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 120000,
        // No git on this PATH — see the comment on SCAFFOLD_RUNNER.
        env: { ...process.env, PATH: join(workdir, 'no-such-bin-directory') },
    });
} catch (error) {
    throw new Error(
        'create-exodra failed to scaffold a project — this is the first command a new user ' +
            'runs.\\n  exit: ' + String(error.status) +
            '\\n  stderr: ' + String(error.stderr ?? '').trim() +
            '\\n  stdout: ' + String(error.stdout ?? '').trim()
    );
}

for (const file of [
    'package.json',
    'index.html',
    'vite.config.ts',
    'src/app.ts',
    'src/entry-server.ts',
    'src/entry-client.ts',
    'server/dev-server.ts',
    // NAMED BY THE SCAFFOLD'S OWN \`serve\` SCRIPT, and for a long time written by nothing — the
    // generated project's own command ended in ENOENT on an otherwise clean scaffold.
    'server/prod-server.ts',
]) {
    assert(existsSync(join(project, file)), 'the scaffold wrote ' + file);
}

const scaffolded = JSON.parse(readFileSync(join(project, 'package.json'), 'utf8'));
assert(scaffolded.name === 'probe-app', 'the scaffold package.json carries the project name');

// EVERY @exodra RANGE THE SCAFFOLD ASKS FOR, AGAINST WHAT THIS RELEASE ACTUALLY INSTALLS. The
// unit test in create-exodra compares these against the manifests in the working tree; this
// compares them against the INSTALLED tarballs, which is the thing a user's npm will be asked to
// satisfy. A scaffold that pins a version this release does not publish is an app that cannot
// install — the worst possible first contact, and invisible until somebody tries.
const declared = { ...scaffolded.dependencies, ...scaffolded.devDependencies };
let checkedRanges = 0;
for (const [name, range] of Object.entries(declared)) {
    if (!name.startsWith('@exodra/')) continue;
    const manifestPath = join(here, 'node_modules', ...name.split('/'), 'package.json');
    assert(
        existsSync(manifestPath),
        'the scaffold asks for ' + name + ', which this release does not install here — either ' +
            'it is not published, or it is not in this gate PACKED set'
    );
    const installed = JSON.parse(readFileSync(manifestPath, 'utf8')).version;
    const wanted = String(range).replace(/^[\\^~]/, '');
    assert(
        installed.split('.').slice(0, 2).join('.') === wanted.split('.').slice(0, 2).join('.'),
        'the scaffold asks for ' + name + '@' + range + ', this release publishes ' + installed
    );
    checkedRanges += 1;
}
assert(checkedRanges > 0, 'the scaffold declares at least one @exodra dependency');

// ─────────────────────────────── the scaffolded app, compiled and RUN against the tarballs
//
// A directory of its own, with a package.json saying commonjs: the scaffold is \`type: module\`
// and its own modules import each other WITHOUT extensions, which Node ESM will not resolve.
// Compiling to CommonJS both fixes that and — the part worth having — loads @exodra/core
// and @exodra/string through their \`require\` condition, which nothing else in
// this gate does.
const built = join(project, 'packed-check');
mkdirSync(built, { recursive: true });
writeFileSync(join(built, 'package.json'), JSON.stringify({ type: 'commonjs' }));

const babel = require('@babel/core');
for (const name of ['app', 'entry-server', 'entry-client']) {
    const from = join(project, 'src', name + '.ts');
    const result = babel.transformFileSync(from, {
        babelrc: false,
        configFile: false,
        presets: [require.resolve('@babel/preset-typescript')],
        plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
    });
    assert(result != null && typeof result.code === 'string', 'the scaffold src/' + name + '.ts compiles');
    writeFileSync(join(built, name + '.js'), result.code);
}

const entryServer = require(join(built, 'entry-server.js'));
assert(typeof entryServer.render === 'function', 'the scaffold entry-server exports render()');
const rendered = entryServer.render();
assert(
    typeof rendered.appHtml === 'string' && rendered.appHtml.length > 0,
    'the scaffold server entry rendered markup'
);
assert(
    rendered.appHtml.includes('Welcome to probe-app'),
    'the scaffold rendered its own project name into the page\\n  actual: ' + rendered.appHtml
);
assert(
    rendered.appHtml.includes('<button'),
    'the scaffold rendered the interactive element its client entry hydrates'
);

// The client half is not RUN — it reads \`document\` at module scope — but what it imports has to
// be there, and that is a resolution question this fixture can answer.
const fromScaffold = createRequire(join(built, 'entry-client.js'));
for (const name of ['@exodra/dom', '@exodra/core', '@exodra/context', '@exodra/string']) {
    assert(
        typeof fromScaffold.resolve(name) === 'string',
        'the scaffold can resolve ' + name + ' from its own source directory'
    );
}

console.log('  create-exodra scaffolded probe-app, ' + checkedRanges + ' @exodra range(s) match what ships');
console.log('  scaffold fixture OK: its server entry rendered ' + rendered.appHtml.length + ' bytes through the installed tarballs');
`;

// ─────────────────────────────────────── what the manifests PROMISE, checked in the install
//
// THE INSTALLED DIRECTORY IS THE TARBALL. `npm install file:…/x.tgz` extracts the archive's
// `package/` into `node_modules/<name>`, so reading a file out of there IS reading it out of
// what was packed — and it costs no tar handling and no second unpack. A file the manifest
// names and `files` did not carry is absent from both.
//
// THE FIXTURES CANNOT DO THIS JOB. They reach every package through a bare specifier, which is
// the right test of the condition that specifier resolves to and no test at all of the rest:
// nothing in a Node import ever looks at `unpkg`, `jsdelivr` or `types`, and the `require`
// condition is reached only for the three packages the scaffolded CommonJS app happens to load.
// `unpkg`/`jsdelivr` are the sharpest case — they point at `dist/exodra.global.js`, which
// is built by a SECOND tsup config in the package, so a `tsup.config.ts` that lost its
// `browserGlobal(…)` entry ships a manifest advertising a CDN file that is not in the tarball
// and every `<script src="…/@exodra/dom">` on the internet 404s, with nothing here to notice.

/** Every leaf of an `exports` map, with the condition path that led to it. */
function collectExportTargets(node, trail, out) {
    if (typeof node === 'string') {
        out.push({ where: `exports${trail}`, target: node });
        return;
    }
    if (node === null || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) {
        collectExportTargets(value, `${trail}[${JSON.stringify(key)}]`, out);
    }
}

/** The manifest fields whose value is a path into the package's own tarball. */
const PROMISED_FIELDS = ['main', 'module', 'types', 'typings', 'unpkg', 'jsdelivr'];

function checkPromisedFiles(pkgDir, manifest, fail) {
    const targets = [];
    for (const field of PROMISED_FIELDS) {
        if (typeof manifest[field] === 'string') {
            targets.push({ where: field, target: manifest[field] });
        }
    }
    collectExportTargets(manifest.exports, '', targets);
    if (typeof manifest.bin === 'string') targets.push({ where: 'bin', target: manifest.bin });
    else if (manifest.bin !== null && typeof manifest.bin === 'object') {
        for (const [name, target] of Object.entries(manifest.bin)) {
            targets.push({ where: `bin[${JSON.stringify(name)}]`, target });
        }
    }
    // A `files` entry is a promise too, and the one that is usually WHY a target is missing.
    // Only the literal entries are checked: a glob is npm's to expand, not this script's.
    for (const entry of manifest.files ?? []) {
        if (typeof entry === 'string' && !/[*?[\]{}!]/.test(entry)) {
            targets.push({ where: `files["${entry}"]`, target: entry });
        }
    }

    for (const { where, target } of targets) {
        if (typeof target !== 'string') continue;
        // An `exports` CONDITION may legitimately name a bare specifier rather than a path, and
        // this script has no business resolving one. Every other field here is a path, including
        // the ones written without a leading `./` — `babel-preset-exodra`'s `main` is
        // `dist/index.cjs`, and skipping it for looking bare is how this check would quietly
        // cover nine packages and not the tenth.
        if (
            where.startsWith('exports') &&
            !target.startsWith('.') &&
            !target.startsWith('/')
        ) {
            continue;
        }
        if (!existsSync(join(pkgDir, target))) {
            fail(
                `${manifest.name}: package.json \`${where}\` promises "${target}", which the ` +
                    `packed tarball does not contain. A consumer resolving that entry point ` +
                    `gets ERR_MODULE_NOT_FOUND; a CDN gets a 404.`
            );
        }
    }
}

// A shipped ESM entry a browser cannot load is a release bug, and the scan below is what caught
// one. Why it exists, what the guard must read, and why the CDN build is exempt:
// docs-site/docs/architecture/gates-and-root-configs.md

/** Ships ESM, is not for a browser, and may therefore say `process`. A LIST, NOT A HEURISTIC. */
const NODE_ONLY_ESM = new Set(['@exodra/vite-plugin']);

/**
 * The words after which a `/` opens a REGULAR EXPRESSION rather than dividing. Everything else
 * that can end an expression — an identifier, a number, `)`, `]` — makes it division.
 */
const REGEX_PRECEDING_KEYWORDS = new Set([
    'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case',
    'do', 'else', 'yield', 'await',
]);

/**
 * Would a `/` at `at` open a regular-expression literal? `chars` is the array being masked, so
 * everything already behind `at` has had its comments and strings blanked out.
 */
function opensRegex(chars, at) {
    let k = at - 1;
    while (k >= 0 && /\s/.test(chars[k])) k--;
    if (k < 0) return true;
    const c = chars[k];
    if (')]}'.includes(c)) return false;
    if ('([{,;:=!&|?+-*%~^<>'.includes(c)) return true;
    if (!/[A-Za-z0-9_$]/.test(c)) return false;
    const end = k + 1;
    while (k >= 0 && /[A-Za-z0-9_$]/.test(chars[k])) k--;
    return REGEX_PRECEDING_KEYWORDS.has(chars.slice(k + 1, end).join(''));
}

/**
 * Comments, string/template literals and regular-expression literals blanked out, indices and
 * length preserved, so that a `process.env` in PROSE or in a MESSAGE is not mistaken for one in
 * code.
 *
 * ALL THREE ARE NECESSARY, and each one is here because the shipped `dist` really contains it:
 * tsup does not minify these packages, so `@exodra/core`'s comment about "the two baskets"
 * survives into `dist/index.js` spelling out `process.env.NODE_ENV` in prose, and the escapers
 * a few hundred lines further down are regular-expression literals CONTAINING QUOTE CHARACTERS
 * (`/"/g`). A masker that skipped regexes would swallow the rest of the file as a string and
 * then find no `process` at all — a check that reports nothing because it lost its place is
 * worse than no check.
 *
 * ONE KNOWN LIMIT, stated rather than assumed: a template literal is blanked whole, `${…}`
 * expressions included, so a `process.env` interpolated into one would not be reported. Nothing
 * in these packages interpolates one, and the failure mode is a miss rather than a false alarm.
 */
function maskNonCode(source) {
    const out = source.split('');
    const n = source.length;
    let i = 0;
    while (i < n) {
        const c = source[i];
        if (c === '/' && source[i + 1] === '/') {
            while (i < n && source[i] !== '\n') out[i++] = ' ';
            continue;
        }
        if (c === '/' && source[i + 1] === '*') {
            const end = source.indexOf('*/', i + 2);
            const stop = end === -1 ? n : end + 2;
            for (let k = i; k < stop; k++) if (source[k] !== '\n') out[k] = ' ';
            i = stop;
            continue;
        }
        if (c === '"' || c === "'" || c === '`') {
            out[i++] = ' ';
            while (i < n) {
                const d = source[i];
                if (d === '\\') {
                    out[i] = ' ';
                    if (i + 1 < n && source[i + 1] !== '\n') out[i + 1] = ' ';
                    i += 2;
                    continue;
                }
                if (d !== '\n') out[i] = ' ';
                i++;
                if (d === c) break;
            }
            continue;
        }
        if (c === '/' && opensRegex(out, i)) {
            out[i++] = ' ';
            let inClass = false;
            while (i < n) {
                const d = source[i];
                if (d === '\\') {
                    out[i] = ' ';
                    if (i + 1 < n && source[i + 1] !== '\n') out[i + 1] = ' ';
                    i += 2;
                    continue;
                }
                if (d !== '\n') out[i] = ' ';
                i++;
                // A regular expression cannot span a line: an unterminated one means the
                // heuristic above misread a division, so stop rather than eat the file.
                if (d === '\n') break;
                if (d === '[') inClass = true;
                else if (d === ']') inClass = false;
                else if (d === '/' && !inClass) break;
            }
            continue;
        }
        i++;
    }
    return out.join('');
}

/**
 * Every `process` reference in CODE that is not inside a `typeof process` guard, as
 * `{ line, column, snippet }`.
 *
 * "Inside a guard" is decided over the enclosing statement rather than a character window: from
 * each reference, back to the nearest `;`, `{` or `}`, the text must already contain
 * `typeof process`. That is exactly the shape the sources are written in, and it does not accept
 * a guard that ended at a previous statement.
 */
function findUnguardedProcess(source, masked) {
    const hits = [];
    for (const match of masked.matchAll(/\bprocess\b/g)) {
        const at = match.index;
        if (at > 0 && masked[at - 1] === '.') continue; // a property named `process`
        if (/\btypeof\s+$/.test(masked.slice(Math.max(0, at - 16), at))) continue; // the guard itself
        let start = at;
        while (start > 0 && !';{}'.includes(masked[start - 1])) start--;
        if (masked.slice(start, at).includes('typeof process')) continue;
        const before = source.slice(0, at);
        hits.push({
            line: before.split('\n').length,
            column: at - (before.lastIndexOf('\n') + 1) + 1,
            snippet: source.slice(Math.max(0, at - 40), at + 60).replace(/\s+/g, ' ').trim(),
        });
    }
    return hits;
}

function resolveRelative(fromFile, spec) {
    const base = join(dirname(fromFile), spec);
    for (const candidate of [base, `${base}.js`, join(base, 'index.js')]) {
        if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    }
    return null;
}

/**
 * The ESM module graph reachable from one entry file, as `file → { source, masked }`.
 *
 * Only RELATIVE specifiers are edges: a bare one is somebody else's package and not in this
 * tarball to check. The specifier text has to be read out of the original source (the mask
 * blanks it), so the keyword position is checked against the mask instead — that is what keeps
 * the word "from" inside a comment or a message from being followed as an import.
 */
function readEsmGraph(entryFile, pkgDir, name, fail) {
    const graph = new Map();
    const stack = [entryFile];
    while (stack.length > 0) {
        const file = stack.pop();
        if (graph.has(file)) continue;
        const source = readFileSync(file, 'utf8');
        const masked = maskNonCode(source);
        graph.set(file, { source, masked });
        for (const match of source.matchAll(/(?:\bfrom|\bimport)\s*\(?\s*["'](\.[^"']*)["']/g)) {
            if (masked[match.index] !== source[match.index]) continue; // in a comment or a string
            const next = resolveRelative(file, match[1]);
            if (next === null) {
                fail(
                    `${name}: ${relative(pkgDir, file)} imports "${match[1]}", which is not in ` +
                        `the packed tarball — the module graph a consumer loads is incomplete.`
                );
            } else {
                stack.push(next);
            }
        }
    }
    return graph;
}

// ──────────────────────────────────────────────────────────────────────────────── the run

const work = mkdtempSync(join(tmpdir(), 'exo-packed-'));
let ok = false;
try {
    const tgz = {};
    for (const pkg of PKGS) {
        const out = execSync(`npm pack --pack-destination "${work}"`, {
            cwd: join(ROOT, pkg.dir),
            encoding: 'utf8',
        });
        tgz[pkg.name] = join(work, out.trim().split('\n').pop().trim());
        console.log(`packed ${pkg.name}@${pkg.version}`);
    }

    const app = join(work, 'app');
    mkdirSync(app);
    const deps = {};
    // Every tarball is a DIRECT dependency of the fixture, which is what lets npm satisfy the
    // packages' own `@exodra/*` dependency and peer edges from these files instead of going to
    // the registry for versions that are not published yet.
    for (const pkg of PKGS) deps[pkg.name] = `file:${tgz[pkg.name]}`;
    // AND WHAT THE FIXTURES THEMSELVES NEED, which is not the same list as what the packages
    // need: npm installs every non-optional PEER of an installed package on its own (that is how
    // `vite`, `esbuild` and `rollup` arrive here, unasked and unavoidable), but a package a
    // RUNNER imports by name has to be declared, or it resolves only by accident of hoisting.
    //
    // `react`/`react-dom` are pinned to 18 rather than left to npm: both React packages satisfy
    // `@exodra/react`'s peer range, and a gate that silently changes major React version between
    // runs is a gate whose failures nobody can reproduce.
    //
    // `@babel/plugin-transform-modules-commonjs` is the scaffold fixture's, and it is the reason
    // the `require` condition of three runtime packages is executed at all — see SCAFFOLD_RUNNER.
    Object.assign(deps, {
        '@babel/core': '^7.24.0',
        '@babel/plugin-syntax-jsx': '^7.24.0',
        '@babel/preset-typescript': '^7.24.0',
        '@babel/plugin-transform-modules-commonjs': '^7.24.0',
        jsdom: '^27.0.0',
        react: '^18.3.1',
        'react-dom': '^18.3.1',
    });
    writeFileSync(
        join(app, 'package.json'),
        JSON.stringify(
            { name: 'packed-app', version: '1.0.0', private: true, dependencies: deps },
            null,
            2
        )
    );

    console.log('installing tarballs into a fresh project…');
    execSync('npm install --no-audit --no-fund --loglevel=error', {
        cwd: app,
        stdio: 'inherit',
    });

    // ── PACKAGING, before a line of the fixture runs. It is checked first because its failures
    // are about what is IN the tarball, and a resolution error inside the fixture would report
    // the same defect later and with a worse message. Every failure is collected and they are
    // reported together: a release that lost a `files` entry usually lost it for more than one
    // package, and finding that out one run at a time is the slow way.
    console.log('\npackaging (the installed tarballs, exactly as a consumer gets them):');
    const failures = [];
    const fail = message => failures.push(message);
    for (const pkg of PKGS) {
        const dir = join(app, 'node_modules', ...pkg.name.split('/'));
        if (!existsSync(dir)) {
            fail(`${pkg.name}: not installed into the fixture at ${dir} — the tarball did not resolve`);
            continue;
        }
        const before = failures.length;
        const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
        checkPromisedFiles(dir, manifest, fail);

        // ONLY THE PACKAGES A BROWSER CAN IMPORT are scanned for `process`, and the test for
        // that is the manifest's own: a package with an `exports["."].import` condition is
        // offering an ESM entry to whoever asks for one, browsers included.
        // `@exodra/babel-plugin-schema`, `babel-preset-exodra` and the esbuild/Rollup/Bun plugins
        // have no such condition — they are CommonJS build-time tools that run in Node and may
        // use `process` freely.
        //
        // THE GRAPH WALK STILL RUNS FOR THE EXEMPTED ONE, and that is deliberate: half of what it
        // does is check that every relative specifier in the shipped graph RESOLVES inside the
        // tarball, which is a packaging fact and true of a Node-only package too.
        const esmEntry = manifest.exports?.['.']?.import;
        let scanned = 0;
        if (typeof esmEntry === 'string' && existsSync(join(dir, esmEntry))) {
            const graph = readEsmGraph(join(dir, esmEntry), dir, pkg.name, fail);
            scanned = graph.size;
            for (const [file, { source, masked }] of graph) {
                if (NODE_ONLY_ESM.has(pkg.name)) continue;
                for (const hit of findUnguardedProcess(source, masked)) {
                    fail(
                        `${pkg.name}: ${relative(dir, file)}:${hit.line}:${hit.column} ` +
                            `references \`process\` with no \`typeof process !== 'undefined'\` ` +
                            `guard, so this module throws ReferenceError in a browser that ` +
                            `imports it unbundled.\n      ${hit.snippet}`
                    );
                }
            }
        }
        const found = failures.length - before;
        console.log(
            found === 0
                ? `  ok   ${pkg.name}: every promised file present, ${scanned} ESM module(s) scanned`
                : `  FAIL ${pkg.name}: ${found} problem(s) — reported in full below`
        );
    }
    if (failures.length > 0) {
        throw new Error(
            `test-packed: ${failures.length} packaging failure(s) in what would have been ` +
                `published:\n  - ${failures.join('\n  - ')}`
        );
    }

    writeFileSync(join(app, 'dom-env.mjs'), DOM_ENV);
    writeFileSync(join(app, 'babel.config.js'), BABEL_CONFIG);
    writeFileSync(join(app, 'app.tsx'), APP_TSX);
    writeFileSync(join(app, 'view.tsx'), VIEW_TSX);
    writeFileSync(join(app, 'schema-runner.mjs'), SCHEMA_RUNNER);
    writeFileSync(join(app, 'bundler-runner.mjs'), BUNDLER_RUNNER);
    writeFileSync(join(app, 'scaffold-runner.mjs'), SCAFFOLD_RUNNER);

    // THREE PROCESSES, IN THIS ORDER, and the order is the cost of a failure: the renderer is
    // what every user of this framework runs, the build tools are what they run it through, and
    // the scaffolder is what wrote both for them. A `babel.config.js` sits in this directory, so
    // each runner is a consumer of the SAME project a user would have.
    console.log('\nschema renderer (directive JSX, ESM consumer):');
    execSync('node schema-runner.mjs', { cwd: app, stdio: 'inherit' });

    console.log('\nbundler plugins (each driven through its own hook):');
    execSync('node bundler-runner.mjs', { cwd: app, stdio: 'inherit' });

    console.log('\nscaffolder (the installed bin, and the app it writes):');
    execSync('node scaffold-runner.mjs', { cwd: app, stdio: 'inherit' });
    ok = true;
} finally {
    rmSync(work, { recursive: true, force: true });
}

if (!ok) process.exit(1);
console.log('\n✅ packed integration passed');
