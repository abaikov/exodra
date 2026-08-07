#!/usr/bin/env node
/**
 * Draft a changeset, explain the reasoning, and let you correct it in words.
 *
 * `changeset add` asks four questions whose answers are mostly derivable: the
 * packages you touched are in the diff, and the bump is largely inferable from
 * what happened to the public API. This proposes all of it, says WHY, and then
 * waits — reply with a correction in plain language and it redrafts.
 *
 * The summary ships to npm as the changelog line a consumer reads to decide
 * whether to upgrade, so nothing is written until you accept it.
 *
 *   npm run change:auto                          # propose, then review
 *   node scripts/draft-changeset.mjs --yes       # accept the first draft
 *   node scripts/draft-changeset.mjs --no-ai     # mechanical only, no model
 *   node scripts/draft-changeset.mjs --bump minor --base origin/master
 */
import { spawnSync } from 'child_process';
import { writeFileSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline/promises';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (name, fallback) => {
    const i = argv.indexOf(`--${name}`);
    return i === -1 ? fallback : argv[i + 1];
};
const has = name => argv.includes(`--${name}`);

const git = (...args) => {
    const r = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
    return r.status === 0 ? r.stdout.trim() : '';
};

const claude = prompt => {
    if (has('no-ai')) return null;
    const r = spawnSync('claude', ['-p', prompt], { encoding: 'utf8', timeout: 180000 });
    return r.status === 0 && r.stdout ? r.stdout.trim() : null;
};

// --- facts from git ------------------------------------------------------------

const base =
    flag('base') || (git('rev-parse', '--verify', 'origin/master') ? 'origin/master' : 'HEAD');

const changedFiles = new Set(
    [
        ...git('diff', '--name-only', `${base}...HEAD`).split('\n'),
        ...git('diff', '--name-only', 'HEAD').split('\n'),
        ...git('diff', '--name-only', '--cached').split('\n'),
        ...git('ls-files', '--others', '--exclude-standard').split('\n'),
    ].filter(Boolean)
);

const publicPackages = new Map();
for (const dir of readdirSync(join(root, 'packages'))) {
    const pkgPath = join(root, 'packages', dir, 'package.json');
    if (!existsSync(pkgPath)) continue;
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    if (!pkg.private) publicPackages.set(pkg.name, dir);
}

const detected = new Set();
for (const file of changedFiles) {
    const m = file.match(/^packages\/([^/]+)\//);
    if (!m || !/\/src\//.test(file)) continue; // a README edit needs no version
    for (const [name, dir] of publicPackages) {
        if (dir === m[1]) detected.add(name);
    }
}

if (detected.size === 0) {
    console.log(
        'No source changes in a publishable package — nothing to release.\n' +
            '(Docs-only or private-package changes need no changeset.)'
    );
    process.exit(0);
}

const subjects = git('log', '--format=%s%n%b', `${base}..HEAD`);
const diffstat = git('diff', '--stat', `${base}...HEAD`) || git('diff', '--stat', 'HEAD');

// Hard evidence beats judgement: an export that vanished from a package's public
// index is breaking, whatever a commit message or a model says about it.
//
// LIMITATION, stated because a half-trusted check is worse than a known one: this
// reads only the NAMED exports written in `src/index.ts`. Packages fronting their
// API with `export type * from './types'` — most of them here — present an empty
// set, so a removal inside those is not caught mechanically and falls through to
// judgement plus your review.
function exportedNames(ref, pkgDir) {
    const path = `packages/${pkgDir}/src/index.ts`;
    const src =
        ref === null
            ? existsSync(join(root, path))
                ? readFileSync(join(root, path), 'utf8')
                : ''
            : git('show', `${ref}:${path}`);
    const names = new Set();
    for (const m of src.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
        for (const part of m[1].split(',')) {
            const n = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/).pop()?.trim();
            if (n) names.add(n);
        }
    }
    for (const m of src.matchAll(
        /export\s+(?:async\s+)?(?:function|const|let|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g
    )) {
        names.add(m[1]);
    }
    return names;
}

const removedExports = [];
for (const [name, dir] of publicPackages) {
    if (!detected.has(name)) continue;
    const before = exportedNames(base, dir);
    if (before.size === 0) continue;
    const after = exportedNames(null, dir);
    for (const symbol of before) {
        if (!after.has(symbol)) removedExports.push(`${name}: ${symbol}`);
    }
}

// --- proposal ------------------------------------------------------------------

const CONTRACT = [
    'This repository is PRE-1.0. Its convention:',
    '  minor — the public API changed in a way a consumer could notice (something',
    '          removed, renamed, a signature or behaviour changed) OR a feature added.',
    '  patch — internal only: bug fix, refactor, performance, tests, docs.',
    '  major — NEVER infer it. It is reserved for the deliberate move to 1.0.',
].join('\n');

function propose(previous, correction) {
    const out = claude(
        [
            'You are drafting a changeset for a JavaScript monorepo release.',
            CONTRACT,
            '',
            'Reply with JSON only — no prose, no code fence:',
            '{"bump":"minor|patch","summary":"one line","packages":["@scope/name"],',
            ' "reasoning":"two sentences: why this bump, and what the line claims"}',
            '',
            'The summary is a changelog line: imperative, under 100 characters, about',
            'what changed for a CONSUMER of the package, not how it was implemented.',
            '',
            `Packages detected from the diff: ${[...detected].join(', ')}`,
            removedExports.length
                ? `Exports REMOVED (this alone forces minor): ${removedExports.join(', ')}`
                : 'No removed exports detected mechanically.',
            '',
            'Commit subjects:',
            subjects.slice(0, 3000) || '(uncommitted work only)',
            '',
            'Files changed:',
            diffstat.slice(0, 3000),
            previous
                ? `\nYour previous proposal:\n${JSON.stringify(previous)}\n\n` +
                  `The human replied: "${correction}"\nRevise accordingly.`
                : '',
        ].join('\n')
    );

    if (!out) return null;
    const start = out.indexOf('{');
    const end = out.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    try {
        const parsed = JSON.parse(out.slice(start, end + 1));
        const packages =
            Array.isArray(parsed.packages) && parsed.packages.length
                ? parsed.packages.filter(p => publicPackages.has(p))
                : [];
        return {
            bump: parsed.bump === 'minor' ? 'minor' : 'patch',
            summary: String(parsed.summary || '').trim(),
            packages: packages.length ? packages : [...detected],
            reasoning: String(parsed.reasoning || '').trim(),
        };
    } catch {
        return null;
    }
}

const mechanical = {
    bump:
        removedExports.length > 0 || /BREAKING[ -]CHANGE|^\w+!:/m.test(subjects)
            ? 'minor'
            : 'patch',
    summary: subjects.split('\n').filter(Boolean)[0] || 'Describe this change before releasing.',
    packages: [...detected],
    reasoning: removedExports.length
        ? 'Exports were removed, which is breaking for consumers.'
        : 'No model used — bump inferred from commit subjects only.',
};

// The mechanical signal is not up for debate: a removed export IS breaking.
function enforce(d) {
    if (removedExports.length > 0 && d.bump !== 'minor') {
        d.bump = 'minor';
        d.reasoning += ' (Held at minor: exports were removed.)';
    }
    if (flag('bump')) d.bump = flag('bump');
    return d;
}

let draft = enforce(propose(null, null) || mechanical);

const render = d =>
    '---\n' +
    d.packages.map(p => `'${p}': ${d.bump}`).join('\n') +
    '\n---\n\n' +
    d.summary +
    '\n';

function show(d) {
    console.log('\n' + '─'.repeat(72));
    console.log(`bump      ${d.bump}`);
    console.log(`packages  ${d.packages.join(', ')}`);
    console.log(`summary   ${d.summary}`);
    console.log(`why       ${d.reasoning}`);
    if (removedExports.length) console.log(`removed   ${removedExports.join(', ')}`);
    console.log('─'.repeat(72));
}

function write(d) {
    const name = `auto-${Date.now().toString(36)}.md`;
    writeFileSync(join(root, '.changeset', name), render(d));
    console.log(`\nWrote .changeset/${name}`);
    console.log('`major` is never inferred — it is reserved for the move to 1.0.');
}

// --- review loop ---------------------------------------------------------------

show(draft);

if (!process.stdin.isTTY || has('yes') || has('no-ai')) {
    write(draft);
    process.exit(0);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
for (;;) {
    const answer = (
        await rl.question('\nEnter to accept · say what to change · q to abort: ')
    ).trim();

    if (answer === '') {
        rl.close();
        write(draft);
        break;
    }
    if (answer.toLowerCase() === 'q') {
        rl.close();
        console.log('Aborted — nothing written.');
        break;
    }

    console.log('Revising…');
    const revised = propose(draft, answer);
    if (!revised) console.log('Could not revise (model unavailable) — draft unchanged.');
    else draft = enforce(revised);
    show(draft);
}
