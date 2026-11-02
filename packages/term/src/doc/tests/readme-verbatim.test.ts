// The test that makes "unmodified" a fact rather than a claim. The acceptance test of this package
// is only worth something if the component really is the documented one — a copy quietly adjusted
// to fit proves the opposite of what it looks like it proves.
//
// This reads `README.md` off disk, pulls out the two `ts` code blocks, removes the ENTRY-POINT
// lines (which no backend can share, by definition), and compares what is left against the marked
// region of the fixture files character for character. IT ALSO ASSERTS WHICH LINES WERE REMOVED, so
// the removal cannot quietly grow to cover an inconvenient one.
//
// Nothing here renders: this file reads two text files and compares them, so it imports no backend
// at all.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const README = readFileSync(
    fileURLToPath(new URL('../../../../../README.md', import.meta.url)),
    'utf8'
);

/** Every fenced `ts` block in the README, in order. */
function tsBlocks(markdown: string): string[] {
    const out: string[] = [];
    const pattern = /```ts\n([\s\S]*?)```/g;
    let match = pattern.exec(markdown);
    while (match !== null) {
        out.push(match[1]);
        match = pattern.exec(markdown);
    }
    return out;
}

/** Blank lines at either end are not part of the code. */
function trimBlankEdges(lines: string[]): string[] {
    let start = 0;
    let end = lines.length;
    while (start < end && lines[start].trim() === '') start++;
    while (end > start && lines[end - 1].trim() === '') end--;
    return lines.slice(start, end);
}

/** What the fixture file says it copied — everything between its two markers. */
function verbatimRegion(file: string): string {
    const source = readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8');
    const lines = source.split('\n');
    const begin = lines.findIndex((line) => line.startsWith('// >>> BEGIN VERBATIM'));
    const end = lines.findIndex((line) => line.startsWith('// <<< END VERBATIM'));
    expect(begin, `${file} has no BEGIN VERBATIM marker`).toBeGreaterThanOrEqual(0);
    expect(end, `${file} has no END VERBATIM marker`).toBeGreaterThan(begin);
    return trimBlankEdges(lines.slice(begin + 1, end)).join('\n');
}

/**
 * The block with the entry-point lines taken out, and the lines that were taken out, side by
 * side — so a test can assert both halves.
 */
function withoutEntryPoint(block: string): { kept: string; dropped: string[] } {
    const dropped: string[] = [];
    const kept = block.split('\n').filter((line) => {
        const isEntryPoint =
            line.includes("from '@exodra/dom'") ||
            // WHATEVER THE README CALLS THE MOUNT. These are text patterns matched against
            // markdown, not calls, and the `dropped` expectations below name the same lines — a
            // README that spells its entry point differently is a failure in both places.
            line.includes('.render(') ||
            // The README's list block DEMONSTRATES the list by mutating it after mounting. A
            // module that did that at import time would run before any test could see the state
            // before it, so the fixture leaves it out and `readme-todos.test.ts` performs it.
            line.includes('todos.push(');
        if (isEntryPoint) dropped.push(line);
        return !isEntryPoint;
    });
    return { kept: trimBlankEdges(kept).join('\n'), dropped };
}

describe('the doc components this backend runs are the README’s, character for character', () => {
    it('finds both blocks in README.md', () => {
        const blocks = tsBlocks(README);
        expect(blocks.some((b) => b.includes('const Counter = composeExoMachine('))).toBe(true);
        expect(blocks.some((b) => b.includes('const TodoList = createExoMachine<TExoChildrenWiring & TExoMachineNode>(todoListSchema, {'))).toBe(true);
    });

    it('the counter fixture is the README block minus its two entry-point lines', () => {
        const block = tsBlocks(README).find((b) => b.includes('const Counter = composeExoMachine('));
        expect(block).toBeDefined();
        const { kept, dropped } = withoutEntryPoint(block as string);

        expect(dropped).toEqual([
            "import { ExoDomBackend, withExoCompiler } from '@exodra/dom';",
            'const dispose = withExoCompiler(new ExoDomBackend()).render(Counter, document.body);',
        ]);
        expect(kept).toBe(verbatimRegion('../readme-counter.ts'));
    });

    it('the todo-list fixture is the README block minus its entry point', () => {
        const block = tsBlocks(README).find((b) => b.includes('const TodoList = createExoMachine<TExoChildrenWiring & TExoMachineNode>(todoListSchema, {'));
        expect(block).toBeDefined();
        const { kept, dropped } = withoutEntryPoint(block as string);

        expect(dropped).toEqual([
            "import { ExoDomBackend, withExoCompiler } from '@exodra/dom';",
            'withExoCompiler(new ExoDomBackend()).render(TodoList, document.body);',
        ]);
        expect(kept).toBe(verbatimRegion('../readme-todos.ts'));
    });

    it('neither fixture reaches a shipped backend', () => {
        for (const file of ['../readme-counter.ts', '../readme-todos.ts']) {
            const source = readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8');
            expect(verbatimRegion(file)).not.toMatch(/@exodra\/(dom|string)/);
            // …and no IMPORT anywhere in the file reaches one either. Compared against real
            // import statements rather than against the text, because the headers of both
            // fixtures QUOTE the entry-point line they left out.
            const imports = source
                .split('\n')
                .filter((line) => /^\s*import\b/.test(line))
                .join('\n');
            expect(imports).not.toMatch(/@exodra\/(dom|string)/);
        }
    });
});
