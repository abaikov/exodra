#!/usr/bin/env node
/**
 * Typecheck the code examples in the documentation against the real source.
 *
 * `check-docs.mjs` verifies that imported NAMES exist. This goes further: it
 * compiles the example, so a changed signature, a renamed method on a returned
 * object, or a wrong generic is caught too — including inside prose guides, which
 * no documentation generator can help with. Both of the API renames that broke
 * the docs this year would have failed here.
 *
 * Scope: fences tagged ts/tsx/typescript/jsx/js that import from `@exodra/*`.
 * Those are self-contained enough to compile and are exactly the ones that rot.
 * Everything else is prose-adjacent fragment and is skipped by design.
 *
 * Opt out of a single fence by adding `no-check` to its info string:
 *
 *     ```ts no-check
 *     // deliberately broken, shown as an anti-pattern
 *     ```
 */
import { readFile, readdir, mkdir, writeFile, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'node_modules', '.doc-examples');

const FENCE = /^```(ts|tsx|typescript|jsx|js)([^\n]*)\n([\s\S]*?)^```/gm;

async function markdownFiles(dir, acc = []) {
    if (!existsSync(dir)) return acc;
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) await markdownFiles(full, acc);
        else if (/\.mdx?$/.test(entry.name)) acc.push(full);
    }
    return acc;
}

function lineOf(text, index) {
    return text.slice(0, index).split('\n').length;
}

const main = async () => {
    const packages = (await readdir(join(root, 'packages'), { withFileTypes: true }))
        .filter(e => e.isDirectory())
        .map(e => e.name);

    const files = [
        ...(await markdownFiles(join(root, 'docs-site', 'docs'))),
        join(root, 'README.md'),
        ...packages.map(p => join(root, 'packages', p, 'README.md')).filter(existsSync),
    ];

    await rm(outDir, { recursive: true, force: true });
    await mkdir(outDir, { recursive: true });

    // Every extracted example, so a compiler error can be pointed back at the
    // markdown line the reader would have to fix.
    const origin = new Map();
    let index = 0;

    for (const file of files) {
        const text = await readFile(file, 'utf8');
        for (const match of text.matchAll(FENCE)) {
            const [, lang, info, code] = match;
            if (/\bno-check\b/.test(info)) continue;
            if (!/from\s+['"]@exodra\//.test(code)) continue;

            const name = `example-${index++}.tsx`;
            origin.set(name, {
                file: relative(root, file),
                line: lineOf(text, match.index) + 1,
                lang,
            });
            // Wrapped in a module scope so examples cannot collide with each
            // other through top-level declarations.
            await writeFile(join(outDir, name), code);
        }
    }

    if (origin.size === 0) {
        console.log('✓ no @exodra examples found to check');
        return;
    }

    // Resolve @exodra/* to SOURCE, so the check runs against what is in the repo
    // rather than a possibly stale dist.
    const paths = {};
    for (const p of packages) {
        const index = join(root, 'packages', p, 'src', 'index.ts');
        if (existsSync(index)) {
            const pkgPath = join(root, 'packages', p, 'package.json');
            if (!existsSync(pkgPath)) continue;
            const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
            paths[pkg.name] = [relative(outDir, index)];
        }
    }
    paths['@exodra/jsx/jsx-runtime'] = [
        relative(outDir, join(root, 'packages', 'jsx', 'src', 'jsx-runtime.ts')),
    ];

    await writeFile(
        join(outDir, 'tsconfig.json'),
        JSON.stringify(
            {
                compilerOptions: {
                    target: 'ES2020',
                    module: 'ESNext',
                    lib: ['ES2020', 'DOM'],
                    moduleResolution: 'bundler',
                    strict: true,
                    skipLibCheck: true,
                    noEmit: true,
                    jsx: 'react-jsx',
                    jsxImportSource: '@exodra/jsx',
                    // Examples elide detail on purpose; unused locals are not a
                    // documentation bug.
                    noUnusedLocals: false,
                    noUnusedParameters: false,
                    baseUrl: '.',
                    paths,
                },
                include: ['*.tsx'],
            },
            null,
            2
        )
    );

    const result = spawnSync(
        'npx',
        ['tsc', '--noEmit', '-p', join(outDir, 'tsconfig.json'), '--pretty', 'false'],
        { cwd: root, encoding: 'utf8', shell: true }
    );

    const output = (result.stdout || '') + (result.stderr || '');
    const raw = output.split('\n').filter(line => /error TS\d+/.test(line));

    // A fence that references a name or module it never declares is a FRAGMENT —
    // documentation prose, not a program. Those produce cascades of downstream
    // type errors that say nothing about the API, so the whole fence is skipped.
    // What remains are errors that can only mean one thing: the docs describe an
    // API that does not exist. That distinction is the difference between a check
    // people act on and one they learn to ignore.
    const FRAGMENT_CODES = /error TS(2304|2307|2503|2552|1005|2657)\b/;
    const fragments = new Set();
    for (const line of raw) {
        const m = line.match(/(example-\d+)\.tsx/);
        if (m && FRAGMENT_CODES.test(line)) fragments.add(m[1]);
    }

    const errors = raw
        .filter(line => {
            const m = line.match(/(example-\d+)\.tsx/);
            return !m || !fragments.has(m[1]);
        })
        .map(line => {
            // tsc prints a path, not a bare basename — match the file anywhere in it.
            const match = line.match(/(example-\d+)\.tsx\((\d+),(\d+)\):\s*(.*)$/);
            if (!match) return { raw: line };
            const src = origin.get(match[1] + '.tsx');
            return {
                file: src?.file ?? match[1],
                // The fence's opening line plus the offset inside it.
                line: (src?.line ?? 0) + Number(match[2]) - 1,
                message: match[4],
            };
        });

    if (errors.length > 0) {
        console.error(`✖ ${errors.length} problem(s) in documentation examples:\n`);
        for (const e of errors) {
            console.error(e.raw ? '  ' + e.raw : `  ${e.file}:${e.line}  ${e.message}`);
        }
        console.error(
            '\nFix the example, or mark the fence ```ts no-check if it is deliberately partial.'
        );
        process.exit(1);
    }

    const checked = origin.size - fragments.size;
    console.log(
        `✓ ${checked} documentation examples typecheck against the source` +
            (fragments.size > 0
                ? ` (${fragments.size} skipped as fragments — they reference names they do not declare)`
                : '')
    );
};

await main();
