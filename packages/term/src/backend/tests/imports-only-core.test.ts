// The claim this package is for, turned into an assertion: everything in `src/` outside `src/doc/`
// imports `@exodra/core` and `@exodra/context` and NOTHING ELSE, and no file in this
// package reaches `@exodra/dom` or `@exodra/string` at runtime or in a type. That is what makes
// this a fourth backend rather than a fork of a shipped one.
//
// IT ASSERTS THE WHOLE INVENTORY, not just the absence of two names: a rule spelled "does not
// import the DOM package" passes the day someone reaches for `@exodra/ssr`, `@exodra/forms` or a
// node built-in. Each layer below states the EXACT set of bare specifiers it may name.
//
// It parses with a regular expression rather than a TypeScript AST because an `import` statement
// always begins a line in this repository's style, and anchoring on that is what lets the pattern
// step over the two places `'@exodra/dom'` legitimately appears in this package's source: the doc
// fixtures' headers, which QUOTE the entry-point line they left out, and `readme-verbatim.test.ts`,
// which holds that line as a string literal it compares against `README.md`.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/** `src/`, with its trailing separator — every path below is built by concatenation onto it. */
const SRC = fileURLToPath(new URL('../../', import.meta.url));

/**
 * TWO NAMES. A backend writes ports and places children; keeping a port in step with a SOURCE is
 * a machine effect the application writes, so this package names no source. The day a `bind` door
 * grows back on an exonode, this list is what refuses it.
 *
 * `@exodra/context` is required and not a widening: a context frame and its tokens are what an
 * instance carries and what `inject` reads, so a backend that cannot name them cannot build an
 * instance at all.
 */
const BACKEND_MAY_IMPORT: readonly string[] = ['@exodra/core', '@exodra/context'];

/**
 * A test may read files and use the runner.
 *
 * `@exodra/computed` is here and NOT in the list above, which is the whole point of the
 * split: the declarative machine is a thing a test may build a component OUT OF, and a thing the
 * backend itself may not name. `dispose-exo-term-child.test.ts` needs it because the defect it
 * pins — a disposer drain running backwards restarts an effect on an instance being destroyed —
 * is only expressible with an effect, and effects are declared through `withExoComputedMachine`.
 */
const TEST_MAY_IMPORT: readonly string[] = [
    ...BACKEND_MAY_IMPORT,
    '@exodra/computed',
    '@exodra/test-utils',
    'vitest',
    'node:fs',
    'node:url',
];

/** Every `.ts` file under `src/`, as a path relative to it. */
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
 * The BARE specifiers a file names — every `import`/`export … from '…'` that is not relative.
 *
 * The statement must BEGIN a line (`(?:^|\n)\s*`), which excludes a quoted import inside a comment
 * or a string, and it may not cross a `;`, which stops the lazy middle from pairing an
 * `export function …` with the next unrelated `from` further down the file.
 *
 * THE TYPE-POSITION FORM IS MATCHED TOO, anywhere rather than at a line start:
 * `X extends import('@exodra/core').TExoWiring` is how `EXO_TERM_NODE_VOCABULARY.ts` states its two
 * compile-time proofs, and also exactly how a file could reach into a shipped backend without ever
 * writing an import statement. ONE RULE THAT COSTS: a comment spelling a quoted type-position import
 * in running text is read as the real thing, and must be reworded rather than exempted.
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

/** Which of the two lists governs a file; `src/doc/` holds to the backend's. */
function allowedFor(file: string): readonly string[] {
    return file.endsWith('.test.ts') ? TEST_MAY_IMPORT : BACKEND_MAY_IMPORT;
}

/**
 * THE ONE EXEMPTION, AND THE ONLY ONE. This file's last test feeds the matcher fixtures that SAY
 * `@exodra/dom` on purpose, so scanning itself would report the checker as the violation.
 * Everything else in `src/` is checked, including the doc fixtures and the other tests; the
 * assertion below pins the exemption to exactly one name so it cannot grow.
 */
const SELF = 'backend/tests/imports-only-core.test.ts';
const ALL_FILES = sourceFiles(SRC);
const FILES = ALL_FILES.filter((file) => file !== SELF);

describe('a fourth backend, written only against what @exodra/core exports', () => {
    it('finds the package to check, so an empty walk cannot pass', () => {
        expect(ALL_FILES).toContain(SELF);
        expect(ALL_FILES.length - FILES.length).toBe(1);
        expect(FILES.length).toBeGreaterThan(15);
        expect(FILES).toContain('instance/EXO_TERM_NODE_VOCABULARY.ts');
        expect(FILES).toContain('doc/readme-counter.ts');
    });

    it('no file in this package imports a shipped backend, in any position', () => {
        const offenders: string[] = [];
        for (const file of FILES) {
            for (const specifier of bareImports(readFileSync(SRC + file, 'utf8'))) {
                if (/^@exodra\/(dom|string|ssr)\b/.test(specifier)) {
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
        // Real statements, including the multi-line form every connector file uses.
        const single = "import { a } from '@exodra/core';";
        const multiLine = "import {\n  a,\n  b,\n} from '@exodra/dom';";
        const reExport = "export type { A } from '@exodra/string';";
        expect(bareImports(single)).toEqual(['@exodra/core']);
        expect(bareImports(multiLine)).toEqual(['@exodra/dom']);
        expect(bareImports(reExport)).toEqual(['@exodra/string']);

        // The type-position form, which begins no line — and which is exactly how a file could
        // reach into a shipped backend without ever writing an import statement.
        const typePosition = "type T = X extends import('@exodra/dom').Y ? 1 : 0;";
        expect(bareImports(typePosition)).toEqual(['@exodra/dom']);

        // Relative imports are this package's own business and are not specifiers to police.
        expect(bareImports("import { a } from './a';")).toEqual([]);

        // THE THREE SHAPES THAT MUST NOT READ AS IMPORTS. The first two are shapes this package
        // really produces — a fixture header quoting the entry point it left out, and a string
        // `readme-verbatim.test.ts` compares against `README.md` — and the third is why the pattern
        // may not cross a `;` while it looks for its `from`.
        //
        // The dead name inside them is deliberate: these literals exercise the SCANNER, not the API,
        // and any bare specifier after `from` would exercise it identically.
        const inComment = "//     import { renderExoRows } from '@exodra/dom';";
        const inStringLiteral = `    "import { renderExoRows } from '@exodra/dom';",`;
        const notAnImport = 'export function f(): void {\n  g();\n}\n';
        expect(bareImports(inComment)).toEqual([]);
        expect(bareImports(inStringLiteral)).toEqual([]);
        expect(bareImports(notAnImport)).toEqual([]);
    });
});
