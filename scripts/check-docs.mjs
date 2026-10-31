#!/usr/bin/env node
/**
 * Fail the build when the docs no longer describe the code.
 *
 * Written after a protocol rename (`subscribe` → `onChange`, `snapshot` →
 * `getValue`) left nine documentation files describing an API that no longer
 * existed, and CDN snippets pinned to versions three minors behind. Both classes
 * were caught by hand, which does not scale.
 *
 * Three checks, all exact — no heuristics, no false positives to train people to
 * ignore:
 *
 *   1. Every named import from an `@exodra/*` package in a docs code block must
 *      actually be exported by that package.
 *   2. Every `@exodra/x@N.N` version pin in the docs must be satisfiable by that
 *      package's current version.
 *   3. A code block may not USE a name that was renamed out from under it.
 *      Check 1 only sees names that are imported; a sample that writes
 *      `<RouterProvider>` or `h(RouterProvider, …)` and never imports it was
 *      invisible, which is exactly how three of them survived the `Legacy`
 *      suffixing of `@exodra/router`'s previous-runtime half. See
 *      `renamedNames()` below for why this one cannot fire on a name that is
 *      merely being talked about.
 */
import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// --- what each package actually exports ---------------------------------------

// Resolve a module's exports, FOLLOWING re-exports. Every package here fronts its
// API with `export type * from './types'`, so a checker that gave up on a star
// re-export would silently check nothing — which is worse than not existing.
async function collectFrom(filePath, names, seen, depth = 0) {
    if (depth > 6 || seen.has(filePath) || !existsSync(filePath)) return;
    seen.add(filePath);
    const src = await readFile(filePath, 'utf8');

    // `export { a, b as c } from './x'` / `export type { T } from './y'`
    for (const match of src.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
        // COMMENTS COME OUT BEFORE THE SPLIT, because the split is on commas and a comment may
        // contain them. An export named under such a comment used to end up glued to the prose in
        // front of it, so `part.trim()` yielded a paragraph and the identifier was never recorded —
        // the gate then reported a doc importing it as importing something that is not exported.
        const body = match[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
        for (const part of body.split(',')) {
            const name = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/).pop()?.trim();
            if (name) names.add(name);
        }
    }
    // `export function foo` / `export const foo` / `export type Foo`
    for (const match of src.matchAll(
        /export\s+(?:async\s+)?(?:function|const|let|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g
    )) {
        names.add(match[1]);
    }
    // `export * from './x'` / `export type * from '@exodra/y'` — follow it.
    for (const match of src.matchAll(/export\s+(?:type\s+)?\*\s+from\s+['"]([^'"]+)['"]/g)) {
        const spec = match[1];
        const next = spec.startsWith('.')
            ? resolveRelative(dirname(filePath), spec)
            : spec.startsWith('@exodra/')
              ? join(root, 'packages', spec.slice('@exodra/'.length), 'src', 'index.ts')
              : null;
        if (next) await collectFrom(next, names, seen, depth + 1);
    }
}

function resolveRelative(fromDir, spec) {
    const base = join(fromDir, spec.replace(/\.js$/, ''));
    for (const candidate of [base + '.ts', join(base, 'index.ts')]) {
        if (existsSync(candidate)) return candidate;
    }
    return null;
}

// `@exodra/jsx` keeps its one entry under `src/schema/`.
async function collectExports(pkgDir) {
    const names = new Set();
    const flat = join(root, 'packages', pkgDir, 'src', 'index.ts');
    const nested = join(root, 'packages', pkgDir, 'src', 'schema', 'index.ts');
    await collectFrom(existsSync(flat) ? flat : nested, names, new Set());
    return names;
}

async function packageDirs() {
    const entries = await readdir(join(root, 'packages'), { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name);
}

// --- docs sources --------------------------------------------------------------

async function markdownFiles(dir, acc = []) {
    if (!existsSync(dir)) return acc;
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) await markdownFiles(full, acc);
        else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) acc.push(full);
    }
    return acc;
}

// --- used-but-renamed names ----------------------------------------------------
//
// EVERY GATE BELOW EXISTS TO KEEP THIS AT ZERO FALSE POSITIVES, because a gate in
// `release:check` that cries wolf gets commented out and then nothing is checked.
// A name is only reported when ALL of these hold:
//
//   a. it is used in one of three positions that can only mean "this identifier
//      is a value, here, now": a JSX open tag `<Name`, the component argument of
//      `h(Name, …)`, or a `useName(` call;
//   b. that use is inside a fence tagged as JS/TS — not prose, not `bash`, not
//      `html` — with comments and string literals removed first, so
//      `// instead of <RouterProvider>` and `` `<RouterProvider>` `` are gone
//      before anything is matched;
//   c. NO published `@exodra/*` package exports that exact name, anywhere;
//   d. some package DOES export `Name + 'Legacy'` — i.e. this is a rename, not an
//      unknown third-party or made-up-for-the-example component;
//   e. the file's own code blocks never bind the name — no import (aliased or
//      not), no `const`/`let`/`var`/`function`/`class`, no destructure;
//   f. the file imports from the package that owns the `Legacy` name, in a code
//      block. Without (f) the check reads a doc's own placeholder as a package
//      export: `core/concepts.md` composes `h(Header)` out of components the
//      reader is meant to have written, and `@exodra/ssr` happens to export a
//      `HeaderLegacy`. Naming the package in prose is not enough — the sample has
//      to actually import from it before "you meant our export" is a fair reading.
//
// (c) and (d) together are the narrow part: they can only be true of a name the
// repository itself renamed. Stripping strings and comments can only ever hide a
// use, never invent one, so the failure mode of this check is a miss — a doc that
// uses a renamed name and imports NOTHING from its package goes unreported.

const CODE_LANGS = new Set([
    'js',
    'jsx',
    'ts',
    'tsx',
    'javascript',
    'typescript',
    'mjs',
    'cjs',
]);

// Fenced blocks whose info string names a JS/TS dialect, as raw source.
function codeBlocks(text) {
    const out = [];
    let inFence = false;
    let lang = '';
    let buf = [];
    for (const line of text.split('\n')) {
        const fence = /^\s*(?:`{3,}|~{3,})(.*)$/.exec(line);
        if (!inFence) {
            if (fence) {
                inFence = true;
                lang = fence[1].trim().split(/[\s,{]/)[0].toLowerCase();
                buf = [];
            }
            continue;
        }
        if (fence && fence[1].trim() === '') {
            if (CODE_LANGS.has(lang)) out.push(buf.join('\n'));
            inFence = false;
            buf = [];
            continue;
        }
        buf.push(line);
    }
    return out;
}

// Blank out comments and string/template literals. Only ever removes text.
function stripCommentsAndStrings(src) {
    let out = '';
    let i = 0;
    while (i < src.length) {
        const c = src[i];
        const d = src[i + 1];
        if (c === '/' && d === '/') {
            while (i < src.length && src[i] !== '\n') i++;
            continue;
        }
        if (c === '/' && d === '*') {
            i += 2;
            while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
            i += 2;
            continue;
        }
        if (c === '"' || c === "'" || c === '`') {
            i++;
            while (i < src.length) {
                if (src[i] === '\\') {
                    i += 2;
                    continue;
                }
                if (src[i] === c) {
                    i++;
                    break;
                }
                i++;
            }
            out += ' ';
            continue;
        }
        out += c;
        i++;
    }
    return out;
}

// Every name the file's own samples introduce, by any means. Deliberately a
// SUPERSET — over-binding costs a missed report, under-binding costs a false one.
function boundNames(blocks) {
    const bound = new Set();
    for (const block of blocks) {
        for (const m of block.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}/g)) {
            for (const part of m[1].split(',')) {
                const local = part
                    .trim()
                    .replace(/^type\s+/, '')
                    .split(/\s+as\s+/)
                    .pop()
                    ?.trim();
                if (local) bound.add(local);
            }
        }
        for (const m of block.matchAll(
            /import\s+(?:\*\s+as\s+([A-Za-z_$][\w$]*)|([A-Za-z_$][\w$]*))\s*(?:,|from\b)/g
        )) {
            if (m[1]) bound.add(m[1]);
            if (m[2]) bound.add(m[2]);
        }
        for (const m of block.matchAll(
            /(?:const|let|var|function\s*\*?|class)\s+([A-Za-z_$][\w$]*)/g
        )) {
            bound.add(m[1]);
        }
        for (const m of block.matchAll(/(?:const|let|var)\s*\{([^}]*)\}/g)) {
            for (const part of m[1].split(',')) {
                const local = part.split(':').pop()?.split('=')[0]?.trim();
                if (local && /^[A-Za-z_$][\w$]*$/.test(local)) bound.add(local);
            }
        }
        // `Foo = …` at the start of a line: a value assembled across fragments.
        for (const m of block.matchAll(/^\s*([A-Z][\w$]*)\s*=[^=]/gm)) bound.add(m[1]);
    }
    return bound;
}

const USE_PATTERNS = [
    /<([A-Z][\w$]*)[\s/>]/g, // JSX open tag
    /\bh(?:Legacy)?\(\s*([A-Z][\w$]*)\s*[,)]/g, // h(Component, …)
    /\b(use[A-Z][\w$]*)\s*\(/g, // useThing(…)
];

// The `@exodra/*` packages a file's code blocks actually import from.
function importedPackages(blocks) {
    const pkgs = new Set();
    for (const block of blocks) {
        for (const m of block.matchAll(/from\s+['"](@exodra\/[a-z-]+)['"]/g)) pkgs.add(m[1]);
    }
    return pkgs;
}

// bare name -> the package that exports `name + 'Legacy'` instead.
function renamedNames(exportsByName) {
    const everything = new Set();
    for (const names of exportsByName.values()) for (const n of names) everything.add(n);

    const renamed = new Map();
    for (const [pkgName, names] of exportsByName) {
        for (const name of names) {
            if (!name.endsWith('Legacy')) continue;
            const base = name.slice(0, -'Legacy'.length);
            if (!base || everything.has(base)) continue;
            renamed.set(base, pkgName);
        }
    }
    return renamed;
}

const main = async () => {
    const dirs = await packageDirs();

    const exportsByName = new Map();
    const versionByName = new Map();
    for (const dir of dirs) {
        const pkgPath = join(root, 'packages', dir, 'package.json');
        if (!existsSync(pkgPath)) continue;
        const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
        versionByName.set(pkg.name, pkg.version);
        if (!pkg.private) exportsByName.set(pkg.name, await collectExports(dir));
    }

    const files = [
        ...(await markdownFiles(join(root, 'docs-site', 'docs'))),
        join(root, 'README.md'),
        ...dirs.map(d => join(root, 'packages', d, 'README.md')).filter(existsSync),
    ];

    const renamed = renamedNames(exportsByName);
    const problems = [];

    for (const file of files) {
        const text = await readFile(file, 'utf8');
        const rel = file.replace(root + '/', '');

        // 1. named imports from an @exodra package
        for (const match of text.matchAll(
            /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"](@exodra\/[a-z-]+)['"]/g
        )) {
            const pkgName = match[2];
            const known = exportsByName.get(pkgName);
            if (!known || known.has('*')) continue;
            // A real import specifier list is identifiers, commas and `as` and
            // nothing else. Prose and multi-line signatures inside a fence can
            // otherwise be mistaken for one.
            if (!/^[\sA-Za-z0-9_$,]*$/.test(match[1].replace(/\bas\b/g, ' '))) continue;
            for (const raw of match[1].split(',')) {
                const name = raw
                    .trim()
                    .replace(/^type\s+/, '')
                    .split(/\s+as\s+/)[0]
                    ?.trim();
                if (!name) continue;
                if (!known.has(name)) {
                    problems.push(
                        `${rel}: imports { ${name} } from ${pkgName}, which does not export it`
                    );
                }
            }
        }

        // 2. version pins — `@exodra/core@0.3` or `@exodra/core@0.3.0`
        for (const match of text.matchAll(/(@exodra\/[a-z-]+)@(\d+(?:\.\d+){0,2})/g)) {
            const [, pkgName, pin] = match;
            const actual = versionByName.get(pkgName);
            if (!actual) continue;
            const pinParts = pin.split('.');
            const actualParts = actual.split('.');
            const satisfied = pinParts.every((part, i) => part === actualParts[i]);
            if (!satisfied) {
                problems.push(
                    `${rel}: pins ${pkgName}@${pin}, but the package is at ${actual}`
                );
            }
        }

        // 3. a sample that USES a name the packages renamed, without binding it
        const blocks = codeBlocks(text);
        if (blocks.length > 0) {
            const bound = boundNames(blocks);
            const fromPackages = importedPackages(blocks);
            const reported = new Set();
            for (const block of blocks) {
                const code = stripCommentsAndStrings(block);
                for (const pattern of USE_PATTERNS) {
                    pattern.lastIndex = 0;
                    for (const match of code.matchAll(pattern)) {
                        const name = match[1];
                        if (reported.has(name) || bound.has(name)) continue;
                        const pkgName = renamed.get(name);
                        if (!pkgName || !fromPackages.has(pkgName)) continue;
                        reported.add(name);
                        problems.push(
                            `${rel}: a code sample uses \`${name}\`, which no @exodra package ` +
                                `exports; ${pkgName} exports \`${name}Legacy\`. Import it as ` +
                                `\`${name}Legacy as ${name}\`, or write the suffixed name.`
                        );
                    }
                }
            }
        }
    }

    if (problems.length > 0) {
        console.error('✖ documentation is out of sync with the code:\n');
        for (const problem of problems) console.error('  ' + problem);
        console.error(
            `\n${problems.length} problem(s). Update the docs, or the code, so they agree.`
        );
        process.exit(1);
    }

    console.log(`✓ docs in sync (${files.length} files checked against ${exportsByName.size} packages)`);
};

await main();
