import type { TExoTermElement } from './types/TExoTermElement';

// Plain by default, so a test can compare the output as a string.
export type TExoTermTextOptions = {
    readonly ansi?: boolean;
    // Spaces per level. Two by default.
    readonly indent?: number;
};

// Built rather than typed, so no raw control byte lives in this source file.
const ESC = String.fromCharCode(27);
const RESET = ESC + '[0m';
const BOLD = ESC + '[1m';
const DIM = ESC + '[2m';
const GREEN = ESC + '[32m';
const YELLOW = ESC + '[33m';

// A children port prints INLINE, at its element's kid depth, with no line of its own.
// NOTHING IS ESCAPED, deliberately — README, "Escaping, and the test for the next backend".
export function exoTermText(root: TExoTermElement, options?: TExoTermTextOptions): string {
    const ansi = options?.ansi === true;
    const width = options?.indent ?? 2;
    const lines: string[] = [];

    const tagOf = (tag: string): string => (ansi ? BOLD + tag + RESET : tag);
    const attrOf = (name: string, value: string): string =>
        ansi ? DIM + ' ' + name + '="' + value + '"' + RESET : ' ' + name + '="' + value + '"';
    const eventOf = (name: string): string =>
        ansi ? YELLOW + ' on:' + name + RESET : ' on:' + name;
    const textOf = (text: string): string =>
        ansi ? GREEN + '"' + text + '"' + RESET : '"' + text + '"';

    function walk(node: TExoTermElement, depth: number): void {
        const pad = ' '.repeat(depth * width);
        let line = pad + tagOf(node.tag);
        const attrs = node.attrs;
        for (const name in attrs) line += attrOf(name, attrs[name]);
        const listeners = node.listeners;
        for (const name in listeners) line += eventOf(name);
        if (node.text !== null) line += ' ' + textOf(node.text);
        lines.push(line);

        const kids = node.kids;
        for (let i = 0; i < kids.length; i++) {
            const kid = kids[i];
            if ('tag' in kid) {
                walk(kid, depth + 1);
                continue;
            }
            if ('text' in kid) {
                if (kid.text.length > 0) {
                    lines.push(' '.repeat((depth + 1) * width) + textOf(kid.text));
                }
                continue;
            }
            const children = kid.children;
            for (let j = 0; j < children.length; j++) walk(children[j].node, depth + 1);
        }
    }

    walk(root, 0);
    return lines.join('\n');
}
