#!/usr/bin/env node
/**
 * `static/llms-full.txt` is generated from the docs, but only by the docs-site
 * build — so a docs edit that never triggered a build leaves a stale digest in
 * the repo. It was 273 lines behind when this check was written.
 *
 * Compares the file's CONTENT against a fresh generation, not against git HEAD:
 * the question is "does this match the docs", which is true or false regardless
 * of what is committed. The regenerated file is left in place, so the fix is to
 * stage it rather than to remember another command.
 */
import { readFileSync, existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'docs-site/static/llms-full.txt');

const before = existsSync(file) ? readFileSync(file, 'utf8') : null;

const gen = spawnSync('node', ['scripts/generate-llms-full.mjs'], {
    cwd: join(root, 'docs-site'),
    encoding: 'utf8',
});
if (gen.status !== 0) {
    console.error('✖ could not regenerate llms-full.txt\n' + (gen.stderr || ''));
    process.exit(1);
}

const after = readFileSync(file, 'utf8');

if (before !== after) {
    console.error(
        '✖ docs-site/static/llms-full.txt did not match the docs — it has been\n' +
            '  regenerated for you. Stage it: the docs changed without a docs-site build.'
    );
    process.exit(1);
}

console.log('✓ llms-full.txt matches the docs');

// ─────────────────────────────────────────────────────────────────────────────────────────────
// AND THE SECOND QUESTION, WHICH NOTHING ASKED BEFORE THIS GATE.
//
// `generate-llms-full.mjs`'s `ORDER` array carries the comment "mirrors sidebars.js so the
// narrative flows top to bottom". It was not a mirror. `security` and `tooling/babel-plugin` sat
// in `ORDER` and in no sidebar entry — **readable by a model and unreachable by a person** — and
// `errors` was navigable and absent from the digest. Nobody noticed,
// because a comment claiming a property is not a check of it.
//
// So the comment becomes a check. A page in one list and not the other is either a page a reader
// cannot find, or a page a model cannot read. Both are defects and both are silent.
//
// DELIBERATE EXCEPTIONS are named here, individually, with the reason — never a pattern. There are
// none at present: every page in one list is in the other.
const sidebars = readFileSync(join(root, 'docs-site/sidebars.js'), 'utf8');
const generator = readFileSync(join(root, 'docs-site/scripts/generate-llms-full.mjs'), 'utf8');
const DIGEST_ONLY_BY_DESIGN = [];
const SIDEBAR_ONLY_BY_DESIGN = [];

/** Doc ids as either file writes them: a quoted slug, comments stripped so a mention is not an entry. */
const idsIn = (text) =>
    new Set(
        [...text.replace(/\/\/[^\n]*/g, '').matchAll(/'([a-z0-9][a-z0-9/-]*)'/g)]
            .map((m) => m[1])
            .filter((id) => existsSync(join(root, 'docs-site/docs', `${id}.md`)))
    );

const orderBody = generator.slice(generator.indexOf('const ORDER'));
const inOrder = idsIn(orderBody.slice(0, orderBody.indexOf('];')));
const inSidebar = idsIn(sidebars);

const digestOnly = [...inOrder].filter(
    (id) => !inSidebar.has(id) && !DIGEST_ONLY_BY_DESIGN.includes(id)
);
const sidebarOnly = [...inSidebar].filter(
    (id) => !inOrder.has(id) && !SIDEBAR_ONLY_BY_DESIGN.includes(id)
);

if (digestOnly.length > 0 || sidebarOnly.length > 0) {
    console.error('\n✖ the digest and the sidebar disagree about which pages exist:');
    for (const id of digestOnly) {
        console.error(`  ${id} — in ORDER, in no sidebar entry: a model can read it, a reader cannot reach it`);
    }
    for (const id of sidebarOnly) {
        console.error(`  ${id} — in the sidebar, not in ORDER: navigable, and absent from the digest`);
    }
    console.error(
        '\nAdd it to whichever list is missing it, or — if the omission is deliberate — name it in\n' +
            'DIGEST_ONLY_BY_DESIGN or SIDEBAR_ONLY_BY_DESIGN in this file, with the reason beside it.\n'
    );
    process.exit(1);
}

console.log(`✓ the digest and the sidebar carry the same ${inSidebar.size} pages`);
