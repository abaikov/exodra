import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

/**
 * HYDRATION IS A LEAF, ASSERTED RATHER THAN INTENDED.
 *
 * A page that only ever renders on the client should not carry the code that adopts a server's
 * markup, and the only thing delivering that is tree-shaking through the barrel: `src/index.ts`
 * names `withExoHydration`, `TExoHydrateNode` and the rest as ESM re-exports, which a bundler
 * drops when the application imports none of them. That works exactly as long as no module some
 * render path ALREADY RETAINS reaches into `hydrate/` — one such import and the whole folder is
 * welded into every bundle, re-export or not.
 *
 * IT HAD EXACTLY ONE, AND IT WAS INVISIBLE. The compiler's two parse-verification passes — both
 * run at module load of any render — value-imported `describeExoNode` from `hydrate/`. The
 * function is thirty lines with no imports at all, so no size measurement ever objected and no
 * reviewer had a reason to. What it cost was structural: while it stood, "hydration is a leaf" was
 * a habit, because any rule stating it would have needed an exception carved for this one file,
 * and an exception is where the next import goes. The function lives in `dom/` now.
 *
 * WHY THIS EXISTS BESIDE THE DEPENDENCY-CRUISER RULE rather than instead of it. The rule
 * (`hydration-is-a-leaf` in `.dependency-cruiser.cjs`) is the one that also covers the package
 * graph in the docs, and it is the gate — but it runs under `npm run graph:check`, which is not
 * what anyone runs while editing a file. This asks the same question of the same files in the
 * suite that runs on every change, and the two are written to agree deliberately: same exemptions,
 * same treatment of type-only imports.
 *
 * TYPE-ONLY IMPORTS COUNT, exactly as they do in the rule. They cost no bytes and cannot defeat a
 * shaker, so this is not a size argument — it is the same one `renderers-do-not-know-each-other`
 * makes one level up: a module on the render path having a REASON to name hydration's types is the
 * step before it has a reason to name its values, and the cheap moment to say no is the first one.
 *
 * IT IS PARSED, NOT GREPPED, for the reason `core/src/tests/browserGlobalSafety.test.ts` gives about
 * `process`: these files are mostly prose, and `hydrate/` appears in a dozen comments explaining
 * what the other side does. Only module specifiers the TypeScript parser reports are looked at.
 */

const SRC = fileURLToPath(new URL('../../', import.meta.url));
const HYDRATE = join(SRC, 'hydrate') + sep;

/**
 * THE BARREL, AND IT MUST BE EXEMPT. Naming every entry point is its whole job, and a named ESM
 * re-export is what a shaker follows — not what defeats it. It is the ONLY exemption: every other
 * file under `src/` is code some render path retains.
 */
const BARREL = join(SRC, 'index.ts');

/** Tests never reach a bundle, and `.dependency-cruiser.cjs` drops them from its crawl too. */
function isTest(name: string): boolean {
    return name.endsWith('.test.ts') || name.endsWith('.spec.ts') || name.endsWith('.d.ts');
}

function tsFilesIn(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            out.push(...tsFilesIn(full));
            continue;
        }
        if (!entry.endsWith('.ts')) continue;
        if (isTest(entry)) continue;
        out.push(full);
    }
    return out;
}

/** Every module specifier this file names — static import, re-export, or dynamic `import()`. */
function specifiersOf(source: ts.SourceFile): { text: string; pos: number }[] {
    const out: { text: string; pos: number }[] = [];
    const take = (node: ts.Node | undefined): void => {
        if (node !== undefined && ts.isStringLiteral(node)) {
            out.push({ text: node.text, pos: node.getStart(source) });
        }
    };
    const visit = (node: ts.Node): void => {
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
            take(node.moduleSpecifier);
        } else if (
            ts.isCallExpression(node) &&
            node.expression.kind === ts.SyntaxKind.ImportKeyword
        ) {
            take(node.arguments[0]);
        }
        ts.forEachChild(node, visit);
    };
    ts.forEachChild(source, visit);
    return out;
}

function at(source: ts.SourceFile, pos: number): string {
    const { line, character } = source.getLineAndCharacterOfPosition(pos);
    return `${line + 1}:${character + 1}`;
}

describe('hydration is a leaf of @exodra/dom', () => {
    it('is imported by nothing outside hydrate/ but the package barrel', () => {
        const offences: string[] = [];

        for (const file of tsFilesIn(SRC)) {
            if (file.startsWith(HYDRATE) || file === BARREL) continue;
            const text = readFileSync(file, 'utf8');
            const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);

            for (const spec of specifiersOf(source)) {
                // A bare specifier is another package; only this package's own graph is the
                // question, and nothing outside it can reach `hydrate/` except through the barrel.
                if (!spec.text.startsWith('.')) continue;
                if (!resolve(dirname(file), spec.text).startsWith(HYDRATE)) continue;
                offences.push(
                    `packages/dom/src/${file.slice(SRC.length)}:${at(source, spec.pos)} — ` +
                        `imports '${spec.text}'. This module is retained by a render path, so ` +
                        'the import welds hydration into every client-only bundle. Move what ' +
                        'is shared into the folder that reads it FIRST — `hydrate/` may import ' +
                        'from `dom/` freely, which is the leaf pointing at the trunk.'
                );
            }
        }

        expect(
            offences,
            `${offences.length} import(s) into hydrate/ from outside it:\n` + offences.join('\n')
        ).toEqual([]);
    });
});
