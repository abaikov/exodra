import type { TExoTermElement } from '@exodra/term';

// A live plain-text tree in the SAME grammar a DOM subtree is sketched in. Deliberately not
// `exoTermText`, which is this backend's own output format: re-using it would make `term` diverge
// on every rule for the reason that its serialiser is spelled differently.
//
// Three points of reconciliation: `text` is a FIELD here and a child node there, both printing as
// one quoted line at depth + 1; an unfilled text port prints nothing on either side; and a region
// prints its children inline at its siblings' depth, which is why no marker node is needed.
export function exoSketchOfTermNode(node: TExoTermElement): string {
    const lines: string[] = [];
    walk(node, 0, lines);
    return lines.join('\n');
}

export function exoSketchOfTermRoots(roots: readonly TExoTermElement[]): string {
    const lines: string[] = [];
    for (let i = 0; i < roots.length; i++) walk(roots[i], 0, lines);
    return lines.join('\n');
}

function walk(node: TExoTermElement, depth: number, lines: string[]): void {
    let line = '  '.repeat(depth) + node.tag;
    const attrs: string[] = [];
    const table = node.attrs;
    for (const name in table) attrs.push(' ' + name + '="' + table[name] + '"');
    attrs.sort();
    for (let i = 0; i < attrs.length; i++) line += attrs[i];
    lines.push(line);

    const pad = '  '.repeat(depth + 1);
    if (node.text !== null) {
        const text = node.text.trim();
        if (text !== '') lines.push(pad + '"' + text + '"');
    }

    const kids = node.kids;
    for (let i = 0; i < kids.length; i++) {
        const kid = kids[i];
        if ('tag' in kid) {
            walk(kid, depth + 1, lines);
            continue;
        }
        if ('text' in kid) {
            const text = kid.text.trim();
            if (text !== '') lines.push(pad + '"' + text + '"');
            continue;
        }
        const children = kid.children;
        for (let j = 0; j < children.length; j++) walk(children[j].node, depth + 1, lines);
    }
}
