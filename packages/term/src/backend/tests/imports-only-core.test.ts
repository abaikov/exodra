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
import { bareImports } from '@exodra/test-utils';

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
});
