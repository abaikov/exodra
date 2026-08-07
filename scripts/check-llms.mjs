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
