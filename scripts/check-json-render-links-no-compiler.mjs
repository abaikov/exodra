// WHAT SHIPPING SCHEMAS INSTEAD OF DECLARATIONS IS WORTH, AND WHAT IT IS WORTH TODAY.
//
// MEASURED with esbuild (bundle, minify, NODE_ENV=production, gzip -9) on one page that renders a
// three-port row:
//
//     BEFORE, declaration path                   31 473 B raw   10 288 B gz
//     BEFORE, JSON path                          31 737 B raw   10 291 B gz  ← three bytes WORSE
//     AFTER,  declaration path                   31 693 B raw   10 307 B gz
//     AFTER,  JSON path                          18 241 B raw    6 242 B gz  ← −4 049 B, −39.3%
//
// What was in the way was ONE import: `EXO_DOM_NODE_VOCABULARY` named `exoDomSchemaOf`, because
// `one`/`list`/`build` compile the declaration of the CHILD they are handed, and every instance
// carries that vocabulary — so every page linked the compiler whatever its own schemas came from.
// `exoDomSchemaForChild` reaches it through the BACKEND instead, which is the pack, and the 19
// bytes the compiling page gained are that indirection.
//
// SO THIS GATE CHECKS TWO THINGS, and only the first is a property the library has today:
//
//  1. STRICT — the two modules a build-compiled page uses for its own schemas reach no compiler.
//     That is what the split bought and it is worth keeping; a new import would take it away.
//  2. PAGE — from what a page actually imports, the compiler IS reachable, by exactly ONE chain.
//     The chain is written down here, and a SECOND one failing this gate is the point: the day
//     somebody cuts the known edge, this half goes green and the gap is closed by measurement
//     rather than by someone remembering to look.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

const STRICT_ENTRIES = [
    'packages/dom/src/dom/createExoDomSchema.ts',
    'packages/dom/src/dom/mountExoSchema.ts',
];

// What a page must import to have a backend at all: the writers, the events and the record
// factories live on this class and nowhere else.
const PAGE_ENTRIES = [...STRICT_ENTRIES, 'packages/dom/src/dom/ExoDomBackend.ts'];

// NOW TRUE OF A PAGE AND NOT ONLY OF TWO MODULES, which is what this gate was written to wait for:
// nothing a page imports reaches the compiler unless the page composes `withExoCompiler`.

const COMPILER = 'packages/dom/src/dom/compileExoDomSchema.ts';
const COMPILER_DOOR = 'packages/dom/src/dom/exoDomSchemaOf.ts';

const SPECIFIERS = /(?:^|\n)\s*(?:import|export)(?!\s+type\s)([^;]*?)from\s*['"](\.[^'"]*)['"]/g;

function resolveSpecifier(fromFile, specifier) {
    const base = resolve(dirname(fromFile), specifier);
    for (const candidate of [base + '.ts', base + '.tsx', join(base, 'index.ts')]) {
        if (existsSync(candidate)) return candidate;
    }
    return null;
}

/** Every module reachable from these entries, and who first reached each one. */
function reachFrom(entries) {
    const reached = new Set();
    const importers = new Map();
    const queue = entries.map((entry) => resolve(root, entry));
    for (const entry of queue) reached.add(entry);
    while (queue.length > 0) {
        const file = queue.shift();
        const source = readFileSync(file, 'utf8');
        for (const match of source.matchAll(SPECIFIERS)) {
            const next = resolveSpecifier(file, match[2]);
            if (next === null) continue;
            (importers.get(next) ?? importers.set(next, []).get(next)).push(file);
            if (reached.has(next)) continue;
            reached.add(next);
            queue.push(next);
        }
    }
    return { reached, importers };
}

const short = (abs) => abs.slice(root.length + 1);

let failed = false;

// 1. STRICT.
{
    const { reached } = reachFrom(STRICT_ENTRIES);
    const found = [COMPILER, COMPILER_DOOR]
        .map((rel) => resolve(root, rel))
        .filter((abs) => reached.has(abs));
    if (found.length > 0) {
        console.error(
            'check:json-render-links-no-compiler: the two build-time-schema entries now REACH ' +
                found.map(short).join(' and ') +
                ', which is the one property the schema/declaration split bought. ' +
                'Whatever import was just added has to go through a pack instead.'
        );
        failed = true;
    } else {
        console.log(
            'check:json-render-links-no-compiler: STRICT ok — ' +
                reached.size +
                ' modules from the two JSON entries, no compiler among them.'
        );
    }
}

// 2. PAGE.
{
    const { reached, importers } = reachFrom(PAGE_ENTRIES);
    const door = resolve(root, COMPILER_DOOR);
    const who = reached.has(door) ? (importers.get(door) ?? []).map(short) : [];
    // The pack is the ONE module allowed to name the compiler: composing it is how a page says it
    // wants one. Anything else that names it puts the compiler back in every page.
    const unexpected = who.filter((importer) => !importer.endsWith('withExoCompiler.ts'));
    if (unexpected.length > 0) {
        console.error(
            'check:json-render-links-no-compiler: a page reaches the compiler again, through ' +
                unexpected.join(', ') +
                ". That is worth 4 049 B gz on the measured page — it is how `one`/`list`/`build` " +
                'used to pay for it. Reach the compiler through the backend, as ' +
                '`exoDomSchemaForChild` does.'
        );
        failed = true;
    } else {
        console.log(
            'check:json-render-links-no-compiler: PAGE ok — nothing a page imports reaches the ' +
                'compiler; it arrives only by composing withExoCompiler.'
        );
    }
}

if (failed) process.exit(1);
