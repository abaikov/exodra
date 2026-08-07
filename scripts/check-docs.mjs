#!/usr/bin/env node
/**
 * Fail the build when the docs no longer describe the code.
 *
 * Written after a protocol rename (`subscribe` → `onChange`, `snapshot` →
 * `getValue`) left nine documentation files describing an API that no longer
 * existed, and CDN snippets pinned to versions three minors behind. Both classes
 * were caught by hand, which does not scale.
 *
 * Two checks, both exact — no heuristics, no false positives to train people to
 * ignore:
 *
 *   1. Every named import from an `@exodra/*` package in a docs code block must
 *      actually be exported by that package.
 *   2. Every `@exodra/x@N.N` version pin in the docs must be satisfiable by that
 *      package's current version.
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
        for (const part of match[1].split(',')) {
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

async function collectExports(pkgDir) {
    const names = new Set();
    await collectFrom(join(root, 'packages', pkgDir, 'src', 'index.ts'), names, new Set());
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
                const name = raw.trim().split(/\s+as\s+/)[0]?.trim();
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
