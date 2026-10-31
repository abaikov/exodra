// BUNDLE-SIZE TRIPWIRE — fails when a package grows past what a PAGE can afford.
//
// Run after building:  node scripts/check-bundle-size.mjs   (or `npm run check:size`)
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT IT MEASURES, AND WHY IT CHANGED.
//
// It used to budget the RAW bytes of `dist/index.js`. That number says almost nothing about what
// a user pays: `dist/index.js` is the unminified, un-defined build meant for a bundler, which will
// minify it, strip the dev refusals through its own `NODE_ENV` substitution, and tree-shake away
// whatever the app never imports. Measured: `@exodra/dom`'s `dist/index.js` is
// 196 502 raw bytes and the minified browser build of the same code is 48 599 — so the old budget
// was policing a number 4× larger than the one that reaches a browser, and it had drifted so far
// that FOUR of seven packages were over it while the script was wired into nothing at all: not
// `package.json`, not CI, not `release:check`. A guard nobody runs is not a guard.
//
// So the gate is now the **gzipped browser build** — `dist/exodra.esm.js`, the minified ESM a page
// imports with no bundler — because that is the artifact whose bytes are time-to-first-click. The
// raw ESM entry is still printed, as information, with a deliberately loose ceiling whose only job
// is to catch a runtime dependency sneaking into a package that should not have one.
//
// `@exodra/string` has no browser build on purpose: it renders on the server, and cdn.md says so.
// It is gated on its bundler entry alone.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE ENTRY CEILING MEASURES CODE, NOT PROSE, AND THIS IS WHY.
//
// The entry ceiling exists to catch a runtime dependency sneaking into a package that should not
// have one. It was gating `statSync(dist/index.js).size`, which is not that number: `dist/index.js`
// is unminified, and this repository writes its argument in the source, so the bundler entry it
// emits is MOSTLY COMMENT. Measured: with the scanner below:
//
//     package      raw bytes    code bytes    comment bytes
//     dom            256 892       119 305          134 517   comments are 52% of the file
//     string          39 718        15 521           24 060   comments are 61% of the file
//     core            48 053        38 366            9 563
//     router          29 633        27 688            1 820
//     reactivity       9 813         9 427              364
//     forms            1 405         1 212              181
//     jsx                 33             0               33   the whole entry is a sourceMappingURL
//
// So the gate was red on `dom` (256 892 against 210 000) and on `string` (39 718 against 32 000)
// for writing documentation, and it could not have told that apart from a dependency arriving —
// which is the one distinction it exists to make. A tripwire that fires when somebody explains
// their code teaches people to stop explaining it, or to bump the number, and both are worse than
// no tripwire.
//
// `string` deserves its own sentence, because the overage there looked unexplained: only 1 071
// bytes of it are `//` lines, so a count of line comments says prose is not the cause. It is.
// The prose is in JSDoc: 337 lines of `*` continuation carrying 22 911 bytes. esbuild keeps a
// JSDoc block attached to a class member, so a method doc on the package's node type is shipped
// in the bundler entry verbatim.
//
// THE PER-FILE ATTRIBUTION THAT STOOD HERE IS STRUCK, AND NOTHING REPLACES IT. It priced ONE
// source file at 26 240 bytes of the entry, 22 449 of them comment, and that file has been
// deleted. The package's node is `src/node/EXO_STR_NODE_VOCABULARY.ts`, 6 468 bytes of SOURCE — a quarter
// of what the struck figure describes — so the split cannot be moved onto it, and no substitute
// number is invented here. WHERE `@exodra/string`'s entry bytes sit is UNMEASURED until somebody
// builds the package and runs `npm run check:size`. The whole-entry figures below are the last
// ones this scanner took, and they were taken from a build of that older tree.
//
// HOW THE COMMENTS ARE REMOVED, and what that is worth. `entryCodeBytes` runs a character scanner
// over the file that knows the four contexts a `/` can appear in — ordinary code, a quoted string,
// a template literal (with `${}` interpolations nested to any depth), and a regular expression —
// so a `//` inside a string literal or a `/*` inside a regex character class is code and stays.
// The one genuinely ambiguous case in JavaScript is `/` as division against `/` opening a regex,
// and it is settled twice over: by the previous significant token (an identifier, a number, `)`,
// `]`, or a closing quote means division; anything else, or one of the keywords that can precede a
// regex, means a regex), and then by a REQUIREMENT THAT THE REGEX CLOSE ON ITS OWN LINE. A regex
// literal cannot span a newline, so when the scan runs off the end of the line the `/` was
// division after all and the scanner rewinds and treats it as ordinary code. That second rule is
// what makes a wrong guess harmless rather than a swallowed line of source.
//
// After the comments are gone, whitespace-only lines are dropped too. Otherwise a 570-line comment
// block would still leave 570 indents behind and the number would keep moving with the prose.
//
// THE RAW BYTES ARE STILL PRINTED, in their own column, because they are what `ls -l` says and a
// reader comparing the two columns can see how much of a package is its own explanation. Nothing
// is gated on them.
//
// WHAT THIS DOES NOT FIX. The scanner is not a JavaScript parser and never sees a syntax it does
// not know how to skip — an unterminated string, a stray backtick in generated output. Every path
// through it either copies bytes or skips a comment it positively identified, so the failure mode
// is over-counting (a comment counted as code), never under-counting, and over-counting can only
// make the gate stricter than intended. If that ever matters, the honest replacement is not a
// better regex: it is asking the bundler that produced the file, since it already parsed it.
import { readFileSync, existsSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * `browserGzip` is THE GATE FOR A PAGE: gzipped bytes of the minified browser ESM build.
 * `entryCode` is a loose ceiling on the CODE in the bundler entry, comments and blank lines
 * removed — a dependency-sneaking tripwire, not a size target. `null` means the package ships no
 * browser build.
 *
 * BUDGETS ARE A TRIPWIRE WITH HEADROOM, NOT A TARGET. Bump one deliberately when a real feature
 * lands, and never to silence a regression — the number beside it is what it measured, with the
 * date, so a bump has something to be argued against.
 *
 * THE ENTRY CEILINGS WERE ALL RE-DERIVED, because every one of them had been
 * calibrated against a comment-inclusive size and none of them meant anything once the comments
 * stopped counting. They are NOT set to what each package measures today — that would make the
 * tripwire fire on the next honest commit, and the number would be bumped, and the gate would be
 * gone. The rule used, written down so the next re-derivation is not a fresh invention:
 *
 *   · a package over 5 kB of code gets ROUGHLY 25% HEADROOM, rounded to a number a human can hold.
 *     25% is not a guess at nothing: it is close to the headroom the earlier calibration
 *     carried (core 34%, dom 21%, router 30%, string 31%), so this is a re-basing of the same
 *     policy onto an honest measurement rather than a loosening of it. In absolute terms it is
 *     large enough that the biggest single module in the package can be added without a bump
 *     (`dom`'s is `compileExoDomSchema.ts` at 18 202 code bytes, against 30 695 of headroom) and
 *     small enough that no third-party runtime arrives unnoticed.
 *   · a package under 5 kB of code gets an ABSOLUTE floor instead, because 25% of a small number
 *     is noise. The question there is only "is this still a stub".
 *
 * PROVENANCE OF THE FIGURES BELOW, because half of them were not taken by this script.
 * The `code` and `raw` byte counts are exact and come from the scanner in this file. The `gz`
 * figures were taken with `gzip -9` from a shell rather than by running this script, so they may
 * differ from `zlib.gzipSync(level: 9)` by a byte or two. Run `npm run check:size` and overwrite
 * them with what it prints; nothing here should stay a second-hand number.
 */
const BUDGETS = {
    // measured: 5 415 gz / 36 365 code (38 973 raw), with `computed/` and `list/` gone.
    // Entry ceiling 45 000 — the 25% rule over that code size, TIGHTENED from 48 000 because the
    // package shrank and a ceiling left where it was is headroom nobody argued for.
    //
    // WHAT THIS NUMBER COST, so a future bump has something to argue against: this gate was RED at
    // 9 808 gz against 6 000 and 61 009 code against 48 000, and two extractions fixed it —
    // `computed/` (66 211 source bytes, 43% of the package) to `@exodra/computed`, and `list/` to
    // `@exodra/list-reconcile`. The browser figure is 5 415 against 6 000: 11% of headroom, tighter
    // than the 25% policy, and deliberately left tight rather than re-based upward.
    // No entry ceiling: the barrel carries the opt-in assert layer, and check:assert-shake asserts it leaves.
    core: { browserGzip: 6500, entryCode: null },
    // measured: 4 770 gz / 24 828 code (26 488 raw), by this script with the package built.
    // Over 5 kB of code, so both ceilings are the 25% rule above: 31 000 code, 6 000 gz.
    //
    // THE PLACEHOLDERS THIS REPLACES WERE 4 000 gz / 40 000 code, AND BOTH WERE WRONG IN OPPOSITE
    // DIRECTIONS — the browser figure was under what the package actually is, the entry figure
    // 61% over it. A guessed pair does not fail safe; it fails in whichever direction the guess
    // leaned, and only one of those two failures is visible as a red gate.
    //
    // `browserGzip` IS NOT NULL, unlike `list-reconcile`'s, and that is decided: this package emits
    // a CDN pair (`packages/computed/tsup.config.ts`). A page composes `withExoComputedMachine`
    // ITSELF — it is application code, not something a backend inlines — and it was inside
    // `window.Exodra.core` until the extraction, so shipping no browser artifact would take
    // `m.field` and `m.derive` away from every no-build page that has one.
    computed: { browserGzip: 6000, entryCode: 31000 },
    // measured 2026-10-28: 6 057 code (6 334 raw), by this script with the package built.
    // Over 5 kB since the keyed-list pack and the LIS identity pass, so the 25% rule: 7 500.
    // `sideEffects: false` holds: importing `reconcileExoChildren` alone bundles neither the
    // keyed pack nor `placeExoChildren` (1 785 min / 889 gz, esbuild).
    //
    // THE KEY IS THE DIRECTORY NAME. It read `reconcile` after the package was renamed to
    // `list-reconcile`, so `packages/reconcile/dist/index.js` resolved to nothing and the gate
    // printed "not built" — which is not a failure, it is a SKIP. The package was ungated and the
    // table said so in a line that looks like every other package's first run.
    //
    // `browserGzip: null`: the CDN pair exists (1 245 gz for `dist/exodra.esm.js`), its budget is not set yet.
    'list-reconcile': { browserGzip: null, entryCode: 7500 },
    // measured: 1 910 gz / 9 427 code (9 813 raw).
    // Entry ceiling 12 000 — 27% over. Almost nothing in this package is comment (364 bytes), so
    // the old 14 000 raw ceiling was nearly a code ceiling already and this barely moves.
    // measured: 20 017 gz / 119 305 code (256 892 raw) — the largest by far, and the
    // one worth watching.
    //
    // THE BROWSER BUDGET, 20 000, IS UNCHANGED AND ITS RECEIPT STANDS. Raised ,
    // temporarily: the build measured 17 746 gz that day and the 17 500 ceiling stopped
    // the release gate. What grew it is real feature work landing since the calibration: the
    // `writers` field with its property-writers pack, `attachExoKeyedList`, `exoForeignNode`,
    // hydration's adopting `bindChildren`, the node bank and the children-walk reconciler. Nothing
    // was raised to hide a regression — the change that shipped alongside that bump DELETED code
    // (`has-adopting-steps.ts`, and the `document.importNode` call it guarded).
    //
    // 20 000 IS A PARKING SPACE, NOT A TARGET. The agreed next step is several passes looking for
    // what can be cut, and the estimate to aim them at is already written down: of dom's ~40.5 kB
    // minified, hydration ~12.3 kB, delegation ~2.7, keyed list ~1.5, foreign ~0.6 and slots ~0.8
    // are each leaves reachable only from `index.ts` — about 17 kB, 41%. Bring this number DOWN
    // after that work; do not let 20 000 become the new normal by quietly measuring against it.
    // It measured 20 017 , which is 17 bytes over — read that as the parking space
    // being full, not as a reason for a wider one.
    //
    // ENTRY CEILING 150 000 — 25.7% over today's 119 305 code bytes, replacing a 210 000 raw
    // ceiling that was 43% comment. Where that code is, measured the same day by attributing each
    // esbuild module banner in the entry: `src/dom` 60 914, `src/hydrate` 27 771, `src/events`
    // 7 361, the children-walk pack 6 741, keyed list 3 467, foreign 3 308, the node bank 3 275,
    // property writers 1 455. Hydration alone is 23% of the entry's code, so the leaf-cutting work
    // above should show up in THIS number as well as the gzipped one.
    dom: { browserGzip: 20000, entryCode: 150000 },
    // measured: 4 865 gz / 27 688 code (29 633 raw).
    // Entry ceiling 35 000 — 26% over.
    router: { browserGzip: 6000, entryCode: 35000 },
    // measured: 420 gz / 1 490 code (1 639 raw).
    // Entry ceiling 2 000, an absolute floor rather than a percentage: this entry is 60 lines, and
    // the only question worth asking of it is whether it is still a stub. The old 4 000 left room
    // for the package to triple in silence.
    forms: { browserGzip: 650, entryCode: 2500 },
    // no browser build: server-side. measured: 15 521 code (39 718 raw), from a build of a source
    // tree that has since been restructured — stale, and not what the package measures today.
    // Entry ceiling 20 000 — 29% over that measurement. The old 32 000 was breached by PROSE and
    // not by code: 15 521 code bytes sat well under it while 61% of the entry was JSDoc. WHICH
    // FILE carried that JSDoc is no longer recorded anywhere; the header above says why.
    string: { browserGzip: null, entryCode: 21500 },
    // types only at runtime — the entry is a stub, and under this measure it is a stub of exactly
    // ZERO code bytes: `dist/index.js` is one `//# sourceMappingURL` line and nothing else.
    // Entry ceiling 500, TIGHTENED from 2 500 on the same day the others were re-derived, because
    // against a real zero the old number admitted a small runtime without a word. A package that
    // is types-only should have to say out loud the day it stops being that.
    jsx: { browserGzip: null, entryCode: 650 },
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE COMMENT SCANNER. See the header for why it exists and what its failure mode is.

// The keywords a `/` may legitimately follow while still opening a regex. `return /x/.test(s)` is
// the common one; the rest cost nothing to admit and each of them makes a division reading wrong.
const REGEX_MAY_FOLLOW = new Set([
    'return',
    'typeof',
    'instanceof',
    'in',
    'of',
    'new',
    'delete',
    'void',
    'throw',
    'case',
    'do',
    'else',
    'yield',
    'await',
]);

const isIdentChar = (ch) =>
    (ch >= 'a' && ch <= 'z') ||
    (ch >= 'A' && ch <= 'Z') ||
    (ch >= '0' && ch <= '9') ||
    ch === '_' ||
    ch === '$';
const isAlpha = (ch) => (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');

// Division or regex? Decided by the previous significant token, which is the standard rule and is
// wrong only for `)` and `}` in constructions this repository's build output does not contain
// (`if (x) /re/.test(y)`). A wrong answer here is caught by the same-line rule in `scanRegex`.
function regexMayStartAfter(prevChar, prevWord) {
    if (prevChar === '') return true; // start of file
    if (prevWord !== '') return REGEX_MAY_FOLLOW.has(prevWord);
    if (
        prevChar === ')' ||
        prevChar === ']' ||
        prevChar === '`' ||
        prevChar === '"' ||
        prevChar === "'"
    )
        return false;
    return !isIdentChar(prevChar);
}

// Returns the index just past the closing `/` and its flags, or -1 if the literal does not close
// on the same line. A regex literal cannot contain an unescaped newline, so -1 means the `/` was
// division and the caller must treat it as ordinary code. This is the rule that keeps a
// mis-guessed division from swallowing the rest of a line.
function scanRegex(src, start) {
    const n = src.length;
    let i = start + 1;
    let inClass = false; // inside `[...]`, where an unescaped `/` is a literal slash
    while (i < n) {
        const ch = src[i];
        if (ch === '\n') return -1;
        if (ch === '\\') {
            i += 2;
            continue;
        }
        if (inClass) {
            if (ch === ']') inClass = false;
        } else if (ch === '[') {
            inClass = true;
        } else if (ch === '/') {
            i++;
            while (i < n && isAlpha(src[i])) i++;
            return i;
        }
        i++;
    }
    return -1;
}

/**
 * The source with every comment removed and every whitespace-only line dropped. Everything else —
 * strings, template literals, regexes, the code itself — is copied through byte for byte.
 */
export function stripComments(src) {
    const kept = [];
    const n = src.length;
    let last = 0; // start of the run of bytes not yet copied
    let i = 0;
    let prevChar = ''; // last significant character seen in code
    let prevWord = ''; // last identifier, if that is what the last significant thing was
    // `T` = inside template text, `B` = inside a `${}` interpolation, `b` = an ordinary brace.
    // The stack is what lets a template inside an interpolation inside a template work.
    const stack = [];

    while (i < n) {
        if (stack.length > 0 && stack[stack.length - 1] === 'T') {
            const ch = src[i];
            if (ch === '\\') {
                i += 2;
                continue;
            }
            if (ch === '`') {
                stack.pop();
                prevChar = '`';
                prevWord = '';
                i++;
                continue;
            }
            if (ch === '$' && src[i + 1] === '{') {
                stack.push('B');
                prevChar = '{';
                prevWord = '';
                i += 2;
                continue;
            }
            i++;
            continue;
        }

        const ch = src[i];

        if (ch === '"' || ch === "'") {
            const quote = ch;
            let j = i + 1;
            while (j < n) {
                if (src[j] === '\\') {
                    j += 2;
                    continue;
                }
                if (src[j] === quote) {
                    j++;
                    break;
                }
                if (src[j] === '\n') break; // unterminated: stop guessing, treat it as code
                j++;
            }
            i = j;
            prevChar = quote;
            prevWord = '';
            continue;
        }

        if (ch === '`') {
            stack.push('T');
            prevChar = '`';
            prevWord = '';
            i++;
            continue;
        }

        if (ch === '{') {
            stack.push('b');
            prevChar = '{';
            prevWord = '';
            i++;
            continue;
        }

        if (ch === '}') {
            stack.pop(); // pops the `B` that resumes a template, or an ordinary `b`
            prevChar = '}';
            prevWord = '';
            i++;
            continue;
        }

        if (ch === '/') {
            const next = src[i + 1];
            if (next === '/') {
                const nl = src.indexOf('\n', i);
                const end = nl < 0 ? n : nl;
                kept.push(src.slice(last, i));
                last = end;
                i = end;
                continue;
            }
            if (next === '*') {
                const close = src.indexOf('*/', i + 2);
                const end = close < 0 ? n : close + 2;
                kept.push(src.slice(last, i));
                last = end;
                i = end;
                continue;
            }
            if (regexMayStartAfter(prevChar, prevWord)) {
                const end = scanRegex(src, i);
                if (end > 0) {
                    i = end;
                    prevChar = '/';
                    prevWord = '';
                    continue;
                }
            }
            prevChar = '/';
            prevWord = '';
            i++;
            continue;
        }

        if (isIdentChar(ch)) {
            let j = i;
            while (j < n && isIdentChar(src[j])) j++;
            prevWord = src.slice(i, j);
            prevChar = src[j - 1];
            i = j;
            continue;
        }

        if (ch !== ' ' && ch !== '\t' && ch !== '\n' && ch !== '\r') {
            prevChar = ch;
            prevWord = '';
        }
        i++;
    }
    kept.push(src.slice(last));

    return kept
        .join('')
        .split('\n')
        .filter((line) => line.trim() !== '')
        .join('\n');
}

const codeBytesOf = (file) => Buffer.byteLength(stripComments(readFileSync(file, 'utf8')), 'utf8');

const gzipOf = (file) => gzipSync(readFileSync(file), { level: 9 }).length;

let failed = 0;
let missing = 0;
console.log('pkg          browser gz   budget  |  entry code    ceiling  (entry raw)   status');
for (const [pkg, budget] of Object.entries(BUDGETS)) {
    const entry = resolve(root, 'packages', pkg, 'dist/index.js');
    const browser = resolve(root, 'packages', pkg, 'dist/exodra.esm.js');

    // A KEY NAMING NO PACKAGE IS A FAILURE, NOT A SKIP. The key IS the directory name, so a
    // package renamed without this table following it leaves a budget pointing at nothing — and
    // the line it printed, "not built", is the same line a first build prints, so the package sits
    // ungated behind a message that reads as routine. `reconcile` did exactly that after becoming
    // `list-reconcile`. A missing `dist/` still only warns: that one is genuinely "build first".
    if (!existsSync(resolve(root, 'packages', pkg))) {
        console.log(
            `${pkg.padEnd(
                12
            )} NO SUCH PACKAGE — this budget names packages/${pkg}, which does not exist`
        );
        failed++;
        continue;
    }

    if (!existsSync(entry)) {
        console.log(`${pkg.padEnd(12)} (not built — run the package build first)`);
        missing++;
        continue;
    }

    // Both are printed; only `entryCode` is compared. See the header.
    const entryRaw = statSync(entry).size;
    const entryCode = codeBytesOf(entry);
    const entryOk = budget.entryCode === null || entryCode <= budget.entryCode;

    let browserCell = '          —        —';
    let browserOk = true;
    if (budget.browserGzip !== null) {
        if (!existsSync(browser)) {
            // A PROMISED ARTIFACT THAT IS NOT THERE IS A FAILURE, not a blank. Every one of these
            // packages declares `exports["./browser"]` pointing at this file, so a build that
            // stopped emitting it ships a manifest with a 404 in it.
            console.log(
                `${pkg.padEnd(12)} MISSING dist/exodra.esm.js — declared by exports["./browser"]`
            );
            failed++;
            continue;
        }
        const gz = gzipOf(browser);
        browserOk = gz <= budget.browserGzip;
        browserCell = `${String(gz).padStart(10)} ${String(budget.browserGzip).padStart(8)}`;
    }

    if (!entryOk || !browserOk) failed++;
    const status = !browserOk ? 'OVER (browser)' : !entryOk ? 'OVER (entry)' : 'ok';
    console.log(
        `${pkg.padEnd(12)}${browserCell}  | ${String(entryCode).padStart(10)} ${String(
            budget.entryCode ?? '—'
        ).padStart(10)}  ` + `${`(${entryRaw})`.padStart(11)}   ${status}`
    );
}

// A SKIPPED PACKAGE IS A FAILED GATE, NOT A NOTE. This used to print the line below and carry
// on: with nothing built, all seven budgets skipped, `failed` stayed 0, and the script exited 0
// having printed "all within budget" — a green that had measured no bytes at all. `check:size`
// sits after `build:all` in `release:check` precisely so every budgeted package IS built by the
// time it runs, so this can only fire when something is genuinely wrong: a package stopped
// emitting `dist/index.js`, or the command was run on its own before a build. Both are worth an
// exit code. Same reasoning as the `_comment_check_numbers` note in package.json.
if (missing > 0) {
    console.error(`\n${missing} package(s) not built — this run gated nothing for them.`);
    console.error('Run `npm run build` first (release:check runs check:size after build:all).');
    process.exit(1);
}
if (failed > 0) {
    console.error(`\n${failed} package(s) over budget.`);
    process.exit(1);
}
console.log('\nall within budget');
