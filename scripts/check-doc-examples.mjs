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

const FENCE = /^```(ts|tsx|typescript|jsx|js)(?![\w-])([^\n]*)\n([\s\S]*?)^```/gm;

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
        ...(await markdownFiles(join(root, 'docs-site', 'src'))),
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
        const fences = [...text.matchAll(FENCE)]
            .filter(([, , info]) => !/\b(no-check|signature)\b/.test(info))
            .map(match => ({
                info: match[2],
                code: match[3],
                line: lineOf(text, match.index) + 1,
            }));
        const setups = fences.filter(fence => /\bsetup\b/.test(fence.info));
        const prelude = setups.map(fence => fence.code).join('\n');
        const preludeLines = prelude === '' ? 0 : prelude.split('\n').length;
        for (const fence of fences.filter(candidate => !/\bsetup\b/.test(candidate.info))) {
            const name = `example-${index++}.tsx`;
            origin.set(name, {
                file: relative(root, file),
                line: fence.line,
                preludeLines,
                setupLine: setups[0]?.line,
            });
            await writeFile(join(outDir, name), `${prelude === '' ? '' : prelude + '\n'}${fence.code}\nexport {};\n`);
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
    // THE JSX PACKAGE IS SHAPED DIFFERENTLY FROM EVERY OTHER ONE, and getting this wrong is how
    // the gate spent its whole life checking the documentation against REACT.
    //
    // `packages/jsx/src/` holds one directory, `schema/`, and nothing else — there is no
    // `src/index.ts` and no `src/jsx-runtime.ts`. So the loop above never mapped `@exodra/jsx` at
    // all (its `existsSync` missed), the line below pointed at a file that does not exist, and
    // both fell through to whatever `dist/` happened to hold. With no mapping and no `types: []`,
    // `@types/react`'s global `JSX` namespace won, and every directive-JSX fence in the docs was
    // type-checked against `DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, …>` — which is
    // exactly the error this gate was reporting, about a dialect the project does not use.
    const jsxSchema = join(root, 'packages', 'jsx', 'src', 'schema');
    paths['@exodra/jsx'] = [relative(outDir, join(jsxSchema, 'index.ts'))];
    paths['@exodra/jsx/schema'] = [relative(outDir, join(jsxSchema, 'index.ts'))];
    paths['@exodra/jsx/schema/jsx-runtime'] = [relative(outDir, join(jsxSchema, 'jsx-runtime.ts'))];
    paths['@exodra/jsx/schema/jsx-dev-runtime'] = [
        relative(outDir, join(jsxSchema, 'jsx-dev-runtime.ts')),
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
                    // THE SUBPATH, not the package root — `packages/jsx/package.json` declares
                    // `./schema/jsx-runtime` and no `./jsx-runtime`, and the runtime's own header
                    // spells the setting out. Naming the root resolved nothing and let React's
                    // ambient JSX namespace answer instead.
                    jsxImportSource: '@exodra/jsx/schema',
                    // NO AMBIENT @types PACKAGES. Without this every `@types/*` in the workspace is
                    // auto-included, and `@types/react` declares a global `JSX` namespace that
                    // silently overrides this project's dialect.
                    types: [],
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

    const errors = raw
        .map(line => {
            // tsc prints a path, not a bare basename — match the file anywhere in it.
            const match = line.match(/(example-\d+)\.tsx\((\d+),(\d+)\):\s*(.*)$/);
            if (!match) return { raw: line };
            const src = origin.get(match[1] + '.tsx');
            return {
                file: src?.file ?? match[1],
                line:
                    Number(match[2]) <= (src?.preludeLines ?? 0)
                        ? (src?.setupLine ?? 0) + Number(match[2]) - 1
                        : (src?.line ?? 0) + Number(match[2]) - (src?.preludeLines ?? 0) - 1,
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

    console.log(`✓ ${origin.size} documentation examples typecheck against the source`);
};

await main();
