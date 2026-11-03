#!/usr/bin/env node
// THE GATE THAT GUARDS THE GATES — nothing in this repository may be a check that nothing runs.
//
// Run:  node scripts/check-gates.mjs   (or `npm run check:gates`)
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS, AND IT IS NOT HYPOTHETICAL.
//
// This repository has, repeatedly, written a check and then not wired it to anything:
//
//   · `test:packed` asserted the API of a renderer that had been DELETED. It could not have passed
//     since the deletion, so the release path was unguarded and nobody noticed.
//   · `check-bundle-size.mjs` was wired into NOTHING, failed on 4 of 7 packages, and budgeted raw
//     bytes of an unminified file rather than what a page pays.
//   · `graph:check` was invoked by nothing, and its no-circular rule used the wrong filter, so it
//     reported violations no one read.
//   · `atlas:verify` and `isControl` — same shape.
//
// Every one was found by accident, months apart, by somebody looking at something else. The
// pattern is not carelessness about any single check; it is that A CHECK'S WIRING IS INVISIBLE.
// The file exists, it looks maintained, it has a header explaining what it protects — and no
// process on earth executes it.
//
// A comment claiming a property is not a check of it. That sentence is already written in
// `check-llms.mjs` about the digest, and this file is the same sentence applied to the checks
// themselves.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE THREE QUESTIONS IT ASKS.
//
//   1. Is every `*.test.ts` on disk actually EXECUTED by the default test run? A test file the
//      runner does not collect is the purest form of this defect: it is green because it never
//      ran, and `Tests 1959 passed` counts it as absent rather than as skipped.
//   2. Is every `scripts/check-*.mjs` REACHABLE from an npm script? A gate nobody can invoke by
//      name is a gate nobody invokes.
//   3. Is every gate-shaped npm script IN the release chain? Being invocable and being invoked are
//      different things, and `release:check` is the only thing that runs before a publish.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// DELIBERATE EXCEPTIONS ARE NAMED HERE, INDIVIDUALLY, WITH THE REASON — never as a pattern.
// A pattern would re-open the hole this file closes: the next orphan would match it silently.
import { readFileSync, readdirSync, existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Scripts that are NOT gates and must not be required to sit in `release:check`.
 * Each entry says what it is instead.
 */
const NOT_A_GATE = {
    'draft-changeset.mjs': 'an authoring helper — it WRITES a changeset, it does not check one',
    'generate-graph.mjs': 'a generator; its output is what `graph:check` then validates',
    'publish-order.mjs': 'computes an order for the publish scripts; running it asserts nothing',
    'exo-error-codes.json': 'the error-code registry — data, not a script',
};

/**
 * Gate scripts that are reachable by name but deliberately OUTSIDE `release:check`, with the
 * reason. Keep this list short and argued; every entry is a hole somebody chose.
 */
const OUTSIDE_RELEASE = {
    'release:check': 'IS the chain. It matches the name rule because the rule is about names.',
};

/** Test directories a separate vitest config runs, with the npm script that runs it. */
const RUN_BY_OWN_CONFIG = {
    'packages/react-compat-libraries/': 'test:react-libraries',
};

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const scripts = pkg.scripts ?? {};
const problems = [];
const notes = [];

// ── 1. EVERY TEST FILE ON DISK IS COLLECTED BY THE RUNNER ────────────────────────────────────
//
// Asked by running the collector itself rather than by re-implementing its include/exclude rules.
// Re-implementing them is how this check would come to disagree with the thing it checks.
const onDisk = [];
const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.tsbuild')
            continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.test\.tsx?$/.test(entry.name)) onDisk.push(relative(ROOT, full));
    }
};
walk(join(ROOT, 'packages'));

const listed = spawnSync('npx', ['vitest', 'list', '--maxWorkers=2'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 600000,
});
if (listed.status !== 0) {
    problems.push(
        'could not ask vitest which files it collects — `vitest list` ' +
            (listed.signal ? `was killed by ${listed.signal}` : `exited ${listed.status}`) +
            (listed.error ? ` (${listed.error.message})` : '') +
            ', so question 1 was not answered:\n' +
            [listed.stderr, listed.stdout]
                .join('\n')
                .split('\n')
                .filter((line) => line.trim() !== '' && !line.startsWith('npm warn'))
                .slice(-8)
                .join('\n')
    );
} else {
    const collected = new Set(
        [...listed.stdout.matchAll(/([\w./-]+\.test\.tsx?)/g)].map((m) => m[1])
    );
    const runElsewhere = (f) =>
        Object.entries(RUN_BY_OWN_CONFIG).some(
            ([dir, script]) =>
                f.startsWith(dir) &&
                scripts[script] !== undefined &&
                (scripts['release:check'] ?? '').includes(script)
        );
    const orphans = onDisk.filter((f) => !collected.has(f) && !runElsewhere(f));
    if (orphans.length > 0) {
        problems.push(
            `${orphans.length} test file(s) exist on disk and are NOT collected by the default ` +
                'run. They are not skipped — they are absent, so nothing they assert is being ' +
                'asserted:\n' +
                orphans.map((f) => `    ${f}`).join('\n')
        );
    } else {
        notes.push(`${onDisk.length} test files on disk, all ${onDisk.length} collected`);
    }
}

// ── 2. EVERY CHECK SCRIPT IS REACHABLE BY NAME ───────────────────────────────────────────────
const allScriptText = Object.values(scripts).join(' \n ');
const scriptFiles = readdirSync(join(ROOT, 'scripts')).filter(
    (n) => n.endsWith('.mjs') || n.endsWith('.js')
);
const unreachable = scriptFiles.filter(
    (n) => !(n in NOT_A_GATE) && !allScriptText.includes(n)
);
if (unreachable.length > 0) {
    problems.push(
        `${unreachable.length} script(s) in scripts/ are named by NO npm script, so there is no ` +
            'way to run them by name and nothing does:\n' +
            unreachable.map((n) => `    scripts/${n}`).join('\n') +
            '\n  Wire each into package.json, or name it in NOT_A_GATE in this file with the ' +
            'reason it is not a gate.'
    );
} else {
    notes.push(`${scriptFiles.length} scripts in scripts/, all reachable by name`);
}

// ── 3. EVERY GATE-SHAPED SCRIPT IS IN THE RELEASE CHAIN ──────────────────────────────────────
//
// "Gate-shaped" is decided by NAME, on purpose: a script called `check:*` or `*:check` or
// `*:verify` has announced what it is. Guessing from its body would let a renamed gate slip out.
const release = scripts['release:check'] ?? '';
if (release === '') {
    problems.push('there is no `release:check` script — the chain this file guards does not exist');
} else {
    const gateNames = Object.keys(scripts).filter(
        (n) => /^check:/.test(n) || /:(check|verify)$/.test(n)
    );
    const missing = gateNames.filter(
        (n) => !(n in OUTSIDE_RELEASE) && !release.includes(n)
    );
    if (missing.length > 0) {
        problems.push(
            `${missing.length} gate-shaped script(s) are invocable and are NOT in ` +
                '`release:check`, so nothing runs them before a publish:\n' +
                missing.map((n) => `    npm run ${n}`).join('\n') +
                '\n  Add each to the chain, or name it in OUTSIDE_RELEASE in this file with the ' +
                'reason it belongs outside.'
        );
    } else {
        notes.push(`${gateNames.length} gate-shaped scripts, all in release:check`);
    }
}

// ── report ───────────────────────────────────────────────────────────────────────────────────
for (const n of notes) console.log(`✓ ${n}`);

if (problems.length > 0) {
    console.error(`\n✖ ${problems.length} unrun check(s):\n`);
    for (const p of problems) console.error(`  ${p}\n`);
    console.error(
        'A check nothing runs is worse than no check: it reads as protection and provides none.\n'
    );
    process.exit(1);
}

console.log('✓ every check in this repository is reachable and run');
