// HOW MANY LINES OF CODE THE BENCHMARK APP COST A PARTICIPANT — counted, never typed in by hand.
//
// ── WHY THE SUITE COUNTS THIS AT ALL ────────────────────────────────────────────────────────
//
// A renderer that is ten percent faster and takes twice the code has not won, and every axis in
// this package printed only the half of that trade it could time. The participants sit side by
// side implementing the IDENTICAL app, gated byte for byte before anything is measured, which is
// exactly the condition under which a line count means something: it is the same job, so the only
// thing the number can be about is what the library made its author write.
//
// ── WHAT IS COUNTED, AND WHY THERE IS NO RULE TO ARGUE WITH ─────────────────────────────────
//
// WHOLE FILES, AND NOTHING ELSE. A participant's app lives in files that hold the app and nothing
// else (`src/benchmarks/apps/<participant>/`), and the suite's own machinery — the mount helper
// that adapts an app to `AppHandle`, the byte gate, the census reporter, the driver registration —
// lives in `src/benchmarks/participants/<participant>/`. So this counter never has to decide what
// half of a file is; it counts files, and `app-files.ts` says which files a participant's app is.
//
// A RULE ABOUT LINE RANGES INSIDE A MIXED FILE WOULD BE A RULE SOMEBODY HAS TO TRUST, and it would
// go stale the first time either half was edited. A file list stays checkable by opening the files.
//
// ── COMMENTS AND BLANK LINES ARE NOT THE APP ────────────────────────────────────────────────
//
// These files are 50-90% prose — headers stating the scene, the refusals, the traps, the
// measurements — and that prose is the most valuable content in the package. Counting it would make
// the most carefully documented participant look like the most verbose one, which inverts the
// truth. So comments and blank lines go, and what is left is counted.
//
// ── THE METHOD: LINES THAT CARRY A TOKEN ────────────────────────────────────────────────────
//
// For TypeScript and TSX this does NOT sweep for `//` and `/* */` with a regular expression. It
// hands the file to TypeScript's own parser (`ts.createSourceFile`), walks the resulting tree down
// to its LEAVES — the tokens — and marks every line any token touches. A line with no token on it
// is a blank line or a comment line, and is not counted. A line with code AND a trailing `//`
// comment is counted exactly once, because the comment is trivia and the code is not.
//
// WHAT THAT GETS RIGHT THAT A SWEEP GETS WRONG, and every one of these appears in this package:
//
//   'https://example'      a `//` INSIDE A STRING is part of the string token. The line is code,
//                          there is no comment on it, and no comment is stripped. A sweep would
//                          truncate the line at the `//` and — if the closing quote went with it —
//                          corrupt everything after.
//   `a /* b */ c`          a `/*` inside a TEMPLATE literal is part of the template token, and a
//                          template that spans lines marks every line it spans as code.
//   /[/]+/.test(s)         a slash inside a REGULAR EXPRESSION. Telling a regex from a division
//                          needs grammar context, which is precisely what a parser has and a
//                          sweep does not.
//
// A JSX text run that is only whitespace is NOT counted: it is a token, but it is the indentation
// between two elements and counting it would make blank lines reappear under another name.
//
// AND A `/** … */` BLOCK IS SKIPPED EXPLICITLY, because TypeScript parses one into real nodes and
// hangs them off the declaration they document. They are comments; they are excluded like every
// other comment, and this is the one case where "leaf of the tree" and "token of the program" do
// not agree.
//
// ── THE TWO FILE KINDS THE TYPESCRIPT PARSER CANNOT READ ────────────────────────────────────
//
// `.svelte` and `.marko` are not TypeScript, and there is no tokenizer for them here. Rather than
// guess, this file SPLITS them and REFUSES what it cannot tokenize:
//
//   `.svelte`   the `<script>` blocks go through the TypeScript parser, exactly as above. The
//               markup around them is counted line-wise, with `<!-- … -->` runs removed by a
//               character scan (not a pattern) that tracks whether it is inside a comment.
//   `.marko`    the whole file is Marko's own syntax. Counted line-wise the same way.
//
// AND THE LINE-WISE HALF CARRIES A GUARD THAT THROWS. It treats a line whose first non-blank
// characters are `//` as a comment, which is true of every line in these files today and is NOT
// true of Marko in general. So if a `//` ever appears anywhere else on a line in one of those
// regions, this counter throws and names the file and the line instead of returning a number that
// is quietly wrong. A loud refusal is the honest output; a guess is not.
import ts from 'typescript';
import { readFileSync } from 'node:fs';

/** Which parser dialect a path is read as. Anything else is refused by `slocOfFile`. */
const SCRIPT_KIND = new Map([
    ['.ts', ts.ScriptKind.TS],
    ['.tsx', ts.ScriptKind.TSX],
    ['.mts', ts.ScriptKind.TS],
    ['.js', ts.ScriptKind.JS],
    ['.jsx', ts.ScriptKind.JSX],
    ['.mjs', ts.ScriptKind.JS],
]);

/**
 * The 0-based line numbers of `text` that carry at least one TOKEN, offset by `firstLine`.
 *
 * The offset exists for `.svelte`, whose script block starts part-way down the file: the caller
 * counts the whole file's lines in one set, so a line cannot be counted twice by two regions.
 */
function tokenLines(text, fileName, scriptKind, firstLine, into) {
    const src = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, scriptKind);
    const walk = (node) => {
        // A `/** … */` BLOCK IS A COMMENT AND TYPESCRIPT PARSES IT INTO NODES. `getChildren()`
        // prepends a node's `jsDoc` array to its children, so without this every line of every
        // doc comment in this package would be counted as code — and these files are mostly doc
        // comment. The whole subtree goes, not just its head.
        if (node.kind >= ts.SyntaxKind.FirstJSDocNode && node.kind <= ts.SyntaxKind.LastJSDocNode) {
            return;
        }
        const kids = node.getChildren(src);
        if (kids.length > 0) {
            for (const kid of kids) walk(kid);
            return;
        }
        // A LEAF. `EndOfFileToken` is a position and not code; a JSX text run that is only
        // whitespace is the indentation between two elements and not code either.
        if (node.kind === ts.SyntaxKind.EndOfFileToken) return;
        if (node.kind === ts.SyntaxKind.JsxText && node.getText(src).trim() === '') return;
        // `getStart` skips the node's leading trivia — which is where a comment lives — so a
        // comment above a statement never reaches this, and a comment after code on the same line
        // is trivia of the NEXT token and does not extend any line either.
        const from = src.getLineAndCharacterOfPosition(node.getStart(src)).line;
        const to = src.getLineAndCharacterOfPosition(node.getEnd()).line;
        for (let l = from; l <= to; l++) into.add(l + firstLine);
    };
    walk(src);
}

/**
 * Count a markup region line-wise: `<!-- … -->` runs removed, blank lines dropped, and a line whose
 * first non-blank characters are `//` treated as a comment.
 *
 * IT THROWS ON A `//` ANYWHERE ELSE ON A LINE — see the header. This region has no tokenizer, so
 * the only honest alternatives are "every `//` here starts a comment, checked" and a refusal.
 */
function markupLines(text, fileName, firstLine, into) {
    const lines = text.split('\n');
    let inComment = false;
    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        // Strip the comment runs by scanning characters, tracking the open/close state across
        // lines. `out` is what is left of this line once the commented spans are gone.
        let out = '';
        for (let c = 0; c < raw.length; ) {
            if (inComment) {
                if (raw.startsWith('-->', c)) {
                    inComment = false;
                    c += 3;
                    continue;
                }
                c += 1;
                continue;
            }
            if (raw.startsWith('<!--', c)) {
                inComment = true;
                c += 4;
                continue;
            }
            out += raw[c];
            c += 1;
        }
        const trimmed = out.trim();
        if (trimmed === '') continue;
        if (trimmed.startsWith('//')) continue;
        const at = out.indexOf('//');
        if (at !== -1) {
            throw new Error(
                `app-sloc: ${fileName}:${firstLine + i + 1} carries a \`//\` that does not start ` +
                    'the line, and this region has no tokenizer — so nothing here can tell a ' +
                    'comment from a `//` inside a string, an attribute or a URL. Counting it ' +
                    'either way would publish a number that is quietly wrong. Move the code into ' +
                    'a file the TypeScript parser can read, or teach this counter that dialect.\n' +
                    `    ${out.trim()}`
            );
        }
        into.add(firstLine + i);
    }
}

/** Where each `<script …>` body starts and ends in a `.svelte` file, in character offsets. */
function svelteScriptRanges(text) {
    const ranges = [];
    let at = 0;
    for (;;) {
        const open = text.indexOf('<script', at);
        if (open === -1) return ranges;
        const bodyStart = text.indexOf('>', open);
        if (bodyStart === -1) return ranges;
        const close = text.indexOf('</script>', bodyStart);
        if (close === -1) return ranges;
        ranges.push([open, bodyStart + 1, close, close + '</script>'.length]);
        at = close + 1;
    }
}

/** 0-based line of a character offset. */
function lineAt(text, offset) {
    let line = 0;
    for (let i = 0; i < offset; i++) if (text[i] === '\n') line += 1;
    return line;
}

/**
 * COUNT ONE FILE. Throws on an extension this cannot tokenize — a participant whose app is written
 * in a dialect nothing here can read must be reported as uncounted, never estimated.
 */
export function slocOfSource(text, fileName) {
    const dot = fileName.lastIndexOf('.');
    const ext = dot === -1 ? '' : fileName.slice(dot);
    const lines = new Set();

    if (SCRIPT_KIND.has(ext)) {
        tokenLines(text, fileName, SCRIPT_KIND.get(ext), 0, lines);
        return lines.size;
    }

    if (ext === '.svelte') {
        const ranges = svelteScriptRanges(text);
        let cursor = 0;
        for (const [open, bodyStart, bodyEnd, tagEnd] of ranges) {
            // The markup BEFORE this block, then the block's own `<script …>` / `</script>` lines
            // (they are code an author wrote), then its body through the TypeScript parser.
            markupLines(text.slice(cursor, open), fileName, lineAt(text, cursor), lines);
            lines.add(lineAt(text, open));
            lines.add(lineAt(text, bodyEnd));
            tokenLines(
                text.slice(bodyStart, bodyEnd),
                `${fileName}.ts`,
                ts.ScriptKind.TS,
                lineAt(text, bodyStart),
                lines
            );
            cursor = tagEnd;
        }
        markupLines(text.slice(cursor), fileName, lineAt(text, cursor), lines);
        return lines.size;
    }

    if (ext === '.marko') {
        markupLines(text, fileName, 0, lines);
        return lines.size;
    }

    throw new Error(
        `app-sloc: no tokenizer for \`${ext}\` (${fileName}). This counter reads TypeScript, TSX, ` +
            'JavaScript, Svelte and Marko; a participant written in anything else has to be ' +
            'reported as UNCOUNTED rather than estimated.'
    );
}

/** `slocOfSource` for a path on disk. A missing file throws — a silent zero would read as "tiny". */
export function slocOfFile(path) {
    let text;
    try {
        text = readFileSync(path, 'utf8');
    } catch (e) {
        throw new Error(
            `app-sloc: cannot read \`${path}\` — it is listed in \`app-files.ts\` as part of a ` +
                `participant's app and is not on disk (${e.message}). A missing file counted as ` +
                'zero would print as the leanest participant in the table.'
        );
    }
    return slocOfSource(text, path);
}
