#!/usr/bin/env node
// SOURCE-CITATION GATE — every `file.ts:123` in the docs must still point at what it says it does.
//
// Run:  node scripts/check-doc-citations.mjs   (or `npm run check:citations`)
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// PROPOSED, NOT BUILT — A CITATION FORM THAT CANNOT ROT.
//
// THE CLASS THIS GATE STRUCTURALLY CANNOT SEE. Everything below the DRIFT heading depends on the
// citing paragraph naming a symbol that survives the anchor filter (>= 4 chars, camelCase /
// PascalCase / underscore / digit, not a DOM builtin). When the paragraph is written in ENGLISH —
// "a silent disagreement would not crash", "the accounting for keeping the check in production
// builds is written out" — there is no anchor, the citation is reported `unanchored`, and it is
// NEVER failed. So it sits on whatever line the last refactor left it on, indefinitely. Two
// by-hand sweeps each found dozens of these; the second one moved
// eleven citations across five pages — `compileExoStrSchema.ts:250` had become
// 319-325, `:144-163` had become 203-219, `:110-118` had become 138-145. Every one of them
// resolved, was in bounds, and landed on a non-blank line. This gate passed all eleven.
//
// The rot is not in the pages. It is in the POINTER: a line number is a coordinate in a file that
// changes for reasons that have nothing to do with the claim.
//
// THE SHAPE. Accept `path/to/file.ts#symbolName` as a first-class citation form, alongside
// `file.ts:123`, and let the gate resolve the line itself at run time:
//
//   · resolution: `symbolName` -> the line where that name is DECLARED in that file, plus the
//     comment block directly above it (the same "reaches up through its own documentation" rule
//     the drift check already uses). A name that does not exist in the file FAILS — that is the
//     whole check, and it is exact rather than a ±12 line heuristic.
//   · the machinery is a walk of the runtime packages with the TypeScript compiler API, pushing
//     `{ file, name, line }` for every declared function, and a resolver that splits `file#name`.
//     Neither is a parser anybody would have to write from scratch.
//   · non-function anchors (a `const`, a type, a comment heading) are NOT covered by that index.
//     They would either extend the walk to declarations generally, or keep `:line`. This is the
//     honest limit of the proposal, and it is the reason it is a MIGRATION and not a replacement.
//
// WHAT MIGRATING WOULD COST. The corpus is ~2678 `file.ext:line` citations in `docs-site/docs/**`
// plus `README.md` (grep; the gate's own count over its full corpus — which adds
// `docs-site/blog/**` and `packages/*/README.md` — is printed on every run and is larger).
//
//   · A citation that names a symbol the paragraph already mentions converts mechanically: the
//     anchor logic in this file ALREADY computes that symbol, so a `--suggest` pass could print
//     the rewrite for each one and a human would approve a diff rather than author it. My
//     judgement, not a measurement: that is the majority of them.
//   · The `unanchored` set — the exact set this proposal exists for — converts by HAND, because
//     nothing in the paragraph says what to anchor to. That is a page-by-page read, and it is the
//     same work the two sweeps just did, once more, but permanently.
//   · Ranges lose information. `:203-219` says "these seventeen lines"; `#compileExoStrSchema` says
//     "this declaration and its header". For a citation into the MIDDLE of a long function the
//     symbol form is coarser, and some citations should keep `:line` for that reason alone.
//   · Both forms have to work forever. This is not a flag day, and a gate that demanded the new
//     form would be a gate somebody deletes — this repository has lost two that way (see the
//     TOLERANCE note below).
//
// WHAT IT BUYS. The failure mode disappears rather than being detected: a symbol citation cannot
// point at the wrong line, because it has no line until the gate computes one. A rename FAILS
// LOUDLY where today it drifts silently, which inverts the current default — today the pointer
// stays plausible and wrong; then it would break and say so. And the ±12-line tolerance, the one
// judgement call in this file, stops applying to every citation that carries a symbol.
//
// WHAT IT DOES NOT BUY. It does not check that the SENTENCE is still true, only that it points at
// the named thing. It should not be described as more than that.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHY THIS EXISTS.
//
// The best property these docs have is that they CITE. A page does not say "the reconciler is
// swappable", it says so and prints `packages/dom/src/index.ts:264`, and a reader who does not
// believe it can open the file. Nothing checked those pointers, and an audit of the
// 199 of them found the rot you would expect from four months of refactoring:
//
//   · `packages/dom/src/index.ts:247-248` is cited on SIX pages as the line that exports
//     `attachExoKeyedList`. Lines 247-248 are the middle of a paragraph about `rememberChild`;
//     the export was at 264-265. Every one of those six sent a reader to the wrong place. One was
//     fixed with this gate and the other five were written down in ACKNOWLEDGED, because that
//     change belonged to somebody else. All six were re-cited, by which time the
//     export had moved again — to 279 — and the five entries are gone from the table.
//   · `exo-runtime.ts:296` for `providersOf` (it is at 369), `:319` for the takeover (389-392),
//     `:105` for `exoRuntime` (114). NOTE: that file is gone — `packages/core/src/
//     runtime/` was deleted when a backend became a composition (`new ExoDomBackend(...packs)`),
//     and no page cites it any more. The four line numbers above are kept because they are the
//     evidence for why this gate exists, not because anybody can open them.
//   · `packages/string/src/node/renderExoStrInstance.ts:372-381` — the file is 363 lines long. NOTE:
//     that file has since grown to 652 lines, so 372-381 is IN BOUNDS today and a
//     reader who opens it will not see what the audit saw. It is kept because it is what the audit
//     found — the evidence for this check existing — not because it can be reproduced.
//   · Two pages disagreed about the same count: one said `rt.get` is called in "exactly five"
//     places, the other in "exactly three". It is four.
//
// A citation is a promise that a reader can check the claim. A stale citation is worse than none:
// it spends the reader's trust and hands them an unrelated line.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT COUNTS AS A CITATION, AND HOW ONE IS RESOLVED.
//
// The detector is `<path-ish>.<ext>:<line>` or `:<from>-<to>`, backticks optional, taken from
// `docs-site/docs/**`, `docs-site/blog/**` (which cite too — checked, they do), `README.md` and
// `packages/*/README.md`. Fenced code blocks are SKIPPED: a `// packages/dom/src/x.ts` comment
// inside a sample is illustration, not a pointer, and several samples carry one.
//
// The docs write a citation three ways and a reader resolves all three without thinking, so this
// does too, in order:
//
//   1. REPO-ROOTED — `packages/dom/src/index.ts:264`. Exists or it does not.
//   2. A SUFFIX OF SOMETHING ALREADY CITED ON THIS PAGE — `remember-child.ts:41-51`,
//      `index.ts:38-51`. Resolved against the most recent EARLIER
//      citation on the same page whose path ends with it, then against the most recent one with
//      the same basename. That is exactly how the pages read: a full path is written once and then
//      shortened — `troubleshooting.md` writes `packages/dom/src/dom/remember-child.ts:41-51` in
//      the prose and then `remember-child.ts:41-51` in the table under it.
//      Resolution is per PAGE and resets at the top of each file, so one page cannot lend a
//      meaning to the next.
//   3. A UNIQUE SUFFIX IN THE REPOSITORY — one file, and only one, ends with that path.
//
// Anything left over is a violation: a pointer nobody can follow is not a citation.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE FOUR MECHANICAL CHECKS. These fail the build, and each was read report-by-report over the
// whole corpus before being turned on — 199 citations at the time of the audit, and over a
// thousand at its widest. The hits are listed above and below; there were no others.
//
//   1. UNRESOLVED — see above.
//   2. PAST THE END — `exo-str-connector.ts:372-381` against a then-363-line file (see the note on
//      that example above: the file has since grown past those lines). Five more were
//      acknowledged when this landed and all five were re-cited; none is left.
//   3. INVERTED OR ZERO — `:52-41`, `:0`. None today; it costs nothing to refuse.
//   4. POINTS AT NOTHING — a SINGLE-line citation landing on a blank line or a bare closer
//      (`}`, `});`, `*/`, `)`, `];`). This is the cheap half of drift detection and it is exact:
//      a citation is a claim that a line SAYS something, and `*/` says nothing. It had three hits
//      when it was written and all three were fixed in the same change: `index.ts:266` on two
//      pages (the export had moved to 293), and `exo-composed-render.test.ts:179`, a `});` where
//      the test it names now starts at 193. Zero false positives over the whole corpus, which is
//      why it is a failure and not a note. It is deliberately not applied to RANGES: a range
//      legitimately ends on a closing brace.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE FIFTH CHECK — DRIFT — AND THE TOLERANCE, WHICH IS THE ONLY JUDGEMENT CALL IN THIS FILE.
//
// The failure that started this was not deletion. `index.ts:247-248` resolves, is in bounds, and
// is not blank. It is simply about something else now. Bounds checking cannot see that.
//
// The evidence available is that these pages name what they are pointing at. They almost always
// write it in backticks in the same sentence — "`bindList` remembers which child belongs to which
// item through `rememberChild` (`packages/dom/src/dom/remember-child.ts:41-51`)" — so the check
// is: THE THING THE SENTENCE NAMES SHOULD BE FINDABLE NEAR THE LINE THE SENTENCE CITES.
//
//   · ANCHORS come from the backticked code spans in the citation's own paragraph, ordered by
//     character distance from the citation, split into identifier tokens. A token is kept if it is
//     four characters or more AND looks like code rather than English — camelCase, PascalCase,
//     an underscore, or a digit. That filter is not decoration: without it `CANNOT` and `RENDERER`
//     (English in backticks for emphasis) were being treated as symbols and produced four false
//     reports in the trial run. A short list of DOM/JS builtins is excluded too, because
//     `getAttribute` and `innerHTML` appear everywhere and localise nothing. IN A MARKDOWN TABLE
//     ROW the context is the CELL, not the line: a row is several independent claims sharing a
//     line, and taking the whole row produced four wrong reports.
//   · OCCURRENCES are whole-word matches on any line of the target, COMMENTS INCLUDED — the
//     headers in this repository are where most of the argument lives, and a doc that cites a
//     header is citing prose, not code. `import` lines are excluded: an import is where a name
//     ARRIVES, never where it is, and reporting "nearest occurrence: line 8" for a file whose
//     interesting line is 160 is a worse message than none.
//   · AN OCCURRENCE REACHES UP THROUGH THE COMMENT BLOCK DIRECTLY ABOVE IT, with no tolerance
//     added at that end, because that block is the occurrence's documentation. This is the rule
//     that separates a legitimate header citation from a stale pointer: `assertExoNoElementInRawText.ts
//     :29-32` is inside the block attached to `assertExoNoElementInRawText` and passes, while
//     `index.ts:247-248` lands in the paragraph about `rememberChild`, one block ABOVE the block
//     attached to the `attachExoKeyedList` export, and fails.
//   · A CITATION INTO THE FILE'S OWN LEADING HEADER is anchored by any occurrence anywhere. A file
//     header documents the whole file and the import list separates it from every declaration, so
//     nothing in the file is ever "near" it by line count.
//   · ANCHORED means ANY candidate anchor reaches the citation. Any, not all — a sentence names
//     several things and only one of them is usually the subject, and demanding all of them fires
//     on every well-written sentence.
//   · NO ANCHOR AT ALL, or none that occurs in the file: reported as `unanchored`, NEVER failed.
//     Most are legitimate, and the two shapes are worth telling apart. A sentence written in
//     ENGLISH names nothing to look for at all — that is the class described at the top of this
//     file, and it is the reason the symbol-citation proposal exists. A sentence that DOES name
//     something can still be unanchorable when the name it uses is a CALLER rather than a resident.
//     The example that stood here was `troubleshooting.md` explaining `@exodra/string`'s
//     duplicate-item behaviour in terms of `bindList` while pointing at the method `bindList` is
//     sugar over. IT IS NOT AN EXAMPLE ANY MORE, and how it stopped being one is the useful half:
//     the page's two pointers there had rotted onto `own()` and `on()`, and the
//     rewrite that fixed them split the sentence in two — one clause citing `bindList` itself, one
//     citing the `renderExoInstanceOnConnector` call it prints each entry through. Naming the
//     resident instead of the caller is the fix for this whole shape, and it costs a clause. Both
//     kinds are printed on every
//     run with their count; the count moves with the corpus, so it is not written down here.
//     The gate says out loud that it cannot check them rather than inventing a check that would.
//
// THE TOLERANCE IS ±12 LINES, and it was chosen by running the rule over the whole corpus at 3, 5,
// 8, 12, 16 and 20 and reading every report:
//
//   · at ±5 the rule fires far more often, and most of the extra fires are one honest pattern — a
//     page citing a paragraph in a function's JSDoc header while the function itself is 7 to 10
//     lines below (`exo-default-plugin.ts:50` for `exoDefaultPlugin` at 57, `exo-provider.ts:11-19`
//     for `exoProvider` at 27). Those citations are right. A gate that calls them wrong is a gate
//     that gets deleted, and this repository has lost two that way. NOTE: BOTH of
//     those files have since been deleted, so the two examples can no longer be opened. The
//     PATTERN they stand for is unchanged and still all over the corpus — every citation into a
//     JSDoc header is one — and the sweep that produced ±12 was run against them, so replacing
//     them with fresh examples would be pretending to evidence this number does not have. If the
//     tolerance is ever re-argued, re-run the sweep rather than re-labelling this bullet.
//   · at ±20 the rule stops seeing `index.ts:247-248` (16 lines from the export it claims to be),
//     which is the single most-repeated stale pointer in the docs.
//   · ±12 keeps that one — 16 > 12 — and clears the header-paragraph pattern, whose misses in this
//     corpus run 6 to 10 lines. It is a judgement, it is not a law of nature, and the number to
//     change if it proves wrong is `DRIFT_TOLERANCE` below.
//
// WITH ALL OF THAT IN PLACE the rule fires on a small fraction of the corpus — seven times on the
// 1315 citations it was tuned against. That ratio is the point: every report that survives is
// written down below, individually, and a reader who opens this file finds a sentence rather than
// a list of paths. The count moves with the corpus; the table is the record, not this number.
//
// DRIFT IS A RATCHET, NOT A VERDICT. Every drift report that exists today is written into
// `ACKNOWLEDGED` with a sentence saying why it is there — either "this is a real stale pointer
// nobody has fixed yet", naming the line it should be, or "this is a header citation the rule
// cannot tell from a stale one". A drift report that is NOT in that table fails the build. So the
// docs cannot get worse, every accepted case is a sentence somebody wrote on purpose, and the
// table shrinks as the stale ones are fixed. An entry that no longer matches anything ALSO fails —
// an acknowledgement that has outlived its citation is how a list like this rots into a mystery.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT THIS GATE CANNOT DO. Stated at length because a gate that is trusted past its reach is
// worse than no gate:
//
//   1. IT CANNOT TELL YOU THE CITED LINE SUPPORTS THE SENTENCE. This is the big one. It checks
//      that a name the sentence uses is findable near the line. It has no idea whether the line
//      MEANS what the paragraph says it means. `compile-hydrate-plan.ts:182` really is the
//      `setHtml` pointer compare — that it is ALSO the reason a raw-markup fill is silenced on an
//      adopting page is a claim only a human can check, and re-check when the code changes. THAT
//      LINE NUMBER READ `:160` HERE, AND ON THE PAGE, UNTIL IT WAS FIXED, by which time 160 was the
//      middle of the comment ABOVE the compare. The gate never reported it, because `setHtml` is
//      named on 159 and 159 is one line away: the anchor was satisfied by the paragraph ABOUT the
//      line while the line itself had moved twenty-two lines down. That is this limit, caught in
//      the act, and it is why the sentence above is stated first.
//   2. IT CANNOT SEE A MOVE TO ANOTHER FILE. The drift rule only fires when the anchor is still
//      in the file cited. If `attachExoKeyedList` moved to another package entirely, the citation
//      would be `unanchored` — reported, not failed.
//   3. IT CANNOT CHECK A CITATION THAT NAMES NOTHING. 41 of 199 today. `imperative-escape.md`'s
//      pointer into a 60-line hazard note in `exoForeignNode.ts` is a paragraph reference, and
//      paragraphs have no names.
//   4. IT CANNOT CHECK COUNTS. "`rt.get` is called in exactly four places" is a claim about a
//      whole package; nothing here counts anything. That claim was wrong on two pages in two
//      different directions and only a grep found it.
//   5. A RANGE IS CHECKED AT ITS EDGES ONLY. `:22-102` passes if the anchor is anywhere in or near
//      it. Whether the range still covers the right 80 lines is not asked.
//   6. SUFFIX RESOLUTION CAN BE WRONG. `index.ts:38-51` means "the `index.ts` we were just talking
//      about". If a page shortens a path it never wrote in full, the gate resolves it against the
//      whole repository and takes it if it is unique — which is a guess that happens to be right
//      today. A wrong guess shows up as an out-of-bounds or a drift report, never as silence.
//   7. IT DOES NOT READ `docs-site/static/llms-full.txt`. That file is GENERATED from the docs;
//      fix a page and re-run `npm run check:llms`, which regenerates it.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// See the header: chosen by sweeping 3/5/8/12/16/20 over all 199 citations and reading the reports.
const DRIFT_TOLERANCE = 12;

// ─────────────────────────────────────────────────────────────────────────────────────────────
// ACKNOWLEDGED. One entry per citation the gate reports and a human has read.
//
// `page` + `cite` identify it — never a line number, which moves whenever a paragraph is added
// above it. `why` is not optional and is printed on every run. Two kinds live here and they are
// labelled: `STALE:` means the pointer really is wrong and is waiting on somebody with the right
// to edit that page; anything else means the report is a limit of the rule, and says which.
//
// An entry that matches no reported problem FAILS. Fix the citation, delete the entry.
const ACKNOWLEDGED = [
    {
        page: 'docs-site/docs/why/sugar-not-restrictions.md',
        cite: 'compileExoDomSchema.ts:777',
        why: 'Points where it says: line 777 is `const writers = backend.writers`, the read the sentence describes. The gate reads the FILE name as the named symbol and measures from the function declaration at 682.',
    },
    // ── fabricated paths, cited on purpose ───────────────────────────────────────────────────
    {
        page: 'docs-site/docs/tooling/introspect.md',
        cite: 'src/components/UserContent.tsx:25',
        why: 'Not a file in this repository and must not be. The admonition is quoting the FIXED "findings" `@exodra/introspect` 0.1.0-0.2.0 returned for every project it was pointed at; naming files that need not exist is the entire point of the paragraph.',
    },
    {
        page: 'docs-site/docs/tooling/introspect.md',
        cite: 'src/auth/validation.ts:10',
        why: 'Same fabricated finding, second of three. See the entry above.',
    },
    {
        page: 'docs-site/docs/tooling/introspect.md',
        cite: 'src/utils/logger.ts:8',
        why: 'Same fabricated finding, third of three. See the entry above.',
    },
    {
        page: 'packages/introspect/README.md',
        cite: 'src/components/UserContent.tsx:25',
        why: "The README repeats the docs page's admonition verbatim. Fabricated on purpose.",
    },
    {
        page: 'packages/introspect/README.md',
        cite: 'src/auth/validation.ts:10',
        why: "The README repeats the docs page's admonition verbatim. Fabricated on purpose.",
    },
    {
        page: 'packages/introspect/README.md',
        cite: 'src/utils/logger.ts:8',
        why: "The README repeats the docs page's admonition verbatim. Fabricated on purpose.",
    },


    // ── THE SENTENCE NAMES THE FUNCTION THE CITED LINES ARE INSIDE ────────────────────────────
    // A declaration reaches DOWNWARD only twelve lines, so a page citing a passage deep inside a
    // long function is reported however right it is. Each of these was opened by hand and each
    // says what is actually at the line.


    // ── THE ANCHOR CAME FROM THE NEXT SENTENCE OR THE NEXT BULLET ─────────────────────────────
    // The context window is five LINES, so where consecutive sentences each cite a different
    // passage of the same file, the name belonging to the sentence BELOW is regularly the nearest
    // span to the citation above it.
    // RETIRED: the troubleshooting page no longer cites
    // `duplicate-item-parity.test.ts:160-178`. It acknowledged a sentence saying the backends
    // DISAGREE on a duplicated item, pinned by a test that asserted the disagreement. The fork is
    // closed — a position is a row on every backend — so the sentence, the citation and this
    // acknowledgement all went with it. The entry's own warning came true: it rotted, and what
    // moved was not the line numbers but the fact underneath them.


];

// ─────────────────────────────────────────────────────────────────────────────────────────────
// RETIRED ACKNOWLEDGEMENTS — kept as text, removed from the live table.
//
// NOTHING HERE WAS DELETED. An acknowledgement is a decision somebody wrote down, and the reason
// the gate fails on one that matches nothing is that a list of unexplained entries rots into a
// mystery. Retiring one to a labelled block with the evidence for its retirement serves that same
// purpose; quietly deleting it would not. Each entry below is reproduced VERBATIM, followed by
// what the audit found.
//
// All six were checked by grepping each page for the literal `cite` string: none of
// the six citations appears on its page any more, so each entry was silencing a report the gate
// no longer produces, which is a build failure under the `dead` rule above.
//
//   1. { page: 'docs-site/docs/why/abstractions-collapse.md',
//        cite: 'packages/core/src/runtime/exo-runtime.ts:445-460',
//        why:  'RE-CITED — it read `:381-396`, which is now inside the `get`
//               refusal's comment. 445-460 is pass 4: the loop over `order` that calls each
//               winning `make` and skips every provider that was taken over, which is the
//               "resolves every provider in dependency order" the sentence describes. The anchor
//               is `exoRuntime`, the 350-line function the loop is inside; its nearest textual
//               occurrence is the refusal message at 426.' }
//
//   2. { page: 'docs-site/docs/why/sugar-not-restrictions.md',
//        cite: 'exo-runtime.ts:453-456',
//        why:  'RE-CITED — it read `:389-392`, which is now inside the `get`
//               refusal. 453-456 are the comment "THE TAKEOVER, and this one line is all of it: a
//               provider that did not win is never called" and the `continue` under it, which is
//               the bullet's claim at the line that makes it. The anchor `providersOf` belongs to
//               the NEXT bullet, one line below, and is the object key at 433.' }
//
//   3. { page: 'docs-site/docs/guides/plugins.md',
//        cite: 'packages/core/src/runtime/exo-runtime.ts:76-95',
//        why:  'Verified by hand and CORRECT — 76-95 is the JSDoc listing the four passes and the
//               refusal each makes, which is what the sentence describes. The anchor that fires is
//               the error code `EXO0001`, and a code lives in the message it is attached to (line
//               159), never in the paragraph explaining the behaviour.' }
//
//   4. { page: 'docs-site/docs/why/abstractions-collapse.md',
//        cite: 'exo-runtime.ts:366',
//        why:  'Line 366 is `const wiring: TExoWiring = Object.freeze({ need })`, which is exactly
//               what the sentence claims for it — and the sentence NAMES `TExoWiring`. The token
//               filter rejects it: `/^[A-Z][a-z]/` tests the second character, and every exported
//               type in this repository is `TExo…` or `EExo…`. So the only anchor left is
//               `exoRuntime`, whose nearest occurrence is the impossible-state message at 350.
//               This entry is the clearest case for relaxing that filter; until it is relaxed, the
//               citation cannot be checked.' }
//
//   WHY 1-4 ARE GONE, and it is the same reason for all four: `packages/core/src/runtime/` no
//   longer exists. There is no `exo-runtime.ts` anywhere in the tree, `TExoWiring` has zero hits
//   across `packages/*/src`, and `providersOf` survives only as a member name in
//   `packages/dom/src/backend/types/TExoWritersInterface.ts`. A backend is composed now
//   (`new ExoDomBackend(...packs)`) and the slot runtime was deleted with it. The pages followed:
//   the string `exo-runtime` does not occur in `docs-site/docs/**`, `docs-site/blog/**`,
//   `README.md` or any `packages/*/README.md`. Entry 4 is the one worth carrying forward as an
//   ARGUMENT rather than a pointer — it is the standing case for admitting `TExo…` to the token
//   filter, and the measured trade for doing so is recorded in the note below this block.
//
//   5. { page: 'docs-site/docs/guides/plugins.md',
//        cite: 'packages/dom/src/index.ts:277-278',
//        why:  'RE-CITED — it read `:262-263`, and the paragraph moved with the
//               `attachExoKeyedList` export. 277-278 are the two lines above that export: "It does
//               NOT work on a hydrated page: `adoptList` seeds a registry keyed by item, and there
//               is no keyed adoption pass yet." That is the bullet's claim, at the line that makes
//               it. `ExoHydrateConnector` is named in the bullet because it is the class that HAS
//               no such method; it is exported at 130, 147 lines up, and an absence cannot be
//               cited.' }
//
//   WHY 5 IS GONE: `packages/dom/src/index.ts` still exists (537 lines), but `guides/plugins.md`
//   now carries NO `index.ts:` citation of any kind. The bullet was rewritten, not moved.
//
//   6. { page: 'docs-site/docs/troubleshooting.md',
//        cite: 'packages/string/src/node/renderExoStrInstance.ts:211-220',
//        why:  'The anchor the sentence names, `bindList`, is a CALLER of this passage rather than
//               a resident of it — the string backend has no `bindList`, only the method it is
//               sugar over. The rule has nothing better to measure against, so the pointer is
//               neither confirmed nor refuted here.' }
//
//   WHY 6 IS GONE: `exo-str-connector.ts` still exists (652 lines) and `troubleshooting.md` still
//   cites it, but never at `:211-220`. The three pointers it carried — `:256-265`
//   twice and `:280-286` — had all rotted onto other methods entirely (`own()` and `on()`), and
//   were re-cited the same day to `:435-441` (`bindList`, whose whole body is `this.list(…)`),
//   `:411-419` (the loop in `list` that prints one instance per entry) and the same `:411-419` in
//   the backend table. The observation the entry records has also stopped being literally true:
//   `bindList` now occurs at 435 and 499 in that file, so a sentence naming it is no longer
//   unanchorable there by construction — and the rewrite went further, naming
//   `renderExoInstanceOnConnector` in the clause that points into `list`, because the resident is
//   what anchors and the caller is not. If the rule fires on one of the surviving pointers, write a
//   new entry then, with its own line numbers, rather than resurrecting this one.
//
//   8. { page: 'docs-site/docs/troubleshooting.md',
//        cite: 'packages/list-reconcile/src/reconcileExoChildren.ts:113-115',
//        why:  'Lines 113-115 are the header paragraph beginning "One child may appear once.",
//               which the sentence quotes in those words. The anchor `bindList` comes from the NEXT
//               paragraph, the one about `@exodra/string`; in this file `bindList` appears once, at
//               38, naming the caller this primitive is sugar for.' }
//
//   WHY 8 IS GONE: the comment pass took that file from 700-odd lines to 300, and the sentence the
//   entry vouches for is not in it any more — `grep "appear once" packages/dom/src` answers with one
//   hit, in `packages/dom/src/plugins/README.md`, not in `attach-exo-children.ts`. The header now
//   states the same limit in different words at line 17, "A value occurring twice resolves to one
//   node.", and the page was re-cited to `:15-17` and re-quoted to match. The old pointer had also
//   stopped being a failure before that: at 113-115 it is in bounds and merely `unanchored`, so the
//   entry was silencing a report the gate no longer produces.
//
//   9. { page: 'docs-site/docs/why/sugar-not-restrictions.md',
//        cite: 'dom/compileExoDomSchema.ts:231',
//        why:  'RE-CITED … Line 231 is `const events = backend.events;`, which is
//               exactly the field load the bullet is about … NOTHING IN THE SENTENCE CAN ANCHOR IT:
//               the subject is `backend.events`, and both halves are ordinary lowercase English
//               words, so the filter throws them away … The only anchor left is `nodeSource`, whose
//               nearest occurrence in this file is line 211.' (abridged; the full text is in the
//               history of this file)
//
//   WHY 9 IS GONE, and it is worth reading because the entry itself had rotted into a false
//   statement: `const events = backend.events;` is line 58 today, not 231, and line 211 holds no
//   `nodeSource` — that name is at 476, beside `backend.writers` at 475. The comment sweep that took
//   this package from 57% comment to 23% moved the read 173 lines up, and an acknowledgement whose
//   `why` asserts what is at a line ages exactly as badly as the pointer it excuses. The page was
//   re-cited to `:58` and `:475-476`, and the sentence now names `compileExoDomSchema` — which IS
//   declared four lines above the read, so the citation anchors on its own and needs no entry. The
//   bullet also claimed `backend.children` was read in the compiler at `:1740`; it is not read there
//   at all any more, and the page says so instead of pointing.
//
//   ALSO RETIRED, and this one because the page was FIXED rather than because it rotted:
//
//   7. { page: 'docs-site/docs/why/what-others-forbid.md',
//        cite: 'node-source.html:116',
//        why:  'Verified by hand and CORRECT — line 116 is
//               `take(props => parkExoChild(c.build(CARD, props)));`, the one call in the page
//               that releases a subtree … the anchors that fire are `providersOf` and
//               `EXO_PLUGIN_SLOT_NODE_SOURCE`, and both live in that print at 180-181 … This page
//               carries three pointers into one file — `:116`, `:179-181` and `:78-84` — and each
//               is anchored by its neighbour's subject.' (abridged; the full text is in the
//               history of this file)
//
//   EVERY FACTUAL CLAIM IN THAT `why` WAS FALSE, and the page it vouched for was
//   repeating one of them. Line 116 of `packages/examples/plugin-slots/node-source.html` is
//   `P => (c, props) => {`, the wire half of the CARD component; `parkExoChild` is not called
//   anywhere in the page, which instead THROWS at boot if `@exodra/dom` still exports it (89-95).
//   `providersOf` and `EXO_PLUGIN_SLOT_NODE_SOURCE` occur zero times in the file, and `:179-181`
//   is no longer cited by the page at all. The doc sentence — "the release half is called from
//   application code" — contradicted the paragraph six lines above it, which already said that
//   argument was wrong. The page was rewritten to point at what is really there:
//   `:133-143` (the comment where the old `parkExoChild` call used to stand, saying the engine
//   installs the release as `plan.childUnmount`), `:219-225` (the `backend.nodeSource` read-back),
//   and `:101-105` (the two refusals, which name `servesExoPlan`). Each of the three names a
//   symbol that occurs inside the lines it cites, so none of them needs an acknowledgement.
// ─────────────────────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE TOKEN FILTER AND THE `TExo` BLIND SPOT — measured, NOT applied.
//
// `/^[A-Z][a-z]/` tests the SECOND character, and this repository mandates `TExo`/`EExo` on every
// exported type. So `TExoWiring`, `TExoView`, `TExoDomChild` and `TExoPort` are thrown away as
// English, and a sentence whose only symbol is a type name is unanchorable however right it is —
// `why/abstractions-collapse.md`'s `exo-runtime.ts:366` was exactly that, and it is entry 4 of the
// RETIRED block above: the citation went away with the file, and the ARGUMENT for the change did
// not. Every `TExo…` sentence in the corpus is still blind to this rule.
//
// TWO CANDIDATE CHANGES WERE RUN OVER THE WHOLE CORPUS (2325 citations at the time), by
// reimplementing this file's rules and diffing report-for-report:
//
//   · `/^[A-Z][A-Za-z]/` — the one-character form. 62 citations gain an anchor, 5 reports clear,
//     and ELEVEN new ones appear. It re-admits SCREAMING English in backticks — `CENSUS`, `GROW`,
//     `NOTHING` and `RENDERER`, which is the token named in the header above as one of the four
//     false reports the filter was written to stop. It is the wrong change.
//   · a fourth alternative, `/^[TE]Exo[A-Z]/`, admitting the prefixes and nothing else. 42
//     citations gain an anchor, 3 reports clear (all three are genuine blindness), and SEVEN new
//     ones appear: ONE real stale pointer that was invisible today (a `:68` for `SPECS.clear()`,
//     which is at 142 — since fixed) and six citations that are correct
//     and would each need an entry below.
//
// So the trade is +3 acknowledgements for 1 pointer caught, on today's corpus. That is a
// judgement, not a verdict, and it is the owner's to make. Nothing here has been changed.
//
// Builtins that appear in every DOM file and localise nothing. This list is EXACTLY the one the
// tolerance sweep was run with; adding to it changes which citations pass, so add nothing without
// re-reading the report.
const BUILTINS = new Set([
    'getAttribute', 'setAttribute', 'removeAttribute', 'innerHTML', 'outerHTML', 'textContent',
    'parentNode', 'nextSibling', 'previousSibling', 'firstChild', 'lastChild', 'cloneNode',
    'appendChild', 'insertBefore', 'removeChild', 'querySelector', 'querySelectorAll',
    'addEventListener', 'removeEventListener', 'createElement', 'createTextNode',
    'DocumentFragment', 'WeakMap', 'WeakSet', 'Symbol', 'Object', 'Array', 'Element', 'Node',
    'Text', 'JSON', 'Promise', 'Number', 'String', 'Boolean', 'Error', 'Function',
]);

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.docusaurus', 'coverage']);
const CODE_EXT = /\.(ts|tsx|js|jsx|mjs|mts|cjs|rs|json|html|css|md)$/;

// ── the corpus ────────────────────────────────────────────────────────────────────────────────

function walk(dir, acc, pred) {
    if (!existsSync(dir)) return acc;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (SKIP_DIRS.has(entry.name)) continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full, acc, pred);
        else if (pred(entry.name)) acc.push(full);
    }
    return acc;
}

function scannedPages() {
    const md = (n) => n.endsWith('.md') || n.endsWith('.mdx');
    const files = walk(join(root, 'docs-site', 'docs'), [], md);
    walk(join(root, 'docs-site', 'blog'), files, md);
    files.push(join(root, 'README.md'));
    for (const entry of readdirSync(join(root, 'packages'), { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const readme = join(root, 'packages', entry.name, 'README.md');
        if (existsSync(readme)) files.push(readme);
    }
    return files.filter((f) => existsSync(f) && statSync(f).isFile());
}

// Every file in the repository, for rule 3 of resolution. Built once.
let repoIndex = null;
function repoFiles() {
    if (repoIndex === null) {
        repoIndex = walk(root, [], () => true).map((f) => relative(root, f));
    }
    return repoIndex;
}

// ── extraction ────────────────────────────────────────────────────────────────────────────────

// `packages/x/y.ts:12`, `y.ts:12-34`, backticks optional. The path may not contain spaces; the
// leading char class is deliberately narrow so ordinary prose ("…at 3:15") cannot match — what
// keeps prose out is the mandatory `.<code-extension>` before the colon, not the first character.
//
// A DOTFILE IS A PATH TOO, and leaving `.` out of the leading class was not a decision, it was an
// oversight with a report attached. `.dependency-cruiser.cjs` is a real file at the root of this
// repository and one page cited it fifteen times; every one of them matched from
// `dependency-cruiser.cjs` instead, which is not a file, so the gate failed fifteen correct
// citations as `unresolved` and the only ways to clear them were fifteen acknowledgements for one
// lexical quirk or fifteen rewritten paths. Adding `.` to the leading class admits nothing else:
// grepped over the whole corpus, the ONLY dot-leading citations in the docs are those
// fifteen, and none of them is relative (`./x.ts:12` would resolve against nothing and would be
// reported, correctly, the moment somebody writes one).
//
// NOTE: there are now ZERO dot-leading citations in the corpus — `architecture/
// dependency-graph.mdx` was rewritten and no longer cites `.dependency-cruiser.cjs` by line at all.
// So the fifteen reports this class was added for cannot be reproduced either. The `.` STAYS: it
// was never a rule about those fifteen, it was the fix for a lexical oversight that would fail the
// next dotfile citation somebody writes, and there is no reading of the corpus that makes leaving
// it out correct.
const CITATION = /([A-Za-z0-9_@.][A-Za-z0-9_@./-]*\.(?:ts|tsx|js|jsx|mjs|mts|cjs|rs|json|html|css|md))`?:(\d+)(?:-(\d+))?/g;

function citationsIn(text) {
    const lines = text.split('\n');
    const out = [];
    let fenced = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/^\s*(```|~~~)/.test(line)) {
            fenced = !fenced;
            continue;
        }
        if (fenced) continue; // see the header: a path in a code sample is illustration
        CITATION.lastIndex = 0;
        let m;
        while ((m = CITATION.exec(line)) !== null) {
            out.push({
                line: i + 1,
                column: m.index,
                text: `${m[1]}:${m[2]}${m[3] ? `-${m[3]}` : ''}`,
                path: m[1],
                from: Number(m[2]),
                to: m[3] ? Number(m[3]) : Number(m[2]),
                isRange: Boolean(m[3]),
            });
        }
    }
    return out;
}

// ── resolution ────────────────────────────────────────────────────────────────────────────────

function resolve(path, seenOnPage) {
    if (existsSync(join(root, path)) && statSync(join(root, path)).isFile()) {
        return { file: path, how: 'rooted' };
    }
    // most recent earlier citation on this page whose path ends with this one
    for (let i = seenOnPage.length - 1; i >= 0; i--) {
        if (seenOnPage[i].endsWith(`/${path}`)) return { file: seenOnPage[i], how: 'page context' };
    }
    for (let i = seenOnPage.length - 1; i >= 0; i--) {
        if (basename(seenOnPage[i]) === basename(path)) {
            return { file: seenOnPage[i], how: 'page context (basename)' };
        }
    }
    const hits = repoFiles().filter((f) => f.endsWith(`/${path}`));
    if (hits.length === 1) return { file: hits[0], how: 'unique in repo' };
    if (hits.length > 1) return { file: null, ambiguous: hits };
    return { file: null };
}

// ── anchors ───────────────────────────────────────────────────────────────────────────────────

// A backticked span becomes anchors; the ORDER is by distance from the citation in the prose, so
// the first one that occurs in the file is the one whose miss gets reported.
function anchorsFor(lines, cite) {
    const own = lines[cite.line - 1] ?? '';
    let ctx;
    let citeAt;
    if (own.trim().startsWith('|')) {
        // A MARKDOWN TABLE ROW IS NOT A SENTENCE. It is several independent claims sharing a line,
        // and the spans nearest the citation belong to other columns — which produced four wrong
        // reports before this case existed. Only the cell holding the citation is context.
        const cell = own.split('|').find((c) => c.includes(cite.text)) ?? own;
        ctx = cell;
        citeAt = cell.indexOf(cite.text);
        if (citeAt < 0) citeAt = Math.floor(cell.length / 2);
    } else {
        const start = Math.max(0, cite.line - 3);
        const end = Math.min(lines.length, cite.line + 2);
        const parts = [];
        let offset = 0;
        citeAt = -1;
        for (let i = start; i < end; i++) {
            if (i === cite.line - 1) citeAt = offset + cite.column;
            parts.push(lines[i]);
            offset += lines[i].length + 1;
        }
        ctx = parts.join('\n');
        if (citeAt < 0) citeAt = Math.floor(ctx.length / 2);
    }

    const spans = [];
    const re = /`([^`\n]+)`/g;
    let m;
    while ((m = re.exec(ctx)) !== null) {
        if (CODE_EXT.test(m[1]) || /:\d/.test(m[1])) continue; // that is another citation
        spans.push({ body: m[1], distance: Math.abs(m.index - citeAt) });
    }
    spans.sort((a, b) => a.distance - b.distance);

    const seen = new Set();
    const ordered = [];
    for (const span of spans) {
        for (const token of span.body.split(/[^A-Za-z0-9_$]+/)) {
            if (token.length < 4) continue;
            if (BUILTINS.has(token)) continue;
            // camelCase, PascalCase, SCREAMING_SNAKE or something with a digit — see the header
            if (!/^[a-z$][A-Za-z0-9$]*[A-Z]/.test(token) && !/^[A-Z][a-z]/.test(token) &&
                !token.includes('_') && !/\d/.test(token)) continue;
            if (seen.has(token)) continue;
            seen.add(token);
            ordered.push(token);
        }
    }
    return ordered;
}

const wordRe = (token) =>
    new RegExp(`(^|[^A-Za-z0-9_$])${token.replace(/[$]/g, '\\$&')}([^A-Za-z0-9_$]|$)`);

function occurrencesOf(token, targetLines) {
    const re = wordRe(token);
    const out = [];
    for (let i = 0; i < targetLines.length; i++) {
        if (/^\s*import\s/.test(targetLines[i])) continue; // where a name arrives, not where it is
        if (re.test(targetLines[i])) out.push(i + 1);
    }
    return out;
}

const isComment = (line) => /^\s*(\*|\/\/|\/\*)/.test(line);

// HOW FAR AN OCCURRENCE REACHES UPWARD. The comment block sitting directly above a line IS that
// line's documentation in this repository — the headers are where most of the argument lives — so
// a page citing a paragraph of it is citing the same thing. Reaching to the TOP OF THAT BLOCK and
// no further is what keeps `index.ts:247-248` a failure: that citation lands in the paragraph
// about `rememberChild`, one block ABOVE the block attached to the `attachExoKeyedList` export.
function blockTop(line, targetLines) {
    let top = line;
    for (let k = line - 1; k >= 1; k--) {
        if (!isComment(targetLines[k - 1])) break;
        top = k;
    }
    return top;
}

// The file's own leading block — comments and blank lines before the first line of code. It
// documents the whole file and is separated from every declaration by the import list, so nothing
// in the file is "near" it by line count. A citation into it is anchored by any occurrence at all.
function leadingHeaderEnd(targetLines) {
    let n = 0;
    for (let i = 0; i < targetLines.length; i++) {
        const line = targetLines[i];
        if (line.trim() === '' || isComment(line)) n = i + 1;
        else break;
    }
    return n;
}

// ── the run ───────────────────────────────────────────────────────────────────────────────────

const problems = []; // { page, line, cite, kind, message }
const unanchored = [];
const noAnchor = [];
const sourceCache = new Map();

function sourceLines(file) {
    if (!sourceCache.has(file)) {
        const split = readFileSync(join(root, file), 'utf8').split('\n');
        // A file that ends with a newline splits into a phantom last element. Leaving it in would
        // make the bounds check one line more generous than `wc -l`, and the citation this gate
        // was written against (`remember-child.ts:41-52` against a 51-line file) is exactly one
        // line over — it would pass.
        if (split.length > 0 && split[split.length - 1] === '') split.pop();
        sourceCache.set(file, split);
    }
    return sourceCache.get(file);
}

const EMPTY_POINTER = /^(|\}|\};|\}\);|\}\)|\*\/|\)|\);|\]|\];|\{)$/;

let checked = 0;

for (const page of scannedPages()) {
    const rel = relative(root, page);
    const text = readFileSync(page, 'utf8');
    const lines = text.split('\n');
    const seenOnPage = [];

    for (const cite of citationsIn(text)) {
        checked++;
        const at = { page: rel, line: cite.line, cite: cite.text };
        const resolved = resolve(cite.path, seenOnPage);

        if (!resolved.file) {
            problems.push({
                ...at,
                kind: 'unresolved',
                message: resolved.ambiguous
                    ? `\`${cite.path}\` matches ${resolved.ambiguous.length} files in the repository ` +
                      `(${resolved.ambiguous.slice(0, 4).join(', ')}${resolved.ambiguous.length > 4 ? ', …' : ''}) ` +
                      `and no earlier citation on this page says which. Write the path in full once.`
                    : `\`${cite.path}\` is not a file in this repository. A pointer a reader ` +
                      `cannot follow is not a citation — write the real path, or say in the ` +
                      `prose that the file is illustrative and add it to ACKNOWLEDGED in ` +
                      `scripts/check-doc-citations.mjs with the reason.`,
            });
            continue;
        }
        seenOnPage.push(resolved.file);
        const target = sourceLines(resolved.file);
        const total = target.length;

        if (cite.from < 1 || cite.to < cite.from) {
            problems.push({
                ...at,
                kind: 'bad range',
                message: `\`${cite.text}\` is not a range — ${cite.from} to ${cite.to}.`,
            });
            continue;
        }
        if (cite.to > total) {
            problems.push({
                ...at,
                kind: 'past the end',
                message:
                    `\`${cite.text}\` points past the end of ${resolved.file}, which is ${total} ` +
                    `lines long. The passage moved or shrank; re-read it and re-cite.`,
            });
            continue;
        }

        if (!cite.isRange) {
            const body = (target[cite.from - 1] ?? '').trim();
            if (EMPTY_POINTER.test(body)) {
                problems.push({
                    ...at,
                    kind: 'points at nothing',
                    message:
                        `\`${cite.text}\` lands on ${body === '' ? 'a blank line' : `\`${body}\``} ` +
                        `— a line that says nothing. Whatever this used to cite has moved.`,
                });
                continue;
            }
        }

        // --- drift ---
        const anchors = anchorsFor(lines, cite);
        if (anchors.length === 0) {
            noAnchor.push({ ...at, file: resolved.file });
            continue;
        }
        const headEnd = leadingHeaderEnd(target);
        let near = false;
        let firstFound = null;
        for (const token of anchors) {
            const occ = occurrencesOf(token, target);
            if (occ.length === 0) continue;
            if (
                cite.from <= headEnd || // the file's own header — see leadingHeaderEnd
                occ.some((o) => {
                    if (cite.from > o + DRIFT_TOLERANCE) return false;
                    // plain ±tolerance first, so the comment walk only runs when it can matter
                    if (cite.to >= o - DRIFT_TOLERANCE) return true;
                    return cite.to >= blockTop(o, target);
                })
            ) {
                near = true;
                break;
            }
            if (firstFound === null) {
                let best = occ[0];
                let bestD = Infinity;
                for (const o of occ) {
                    const d = o < cite.from ? cite.from - o : o - cite.to;
                    if (d < bestD) {
                        bestD = d;
                        best = o;
                    }
                }
                firstFound = { token, line: best, distance: bestD };
            }
        }
        if (near) continue;
        if (firstFound === null) {
            unanchored.push({ ...at, file: resolved.file, named: anchors.slice(0, 3) });
            continue;
        }
        problems.push({
            ...at,
            kind: 'drift',
            message:
                `\`${cite.text}\` names \`${firstFound.token}\`, and the nearest \`${firstFound.token}\` ` +
                `in ${resolved.file} is line ${firstFound.line} — ${firstFound.distance} lines away, ` +
                `past the ±${DRIFT_TOLERANCE} this gate allows. Either the pointer should be ` +
                `${firstFound.line}, or this is a passage reference the rule cannot read: say which ` +
                `in ACKNOWLEDGED in scripts/check-doc-citations.mjs.`,
        });
    }
}

// ── acknowledgements ──────────────────────────────────────────────────────────────────────────

const used = new Set();
const live = [];
for (const problem of problems) {
    const idx = ACKNOWLEDGED.findIndex((a) => a.page === problem.page && a.cite === problem.cite);
    if (idx >= 0) {
        used.add(idx);
        continue;
    }
    live.push(problem);
}
const dead = ACKNOWLEDGED.map((a, i) => ({ ...a, i })).filter((a) => !used.has(a.i));

// ── report ────────────────────────────────────────────────────────────────────────────────────

console.log('\n📎 source-citation gate — every `file.ts:123` in the docs against the file it names\n');
console.log(
    `scanned: ${checked} citation(s) · ${problems.length} report(s) · ` +
        `${ACKNOWLEDGED.length - dead.length} acknowledged · ${unanchored.length} unanchored · ` +
        `${noAnchor.length} with no nameable anchor\n`
);

if (ACKNOWLEDGED.length - dead.length > 0) {
    const stale = ACKNOWLEDGED.filter((a, i) => used.has(i) && a.why.startsWith('STALE:'));
    const judged = ACKNOWLEDGED.filter((a, i) => used.has(i) && !a.why.startsWith('STALE:'));
    if (stale.length > 0) {
        console.log(`— ${stale.length} citation(s) KNOWN WRONG and not yet fixed —\n`);
        for (const a of stale) console.log(`  ${a.page}  \`${a.cite}\`\n      ${a.why}\n`);
    }
    if (judged.length > 0) {
        console.log(`— ${judged.length} report(s) a human read and accepted —\n`);
        for (const a of judged) console.log(`  ${a.page}  \`${a.cite}\`\n      ${a.why}\n`);
    }
}

if (unanchored.length > 0) {
    console.log(
        `— ${unanchored.length} citation(s) whose named symbols are not in the file at all ` +
            `(reported, never failed: the symbol may have moved to another file, or the sentence ` +
            `may be naming a caller rather than the passage) —\n`
    );
    for (const u of unanchored) {
        console.log(`  ${u.page}:${u.line}  \`${u.cite}\`  names ${u.named.map((n) => `\`${n}\``).join(', ')}`);
    }
    console.log('');
}

if (noAnchor.length > 0) {
    console.log(
        `${noAnchor.length} citation(s) name nothing this gate can look for — a paragraph ` +
            `reference, or a sentence written entirely in English. Bounds are checked; drift is not.\n`
    );
}

let failed = false;

if (dead.length > 0) {
    failed = true;
    console.error('✖ acknowledgements that no longer match anything:\n');
    for (const a of dead) {
        console.error(
            `  ${a.page}  \`${a.cite}\`\n` +
                `      This entry silences a report that is no longer produced. If the citation was ` +
                `fixed, delete the entry; if the citation was deleted, delete the entry. An ` +
                `acknowledgement nobody can trace back to a line is how a list like this rots.\n`
        );
    }
}

if (live.length > 0) {
    failed = true;
    console.error(`\n✖ ${live.length} citation(s) that do not point at what they say:\n`);
    for (const p of live) console.error(`  ${p.page}:${p.line}  [${p.kind}] ${p.message}\n`);
    console.error(
        `A citation is a promise the reader can check the claim. Fix the pointer, or write down in ` +
            `ACKNOWLEDGED (scripts/check-doc-citations.mjs) why this one cannot be fixed — ` +
            `individually, with the reason, never as a blanket.\n`
    );
}

if (failed) process.exit(1);
console.log('✓ every source citation resolves, is in bounds, and still names its subject');
