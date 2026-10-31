// IT ASSERTS THE WHOLE INVENTORY, not the absence of a few names: each layer below states the EXACT
// set of bare specifiers it may name. The scanner is `@exodra/term`'s, name for name, so a shape
// that fools one fools neither.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../', import.meta.url));

/** TWO NAMES. A backend writes ports and places children; a source is the application's word. */
const RENDERER_MAY_IMPORT: readonly string[] = ['@exodra/core', '@exodra/context'];

/** `jsdom` is the document a bench runs against outside a browser. */
const BENCH_MAY_IMPORT: readonly string[] = [...RENDERER_MAY_IMPORT, 'jsdom'];

/** A test may drive the machine, read files, and use the runner. */
const TEST_MAY_IMPORT: readonly string[] = [
    ...BENCH_MAY_IMPORT,
    '@exodra/computed',
    '@exodra/list-reconcile',
    '@exodra/string',
    '@exodra/test-utils',
    '@exodra/dom',
    'vitest',
    'typescript',
    'node:fs',
    'node:path',
    'node:url',
];

function sourceFiles(dir: string, prefix = ''): string[] {
    const out: string[] = [];
    const entries = readdirSync(dir, { withFileTypes: true });
    entries.sort((a, b) => (a.name < b.name ? -1 : 1));
    for (const entry of entries) {
        if (entry.isDirectory()) {
            out.push(...sourceFiles(dir + entry.name + '/', prefix + entry.name + '/'));
            continue;
        }
        if (entry.name.endsWith('.ts')) out.push(prefix + entry.name);
    }
    return out;
}

/**
 * The BARE specifiers a file names. The statement must BEGIN a line, which steps over a quoted
 * import inside a comment or a string literal, and it may not cross a `;`, which stops the lazy
 * middle pairing an `export function …` with an unrelated `from` further down.
 *
 * THE TYPE-POSITION FORM IS MATCHED TOO: `X extends import('@exodra/core').TExoWiring` is how a
 * file could reach into another package without ever writing an import statement.
 */
function bareImports(source: string): string[] {
    const found = new Set<string>();
    const take = (specifier: string): void => {
        if (!specifier.startsWith('.')) found.add(specifier);
    };

    const statements = /(?:^|\n)[ \t]*(?:import|export)\b[^;]*?\bfrom\s*'([^']+)'/g;
    let match = statements.exec(source);
    while (match !== null) {
        take(match[1]);
        match = statements.exec(source);
    }

    const inType = /\bimport\s*\(\s*'([^']+)'\s*\)/g;
    match = inType.exec(source);
    while (match !== null) {
        take(match[1]);
        match = inType.exec(source);
    }

    return [...found].sort();
}

function allowedFor(file: string): readonly string[] {
    if (file.endsWith('.test.ts')) return TEST_MAY_IMPORT;
    if (file.includes('bench/')) return BENCH_MAY_IMPORT;
    return RENDERER_MAY_IMPORT;
}

/** This file's last test feeds the scanner fixtures that SAY the forbidden names on purpose. */
const SELF = 'tests/imports-only-core.test.ts';
const ALL_FILES = sourceFiles(SRC);
const FILES = ALL_FILES.filter((file) => file !== SELF);

describe('@exodra/dom names the schema surface and the context vocabulary, and nothing else', () => {
    it('finds the package to check, so an empty walk cannot pass', () => {
        expect(ALL_FILES).toContain(SELF);
        expect(ALL_FILES.length - FILES.length).toBe(1);
        expect(FILES.length).toBeGreaterThan(100);
        expect(FILES).toContain('dom/EXO_DOM_NODE_VOCABULARY.ts');
        expect(FILES).toContain('hydrate/EXO_HYDRATE_NODE_VOCABULARY.ts');
    });

    it('no file in this package reaches another backend outside a test', () => {
        const offenders: string[] = [];
        for (const file of FILES) {
            if (file.endsWith('.test.ts')) continue;
            for (const specifier of bareImports(readFileSync(SRC + file, 'utf8'))) {
                if (/^@exodra\/(string|term|ssr)\b/.test(specifier)) {
                    offenders.push(`${file} imports ${specifier}`);
                }
            }
        }
        expect(offenders).toEqual([]);
    });

    it('every file imports only what its layer may name', () => {
        const offenders: string[] = [];
        for (const file of FILES) {
            const allowed = allowedFor(file);
            for (const specifier of bareImports(readFileSync(SRC + file, 'utf8'))) {
                if (!allowed.includes(specifier)) offenders.push(`${file} imports ${specifier}`);
            }
        }
        expect(offenders).toEqual([]);
    });

    it('the pattern it checks with actually bites', () => {
        const single = "import { a } from '@exodra/core';";
        const multiLine = "import {\n  a,\n  b,\n} from '@exodra/ssr';";
        const reExport = "export type { A } from '@exodra/list-reconcile';";
        expect(bareImports(single)).toEqual(['@exodra/core']);
        expect(bareImports(multiLine)).toEqual(['@exodra/ssr']);
        expect(bareImports(reExport)).toEqual(['@exodra/list-reconcile']);

        const typePosition = "type T = X extends import('@exodra/ssr').Y ? 1 : 0;";
        expect(bareImports(typePosition)).toEqual(['@exodra/ssr']);

        expect(bareImports("import { a } from './a';")).toEqual([]);

        const inComment = "//     import { renderExoPage } from '@exodra/ssr';";
        const inStringLiteral = `    "import { renderExoPage } from '@exodra/ssr';",`;
        const notAnImport = 'export function f(): void {\n  g();\n}\n';
        expect(bareImports(inComment)).toEqual([]);
        expect(bareImports(inStringLiteral)).toEqual([]);
        expect(bareImports(notAnImport)).toEqual([]);
    });
});
