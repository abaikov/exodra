#!/usr/bin/env node
/**
 * EVERY `packages/**\/src/**.ts` PATH THE DOCS NAME HAS TO BE A FILE THAT EXISTS.
 *
 * A pointer is the one part of a doc page a reader is meant to follow, and it is the part nothing
 * checked: `check-docs` verifies imported NAMES, `check-doc-examples` compiles fenced TypeScript,
 * and neither looks at a path written in prose. 57 of the 109 paths the docs named were gone — a
 * folder move, a kebab-to-export rename, or a deleted plugin — and every one of them read as a
 * working citation.
 *
 * A RATCHET, NOT A WALL. 45 of those name files that no longer exist IN ANY FORM: deleted plugins
 * (exo-keyed-list, exo-children-walk, exo-node-bank, exo-binding), the kebab-case generation of
 * `@exodra/dom`, types that were folded away. Those are prose to rewrite, not paths to repair, so
 * they are listed in `doc-pointers-known-dead.json` and the gate stays green on them. It fails on
 * a dead pointer that is NOT on the list — new rot — and it fails when a listed pointer comes back
 * to life, which is how the list is kept from going stale: fix the prose, strike the line.
 */
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const LIST = join(root, 'scripts/doc-pointers-known-dead.json');
const POINTER = /packages\/[a-z-]+\/src\/[A-Za-z0-9/._-]+\.tsx?/g;

const pages = [];
const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.md')) pages.push(full);
    }
};
walk(join(root, 'docs-site/docs'));
pages.push(join(root, 'README.md'));

const where = new Map();
for (const page of pages) {
    for (const hit of readFileSync(page, 'utf8').matchAll(POINTER)) {
        if (!where.has(hit[0])) where.set(hit[0], new Set());
        where.get(hit[0]).add(page.slice(root.length + 1));
    }
}

const known = new Set(JSON.parse(readFileSync(LIST, 'utf8')));
const fresh = [];
const revived = [];
let dead = 0;
for (const pointer of where.keys()) {
    const lives = existsSync(join(root, pointer));
    if (!lives) dead++;
    if (!lives && !known.has(pointer)) fresh.push(pointer);
    if (lives && known.has(pointer)) revived.push(pointer);
}
for (const pointer of known) if (!where.has(pointer)) revived.push(pointer);

if (process.argv.includes('--accept-revived') && revived.length > 0) {
    writeFileSync(LIST, JSON.stringify([...known].filter((p) => !revived.includes(p)).sort(), null, 4) + '\n');
    console.log('check:doc-pointers: struck ' + revived.length + ' revived pointer(s) from the list.');
    process.exit(0);
}

let failed = false;
for (const pointer of fresh.sort()) {
    console.error(
        'check:doc-pointers: ' +
            pointer +
            ' does not exist, and it is not on the known-dead list — named by ' +
            [...where.get(pointer)].join(', ')
    );
    failed = true;
}
for (const pointer of revived.sort()) {
    console.error(
        'check:doc-pointers: ' +
            pointer +
            ' is on the known-dead list but the file EXISTS or no page names it any more. The prose was ' +
            'fixed and the list was not — rerun with --accept-revived to strike it.'
    );
    failed = true;
}

if (!failed) {
    console.log(
        'check:doc-pointers: ' +
            where.size +
            ' pointer(s) in the docs, ' +
            (where.size - dead) +
            ' of them live, ' +
            dead +
            ' known dead and carried as prose debt.'
    );
}
process.exit(failed ? 1 : 0);
