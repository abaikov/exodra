#!/usr/bin/env node
// THE DETACHMENT GATE — a page that never names the computed system must not carry one byte of it.
//
// Run:  node scripts/check-computed-shake.mjs   (or `npm run check:computed-shake`)
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT IT ASKS, AND WHY A SIZE NUMBER ALONE COULD NOT ASK IT
//
// `check:size` budgets a whole package. It cannot say WHICH page pays for WHAT, so a subsystem
// that was supposed to be optional can be welded into every application and the only symptom is
// that one number is a bit bigger than somebody expected. That is how this was measured the first
// time — by hand, once: a machine-free page bundled to 14 130 gzipped bytes and the
// same page with a machine to 17 327. A number taken by hand once is not a gate; it is an anecdote
// that stops being true the moment somebody adds an import, and nothing tells them.
//
// So this asks the question MECHANICALLY and by MODULE IDENTITY rather than by byte count:
//
//     bundle a page that uses ONLY the imperative machine
//     ask esbuild which source files contributed bytes to that bundle
//     assert that NOT ONE of them belongs to the computed system
//
// The byte figures are still printed, because they are what a reader wants, but they are
// INFORMATION and not the assertion. A rename, a minifier change or a comment cannot move the
// assertion; only an import can, which is exactly the event this exists to catch.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT "THE COMPUTED SYSTEM" IS, AND WHY THE LIST IS BY FILE AND NOT BY SYMBOL
//
// A symbol list would have to be matched against bundled output, which minification renames and
// which a comment can spoof. `esbuild --metafile` reports the INPUT FILES whose bytes reached the
// output, with the byte count each contributed, so the membership question is answered by the
// bundler itself rather than re-implemented here by grep.
//
// The list below is by BASENAME, deliberately, so that moving these modules into their own
// directory — which is the whole point of the exercise — neither breaks this gate nor silently
// switches it off. A file renamed out of the list is a decision somebody makes in this file, in
// the open, with the reason beside it.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE EXTRACTION LANDED, AND THAT CHANGES WHAT THIS GATE IS ALLOWED TO CLAIM.
//
// It was written to be RED. `exoMachine`'s `done()` called `compileExoMachine` and
// `chainExoMachineWakes` unconditionally, on the one path every machine takes, so an imperative
// page linked the inversion, the chain table and the commit whether or not it declared a single
// derivation. The nineteen modules are now `packages/computed/src`, a package of their own, and
// the seam is the package boundary: `@exodra/core` may not import `@exodra/computed` at all —
// `.dependency-cruiser.cjs` is where that direction is enforced.
//
// SO THE ORIGINAL ASSERTION IS NOW MOSTLY STRUCTURAL, AND SAYING SO IS THE POINT. A page built
// against a `@exodra/core` that cannot name a computed module will not carry one, and a gate that
// announced that discovery would be flattering itself. It is kept because it is exactly what
// fails the day somebody adds the import back, and because the byte figures it prints are what a
// reader wants. What it must NOT be read as is evidence of tree-shaking.
//
// WHAT IS STILL A LIVE QUESTION, and is assertion 3 below: THE BARREL. `@exodra/computed`'s
// `src/index.ts` re-exports nineteen modules from one file, and the computed page names four of
// them. Whether the other fifteen shake out is a property of the code, not of the package
// boundary, and it can regress on any commit that gives one of them a side effect.
//
// AND ASSERTION 2 IS NOW BY PATH, NOT BY NAME. The old `unclassified` check only looked at files
// whose basename contained `machine`, so a new computed module called anything else — a derive
// slot, a mark table — reached the imperative page in neither table and was reported by nothing.
// Membership is now "does this file live in `packages/computed/src`", which no naming choice can
// slip past.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHY IT BUNDLES FROM SOURCE AND NOT FROM `dist/`
//
// `dist/index.js` is ONE file, so a metafile taken against it reports one input and answers
// nothing about which module got in. Bundling `packages/core/src/index.ts` and
// `packages/computed/src/index.ts` directly gives esbuild the real module graph, which is the
// graph the assertion is about — and it means this needs nothing built and can run early, beside
// the other structural checks, instead of after `build:all`.
//
// WHAT THAT COSTS IN HONESTY, STATED: the bytes printed here are esbuild's minified output of the
// SOURCE tree, not tsup's `dist/exodra.esm.js`, so they will not match `check:size` to the byte.
// They are comparable to EACH OTHER, which is the only comparison this file makes.

import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

// ESBUILD IS NOT A DECLARED ROOT DEPENDENCY AND IS NOT ADDED AS ONE, DELIBERATELY. It is hoisted
// here by `tsup`, which every package in this repository builds with, so it is present in any tree
// that can run `npm run build` at all. Adding it to `devDependencies` would require regenerating
// `package-lock.json`, and this repository publishes 22 packages on a push to master — a lock
// touched for a gate is not a trade anybody agreed to. If it is ever missing, this says so in one
// sentence instead of throwing a module-resolution stack.
let build;
try {
    ({ build } = await import('esbuild'));
} catch {
    console.error(
        '❌ check:computed-shake: esbuild is not resolvable from the repository root.\n' +
            '   It is expected here as a hoisted dependency of tsup. Run `npm install` at the\n' +
            '   root, or add esbuild to devDependencies deliberately, lock file and all.'
    );
    process.exit(1);
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CORE_ENTRY = resolve(ROOT, 'packages/core/src/index.ts');
const COMPUTED_ENTRY = resolve(ROOT, 'packages/computed/src/index.ts');
// `@exodra/core` imports the context chain, and this gate runs BEFORE `build:all` — without the
// alias esbuild reaches for `packages/context/dist`, which need not exist yet.
const CONTEXT_ENTRY = resolve(ROOT, 'packages/context/src/index.ts');
// The directory membership test behind assertion 2. Compared against esbuild's metafile keys,
// which are repository-relative and always `/`-separated whatever the platform.
const COMPUTED_SRC = 'packages/computed/src/';

/**
 * THE COMPUTED SYSTEM, FILE BY FILE — every module that exists because a value can be DERIVED from
 * a field, and nothing else. Each entry carries the sentence that puts it here, because a list
 * whose membership is obvious to its author is a list nobody else can correct.
 */
const COMPUTED = {
    'withExoComputedMachine.ts': 'the decoration itself — field, mounted, derive, fill, effectOn',
    'compileExoMachine.ts': 'the field→slots inversion; nothing without derivations has one',
    'commitExoMachine.ts': 'the walk over the pending word — the pending word is computed',
    'chainExoMachineWakes.ts': 'one composed closure per field that wakes something',
    'fillExoMachineDerivations.ts': 'the initial derivation pass',
    'runExoMachineSlots.ts': 'consumes the BODY BITS of the pending word',
    'exoMachineSettle.ts': 'chooses between two commits; both are computed',
    'bindExoMachineReads.ts': "binds a derivation's declared readers into its call",
    'exoMachineField.ts': 'the flat field descriptor — a bit and a row of the mark table',
    'exoComputed.ts': 'the flat derivation descriptor',
    'exoBody.ts': 'the flat descriptor of a body slot WITH A DEPENDENCY LIST',
    'exoFieldBit.ts': "a field's bit in the pending word",
    'exoBoundTransition.ts': 'a per-instance transition over a per-instance program',
    'EXO_HOLD_VOCABULARY.ts': 'batching by PARKING the wake table — there is nothing to park otherwise',
    'exoTransition.ts': 'a transition exists to SPEND the pending word; an imperative one has none',
    'EXO_MACHINE_LIMIT.ts': 'the 31-bit ceiling OF THE PENDING WORD',
    'EXO_MOUNTED.ts': "the name of `b.mounted()`, which is a FIELD",
    'ExoWiringBlock.ts': 'the same declarations made per instance, inside a wire',
    'exoWiring.ts': 'the door onto that block',
};

/**
 * THE MODULES OF `@exodra/computed` THAT THE COMPUTED PAGE NEVER NAMES — assertion 3, and the one
 * question in this file that the package boundary does not already answer. The page imports
 * `withExoComputedMachine`; everything reachable from it is expected in
 * its bundle and is not listed here. These four are reachable only from the BARREL, so their
 * presence would mean the barrel stopped shaking — a side effect on a module, or one of them
 * wired into the default path.
 */
const UNNAMED_BY_THE_PAGE = {
    'EXO_HOLD_VOCABULARY.ts': 'batching; a page that never holds a transition must not link the park',
    'exoBoundTransition.ts': 'per-instance transitions, reachable only through exoWiring',
    'exoWiring.ts': 'the per-instance door; the page declares at module load instead',
    'ExoWiringBlock.ts': 'what that door opens onto',
};

/**
 * THE TWO PAGES. They are written to a temp directory rather than kept in `packages/` so that
 * nothing here joins the build graph, the lint globs or the published surface — this gate's only
 * artefact is this file.
 *
 * THE IMPERATIVE PAGE NAMES NOT ONE THING FROM THE LIST ABOVE. That is the whole fixture: no
 * `b.field`, no `b.derive`, no `b.fill`, no `b.mounted`, no dependency list. Its transitions write
 * their port directly and its state is the cache slot.
 */
const IMPERATIVE = `
import {
    composeExoMachine,
    createExoMachine,
    createExoSchema,
    withExoHandlers,
} from '@exodra/core';

const SCHEMA = createExoSchema((b) => {
    let label;
    let click;
    b.el('button', { class: 'counter' }, (btn) => {
        click = btn.eventPort('click');
        label = btn.textPort();
    });
    return { label, click };
});
const P = SCHEMA.ports;

export const bump = (c) => {
    c.state.n += 1;
    c.text(P.label, String(c.state.n));
};

export const APP = composeExoMachine(
    createExoMachine(SCHEMA, { createInitialState: () => ({ n: 0 }) }),
    (m) => withExoHandlers(m, (on) => on(P.click, (c) => bump(c))),
);
`;

/**
 * THE COMPUTED PAGE — the same component said the other way, so the printed delta is the price of
 * the system rather than the price of two unrelated programs.
 *
 * IT NAMES `b.effectOn` so that the delta below carries the slot runner and the engine's re-run
 * door rather than the derivation walk alone.
 */
const COMPUTED_PAGE = `
import {
    composeExoMachine,
    createExoMachine,
    createExoSchema,
    withExoHandlers,
} from '@exodra/core';
import { withExoComputedMachine } from '@exodra/computed';

const SCHEMA = createExoSchema((b) => {
    let label;
    let click;
    b.el('button', { class: 'counter' }, (btn) => {
        click = btn.eventPort('click');
        label = btn.textPort();
    });
    return { label, click };
});
const P = SCHEMA.ports;

export const APP = composeExoMachine(
    createExoMachine(SCHEMA),
    (m) => withExoComputedMachine(m, (b) => {
        const n = b.field(0);
        const live = b.mounted();
        b.derive(P.label, [n, live], (n, live) => (live ? String(n) : ''));
        const bump = b.transition((c) => n.set(c, n.get(c) + 1));
        b.effectOn([n], (c) => {
            const id = setTimeout(() => bump(c), n.get(c));
            return () => clearTimeout(id);
        });
        return { bump };
    }),
    (m) => withExoHandlers(m, (on) => on(P.click, (c) => m.transitions.bump(c))),
);

export const { bump } = APP.transitions;
`;

const dir = mkdtempSync(join(tmpdir(), 'exo-shake-'));
const problems = [];
const notes = [];

/** Bundle one page and report what got in, by file, with the bytes each contributed. */
const bundleOne = async (name, source) => {
    const entry = join(dir, `${name}.ts`);
    writeFileSync(entry, source, 'utf8');
    const result = await build({
        entryPoints: [entry],
        bundle: true,
        write: false,
        format: 'esm',
        platform: 'browser',
        target: 'es2020',
        minify: true,
        metafile: true,
        absWorkingDir: ROOT,
        logLevel: 'silent',
        define: { 'process.env.NODE_ENV': '"production"' },
        alias: {
            '@exodra/core': CORE_ENTRY,
            '@exodra/computed': COMPUTED_ENTRY,
            '@exodra/context': CONTEXT_ENTRY,
        },
    });
    const out = Object.values(result.metafile.outputs)[0];
    const bytes = result.outputFiles[0].contents;
    return {
        gz: gzipSync(Buffer.from(bytes), { level: 9 }).length,
        min: bytes.length,
        // ONLY THE FILES THAT CONTRIBUTED BYTES. A module esbuild parsed and then shook away is
        // not in the page and must not be reported as if it were.
        files: Object.entries(out.inputs)
            .filter(([, v]) => v.bytesInOutput > 0)
            .map(([path, v]) => [basename(path), v.bytesInOutput]),
        // The same set kept by PATH, for the directory-membership assertion. A basename cannot
        // answer "which package is this from" and two packages may legitimately share one.
        paths: Object.entries(out.inputs)
            .filter(([, v]) => v.bytesInOutput > 0)
            .map(([path, v]) => [path.split('\\').join('/'), v.bytesInOutput]),
    };
};

let imperative;
let computed;
try {
    imperative = await bundleOne('imperative', IMPERATIVE);
    computed = await bundleOne('computed', COMPUTED_PAGE);
} catch (error) {
    // A FIXTURE THAT NO LONGER BUNDLES IS THE GATE SPEAKING, NOT THE GATE BREAKING. The surface it
    // is written against moved; say so with the compiler's own words and fail.
    console.error(
        '❌ check:computed-shake — a fixture page no longer builds against @exodra/core and ' +
            '@exodra/computed.'
    );
    console.error('   The gate is written against a named surface; if that surface moved, move the');
    console.error('   fixture in scripts/check-computed-shake.mjs with it.\n');
    console.error(String(error.message ?? error).split('\n').slice(0, 20).join('\n'));
    rmSync(dir, { recursive: true, force: true });
    process.exit(1);
}
rmSync(dir, { recursive: true, force: true });

// ── THE ASSERTION ────────────────────────────────────────────────────────────────────────────
const leaked = imperative.files.filter(([f]) => f in COMPUTED);
if (leaked.length > 0) {
    problems.push(
        `${leaked.length} module(s) of the COMPUTED system are in a page that declares no ` +
            'derivation, no fill and no field. The engine is carrying them:\n' +
            leaked
                .map(([f, b]) => `    ${String(b).padStart(6)} B  ${f}\n              ${COMPUTED[f]}`)
                .join('\n')
    );
} else {
    notes.push(`the imperative page carries none of the ${Object.keys(COMPUTED).length} computed modules`);
}

const strayed = imperative.paths.filter(([p]) => p.includes(COMPUTED_SRC));
if (strayed.length > 0) {
    problems.push(
        `${strayed.length} file(s) from packages/computed/src reached a page that imports only ` +
            '@exodra/core, so core is naming the package it was split from:\n' +
            strayed.map(([p, b]) => `    ${String(b).padStart(6)} B  ${p}`).join('\n')
    );
} else {
    notes.push('no file of packages/computed/src reaches a page built against @exodra/core alone');
}

const shaken = computed.files.filter(([f]) => f in UNNAMED_BY_THE_PAGE);
if (shaken.length > 0) {
    problems.push(
        `${shaken.length} module(s) of @exodra/computed reached a page that never names them. ` +
            "The barrel re-exports nineteen modules from one file and the page imports four; " +
            'these came with them:\n' +
            shaken
                .map(
                    ([f, b]) =>
                        `    ${String(b).padStart(6)} B  ${f}\n              ` +
                        UNNAMED_BY_THE_PAGE[f]
                )
                .join('\n')
    );
} else {
    notes.push(
        `the computed page carries none of the ${Object.keys(UNNAMED_BY_THE_PAGE).length} ` +
            'modules it never names — the barrel shakes'
    );
}

// ── THE INFORMATION ──────────────────────────────────────────────────────────────────────────
console.log('check:computed-shake — what one page pays for the computed system\n');
console.log(`  imperative page   ${String(imperative.gz).padStart(6)} B gz   (${imperative.min} B min)`);
console.log(`  computed page     ${String(computed.gz).padStart(6)} B gz   (${computed.min} B min)`);
console.log(
    `  the system        ${String(computed.gz - imperative.gz).padStart(6)} B gz   ` +
        '← what the imperative page must not be paying\n'
);

if (problems.length > 0) {
    console.error('❌ check:computed-shake\n');
    for (const p of problems) console.error(`  ${p}\n`);
    console.error(
        '  The extraction has landed, so this is a REGRESSION and not a work item. See the\n' +
            '  header of this file for which of the three assertions above is which.\n'
    );
    process.exit(1);
}

for (const n of notes) console.log(`  ✓ ${n}`);
console.log('\n✅ check:computed-shake — the computed system detaches.');
