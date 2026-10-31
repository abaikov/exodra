#!/usr/bin/env node
// check:minimal-page — what the SMALLEST real page costs after a bundler tree-shakes it.
//
// `check:size` budgets a whole package; this budgets what a user's bundle actually carries for the
// least they can write: one machine with a text port and an event port, rendered by each entry
// point. Each fixture is bundled by esbuild from source (minified, NODE_ENV=production,
// tree-shaken), gzipped at level 9, and held under a ceiling. The files that contributed bytes are
// printed largest first, so a regression names its cause. Each page is bundled twice: from source
// (per-file report) and from the built `dist/` a user installs, because a single-file dist keeps
// a module-level call the per-file source graph would have dropped.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

let build;
try {
    ({ build } = await import('esbuild'));
} catch {
    console.error('❌ check:minimal-page: esbuild is not resolvable from the repository root.');
    process.exit(1);
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (pkg) => resolve(ROOT, `packages/${pkg}/src/index.ts`);
const ALIAS = {
    '@exodra/context': src('context'),
    '@exodra/core': src('core'),
    '@exodra/dom': src('dom'),
    '@exodra/string': src('string'),
    '@exodra/list-reconcile': src('list-reconcile'),
};

const COUNTER = `
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoEventPort, TExoMachineNode, TExoTextPort } from '@exodra/core';

const SCHEMA = createExoSchema((b) => {
    let count!: TExoTextPort;
    let bump!: TExoEventPort;
    b.el('button', { type: 'button' }, (button) => {
        count = button.textPort();
        bump = button.eventPort('click');
    });
    return { count, bump };
});
const m = createExoMachineBuilder<TExoMachineNode, unknown, { n: number }>(SCHEMA);
m.createInitialState(() => ({ n: 0 }));
const show = m.transition((c) => {
    c.text(SCHEMA.ports.count, String(c.state.n));
});
m.wire((c) => show(c));
m.on(SCHEMA.ports.bump, (c) => {
    c.state.n += 1;
    show(c);
});
export const COUNTER = m.done();
`;

const LIST = `
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoChildrenPort, TExoMachineNode, TExoTextPort } from '@exodra/core';
import { reconcileExoOrder } from '@exodra/list-reconcile';

const ROW_SCHEMA = createExoSchema((b) => {
    let label!: TExoTextPort;
    b.el('li', null, (li) => {
        label = li.textPort();
    });
    return { label };
});
const mRow = createExoMachineBuilder<TExoMachineNode, string>(ROW_SCHEMA);
mRow.wire((c, label) => {
    c.text(ROW_SCHEMA.ports.label, label);
});
const ROW = mRow.done();

const LIST_SCHEMA = createExoSchema((b) => {
    let rows!: TExoChildrenPort;
    b.el('ul', null, (ul) => {
        rows = ul.childrenPort();
    });
    return { rows };
});
type TState = { rows: never; shown: string[] };
const mList = createExoMachineBuilder<TExoMachineNode & { childList(p: TExoChildrenPort): never; build(m: unknown, i: number, p: string): never }, unknown, TState>(LIST_SCHEMA);
mList.createInitialState((c) => ({ rows: c.childList(LIST_SCHEMA.ports.rows), shown: [] }));
mList.wire((c) => {
    const want = ['a', 'b', 'c'];
    c.state.shown = reconcileExoOrder(c.state.rows, c.state.shown, want, want, (item, i) => c.build(ROW, i, item));
});
export const LIST = mList.done();
`;

const PAGES = {
    'dom: render one machine': {
        ceilingGz: 8620,
        distCeilingGz: 8730,
        source: `${COUNTER}
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
withExoCompiler(new ExoDomBackend()).render(COUNTER as never, document.body);
`,
    },
    'dom: hydrate one machine': {
        ceilingGz: 11930,
        distCeilingGz: 12030,
        source: `${COUNTER}
import { ExoDomBackend, withExoCompiler, withExoHydration } from '@exodra/dom';
withExoHydration(withExoCompiler(new ExoDomBackend())).hydrate(COUNTER as never, document.body);
`,
    },
    'dom: render a reconciled list': {
        ceilingGz: 10175,
        distCeilingGz: 10250,
        source: `${LIST}
import { ExoDomBackend, withExoChildList, withExoCompiler } from '@exodra/dom';
withExoChildList(withExoCompiler(new ExoDomBackend())).render(LIST as never, document.body);
`,
    },
    'dom: render one machine with SVG': {
        ceilingGz: 10210,
        distCeilingGz: 10330,
        source: `${COUNTER}
import { ExoDomBackend, withExoCompiler, withExoForeignNamespaces } from '@exodra/dom';
withExoForeignNamespaces(withExoCompiler(new ExoDomBackend())).render(COUNTER as never, document.body);
`,
    },
    'string: render one machine': {
        ceilingGz: 6900,
        distCeilingGz: 7000,
        source: `${COUNTER}
import { ExoStrBackend } from '@exodra/string';
console.log(new ExoStrBackend().render(COUNTER as never));
`,
    },
};

const dir = mkdtempSync(join(tmpdir(), 'exo-minimal-page-'));
const failures = [];
const report = process.argv.includes('--files');
const ROUNDS = [
    { label: 'src ', alias: ALIAS, ceiling: (page) => page.ceilingGz },
    { label: 'dist', alias: {}, ceiling: (page) => page.distCeilingGz },
];

try {
    for (const round of ROUNDS)
        for (const [name, page] of Object.entries(PAGES)) {
            const entry = join(dir, `${name.replace(/[^a-z]+/gi, '-')}.ts`);
            writeFileSync(entry, page.source, 'utf8');
            const ceilingGz = round.ceiling(page);
            const result = await build({
                entryPoints: [entry],
                bundle: true,
                write: false,
                format: 'esm',
                platform: 'browser',
                target: 'es2020',
                minify: true,
                treeShaking: true,
                metafile: true,
                absWorkingDir: ROOT,
                logLevel: 'silent',
                define: { 'process.env.NODE_ENV': '"production"' },
                alias: round.alias,
            nodePaths: [join(ROOT, 'node_modules')],
            });
            const bytes = result.outputFiles[0].contents;
            const gz = gzipSync(Buffer.from(bytes), { level: 9 }).length;
            const over = ceilingGz > 0 && gz > ceilingGz;
            if (over)
                failures.push(`${round.label} ${name}: ${gz} gz over its ceiling of ${ceilingGz}`);
            console.log(
                `${over ? '✖' : '✓'} ${round.label} ${name.padEnd(32)} ${String(gz).padStart(
                    6
                )} gz  ${String(bytes.length).padStart(7)} min` +
                    (ceilingGz > 0 ? `   ceiling ${ceilingGz}` : '   (no ceiling)')
            );
            if ((report || over) && round.alias === ALIAS) {
                const inputs = Object.entries(Object.values(result.metafile.outputs)[0].inputs)
                    .filter(([, v]) => v.bytesInOutput > 0)
                    .sort((a, b) => b[1].bytesInOutput - a[1].bytesInOutput)
                    .slice(0, 25);
                for (const [path, v] of inputs) {
                    console.log(
                        `      ${String(v.bytesInOutput).padStart(6)}  ${
                            path.includes('exo-minimal-page-')
                                ? '(the fixture page)'
                                : relative(ROOT, resolve(ROOT, path))
                        }`
                    );
                }
            }
        }
} finally {
    rmSync(dir, { recursive: true, force: true });
}

if (failures.length > 0) {
    console.error(
        `\n✖ check:minimal-page — ${failures.length} page(s) over budget:\n  ${failures.join(
            '\n  '
        )}`
    );
    process.exit(1);
}
console.log('\n✓ check:minimal-page — every minimal page is within its ceiling');
