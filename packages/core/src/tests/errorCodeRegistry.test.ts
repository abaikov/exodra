import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

/**
 * WHAT THIS TEST IS FOR. A production build of an Exodra package throws a CODE where a
 * development build throws a sentence:
 *
 *     throw new Error(
 *         typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
 *             ? 'exoRuntime: "a" needs "b" — <how to fix it, and why>'
 *             : 'EXO0001'
 *     );
 *
 * A bundler folds `NODE_ENV` to "production", the whole condition to `false`, and `false ? long :
 * short` to `short`, so the long literal never reaches a user's bundle. What that saving is worth
 * is stated in ONE place — the `measurement` block of `scripts/exo-error-codes.json` — and this
 * test fails if any figure from it is copied to a second place, because copies drift out of step
 * with a fresh build and nothing reconciles them. What the shape COSTS is that a person reading a production console
 * sees `EXO0001` and nothing else, so the code has to be findable and exactly one thing may answer
 * to it.
 *
 * TWO FORMS ARE ACCEPTED, and the difference is the point of half this file:
 *
 *     : 'EXO0001'                        BARE — the code alone.
 *     : `EXO0002 "${event}"`             APPENDED — the code, one space, and NAMES ONLY.
 *
 * The appended form exists because "run it again in development and you get the full sentence"
 * is only true when the developer's run is the SAME PROGRAM. A pack assembled from a config, a
 * composition assembled from a plugin registry: those name something the user's data chose, and a
 * bare code there identifies nothing. `payload` in the registry says which form a row uses and
 * this test holds the site to it in both directions — a row with a payload thrown bare is a name
 * silently dropped, and a payload thrown for a row without one is prose creeping back in.
 *
 * THREE ARTEFACTS HAVE TO AGREE, AND NOTHING BUT THIS TEST MAKES THEM:
 *
 *   · the THROW SITES, in packages/&#42;/src — where the codes are spelled;
 *   · the REGISTRY, scripts/exo-error-codes.json — the one list of what each code means;
 *   · the DOCS PAGE, docs-site/docs/errors.md — the page a URL in a console points at.
 *
 * Each pair can rot in both directions, and every one of those is a failure here: a code thrown
 * but unregistered is a dead end for whoever reads it; a code registered but thrown nowhere is a
 * lie in the docs; one code at two sites means the console tells you two different things; an
 * entry with no explanation is a row that exists to pass a checker; and a registered code missing
 * from the page is the whole mechanism failing at the one moment it is used.
 *
 * THE NUMBERS ARE A FLAT COUNTER, NOT PER-PACKAGE BLOCKS, and this test enforces the counter
 * rather than a layout. A code is a permanent public identifier; blocks tied it to which package
 * a refusal happened to live in, and this repository moves refusals between files, functions and
 * packages, so a block scheme's only two exits were failing the build or renumbering — and
 * renumbering is the one thing the docs page promises never happens. `codes` and `retired`
 * together must therefore be exactly 1..N with no gap and no repeat: that single rule is what
 * makes "the next number" mechanical, what makes a retired number stay spoken for, and what stops
 * a deleted refusal being erased rather than retired.
 *
 * IT LIVES BESIDE `browserGlobalSafety.test.ts` AND IS BUILT THE SAME WAY, for the same reason:
 * both are assertions about SOURCE TEXT across several packages that no behavioural test can
 * reach, and both are the kind of rule that only stays true while something checks it. Codes are
 * found by PARSING rather than by grepping — `EXO0002` appears in comments and in this file's own
 * prose, and a text scanner cannot tell a string literal from a sentence about one. Files are
 * pre-filtered with a cheap regex first, so the TypeScript parser only sees the handful of files
 * that could possibly contain a code.
 *
 * WHAT IT CANNOT CATCH:
 *
 *   1. IT CANNOT CHECK THAT AN EXPLANATION IS TRUE. `EXO0002` could describe the wrong refusal
 *      entirely and every assertion here would pass. Only a reader comparing the site to the row
 *      finds that. The same goes for a `payload` sentence that describes different names from the
 *      ones the site actually interpolates: the FORM is checked, the CONTENT is not.
 *   2. IT SCANS `packages/&#42;/src` ONLY — not `packages/examples/&#42;`, not `packages/benchmarks/scripts`,
 *      not any `.js` or `.mjs` in the tree. A code thrown from outside that tree is invisible, and
 *      would read here as a registered-but-unthrown code.
 *   3. IT READS SOURCE, NEVER `dist`. That the bundler actually folded the condition away is
 *      `check-bundle-size.mjs`'s question, not this one — this test would pass unchanged over a
 *      build that shipped every long message.
 *   4. IT DOES NOT KNOW WHICH REFUSALS OUGHT TO HAVE CODES. A site left with its full prose in
 *      production is not a failure here — it is simply a saving not taken.
 *   5. THE GATING SCAN IS STRUCTURAL, NOT SEMANTIC. It refuses a coded throw standing inside an
 *      `if`, a `? :` or the right half of an `&&` whose condition names `NODE_ENV` — which is the
 *      regression that otherwise passed every assertion here while deleting the refusal from
 *      production. A gate written some other way (a boolean computed two functions up, a flag on
 *      an options object read from `process.env`) is not seen.
 *   6. NOTHING HERE PROVES THE SITE STILL THROWS. That is a behavioural question and it is asked
 *      by value-level tests beside each site — `runtime/exo-runtime.test.ts` and
 *      `@exodra/dom`'s `events/exo-events.test.ts` both set `NODE_ENV` to `production` and assert
 *      the code arrives, payload and all.
 */

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const PACKAGES_DIR = join(ROOT, 'packages');

/**
 * The registry, and the page that renders it. Both are named here rather than in the registry
 * because this test is the only consumer that has to find them, and a path stored beside the data
 * it points at is a path nothing checks.
 */
const REGISTRY_FILE = 'scripts/exo-error-codes.json';
const DOC_PAGE = 'docs-site/docs/errors.md';

/**
 * Where the mechanism's PROSE lives, and therefore where a stray copy of a measured figure would
 * do its damage. Every throw site is added to this list at run time; these four are the fixed
 * homes — the page a reader lands on, the note that decides the rule, this file, and the
 * dependency-cruiser rule that forbids the registry from being imported.
 */
const PROSE_HOMES = [
    DOC_PAGE,
    'packages/core/src/schema/factories/createExoSchema.ts',
    'packages/core/src/tests/errorCodeRegistry.test.ts',
    '.dependency-cruiser.cjs',
];

/** The one accepted spelling. Copied from `createExoSchema`'s two-baskets note under "HOW IT IS SPELLED". */
const REQUIRED_GUARD = "typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'";

/** What a code IS. Four digits, no more and no fewer, so every code sorts and pastes alike. */
const CODE = /^EXO\d{4}$/;

/**
 * What LOOKS like a code at the START of a literal, and is therefore held to `CODE`. Anchored at
 * the start and stopped at whitespace so that the APPENDED form is seen: the head of
 * `` `EXO0002 "${event}"` `` is the text `EXO0002 "`, and a rule anchored to the whole literal
 * matches neither it nor `'EXO0002 ' + name` — so a code could be thrown that no row and no page
 * described while every assertion here passed.
 */
const CODE_SHAPED = /^exo\d+(?=\s|$)/i;

/** Cheap pre-filter: a file with no `EXO<digit>` anywhere in its text cannot contain a code. */
const MIGHT_HOLD_A_CODE = /exo\d/i;

type TRegistryEntry = {
    code: string;
    pkg: string;
    /** Present exactly when the site throws the appended form; absent for the bare form. */
    payload?: string;
    meaning: string;
    explanation: string;
};

type TRetiredEntry = {
    code: string;
    pkg: string;
    note: string;
};

type TMeasurement = {
    figures: Record<string, number>;
    superseded: { figures: Record<string, number> };
};

type TRegistry = {
    measurement: TMeasurement;
    codes: TRegistryEntry[];
    /** Numbers that are spent. Exempt from "every registered code is thrown", and never reissued. */
    retired: TRetiredEntry[];
};

type TSite = {
    /** The literal (or template head) exactly as written — held unvalidated, so a malformed one can be reported. */
    text: string;
    /** The `EXO\d+`-shaped prefix of `text`, or `''` when it is not code-shaped at all. */
    code: string;
    /** True when something follows the code in the thrown value: a payload was appended. */
    appended: boolean;
    /** The `packages/<name>` this literal was written in. */
    pkg: string;
    /** `packages/dom/src/events/factories/createExoDelegatedEvents.ts:126:23` */
    where: string;
    /** True when the thrown value is the production branch of the accepted guard, and nothing else. */
    shaped: boolean;
    /** Where a NODE_ENV-reading branch encloses this throw, and `null` when none does. */
    gatedAt: string | null;
};

// ── reading ───────────────────────────────────────────────────────────────────────────────────

function readRegistry(): TRegistry {
    const raw = readFileSync(join(ROOT, REGISTRY_FILE), 'utf8');
    // A registry that does not parse is not something to work around: every assertion below would
    // otherwise pass vacuously over an empty list, which is the failure mode this whole file
    // exists to prevent.
    return JSON.parse(raw) as TRegistry;
}

function tsFilesIn(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            if (entry === 'node_modules' || entry === 'dist' || entry === '.tsbuild') continue;
            tsFilesIn(full, out);
            continue;
        }
        if (!entry.endsWith('.ts') && !entry.endsWith('.tsx')) continue;
        // A test never ships, so a code named in one is not a site — and THIS file names two of
        // them in its own prose. Ambient declarations emit nothing at all.
        if (entry.endsWith('.test.ts') || entry.endsWith('.spec.ts') || entry.endsWith('.d.ts')) {
            continue;
        }
        out.push(full);
    }
    return out;
}

type TShippedFile = { pkg: string; file: string; text: string };

/**
 * Every file that a published package compiles from. `packages/examples/*` is not here — those are
 * applications, not packages — and neither is anything outside a `src/`, which is where every
 * package's `files`/`exports` build is rooted.
 */
let shipped: TShippedFile[] | null = null;

function shippedFiles(): TShippedFile[] {
    if (shipped !== null) return shipped;
    const out: TShippedFile[] = [];
    for (const entry of readdirSync(PACKAGES_DIR, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const src = join(PACKAGES_DIR, entry.name, 'src');
        if (!existsSync(src)) continue;
        for (const file of tsFilesIn(src)) {
            out.push({ pkg: entry.name, file, text: readFileSync(file, 'utf8') });
        }
    }
    shipped = out;
    return out;
}

const relative = (file: string): string => 'packages/' + file.slice(PACKAGES_DIR.length + 1);

/** The code-shaped prefix of a literal, or `''`. `EXO0002 "` gives `EXO0002`. */
function codeOf(text: string): string {
    const match = CODE_SHAPED.exec(text);
    return match === null ? '' : match[0];
}

/**
 * THE WHOLE VALUE THE LITERAL BEGINS, not the literal. A code is written three ways and only the
 * first one is its own expression:
 *
 *     : 'EXO0001'                     the literal IS the value
 *     : `EXO0002 "${event}"`          the literal is a template HEAD
 *     : 'EXO0003 ' + name             the literal is the left operand of a `+` chain
 *
 * Walking up the leftmost `+` operands (through parentheses) is what turns the third into one
 * node whose parent can be asked the only question that matters: is this the branch a bundler
 * keeps? Without it the third form's parent is a `+`, `isProductionBranch` answers no, and the
 * site is reported as "not the production branch of a refusal".
 */
function valueBegunBy(node: ts.Node): ts.Node {
    let current = node;
    for (;;) {
        const parent: ts.Node | undefined = current.parent;
        if (parent === undefined) return current;
        if (ts.isParenthesizedExpression(parent)) {
            current = parent;
            continue;
        }
        if (
            ts.isBinaryExpression(parent) &&
            parent.operatorToken.kind === ts.SyntaxKind.PlusToken &&
            parent.left === current
        ) {
            current = parent;
            continue;
        }
        return current;
    }
}

/** Every code-shaped literal, in any of the three forms, wherever it is written. */
function collectSites(): TSite[] {
    const sites: TSite[] = [];
    for (const { pkg, file, text } of shippedFiles()) {
        if (!MIGHT_HOLD_A_CODE.test(text)) continue;
        // `true` sets parent pointers, which is what makes "is this literal the production branch
        // of a guard?" answerable at all.
        const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
        const record = (node: ts.Node, literal: string, hasSpans: boolean): void => {
            if (!CODE_SHAPED.test(literal)) return;
            const code = codeOf(literal);
            const value = valueBegunBy(node);
            const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source));
            const conditional =
                value.parent !== undefined && ts.isConditionalExpression(value.parent)
                    ? value.parent
                    : null;
            sites.push({
                text: literal,
                code,
                appended: hasSpans || value !== node || literal.length > code.length,
                pkg,
                where: `${relative(file)}:${line + 1}:${character + 1}`,
                shaped: isProductionBranch(value, source),
                gatedAt: gatedBy(node, conditional, source, file),
            });
        };
        const visit = (node: ts.Node): void => {
            if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
                record(node, node.text, false);
            } else if (ts.isTemplateExpression(node)) {
                record(node, node.head.text, true);
            }
            ts.forEachChild(node, visit);
        };
        ts.forEachChild(source, visit);
    }
    return sites;
}

/**
 * The value is the `whenFalse` of a conditional whose condition begins with the accepted guard —
 * which is the shape, and the only shape, that a bundler folds away to leave the code behind. The
 * condition's text is compared with whitespace runs collapsed, so the multi-line form prettier
 * produces passes and the semantically-equivalent inverted form (`typeof process === 'undefined'
 * || … ? short : long`) does not. That rejection is deliberate and is the same one
 * `browserGlobalSafety.test.ts` makes: a textual rule is checkable, a semantic one is not.
 */
function isProductionBranch(value: ts.Node, source: ts.SourceFile): boolean {
    const parent = value.parent;
    if (parent === undefined || !ts.isConditionalExpression(parent)) return false;
    if (parent.whenFalse !== value) return false;
    const condition = parent.condition.getText(source).replace(/\s+/g, ' ').trim();
    return condition.startsWith(REQUIRED_GUARD);
}

/**
 * IS THIS THROW ITSELF INSIDE SOMETHING THAT READS `NODE_ENV`? The shape this answers passes
 * every other assertion in this file:
 *
 *     if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
 *         throw new Error(guard ? 'the long sentence' : 'EXO0001');
 *     }
 *
 * The code is still collected, the ternary is still the accepted shape, the registry and the page
 * still agree — and a production build refuses nothing at all, which is the one property the
 * whole mechanism claims ("the check itself is not stripped"). So every ancestor between the
 * literal and the file is asked whether it GATES on `NODE_ENV`, skipping the one conditional the
 * literal is legitimately the short branch of.
 *
 * It is structural: an `if`, a `? :`, or the right operand of an `&&`/`||` whose left half names
 * `NODE_ENV`. A gate written some other way — a boolean computed elsewhere, an option read off
 * the environment two functions up — is not seen, and is listed under WHAT IT CANNOT CATCH.
 */
function gatedBy(
    node: ts.Node,
    accepted: ts.ConditionalExpression | null,
    source: ts.SourceFile,
    file: string
): string | null {
    const names = (test: ts.Node): boolean => test.getText(source).includes('NODE_ENV');
    const at = (found: ts.Node): string => {
        const { line } = source.getLineAndCharacterOfPosition(found.getStart(source));
        return `${relative(file)}:${line + 1}`;
    };
    let child: ts.Node = node;
    let parent: ts.Node | undefined = node.parent;
    while (parent !== undefined && !ts.isSourceFile(parent)) {
        if (parent !== accepted) {
            if (
                ts.isIfStatement(parent) &&
                parent.expression !== child &&
                names(parent.expression)
            ) {
                return at(parent);
            }
            if (
                ts.isConditionalExpression(parent) &&
                parent.condition !== child &&
                names(parent.condition)
            ) {
                return at(parent);
            }
            if (
                ts.isBinaryExpression(parent) &&
                (parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
                    parent.operatorToken.kind === ts.SyntaxKind.BarBarToken) &&
                parent.right === child &&
                names(parent.left)
            ) {
                return at(parent);
            }
        }
        child = parent;
        parent = parent.parent;
    }
    return null;
}

// ── the docs page ─────────────────────────────────────────────────────────────────────────────

/**
 * Markdown noise removed and whitespace collapsed, so that the page may write `exoRuntime` in a
 * code span and wrap its lines where it likes while still being comparable, character for
 * character, against the sentence in the registry.
 */
const flatten = (s: string): string => s.replace(/[`*|]/g, '').replace(/\s+/g, ' ').trim();

type TDocEntry = { code: string; line: number; body: string };

/** One entry per `### EXO0001 …` heading, holding everything down to the next heading. */
function docEntries(text: string): TDocEntry[] {
    const lines = text.split('\n');
    const out: TDocEntry[] = [];
    for (let i = 0; i < lines.length; i++) {
        const heading = /^#{2,4}\s+(EXO\d{4})\b/.exec(lines[i]);
        if (heading === null) continue;
        const body: string[] = [];
        for (let j = i + 1; j < lines.length && !lines[j].startsWith('#'); j++) body.push(lines[j]);
        out.push({ code: heading[1], line: i + 1, body: flatten(body.join(' ')) });
    }
    return out;
}

/** The one table row a retired code gets: `| \`EXO0002\` | … |`. */
function retiredRow(text: string, code: string): string | null {
    for (const line of text.split('\n')) {
        if (!line.startsWith('|')) continue;
        if (!new RegExp('^\\|\\s*`?' + code + '`?\\s*\\|').test(line)) continue;
        return flatten(line);
    }
    return null;
}

// ── the assertions ────────────────────────────────────────────────────────────────────────────

describe('error code registry — a production console prints a code, and exactly one thing answers to it', () => {
    it('spells every code as EXO followed by four digits, and separates a payload with one space', () => {
        const offences: string[] = [];

        for (const site of collectSites()) {
            if (!CODE.test(site.code)) {
                offences.push(
                    `${site.where} — \`${site.text}\` is shaped like an error code and is not ` +
                        'one. A code is `EXO` followed by exactly four digits, so that every ' +
                        'code sorts, pastes and searches alike.'
                );
                continue;
            }
            if (site.appended && !site.text.startsWith(site.code + ' ')) {
                offences.push(
                    `${site.where} — \`${site.text}\` runs a payload straight onto \`${site.code}\`. ` +
                        'Put exactly one space between them: the code is what a reader searches ' +
                        'for and what this gate parses, and glued to a value it is neither.'
                );
            }
        }
        const registry = readRegistry();
        for (const entry of [...registry.codes, ...registry.retired]) {
            if (CODE.test(entry.code)) continue;
            offences.push(
                `${REGISTRY_FILE} — \`${entry.code}\` is not \`EXO\` followed by exactly four digits.`
            );
        }

        expect(offences, `${offences.length} malformed code(s):\n` + offences.join('\n')).toEqual(
            []
        );
    });

    it('registers every code that is thrown, and throws every code that is registered', () => {
        const registry = readRegistry();
        const sites = collectSites().filter((s) => CODE.test(s.code));
        const registered = new Set(registry.codes.map((e) => e.code));
        const retired = new Set(registry.retired.map((e) => e.code));
        const thrown = new Set(sites.map((s) => s.code));
        const offences: string[] = [];

        for (const site of sites) {
            if (retired.has(site.code)) {
                offences.push(
                    `${site.where} — throws \`${site.code}\`, which is RETIRED. That number was ` +
                        'spent by a refusal that no longer exists and every console log, bug ' +
                        'report and search result from before it went still points at it. Take ' +
                        'the next unused number instead.'
                );
                continue;
            }
            if (registered.has(site.code)) continue;
            offences.push(
                `${site.where} — throws \`${site.code}\`, which is in no row of ${REGISTRY_FILE}. ` +
                    'A code a user can read and nobody can look up is worse than the sentence it ' +
                    'replaced. Add a row with `pkg`, `meaning` and `explanation`, and an entry on ' +
                    `${DOC_PAGE}.`
            );
        }
        for (const entry of registry.codes) {
            if (thrown.has(entry.code)) continue;
            offences.push(
                `${REGISTRY_FILE} — \`${entry.code}\` is registered and thrown from nowhere in ` +
                    'packages/*/src. A code with no site is a lie in the docs: somebody looks it ' +
                    'up and reads about a refusal this build cannot produce. Restore the site it ' +
                    'was written for, or MOVE THE ROW INTO `retired` — deleting it would hand the ' +
                    'number back, and the page promises that never happens.'
            );
        }
        for (const entry of registry.retired) {
            if (!thrown.has(entry.code)) continue;
            offences.push(
                `${REGISTRY_FILE} — \`${entry.code}\` is in \`retired\` and is thrown from ` +
                    'packages/*/src. A retired code is retired for good; give the site a new number.'
            );
        }

        expect(
            offences,
            `${offences.length} code(s) that only one side knows about:\n` + offences.join('\n')
        ).toEqual([]);
    });

    it('uses each code at exactly one site', () => {
        const byCode = new Map<string, TSite[]>();
        for (const site of collectSites()) {
            if (!CODE.test(site.code)) continue;
            const list = byCode.get(site.code);
            if (list === undefined) byCode.set(site.code, [site]);
            else list.push(site);
        }
        const offences: string[] = [];
        for (const [code, list] of byCode) {
            if (list.length < 2) continue;
            offences.push(
                `\`${code}\` is thrown from ${list.length} sites:\n` +
                    list.map((s) => `        ${s.where}`).join('\n') +
                    '\n      One code means one refusal. Two sites make the docs page describe ' +
                    'whichever of them the writer had in mind, and the reader has no way to ' +
                    'know which one they hit. Give the second site its own number.'
            );
        }

        expect(offences, `${offences.length} reused code(s):\n` + offences.join('\n')).toEqual([]);
    });

    it('hands the numbers out with a counter that never goes back and never repeats', () => {
        // THE WHOLE NUMBERING RULE, and it replaces per-package blocks. Live and retired codes
        // together must be exactly 1..N: no gap, no repeat, nothing above N. A gap is a number
        // that has silently become free again — which is precisely how a retired code gets reused
        // — and a repeat is two refusals answering to one console line.
        const { codes, retired } = readRegistry();
        const all = [...codes, ...retired].map((e) => ({
            code: e.code,
            n: Number(e.code.slice(3)),
        }));
        const offences: string[] = [];
        const seen = new Map<number, string[]>();
        for (const entry of all) {
            const list = seen.get(entry.n);
            if (list === undefined) seen.set(entry.n, [entry.code]);
            else list.push(entry.code);
        }
        for (const [n, list] of seen) {
            if (list.length < 2) continue;
            offences.push(
                `${REGISTRY_FILE} — the number ${n} is claimed ${list.length} times. A number is ` +
                    'handed out once, ever, whether it is live or retired.'
            );
        }
        const highest = all.length === 0 ? 0 : Math.max(...all.map((e) => e.n));
        for (let n = 1; n <= highest; n++) {
            if (seen.has(n)) continue;
            offences.push(
                `${REGISTRY_FILE} — nothing claims the number ${n}, and ${highest} is claimed. A ` +
                    'gap means a code was DELETED rather than retired, which hands its number ' +
                    'back to the next author while old console logs still point at it. Put the ' +
                    'row it belonged to into `retired` with a note saying what it used to mean.'
            );
        }
        if (seen.has(0)) {
            offences.push(
                `${REGISTRY_FILE} — EXO0000 is claimed. A code of all zeros reads as "no code"; ` +
                    'numbering starts at 0001.'
            );
        }

        expect(
            offences,
            `${offences.length} break(s) in the numbering:\n` + offences.join('\n')
        ).toEqual([]);
    });

    it('keeps the row and the site saying the same thing about package and payload', () => {
        // `pkg` IS A PLAIN FIELD, NOT A NUMBERING RULE. It is here for the reader, and this
        // assertion only keeps it from claiming a package the site is not in — a refusal that
        // MOVES package edits this field and keeps its number, which is the affordance the block
        // scheme did not have.
        const { codes } = readRegistry();
        const sites = collectSites().filter((s) => CODE.test(s.code));
        const siteByCode = new Map(sites.map((s) => [s.code, s]));
        const offences: string[] = [];

        for (const entry of codes) {
            const site = siteByCode.get(entry.code);
            if (site === undefined) continue;
            if (site.pkg !== entry.pkg) {
                offences.push(
                    `${REGISTRY_FILE} — \`${entry.code}\` is registered to \`${entry.pkg}\` and ` +
                        `thrown from \`${site.pkg}\` (${site.where}). Change the row's \`pkg\`; ` +
                        'the NUMBER does not change and must not.'
                );
            }
            const hasPayload = typeof entry.payload === 'string';
            if (hasPayload && !site.appended) {
                offences.push(
                    `${REGISTRY_FILE} — \`${entry.code}\` has a \`payload\` and ${site.where} ` +
                        'throws the code alone. The row promises a reader that names follow the ' +
                        'code; either append them at the site or drop the `payload` field.'
                );
            }
            if (!hasPayload && site.appended) {
                offences.push(
                    `${site.where} — throws \`${site.text}…\`, appending something to ` +
                        `\`${entry.code}\`, and the row has no \`payload\` saying what it is. ` +
                        'A reader is looking at names nothing describes. Add `payload` — one ' +
                        'sentence naming what follows the code, and NAMES ONLY may follow it.'
                );
            }
        }

        expect(
            offences,
            `${offences.length} row(s) out of step with their site:\n` + offences.join('\n')
        ).toEqual([]);
    });

    it('gives every registered code a meaning and an explanation worth reading', () => {
        const offences: string[] = [];
        const seen = new Set<string>();
        const registry = readRegistry();

        for (const entry of registry.codes) {
            if (seen.has(entry.code)) {
                offences.push(
                    `${REGISTRY_FILE} — \`${entry.code}\` has two rows. One code, one row.`
                );
            }
            seen.add(entry.code);

            if (typeof entry.pkg !== 'string' || entry.pkg.trim() === '') {
                offences.push(`${REGISTRY_FILE} — \`${entry.code}\` names no owning package.`);
            }
            for (const field of ['meaning', 'explanation'] as const) {
                const value = entry[field];
                if (typeof value !== 'string' || value.trim() === '') {
                    offences.push(
                        `${REGISTRY_FILE} — \`${entry.code}\` has no \`${field}\`. Both are ` +
                            'required: this row is the whole of what a person gets after they ' +
                            'read the code off a console.'
                    );
                    continue;
                }
                // "Shorter than one sentence" made checkable. The failures this catches are the
                // ones a row-shaped checker invites — `TODO`, `see the code`, `internal` — and
                // none of the honest rows are anywhere near the floor: the shortest real
                // `meaning` in this repository runs to 105 characters.
                if (value.trim().length < 60 || !/[.!?]/.test(value)) {
                    offences.push(
                        `${REGISTRY_FILE} — \`${entry.code}\`'s \`${field}\` is ` +
                            `${value.trim().length} character(s) and is not a sentence: ` +
                            `"${value.trim()}". \`meaning\` says what happened; \`explanation\` ` +
                            'says what to do about it and why it is refused. A row that cannot ' +
                            'do that is a row that exists to pass this check.'
                    );
                }
                if (field === 'meaning' && value.includes('`')) {
                    offences.push(
                        `${REGISTRY_FILE} — \`${entry.code}\`'s \`meaning\` contains a backtick. ` +
                            'Keep the registry in plain prose and let the docs page add its own ' +
                            'code spans; the page is compared against this text with backticks ' +
                            'removed, and a backtick on this side has nothing to match.'
                    );
                }
            }
            const payload = entry.payload;
            if (payload !== undefined && (typeof payload !== 'string' || payload.trim() === '')) {
                offences.push(
                    `${REGISTRY_FILE} — \`${entry.code}\` has an empty \`payload\`. Either say ` +
                        'in one sentence what follows the code, or remove the field and throw ' +
                        'the code alone.'
                );
            }
        }
        for (const entry of registry.retired) {
            if (typeof entry.note === 'string' && entry.note.trim().length >= 20) continue;
            offences.push(
                `${REGISTRY_FILE} — retired \`${entry.code}\` has no usable \`note\`. A retired ` +
                    'row exists to answer somebody holding an old console log: say what the code ' +
                    'used to mean and why it went.'
            );
        }

        expect(offences, `${offences.length} unusable row(s):\n` + offences.join('\n')).toEqual([]);
    });

    it('documents every registered code on the page a console sends people to', () => {
        const { codes, retired } = readRegistry();
        const page = join(ROOT, DOC_PAGE);
        const offences: string[] = [];

        // Checked before anything is read, so a missing page says so instead of arriving as an
        // ENOENT from `readFileSync` with no explanation of what the file was for.
        expect(
            existsSync(page),
            `${DOC_PAGE} does not exist. It is the page an error code is looked up on, and it is ` +
                'wired into docs-site/sidebars.js; without it the codes are unreadable by ' +
                'construction and the whole mechanism is a byte saving with no other side.'
        ).toBe(true);

        const text = readFileSync(page, 'utf8');
        const entries = docEntries(text);
        const documented = new Map(entries.map((e) => [e.code, e]));

        for (const entry of codes) {
            const doc = documented.get(entry.code);
            if (doc === undefined) {
                offences.push(
                    `${DOC_PAGE} — has no entry for \`${entry.code}\`. Add a section:\n` +
                        `        ### ${entry.code} {#${entry.code.toLowerCase()}}\n` +
                        `        ${entry.meaning}\n` +
                        `        ${entry.explanation}`
                );
                continue;
            }
            const fields: ('meaning' | 'explanation' | 'payload')[] = ['meaning', 'explanation'];
            if (typeof entry.payload === 'string') fields.push('payload');
            for (const field of fields) {
                const value = entry[field];
                if (typeof value !== 'string' || doc.body.includes(flatten(value))) continue;
                offences.push(
                    `${DOC_PAGE}:${doc.line} — the \`${entry.code}\` section does not carry the ` +
                        `registry's \`${field}\` verbatim. The registry is the source and the ` +
                        'page is its rendering; copy it across (code spans and line wrapping are ' +
                        `ignored in this comparison). Expected to find:\n        ${flatten(value)}`
                );
            }
        }
        const registered = new Set(codes.map((e) => e.code));
        const isRetired = new Set(retired.map((e) => e.code));
        for (const doc of entries) {
            if (registered.has(doc.code)) continue;
            if (isRetired.has(doc.code)) {
                offences.push(
                    `${DOC_PAGE}:${doc.line} — gives retired \`${doc.code}\` a section of its ` +
                        'own. A retired code belongs in the retired table, where it says it is ' +
                        'retired; a full section reads as a refusal this build can still throw.'
                );
                continue;
            }
            offences.push(
                `${DOC_PAGE}:${doc.line} — documents \`${doc.code}\`, which is in no row of ` +
                    `${REGISTRY_FILE}. A page describing a code no build can throw sends its ` +
                    'reader looking for a bug they do not have.'
            );
        }
        for (const entry of retired) {
            const row = retiredRow(text, entry.code);
            if (row === null) {
                offences.push(
                    `${DOC_PAGE} — has no retired-table row for \`${entry.code}\`. Somebody is ` +
                        'holding a console log with that code in it and the page is where they ' +
                        `come; add a row: | \`${entry.code}\` | ${entry.note} |`
                );
                continue;
            }
            if (row.includes(flatten(entry.note))) continue;
            offences.push(
                `${DOC_PAGE} — the retired row for \`${entry.code}\` does not carry the ` +
                    `registry's \`note\` verbatim. Expected to find:\n        ${flatten(
                        entry.note
                    )}`
            );
        }

        expect(
            offences,
            `${offences.length} disagreement(s) between the registry and the docs:\n` +
                offences.join('\n')
        ).toEqual([]);
    });

    it('writes every code as the production branch of the accepted guard, and nowhere else', () => {
        // THE SHAPE IS THE SAVING. A code that is not the `whenFalse` of that exact condition is
        // either a message that ships in full anyway — the bytes this exists to remove — or a
        // refusal whose ONLY message is four digits, in development as well, which leaves the
        // author of the calling code with nothing to work from.
        const offences: string[] = [];
        for (const site of collectSites()) {
            if (!CODE.test(site.code) || site.shaped) continue;
            offences.push(
                `${site.where} — \`${site.text}\` is not the production branch of a refusal. ` +
                    'Write it as, exactly:\n' +
                    '        throw new Error(\n' +
                    `            ${REQUIRED_GUARD}\n` +
                    "                ? '…the full sentence, with how to fix it and why…'\n" +
                    `                : '${site.code}'\n` +
                    '        );\n' +
                    '      The `typeof` half comes first so a browser with no bundler does not ' +
                    'throw ReferenceError on the property read; the `NODE_ENV` half is what a ' +
                    'bundler substitutes, folding the whole condition to false and deleting the ' +
                    'long literal. The inverted spelling means the same thing and is refused ' +
                    'anyway — see browserGlobalSafety.test.ts for why the rule is textual. ' +
                    'A payload may be appended (`' +
                    site.code +
                    ' ${name}`) and NAMES ONLY may go in it.'
            );
        }

        expect(
            offences,
            `${offences.length} code(s) written outside the accepted shape:\n` + offences.join('\n')
        ).toEqual([]);
    });

    it('leaves no coded refusal standing inside a NODE_ENV branch', () => {
        // THE SHAPE THAT PASSES EVERYTHING ELSE. Wrap a coded throw in
        // `if (guard) { … }` and the code is still collected, the ternary inside it is still the
        // accepted shape, the registry and the page still agree — and production refuses nothing.
        // The docs page's flat statement, "the check itself is not stripped", is the promise this
        // assertion is the whole of.
        const offences: string[] = [];
        for (const site of collectSites()) {
            if (!CODE.test(site.code) || site.gatedAt === null) continue;
            offences.push(
                `${site.where} — \`${site.code}\` is thrown from inside a NODE_ENV branch at ` +
                    `${site.gatedAt}. A bundler deletes that branch whole, so a production build ` +
                    'refuses nothing and the code can never be printed — while every other ' +
                    'assertion in this file passes. The guard belongs INSIDE the message ' +
                    '(`guard ? prose : code`) and never around the check.'
            );
        }

        expect(
            offences,
            `${offences.length} refusal(s) a production build would not make:\n` +
                offences.join('\n')
        ).toEqual([]);
    });

    it('states the byte measurement in exactly one place', () => {
        // A FIGURE IN SEVERAL PLACES STOPS RECONCILING WITH A FRESH BUILD, and
        // `scripts/check-doc-numbers.mjs` cannot catch it: that gate reads markdown TABLES, and
        // these copies are prose.
        //
        // Only figures of four digits or more are scanned. A percentage or a two-digit number
        // occurs by accident in ordinary prose, and a gate that fires on `30` would be a gate
        // somebody turns off.
        const registry = readRegistry();
        const figures = [
            ...Object.values(registry.measurement.figures),
            ...Object.values(registry.measurement.superseded.figures),
        ]
            .map((n) => String(n))
            .filter((n) => n.length >= 4);

        expect(
            figures.length,
            `${REGISTRY_FILE} — the \`measurement\` block states no figure of four digits or ` +
                'more, so this assertion is checking nothing. Either it lost its numbers or this ' +
                'gate is now looking in the wrong place.'
        ).toBeGreaterThan(0);

        const homes = new Set(PROSE_HOMES);
        for (const site of collectSites()) {
            if (CODE.test(site.code)) homes.add(site.where.split(':')[0]);
        }
        const offences: string[] = [];
        for (const home of homes) {
            const path = join(ROOT, home);
            if (!existsSync(path)) continue;
            const text = readFileSync(path, 'utf8');
            for (const figure of figures) {
                // Bounded by non-word characters on both sides, so a code whose digits one day
                // happen to spell a figure is not read as a copy of it — and so that this comment,
                // in a file the scan covers, cannot fail the gate by naming one.
                const token = new RegExp('(^|[^0-9A-Za-z_])' + figure + '($|[^0-9A-Za-z_])');
                if (!token.test(text)) continue;
                offences.push(
                    `${home} — repeats the figure ${figure}. The measurement is stated ONCE, in ` +
                        `the \`measurement\` block of ${REGISTRY_FILE}, and cited by name from ` +
                        'everywhere else. Three copies of it is how the old figures went stale ' +
                        'in three files at once with nothing to notice.'
                );
            }
        }

        expect(
            offences,
            `${offences.length} second home(s) for a measured figure:\n` + offences.join('\n')
        ).toEqual([]);
    });

    it('keeps the registry out of every shipped bundle', () => {
        // THE GUARANTEE, and it is this test rather than the file's location. `resolveJsonModule`
        // is on in the root tsconfig, so any file under packages/*/src could import the registry
        // and tsup would inline all of it — every explanation, in every bundle, which is the exact
        // cost the codes were introduced to remove. There is also a dependency-cruiser rule
        // (`error-registry-does-not-ship`), and it is worth having, but nothing in `release:check`
        // or in any workflow under .github/ runs `graph:check`, so it bites only by hand.
        //
        // IT IS THE MODULE SPECIFIER THAT IS CHECKED, NOT THE WORD. A coded site names the
        // registry in a comment — that is how a person finds the row for the code in front of
        // them — so a text scan for the filename would fail on exactly the sites that did the
        // right thing. Only files that mention it at all are parsed.
        const needle = 'exo-error-codes';
        const offences: string[] = [];
        for (const { file, text } of shippedFiles()) {
            if (!text.includes(needle)) continue;
            const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
            const report = (specifier: string, node: ts.Node): void => {
                if (!specifier.includes(needle)) return;
                const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
                offences.push(
                    `${relative(file)}:${line + 1} — imports \`${specifier}\`. The registry is a ` +
                        'documentation artefact: a shipped module that imports it puts every ' +
                        'explanation back into every bundle, which is the whole of what the ' +
                        'codes were introduced to remove. Read the row, do not link to it. ' +
                        '(Tests are exempt — this one reads the file — because a test never ships.)'
                );
            };
            const visit = (node: ts.Node): void => {
                if (
                    (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
                    node.moduleSpecifier !== undefined &&
                    ts.isStringLiteral(node.moduleSpecifier)
                ) {
                    report(node.moduleSpecifier.text, node);
                } else if (ts.isCallExpression(node)) {
                    // `import('…')` and `require('…')`, the two ways to reach a module without an
                    // import declaration. Both are string-literal-only here; a computed specifier
                    // would defeat this and is not a thing any package in this repo does.
                    const callee = node.expression;
                    const isDynamic =
                        callee.kind === ts.SyntaxKind.ImportKeyword ||
                        (ts.isIdentifier(callee) && callee.text === 'require');
                    const first = node.arguments[0];
                    if (isDynamic && first !== undefined && ts.isStringLiteral(first)) {
                        report(first.text, node);
                    }
                }
                ts.forEachChild(node, visit);
            };
            ts.forEachChild(source, visit);
        }

        expect(
            offences,
            `${offences.length} shipped file(s) reaching for the registry:\n` + offences.join('\n')
        ).toEqual([]);
    });
});
