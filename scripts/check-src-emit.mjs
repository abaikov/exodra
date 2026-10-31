#!/usr/bin/env node
// NO COMPILED OUTPUT BESIDE SOURCES — the gate against a test suite that lies.
//
// Run:  node scripts/check-src-emit.mjs   (or `npm run check:src-emit`)
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT IT GUARDS, AND IT HAPPENED.
//
// `tsc -b packages/benchmarks/tsconfig.json` used to write `.js`, `.js.map`, `.d.ts` and
// `.d.ts.map` NEXT TO THE `.ts` SOURCES OF OTHER PACKAGES: 256 files into packages/core/src, 324
// into packages/dom/src, 44 into packages/string/src, 26 into packages/reactivity/src. That config
// resolves `@exodra/*` to the library SOURCES, so every library file it pulled in was outside its
// `rootDir` and landed beside itself. (Stopped at the source now — see the header of
// `packages/benchmarks/tsconfig.json`.)
//
// Then vitest loaded the `.js` IN PREFERENCE TO the `.ts` beside it, because that is Vite's
// extension order. `packages/dom/src/dom/build-into-exo-child.js` held a call the `.ts` beside it
// had already had fixed; the suite reported the old failure with a stack frame pointing at
// `build-into-exo-child.ts:72`, a line that is inside a JSDoc block — the stale file's sourcemap
// saying, if anyone read it that way, that the runner was executing something else. The reported
// state of the package was `2 failed / 835 passed`. After deleting 58 stray files: `837 passed`.
//
// WHY NOTHING SAID SO. `.gitignore` carried `**/src/**/*.js` and its three siblings, so `git
// status` was clean over a tree that was running last month's code. Somebody had met this before
// and silenced the symptom instead of stopping the emit. Those lines are gone; this file replaces
// them, and it replaces them with the opposite behaviour — a stray file is now LOUD.
//
// The failure class is silent by construction: nothing goes red, nothing looks wrong, and every
// number and every test result taken off that tree is worthless. That is why the gate is worth
// more than any single fix that stops one emitter.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT IT DOES NOT LOOK AT, AND WHY EACH ONE IS SKIPPED RATHER THAN ALLOWED.
//
// `dist/`, `.tsbuild/`, `coverage/`, `node_modules/` are output directories, and skipping them is
// CORRECTNESS and not speed: several packages emit `dist/src/index.js`, which matches the pattern
// this gate hunts and is exactly where compiled output belongs.
import { readdirSync } from 'fs';
import { dirname, join, relative, sep } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES = join(ROOT, 'packages');

/**
 * Directories that hold build output by design, or that are not ours. Never descended into.
 */
const OUTPUT_DIRS = new Set(['node_modules', 'dist', '.tsbuild', 'coverage', '.git']);

/**
 * Files under a `src/` that are GENUINE hand-written sources despite carrying an output
 * extension. Empty, and it should stay empty: every `packages/**\/src` file in this repository is
 * `.ts`/`.tsx`. Each entry is a repo-relative path and says in one sentence who wrote it by hand.
 * A pattern must never be added here — a pattern would let the next accidental emit in silently,
 * which is the entire defect this file exists to make impossible.
 */
const HAND_WRITTEN = {};

const isOutputFile = (name) =>
    name.endsWith('.js') ||
    name.endsWith('.js.map') ||
    name.endsWith('.d.ts') ||
    name.endsWith('.d.ts.map');

const extensionOf = (name) =>
    name.endsWith('.d.ts.map')
        ? '.d.ts.map'
        : name.endsWith('.d.ts')
          ? '.d.ts'
          : name.endsWith('.js.map')
            ? '.js.map'
            : '.js';

/** src directory (repo-relative) → { files: string[], byExt: Map<string, number> } */
const found = new Map();
let scanned = 0;
let srcDirs = 0;

/**
 * @param {string} dir absolute directory to read
 * @param {string | null} srcRoot repo-relative path of the `src/` this directory sits under,
 *                                or null while still above one
 */
const walk = (dir, srcRoot) => {
    let entries;
    try {
        entries = readdirSync(dir, { withFileTypes: true });
    } catch {
        return; // a directory that vanished under us is not a finding
    }
    for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (OUTPUT_DIRS.has(entry.name)) continue;
            let nextRoot = srcRoot;
            if (srcRoot === null && entry.name === 'src') {
                nextRoot = relative(ROOT, full);
                srcDirs++;
            }
            walk(full, nextRoot);
            continue;
        }
        if (srcRoot === null || !entry.isFile()) continue;
        scanned++;
        if (!isOutputFile(entry.name)) continue;
        const rel = relative(ROOT, full);
        if (rel in HAND_WRITTEN) continue;
        let group = found.get(srcRoot);
        if (group === undefined) {
            group = { files: [], byExt: new Map() };
            found.set(srcRoot, group);
        }
        group.files.push(rel);
        const ext = extensionOf(entry.name);
        group.byExt.set(ext, (group.byExt.get(ext) ?? 0) + 1);
    }
};

walk(PACKAGES, null);

/**
 * THE SECOND QUESTION, AND IT IS NOT THE FIRST ONE. Above, a `.js` under a `src/` is wrong because
 * a runner resolves it instead of the `.ts`. Here, a compiled TEST under a `dist/` is wrong for a
 * different reason: every one of these packages ships `files: ["dist"]`, so a `*.test.js` in there
 * is published to users, and a runner whose globs reach build output executes last build's suite
 * against this build's code.
 *
 * FOUND BY THIS GATE WHEN IT WAS WRITTEN: `packages/attrs/dist/tests`,
 * `packages/dom-profiler/dist/tests` and `packages/vite-plugin-exodra/dist/tests` — empty
 * directories left where a build once emitted compiled tests. The root vitest config excludes
 * `**\/dist/**`, which is what stops the suite running them TODAY; nothing stopped them shipping.
 */
const distTests = [];
const walkDistForTests = (dir) => {
    let entries;
    try {
        entries = readdirSync(dir, { withFileTypes: true });
    } catch {
        return;
    }
    for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === 'node_modules') continue;
            if (entry.name === 'tests' || entry.name === '__tests__') {
                distTests.push(relative(ROOT, full) + sep);
                continue;
            }
            walkDistForTests(full);
            continue;
        }
        if (/\.test\.(js|cjs|mjs|d\.ts)(\.map)?$/.test(entry.name)) distTests.push(relative(ROOT, full));
    }
};
for (const pkg of readdirSync(PACKAGES, { withFileTypes: true })) {
    if (!pkg.isDirectory()) continue;
    walkDistForTests(join(PACKAGES, pkg.name, 'dist'));
}

const total = [...found.values()].reduce((n, g) => n + g.files.length, 0);

if (total === 0 && distTests.length === 0) {
    console.log(
        `✓ no compiled output beside sources — ${scanned} files under ${srcDirs} ` +
            `packages/**/src directories, none of them .js/.js.map/.d.ts/.d.ts.map`
    );
    console.log('✓ no compiled test reaches a published dist/');
    process.exit(0);
}

if (distTests.length > 0) {
    console.error(
        `\n✖ ${distTests.length} test artefact(s) sit inside a dist/ that ships:\n` +
            distTests.map((p) => `      ${p}`).join('\n') +
            '\n\n  These packages publish `files: ["dist"]`, so this is shipped to users, and a\n' +
            '  runner whose globs reach build output runs last build’s suite against this build.\n' +
            '  Delete them, then stop the emit: a package`s build config must not take its\n' +
            '  `*.test.ts` as input.\n'
    );
}

if (total === 0) process.exit(1);

const SHOWN_PER_DIR = 5;
console.error(
    `\n✖ ${total} compiled file(s) sit beside the sources they were compiled from, in ` +
        `${found.size} src director${found.size === 1 ? 'y' : 'ies'}:\n`
);
for (const [srcRoot, group] of [...found].sort((a, b) => b[1].files.length - a[1].files.length)) {
    const breakdown = [...group.byExt]
        .sort()
        .map(([ext, n]) => `${n} ${ext}`)
        .join(', ');
    console.error(`  ${srcRoot}${sep}   ${group.files.length} files   (${breakdown})`);
    for (const f of group.files.slice(0, SHOWN_PER_DIR)) console.error(`      ${f}`);
    if (group.files.length > SHOWN_PER_DIR)
        console.error(`      … and ${group.files.length - SHOWN_PER_DIR} more`);
}
console.error(
    '\n  Vitest and Vite resolve a `.js` BEFORE the `.ts` beside it, so every suite, benchmark\n' +
        '  and profile taken off this tree is running whatever those files last held — and\n' +
        '  nothing goes red to say so.\n' +
        '\n' +
        '  Delete them:      npm run clean:src\n' +
        '  Then find what wrote them: a `tsc`/`tsc -b` run whose config emits (no `noEmit`) while\n' +
        '  `@exodra/*` resolves to package SOURCES — every file it reads outside its own `rootDir`\n' +
        '  is written back next to itself. Fix that config, not this gate.\n' +
        '  A genuinely hand-written `.js` under a `src/` goes in HAND_WRITTEN in this file, by\n' +
        '  full path, with the reason.\n'
);
process.exit(1);
