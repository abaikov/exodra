// PLUGIN-PRICE GATE — every composable plugin must have a measured price somewhere.
//
// Run:  node scripts/check-plugin-prices.mjs   (or `npm run check:plugin-prices`)
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS.
//
// Every composable pack is sold as the answer to a named problem — the walking reconciler for
// surviving a DOM that an extension or a translator mutated, the keyed list for data whose identity
// does not survive a refetch, the node bank for a page that builds and destroys the same shape. A
// user cannot find out what any of them costs unless some axis builds a participant out of it.
// Composing a pack is one line, and the price of that line is what makes it a choice.
//
// WHO IS PRICED AND WHO IS NOT IS PRINTED BY THE RUN, NEVER LISTED IN THIS HEADER. A list of pack
// names written here does not survive a rename: it goes on naming packs that no longer exist while
// the real ones go unseen, which is the same silent drift the gate exists to catch one level down.
//
// THE POINT OF A PLUGIN SYSTEM IS THAT A USER CHOOSES. A choice with no price is not a choice; it
// is a suggestion. This gate exists to make "a plugin nobody measured" impossible.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT IT CHECKS, AND WHAT IT DELIBERATELY DOES NOT.
//
// IT CHECKS THAT AN AXIS NAMES THE PLUGIN. It does not check that the axis is good, that the
// number is meaningful, or that the run was recorded — a gate that tried would be re-implementing
// the axes' own honesty machinery, which already refuses regions under the clock, prints its own
// resolution and states what it did not measure. What this gate closes is the hole one level up:
// the plugin nobody thought to measure at all.
//
// IT IS A SOURCE GREP, NOT A RUN. It reads `packages/benchmarks/src` and asks whether the plugin's
// exported name appears there outside a comment. That is a weaker claim than "priced" and it is
// the honest one: it says somebody built a participant out of it.
//
// A PLUGIN MAY BE EXEMPTED, INDIVIDUALLY AND WITH A REASON, in `ACKNOWLEDGED` below — never as a
// blanket, and never as a wildcard. The pattern is `check-doc-citations.mjs`'s and it is here for
// the same reason: an exemption somebody had to write down and justify is a decision; a silently
// passing gate is not.
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
// The three packages that ship a backend a pack could decorate. `packages/string` and
// `packages/term` hold none today; they are swept anyway so that the first one to arrive there is
// discovered rather than waiting for somebody to remember this file.
const PLUGIN_DIRS = [
    join(ROOT, 'packages/dom/src'),
    join(ROOT, 'packages/string/src'),
    join(ROOT, 'packages/term/src'),
];
const BENCH_SRC = join(ROOT, 'packages/benchmarks/src');

/**
 * Plugins that ship without a price, each with the reason it may.
 *
 * EMPTY IS THE INTENDED STATE. A name here is a debt, not a category.
 */
const ACKNOWLEDGED = new Map([
    // e.g. ['withExoSomething', 'reason it cannot be measured, written by whoever exempted it'],
]);

/** Every `.ts`/`.tsx` under a directory, tests excluded — a test is not a measurement. */
function sources(dir) {
    const out = [];
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) {
            out.push(...sources(full));
            continue;
        }
        if (!/\.tsx?$/.test(name)) continue;
        if (/\.test\.tsx?$/.test(name)) continue;
        out.push(full);
    }
    return out;
}

/**
 * THE EXPORTED NAMES THIS GATE CONSIDERS A COMPOSABLE PLUGIN.
 *
 * A pack is a decorator a caller wraps a backend in, and every one of them is exported as
 * `withExo…`. `EXTRA` holds the shipped values a caller composes by hand instead — spelled
 * `createExo…` rather than `withExo…`, and exactly the kind of thing this gate exists to catch.
 *
 * DISCOVERY IS BY EXPORT AND NOT BY A LIST, and `EXTRA` is the exception that proves it: it held
 * `exoDelegatedEvents` and `attachExoKeyedList`, and BOTH had become names no package exports —
 * one renamed, one deleted with the keyed list. So the gate was demanding a price for a ghost while
 * counting a corpse as priced. Anything added here is checked against the exports below.
 */
const PACK_EXPORT = /^export (?:const|function) (withExo\w+)\b/gm;
const EXTRA_EXPORT = /^export (?:const|function) (createExoDelegatedEvents)\b/gm;

const EXTRA_EXPECTED = ['createExoDelegatedEvents'];

function pluginNames() {
    const found = new Set();
    const extraSeen = new Set();
    for (const file of PLUGIN_DIRS.flatMap(sources)) {
        const text = readFileSync(file, 'utf8');
        for (const m of text.matchAll(EXTRA_EXPORT)) {
            found.add(m[1]);
            extraSeen.add(m[1]);
        }
        for (const m of text.matchAll(PACK_EXPORT)) {
            found.add(m[1]);
        }
    }
    for (const name of EXTRA_EXPECTED) {
        if (extraSeen.has(name)) continue;
        throw new Error(
            `check-plugin-prices: EXTRA_EXPECTED names \`${name}\`, and no package under ` +
                `${PLUGIN_DIRS.map((d) => relative(ROOT, d)).join(', ')} exports it. The list went ` +
                'stale, which is the drift this gate exists to catch one level down. Fix the name ' +
                'or drop the entry.'
        );
    }
    return [...found].sort();
}

/** Lines that are not comments — a plugin NAMED in prose is not a plugin somebody measured. */
function mentionsOutsideComments(text, name) {
    for (const raw of text.split('\n')) {
        const line = raw.trim();
        if (line.startsWith('//') || line.startsWith('*') || line.startsWith('/*')) continue;
        if (line.includes(name)) return true;
    }
    return false;
}

const benchFiles = sources(BENCH_SRC);
const offences = [];
const priced = [];

for (const name of pluginNames()) {
    const axes = benchFiles
        .filter((f) => mentionsOutsideComments(readFileSync(f, 'utf8'), name))
        .map((f) => relative(BENCH_SRC, f));
    if (axes.length > 0) {
        priced.push([name, axes]);
        continue;
    }
    const why = ACKNOWLEDGED.get(name);
    if (why !== undefined) {
        priced.push([name, [`ACKNOWLEDGED — ${why}`]]);
        continue;
    }
    offences.push(name);
}

console.log('');
for (const [name, axes] of priced) {
    console.log(`  ${name.padEnd(28)} ${axes.join(', ')}`);
}

if (offences.length > 0) {
    console.log('');
    for (const name of offences) {
        console.error(
            `  ✖ ${name} is composable and no axis under packages/benchmarks/src builds a\n` +
                '    participant out of it, so nobody can find out what composing it costs.\n' +
                '    Add a participant to an axis, or write the reason it cannot be measured into\n' +
                '    ACKNOWLEDGED in scripts/check-plugin-prices.mjs — individually, with the reason.'
        );
    }
    console.log('');
    console.error(
        `${offences.length} plugin(s) ship without a price. Composing one is a line of code; the ` +
            'price of that line is what makes it a choice rather than a suggestion.'
    );
    process.exit(1);
}

console.log('');
console.log(`✓ all ${priced.length} composable plugins are named by at least one axis`);
