// JSX's whitespace rules, which must match Babel's and React's exactly.
export function cleanJsxText(raw: string): string {
    const lines = raw.split(/\r\n|\n|\r/);
    // Default 0, as Babel does: a whitespace-only single line stays ONE space, which requires
    // treating it as the last non-empty line.
    let lastNonEmpty = 0;
    for (let i = 0; i < lines.length; i++) {
        if (/[^ \t]/.test(lines[i])) lastNonEmpty = i;
    }
    let out = '';
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].replace(/\t/g, ' ');
        if (i !== 0) line = line.replace(/^ +/, '');
        if (i !== lines.length - 1) line = line.replace(/ +$/, '');
        if (!line) continue;
        if (i !== lastNonEmpty) line += ' ';
        out += line;
    }
    return out;
}
