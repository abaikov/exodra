import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

/**
 * WHAT THIS TEST IS FOR. `@exodra/core`, `@exodra/string` and `@exodra/dom` each ship an ESM
 * `dist/index.js` that a page is meant to be able to import from a `<script type="module">`
 * with no bundler anywhere — that is one of the two ways this repository delivers its
 * no-build-step promise, the other being the CDN IIFE. Every bare `process.env.NODE_ENV` in
 * that file breaks it: a browser has no `process`, so the first schema the page builds throws
 * `ReferenceError: process is not defined` and nothing renders. It DID break, at six sites in
 * core, four in dom and four in string, and no test noticed — because every test in this
 * repository runs under Node, where `process` exists and the guard is invisible.
 *
 * SO THE ASSERTION IS ABOUT THE SOURCE TEXT, NOT ABOUT BEHAVIOUR. There is no way to observe
 * this by calling the code from Node, and faking it (deleting `globalThis.process` and
 * re-importing) would assert against a mock of a browser rather than against a browser. What
 * can be checked exactly is the thing that was actually wrong: the spelling at the site. The
 * rule is stated once, in `createExoSchema`'s two-baskets note under "HOW IT IS SPELLED", and it is:
 *
 *     typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
 *
 * with the `typeof` FIRST, written out at the site. It is written out rather than shared
 * because a bundler substitutes the member expression textually and then folds the whole `&&`
 * to `false`, which is what deletes the guarded refusal from a production build; a helper call
 * or a cross-module `const` would survive the fold and the messages would ship.
 *
 * THE SOURCE IS WHAT IS SCANNED, NOT `dist`. tsup/esbuild emits these expressions verbatim —
 * the broken `dist` lines were character-for-character their source lines — so source is the
 * origin of the defect, and it is present in a fresh clone that has never run a build, where
 * `dist` is not.
 *
 * IT IS PARSED, NOT GREPPED. These files are mostly prose: the word "process" appears in
 * dozens of comments ("for the life of the process"), and the runtime source also contains
 * regex literals with quotes in them, which defeats every naive text scanner. So TypeScript's
 * own parser finds the references and the textual rule is applied only at the offsets it
 * reports.
 */

const PACKAGES_DIR = fileURLToPath(new URL('../../../', import.meta.url));

/** The three packages whose ESM build is meant to be importable straight into a browser. */
const RUNTIME_PACKAGES = ['core', 'string', 'dom'] as const;

/**
 * The exact prefix a `process` member read must carry. Compared against the source text with
 * whitespace runs collapsed, so the multi-line form prettier produces for a longer condition
 * passes and a `typeof` moved after the read does not.
 */
const REQUIRED_PREFIX = "typeof process !== 'undefined' && ";

/**
 * Node-only globals that are as absent from a browser as `process` is, and would fail the same
 * way. `module` and `global` are deliberately NOT here: both are ordinary English words that
 * could legitimately name a local, and a test that cries about a parameter named `module` would
 * be turned off. Neither appears in these packages, nor in their built `dist/index.js`.
 */
const FORBIDDEN_GLOBALS = ['require', '__dirname', '__filename', 'Buffer'];

function tsFilesIn(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            out.push(...tsFilesIn(full));
            continue;
        }
        if (!entry.endsWith('.ts') && !entry.endsWith('.tsx')) continue;
        // Tests and ambient declarations never reach a browser.
        if (entry.endsWith('.test.ts') || entry.endsWith('.spec.ts') || entry.endsWith('.d.ts')) {
            continue;
        }
        // A BENCH LIVES BESIDE ITS `tests/`, IN THE DOMAIN IT MEASURES, and reads `process.argv`
        // on purpose — it is a command-line program. It is excluded from every package's build
        // `tsconfig` (`**/bench/**`) and reachable from no barrel, so it cannot enter a `dist`.
        // THE SECOND ASSERTION BELOW PROVES THAT rather than trusting this line: an `index.ts`
        // that ever reaches into a `bench/` turns this exclusion into a hole, and the gate says so.
        if (full.includes('/bench/')) continue;
        out.push(full);
    }
    return out;
}

type TParsedSource = { file: string; text: string; source: ts.SourceFile };

/**
 * Parsed ONCE and shared by both assertions below — 177 files, and the second `it` would
 * otherwise re-parse every one of them to ask a different question of the same trees.
 */
let parsed: TParsedSource[] | null = null;

function runtimeSources(): TParsedSource[] {
    if (parsed !== null) return parsed;
    const out: TParsedSource[] = [];
    for (const pkg of RUNTIME_PACKAGES) {
        for (const file of tsFilesIn(join(PACKAGES_DIR, pkg, 'src'))) {
            const text = readFileSync(file, 'utf8');
            out.push({
                file,
                text,
                // `true` sets parent pointers, which is what makes "is this `process`
                // the operand of a `typeof`, or the object of a member read?" answerable.
                source: ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true),
            });
        }
    }
    parsed = out;
    return out;
}

/** Every identifier with the given name, as parsed — never as matched in a comment or string. */
function identifiersNamed(source: ts.SourceFile, name: string): ts.Identifier[] {
    const found: ts.Identifier[] = [];
    const visit = (node: ts.Node): void => {
        if (ts.isIdentifier(node) && node.text === name) found.push(node);
        ts.forEachChild(node, visit);
    };
    ts.forEachChild(source, visit);
    return found;
}

function at(source: ts.SourceFile, pos: number): string {
    const { line, character } = source.getLineAndCharacterOfPosition(pos);
    return `${line + 1}:${character + 1}`;
}

function relative(file: string): string {
    return 'packages/' + file.slice(PACKAGES_DIR.length);
}

describe('browser global safety — the three runtime packages import into a bare <script type="module">', () => {
    it("reads no property of `process` without a `typeof process !== 'undefined' &&` in front of it", () => {
        const offences: string[] = [];

        for (const { file, text, source } of runtimeSources()) {
            for (const id of identifiersNamed(source, 'process')) {
                const parent = id.parent;

                // `typeof process` is the guard itself, and the one read of a missing global
                // that does not throw.
                if (ts.isTypeOfExpression(parent)) continue;

                const isMemberRead =
                    (ts.isPropertyAccessExpression(parent) ||
                        ts.isElementAccessExpression(parent)) &&
                    parent.expression === id;

                if (!isMemberRead) {
                    offences.push(
                        `${relative(file)}:${at(source, id.getStart(source))} — ` +
                            '`process` is referenced bare. A browser has no such global; ' +
                            "reach it only as `typeof process !== 'undefined' && process.…`"
                    );
                    continue;
                }

                const start = parent.getStart(source);
                const before = text.slice(Math.max(0, start - 80), start).replace(/\s+/g, ' ');

                if (!before.endsWith(REQUIRED_PREFIX)) {
                    offences.push(
                        `${relative(file)}:${at(source, start)} — ` +
                            `\`${parent.getText(source).slice(0, 40)}\` is read without ` +
                            `\`${REQUIRED_PREFIX.trim()}\` immediately in front of it. ` +
                            'Without it this file throws `ReferenceError: process is not ' +
                            'defined` in a browser that imports dist/index.js with no ' +
                            'bundler. See the two-baskets note in core/src/exoSchema.ts.'
                    );
                }
            }
        }

        expect(
            offences,
            `${offences.length} unguarded read(s) of \`process\`:\n` + offences.join('\n')
        ).toEqual([]);
    });

    it('references no other Node-only global', () => {
        const offences: string[] = [];

        for (const { file, source } of runtimeSources()) {
            for (const name of FORBIDDEN_GLOBALS) {
                for (const id of identifiersNamed(source, name)) {
                    // A `typeof` probe is safe, and a property named `Buffer` on someone
                    // else's object (`x.Buffer`) is not a global read at all.
                    if (ts.isTypeOfExpression(id.parent)) continue;
                    if (ts.isPropertyAccessExpression(id.parent) && id.parent.name === id) {
                        continue;
                    }
                    offences.push(
                        `${relative(file)}:${at(source, id.getStart(source))} — ` +
                            `\`${name}\` does not exist in a browser, and these three ` +
                            'packages are meant to import into one with no bundler.'
                    );
                }
            }
        }

        expect(
            offences,
            `${offences.length} Node-only global reference(s):\n` + offences.join('\n')
        ).toEqual([]);
    });

    /**
     * THE EXCLUSION ABOVE IS PROVED HERE, NOT TRUSTED. `tsFilesIn` skips `bench/` because a bench
     * is a command-line program that cannot enter a bundle — and that is true only while nothing
     * a page loads reaches into one. This walks the import graph from each package's barrel and
     * fails the moment a reachable file names a `bench/` path, which is exactly the day the
     * exclusion would start hiding an unguarded `process.argv` in shipping code.
     */
    it('no bench is reachable from any barrel, so skipping them hides nothing', () => {
        const offences: string[] = [];
        for (const pkg of RUNTIME_PACKAGES) {
            const src = join(PACKAGES_DIR, pkg, 'src');
            const seen = new Set<string>();
            const queue = [join(src, 'index.ts')];
            while (queue.length > 0) {
                const file = queue.pop() as string;
                if (seen.has(file) || !existsSync(file)) continue;
                seen.add(file);
                if (file.includes('/bench/')) {
                    offences.push(`${relative(file)} is reachable from ${pkg}'s barrel`);
                    continue;
                }
                const text = readFileSync(file, 'utf8');
                for (const m of text.matchAll(/(?:from|import\s*\()\s*'(\.[^']+)'/g)) {
                    const base = join(dirname(file), m[1]);
                    queue.push(existsSync(base + '.ts') ? base + '.ts' : join(base, 'index.ts'));
                }
            }
            expect(
                seen.size,
                `${pkg}'s barrel reached nothing — the walk is broken`
            ).toBeGreaterThan(5);
        }
        expect(offences).toEqual([]);
    });
});
