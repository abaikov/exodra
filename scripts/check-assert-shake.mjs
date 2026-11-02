#!/usr/bin/env node
// A page that composes no schema asserts must not carry the assert layer.
//
// Run:  node scripts/check-assert-shake.mjs   (or `npm run check:assert-shake`)
//
// This is what core's entry ceiling in check-bundle-size.mjs was standing in for. That ceiling
// weighed the barrel, and the barrel holds the opt-in assert layer (`withExoSchemaAsserts`,
// `ExoAssertingSchemaCursor` and the refusals it calls), which a page only pays for by composing it.
// Membership is asked of esbuild's metafile, as in check-binding-shake.mjs.

import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

let build;
try {
    ({ build } = await import('esbuild'));
} catch {
    console.error(
        '❌ check:assert-shake: esbuild is not resolvable from the repository root.\n' +
            '   It is expected here as a hoisted dependency of tsup.'
    );
    process.exit(1);
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const readAliases = () => {
    const raw = readFileSync(resolve(ROOT, 'tsconfig.depcruise.json'), 'utf8');
    const paths = JSON.parse(raw.replace(/^\s*\/\/.*$/gm, '')).compilerOptions.paths;
    const alias = {};
    for (const [specifier, [target]] of Object.entries(paths))
        alias[specifier] = resolve(ROOT, target);
    return alias;
};
const ALIAS = readAliases();

const isAssertModule = (path) =>
    path.startsWith('packages/core/src/') &&
    (path.includes('/asserts/') ||
        path.endsWith('/ExoAssertingSchemaCursor.ts') ||
        path.endsWith('/withExoSchemaAsserts.ts'));

const UNCONDITIONAL = {
    'packages/core/src/schema/markup/asserts/assertExoRootElement.ts':
        'every schema has one root element',
    'packages/core/src/schema/markup/asserts/assertExoOneRoot.ts':
        'every schema has exactly one root',
    'packages/core/src/schema/ports/asserts/assertExoChildrenPort.ts':
        "called by @exodra/dom's childList door, EXO_DOM_NODE_VOCABULARY.ts",
    'packages/core/src/schema/markup/asserts/assertExoNoTextAfterChildrenPort.ts':
        "called by @exodra/dom's compiler, compileExoDomSchema.ts",
    'packages/core/src/machine/asserts/assertExoArming.ts':
        "called by every backend's childList/one/list door: a re-run wire may not place children",
};

const CONTROL = 'packages/core/src/schema/cursor/ExoAssertingSchemaCursor.ts';

const page = (decorate, imports) => `
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import { createExoMachine, createExoSchema } from '@exodra/core';
${imports}

const BACKEND = withExoCompiler(new ExoDomBackend());

const SCHEMA = createExoSchema(
    (b) => {
        let label;
        b.el('div', { class: 'card' }, (d) => {
            d.el('span', { class: 'label' }, (s) => {
                label = s.textPort();
            });
        });
        return { label };
    }${decorate}
);
export const APP = createExoMachine(SCHEMA, {
    createInitialState: (c) => {
        c.text(SCHEMA.ports.label, 'hello');
    },
});

export const start = (root) => BACKEND.render(APP, root);
`;

const PLAIN = page('', '');
const ASSERTED = page(
    ',\n    (cursor) => withExoSchemaAsserts(cursor)',
    "import { withExoSchemaAsserts } from '@exodra/core';"
);

const dir = mkdtempSync(join(tmpdir(), 'exo-assert-shake-'));

const bundleOne = async (name, source) => {
    const entry = join(dir, `${name}.ts`);
    writeFileSync(entry, source, 'utf8');
    const result = await build({
        entryPoints: [entry],
        bundle: true,
        write: false,
        format: 'esm',
        platform: 'browser',
        target: 'es2020',
        minify: true,
        metafile: true,
        absWorkingDir: ROOT,
        logLevel: 'silent',
        define: { 'process.env.NODE_ENV': '"production"' },
        alias: ALIAS,
    });
    const out = Object.values(result.metafile.outputs)[0];
    const bytes = result.outputFiles[0].contents;
    return {
        gz: gzipSync(Buffer.from(bytes), { level: 9 }).length,
        paths: Object.entries(out.inputs)
            .filter(([, v]) => v.bytesInOutput > 0)
            .map(([path, v]) => [path.split('\\').join('/'), v.bytesInOutput]),
    };
};

let plain;
let asserted;
try {
    plain = await bundleOne('plain', PLAIN);
    asserted = await bundleOne('asserted', ASSERTED);
} catch (error) {
    console.error(
        '❌ check:assert-shake — a fixture page no longer builds; move the fixtures with the surface.\n'
    );
    console.error(
        String(error.message ?? error)
            .split('\n')
            .slice(0, 20)
            .join('\n')
    );
    rmSync(dir, { recursive: true, force: true });
    process.exit(1);
}
rmSync(dir, { recursive: true, force: true });

const problems = [];
const plainAsserts = plain.paths.filter(([p]) => isAssertModule(p));
const leaked = plainAsserts.filter(([p]) => !(p in UNCONDITIONAL));
if (leaked.length > 0) {
    problems.push(
        `${leaked.length} assert module(s) reached a page that composes no asserts:\n` +
            leaked.map(([p, b]) => `    ${String(b).padStart(6)} B  ${p}`).join('\n')
    );
}
if (!asserted.paths.some(([p]) => p === CONTROL)) {
    problems.push(
        `the ASSERTED page does not carry ${CONTROL}, so the assertion above measured nothing`
    );
}

const sum = (rows) => rows.reduce((n, [, b]) => n + b, 0);
console.log('check:assert-shake — what one page pays for the schema assert layer\n');
console.log(
    `  plain page      ${String(plain.gz).padStart(6)} B gz   assert modules: ${
        plainAsserts.length
    }, ${sum(plainAsserts)} B min`
);
const assertedAsserts = asserted.paths.filter(([p]) => isAssertModule(p));
console.log(
    `  asserted page   ${String(asserted.gz).padStart(6)} B gz   assert modules: ${
        assertedAsserts.length
    }, ${sum(assertedAsserts)} B min\n`
);
for (const [p, b] of plainAsserts)
    console.log(`  kept on plain   ${String(b).padStart(6)} B  ${p}`);

if (problems.length > 0) {
    console.error('\n❌ check:assert-shake\n');
    for (const p of problems) console.error(`  ${p}\n`);
    process.exit(1);
}
console.log('\n✅ check:assert-shake — the assert layer detaches.');
