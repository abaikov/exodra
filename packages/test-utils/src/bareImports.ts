/**
 * The BARE specifiers a file names. The statement must BEGIN a line, which steps over a quoted
 * import inside a comment or a string literal, and it may not cross a `;`, which stops the lazy
 * middle pairing an `export function …` with an unrelated `from` further down.
 *
 * THE TYPE-POSITION FORM IS MATCHED TOO: `X extends import('@exodra/core').TExoWiring` is how a
 * file could reach into another package without ever writing an import statement.
 */
export function bareImports(source: string): string[] {
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
