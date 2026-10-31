#!/usr/bin/env node
// THE TEST FILES, HANDED TO THE COMPILER. Run: `npm run typecheck:tests`.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// ARMED — IT RUNS IN `release:check`, between `npm run typecheck` and `typecheck:benchmarks`.
//
// That position is the precondition below: the `paths` these configs inherit name `.tsbuild`, and
// `npm run typecheck` is the step that writes it.
//
// NOTHING HOLDS IT THERE BUT THIS LINE. `check-gates.mjs` decides "gate-shaped" by NAME (`check:*`,
// `*:check`, `*:verify`) and `typecheck:tests` matches none of the three, so taking it back out of
// the chain turns nothing red. What that file DOES require is that every script in `scripts/` be
// named by some npm script, which `typecheck:tests` satisfies whether or not the chain calls it —
// and a gate invocable by nothing is the shape in which this repository has already lost five
// checks, each catalogued in `scripts/check-gates.mjs`'s header.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT IT RUNS, AND WHY IT DISCOVERS RATHER THAN LISTS.
//
// One `tsc -p packages/<pkg>/tsconfig.tests.json` per package that has test files. Each of those
// configs extends its own package's typecheck config, which is what keeps every `@exodra/*`
// specifier resolving to the same `.d.ts` the package's sources resolve it to; the long-form
// version of that argument is in `packages/core/tsconfig.tests.json`.
//
// The list of projects is DISCOVERED from disk, not written here. This repository has been bitten
// twice by a hand-maintained list drifting from the thing it lists — the root `tsconfig.json` and
// `tsconfig.build.json` carried two `references` arrays that nothing kept in step, and a
// syntactically broken file in `packages/term` was green all day because it was in one list and
// not the other. A list in this file would be a third.
//
// So the script asks two questions instead of one:
//
//   1. Does every package holding a `*.test.ts` / `*.test.tsx` / `*.spec.ts` have a
//      `tsconfig.tests.json`? A package that grows a suite and no config would otherwise be
//      covered by nothing, silently, which is the exact defect being closed here.
//   2. Does each of those projects compile?
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// PRECONDITION: `npm run typecheck` FIRST, ON A CLEAN CHECKOUT.
//
// Every `paths` entry in this repository names `../<pkg>/.tsbuild/index.d.ts` — tsc's own output,
// written by `tsc -b tsconfig.build.json`. These configs inherit those maps, so on a tree where
// nothing has been built yet the failures will be TS2307 on every sibling import rather than
// anything about the tests. Mapping siblings to their SOURCE instead is not an option: a project
// that reaches outside its own `rootDir` answers TS6059, which is the reason
// `tsconfig.depcruise.json` exists as a separate file.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// SEQUENTIAL, ON PURPOSE. Twenty-five `tsc` processes started at once is twenty-five programs
// built at once; this machine has been hung by less. There is no parallel mode and adding one
// would need a measured reason.
import { readdirSync, existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES = join(ROOT, 'packages');

/**
 * Directories under `packages/` that are NOT single packages and are skipped by the discovery
 * walk. Each entry says why, because a pattern here would silently swallow the next one.
 */
const NOT_A_PACKAGE = {
    examples: 'a directory OF applications, not a package — `escape-hatches` / `no-build` are HTML ' +
        'pages with no build',
};

/**
 * Packages that hold test files and deliberately have NO `tsconfig.tests.json`, with the reason.
 * Empty today: every package with a suite has one. Keep it that way, or argue an entry here.
 */
const NO_TESTS_CONFIG = {};

const TEST_FILE = /\.(test|spec)\.tsx?$/;

const hasTests = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (
            entry.name === 'node_modules' ||
            entry.name === 'dist' ||
            entry.name === '.tsbuild' ||
            entry.name === 'target'
        )
            continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (hasTests(full)) return true;
        } else if (TEST_FILE.test(entry.name)) return true;
    }
    return false;
};

const packages = readdirSync(PACKAGES, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !(e.name in NOT_A_PACKAGE))
    .map((e) => e.name)
    .sort();

const withTests = packages.filter((name) => hasTests(join(PACKAGES, name)));

// ── 1. EVERY PACKAGE WITH A SUITE HAS A CONFIG ───────────────────────────────────────────────
const uncovered = withTests.filter(
    (name) =>
        !(name in NO_TESTS_CONFIG) &&
        !existsSync(join(PACKAGES, name, 'tsconfig.tests.json'))
);
if (uncovered.length > 0) {
    console.error(
        `\n✖ ${uncovered.length} package(s) hold test files that NO tsconfig looks at:\n` +
            uncovered.map((n) => `    packages/${n}`).join('\n') +
            '\n\n  Add a `tsconfig.tests.json` extending that package\'s own typecheck config ' +
            '(see packages/core/tsconfig.tests.json), or name it in NO_TESTS_CONFIG in this ' +
            'file with the reason it stays uncompiled.\n'
    );
    process.exit(1);
}

// ── 2. EVERY PROJECT COMPILES ────────────────────────────────────────────────────────────────
const projects = withTests
    .filter((name) => existsSync(join(PACKAGES, name, 'tsconfig.tests.json')))
    .map((name) => ({ name, config: join(PACKAGES, name, 'tsconfig.tests.json') }));

console.log(
    `Type-checking the test files of ${projects.length} package(s), one at a time.\n` +
        'Sibling packages resolve through each package\'s own `paths`, which name `.tsbuild` — ' +
        'run `npm run typecheck` first on a clean checkout.\n'
);

const failed = [];
for (const { name, config } of projects) {
    const result = spawnSync(
        'npx',
        ['tsc', '-p', relative(ROOT, config), '--pretty', 'false'],
        { cwd: ROOT, encoding: 'utf8' }
    );
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
    if (result.status === 0) {
        console.log(`✓ ${name}`);
    } else {
        const count = (output.match(/error TS\d+:/g) ?? []).length;
        console.log(`✖ ${name}${count > 0 ? ` — ${count} error(s)` : ''}`);
        if (output !== '') console.log(`${output}\n`);
        failed.push(name);
    }
}

if (failed.length > 0) {
    console.error(
        `\n✖ ${failed.length} of ${projects.length} package(s) failed: ${failed.join(', ')}\n`
    );
    process.exit(1);
}

console.log(`\n✓ the test files of all ${projects.length} packages type-check`);
