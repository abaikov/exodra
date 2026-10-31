// `core-is-zero-dep` in `.dependency-cruiser.cjs` reads the IMPORT GRAPH, and a module can know
// the DOM without importing anything. It did, twice, for months under a green gate:
//
//   · `packages/core/src/list/` called `insertBefore`, `removeChild` and `parentNode`. It is now
//     `@exodra/list-reconcile`.
//   · `events/` and `machine/` typed a handler's two pass-through parameters `Event` and `Element`.
//     `@exodra/term` had to fabricate one and cast the other, and its own comment called the second
//     cast a lie in the type system. Both are generic now, defaulted to `unknown`.
//
// THIS FILE IS THE GATE THE GRAPH CANNOT BE. It is a name test, not an import test.
//
// IT IS PARSED, NOT GREPPED, for the reason `browserGlobalSafety.test.ts` gives: these files are
// mostly prose, and a scanner that cannot tell a comment from a type reference reports the
// explanation instead of the code.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../', import.meta.url));

/**
 * lib.dom NAMES THIS PACKAGE MAY NOT SPEAK. A written-down list, never a pattern: a pattern would
 * decide by spelling, and the question is which vocabulary a name belongs to. Extending it is a
 * deliberate act; so is exempting something.
 */
const DOM_NAMES: readonly string[] = [
    'document',
    'window',
    'Document',
    'DocumentFragment',
    'Element',
    'HTMLElement',
    'SVGElement',
    'Node',
    'NodeList',
    'Text',
    'Comment',
    'Event',
    'EventTarget',
    'MouseEvent',
    'KeyboardEvent',
    'MutationObserver',
    'setAttribute',
    'removeAttribute',
    'setAttributeNS',
    'removeAttributeNS',
    'getAttribute',
    'insertBefore',
    'removeChild',
    'appendChild',
    'replaceChild',
    'parentNode',
    'nextSibling',
    'previousSibling',
    'firstChild',
    'childNodes',
    'textContent',
    'innerHTML',
    'outerHTML',
    'classList',
    'addEventListener',
    'removeEventListener',
    'dispatchEvent',
    'cloneNode',
    'importNode',
    'createElement',
    'createTextNode',
    'querySelector',
    'querySelectorAll',
    'requestAnimationFrame',
    'localName',
    'namespaceURI',
];

/**
 * THE ONE EXEMPTION, BY EXACT PATH AND WITH ITS REASON. `escapeExoText` and its attribute twin deal
 * in HTML entities and belong in core — both backends call them — but neither names anything in the
 * list, so no exemption is needed for them and the list below stays empty.
 *
 * An entry here is a claim that a DOM name in core is correct. Write the sentence, or move the code.
 */
const EXEMPT: readonly { readonly file: string; readonly name: string; readonly why: string }[] =
    [];

/** Every non-test `.ts` under `src/`, as a path relative to it. */
function sourceFiles(dir: string, prefix = ''): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
        const path = dir + entry;
        if (statSync(path).isDirectory()) {
            // `bench/` is skipped for the same reason `tests/` is, and the reason is proved rather
            // than asserted: `browserGlobalSafety.test.ts` walks the import graph from the barrel
            // and fails if any bench is reachable from it. A bench measuring event dispatch builds
            // a real `Event` on purpose — that is the thing being timed.
            if (entry === 'tests' || entry === 'bench') continue;
            out.push(...sourceFiles(path + '/', prefix + entry + '/'));
            continue;
        }
        if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) out.push(prefix + entry);
    }
    return out;
}

/**
 * Every forbidden name this source SPEAKS — in a value position or a type position, never in a
 * comment and never inside a string literal, because the parser yields neither as an identifier.
 *
 * A property access is checked on its NAME only (`node.insertBefore` fires on `insertBefore`), and
 * an object key is not: `{ parentNode: x }` in a plain record is this repository's own vocabulary.
 */
function domNamesIn(source: string, file: string): string[] {
    const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.ESNext, true);
    const found: string[] = [];
    const forbidden = new Set(DOM_NAMES);

    const visit = (node: ts.Node): void => {
        if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)) {
            // The KEY is ours; the value is not skipped.
            visit(node.initializer);
            return;
        }
        if (ts.isIdentifier(node) && forbidden.has(node.text)) found.push(node.text);
        ts.forEachChild(node, visit);
    };
    visit(parsed);
    return found;
}

const FILES = sourceFiles(SRC);

describe('@exodra/core speaks no DOM, in code or in types', () => {
    it('finds the package, so an empty walk cannot pass', () => {
        expect(FILES.length).toBeGreaterThan(80);
        expect(FILES).toContain('index.ts');
        expect(FILES).toContain('schema/ports/asserts/assertExoChildrenPort.ts');
    });

    it('the parser tells a comment and a string from a type reference', () => {
        expect(domNamesIn('// insertBefore is what list/ used to call\n', 'x.ts')).toEqual([]);
        expect(domNamesIn('const m = "node.insertBefore(a, b)";\n', 'x.ts')).toEqual([]);
        expect(domNamesIn('function f(e: Event): void {}\n', 'x.ts')).toEqual(['Event']);
        expect(domNamesIn('p.insertBefore(a, b);\n', 'x.ts')).toEqual(['insertBefore']);
    });

    it('names no DOM type and calls no DOM method', () => {
        const exempt = new Set(EXEMPT.map((e) => `${e.file}:${e.name}`));
        const offenders: string[] = [];
        for (const file of FILES) {
            for (const name of new Set(domNamesIn(readFileSync(SRC + file, 'utf8'), file))) {
                if (!exempt.has(`${file}:${name}`)) offenders.push(`${file} speaks ${name}`);
            }
        }
        expect(offenders).toEqual([]);
    });

    it('every exemption carries a reason, so the list cannot grow silently', () => {
        for (const entry of EXEMPT) expect(entry.why.length).toBeGreaterThan(40);
    });
});
