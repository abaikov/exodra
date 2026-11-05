// AXIS `toggle` — THE NATIVE FLOOR. How cheaply can this browser hide and show these 200 panels,
// AT ALL, with no framework of any kind between the program and Blink?
//
// It is the `toggle` axis's counterpart of `mount-floor.ts` and `teardown-floor.ts`, and it exists
// because this axis had the answer without the question. `toggle` already carries two strategy rows
// — `exodraKept` (keep the panels across the hide) and `exodraDelegated` — and the first of them is
// the largest single win recorded anywhere in this suite: 3.3 against a default 10.2 on the run
// quoted in `teardown-phases.tsx`'s header (`.gate/toggle.base1.json`; A CITATION — this file has
// measured nothing). WITHOUT A FLOOR THAT SENTENCE RANKS TWO OF OUR OWN ROWS AND NOTHING ELSE. "A
// pool is 3× the rebuild" says how far apart two of our programs are; it does not say whether
// either is near what the machine can do, and this axis is the ONE axis where the schema core is
// behind — 11% behind Solid on the same recorded run, against 26% ahead of it on mounting.
//
// ── THE QUESTION, AND THE QUESTION IT IS NOT ────────────────────────────────────────────────
//
// "Is our toggle optimal" CANNOT BE PROVED and this file does not try; `mount-floor`'s header
// argues that at length and the argument is unchanged here. A BOUND can be proved. Making 200
// panels leave the document and 200 new ones enter it cannot cost less than the DOM calls that
// move them, and no framework can delete that work. So this file writes straight-line programs
// that produce the axis's EXACT markup, byte for byte, at all four of its states, with no
// component, no declaration, no reactivity, no schema, no list block and no library — and hands
// them to the same harness, in the same session, interleaved with everybody else.
//
// ── THE SPELLING PROBLEM, WHICH IS THE WHOLE DESIGN OF THIS FILE ────────────────────────────
//
// A MOUNT HAS ONE HONEST ZERO-ABSTRACTION SPELLING AND A HIDE HAS SEVERAL. `mount-floor` could
// build one program and call it the floor. Here, "hide 200 panels" is FOUR DIFFERENT JOBS wearing
// one English sentence, and a floor that quietly picked the cheapest of them would be a floor
// chosen to flatter whoever picked it:
//
//   (1) `display: none` ON THE HOST — one style store. NOT BUILT, and the reason is mechanical
//       rather than an opinion: it leaves all 200 panels in the tree, so `markupOf(container)`
//       after a hide reads 200 panels where the reference reads none, and `gateMarkup` at the
//       'hidden again' state THROWS. It could not be a row on this axis even if it were wanted.
//       WHAT IT WOULD HAVE MEASURED: not this scenario. No node is created, destroyed, detached or
//       re-attached; the JS side is two property stores per cycle and the whole cost is Blink's
//       style and layout invalidation over nodes that never left, which lands after the timed
//       region (see the deferral caveat below). It would have come out at or under the clock's
//       quantum and it would have been answering "how cheaply can a block stop being VISIBLE",
//       which is not the question any participant on this axis is answering: Solid's `<For>` over
//       `[]`, Lit's empty child part, Mikado's `render([])` and our own `reconcileExoOrder` all really do
//       destroy. The axis's own header calls this a tab switch, a route change, a page of a
//       paginated table — jobs where the old content must genuinely go.
//
//   (2) EMPTY THE PARENT IN ONE CALL — `parent.textContent = ''`. BUILT, twice (`floor·rebuild·
//       owned`, `floor·kept·owned`). Available only to a program that OWNS the parent element,
//       which is exactly the structural split `toggle.tsx`'s header already names: Mikado's
//       `remove(0, length)` takes a branch that sets `this.root.textContent = ""` and skips
//       `node.remove()` per node, and stage0's `reconcile` opens with the same fast path.
//
//   (3) REMOVE EVERY CHILD — `panel.remove()` × 200. BUILT, twice (`floor·rebuild`, `floor·kept`).
//       This is what a list block that SHARES its parent with anything else must do — the `else`
//       branch at `attach-exo-children.ts:77`, which is the path our own renderer takes for every
//       children port that has siblings. It is NOT the path this axis's block takes; see the trace
//       below.
//
//   (4) DETACH AND KEEP versus DETACH AND DROP. Orthogonal to (2)/(3) and the more important of
//       the two axes: whether the program still holds the nodes afterwards. `exodraKept` and
//       `mikadoPooled` keep; every competing row drops. A floor that rebuilt could never bound a
//       row that keeps, and one that kept could never bound a row that rebuilds.
//
// SO THE FLOOR IS A 2×2 AND THE RUN PRINTS ALL FOUR CELLS. There is no single number here and
// pretending there is would be the lie this file exists to avoid.
//
// ── THE TWO CONTRACTS, AND WHICH ROWS MAY BE QUOTED AGAINST WHICH ───────────────────────────
//
// `teardown-floor.ts` carries a contract per row for this reason and this file adopts it verbatim.
// A comparison ACROSS a contract is not a headroom, it is two different jobs with a ratio printed
// between them, and this repository made exactly that mistake in the same week with
// `mount-floor`'s `app-clone·fill`.
//
//   THE NODE CONTRACT — what is true of the 200 panels after a hide:
//     `rebuild`  not one of them survives; the next show builds 200 new ones. This is the contract
//                of `exodra`, `exodraDelegated`, `solid`, `svelte`, `react`, `voby`, `marko`,
//                `mikado`, `lit`, `stage0`, `uhtml` and `sinuous` — the axis's own `gateRebuilds`
//                proves it of every one of them.
//     `keep`     all 200 survive, detached, and the next show writes new data into them and puts
//                them back. This is the contract of `exodraKept` and `mikadoPooled`, and the
//                axis's `gateKeeps` proves it of both.
//
//   THE PARENT CONTRACT — what the program is allowed to do to the host element:
//     `owned`    it may empty the parent in one call, because nothing else lives there.
//     `shared`   it must take each child out by itself.
//
// THE COMPARABILITY MAP, and nothing outside it may be quoted:
//
//     floor·rebuild·owned  bounds  `exodra` and `exodraDelegated` (SETTLED, see below), and
//                                  `mikado` and `stage0` (their own one-call clear, cited in
//                                  `toggle.tsx`'s header, not read by me)
//     floor·kept·owned     bounds  `exodraKept` (SETTLED), and `mikadoPooled`
//     floor·rebuild        bounds  a rebuilding block whose port has SIBLINGS — the other shape of
//                                  our own renderer, and the bracket's far end for the eight
//                                  participants whose clear path nobody here has read
//     floor·kept           bounds  the same, for a keep-alive
//
// WHICH SIDE `exodra` IS ON WAS AN OPEN DISAGREEMENT BETWEEN TWO HEADERS IN THIS REPOSITORY WHEN
// THIS FILE WAS FIRST WRITTEN, AND IT IS NOW READ RATHER THAN ARGUED. It was never a matter of
// opinion — it was a flag nobody had traced. Line by line:
//
//   1. `compileExoDomSchema.ts:467-468` — `if (frame.rawKids === 1 && frame.soleChildPort >= 0)`
//      the port is pushed onto `owned`, and `finish` (:228-232) turns that list into the schema's
//      `ownsElement` byte. A children port that is its element's ONE AND ONLY child owns its
//      element's content.
//   2. `EXO_DOM_NODE_VOCABULARY.ts:241-245` — `c.portChildList(port)` hands `schema.ownsElement[index] === 1` to
//      `createExoChildList` as its `ownsParent`, and nothing re-derives it at runtime.
//   3. `reconcileExoOrder.ts:102-106` — an empty want is `kids.removeAll()` and nothing else:
//      the reconciler never decides how a parent is emptied, the child list does.
//   4. `createExoChildList.ts:112-125` — `removeAll` runs every `unmount()` with the list still
//      whole, then `if (this.ownsParent) { N × index = -1; parent.textContent = ''; }` else
//      `removeChild` per child from the end downwards.
//   5. `clearOwnedExoChildList.ts:9-16` is the same one-call clear as a free function —
//      N × `unmount()`, N × `index = -1`, then ONE `parent.textContent = ''` — exported from
//      `@exodra/dom` and called by nothing in the library, which is why (4) is the path that runs.
//
// THE AXIS'S HOST IS `b.el('div', null, (host) => { panels = host.childrenPort(); })`, whose div
// has exactly one kid, so (1) fires and the hide is the ONE-CALL clear. `toggle.tsx`'s
// `gateOwnsParent` proves it twice before anything is timed — once off the compiled schema
// (`ownsElement[port] === 1`, `teardown-phases.tsx`'s `gateSchemas` in this axis's costume) and once
// by BEHAVIOUR, by parking a foreign node in the host and watching the hide take it, which only
// `textContent = ''` can do. `teardown-phases.tsx`'s header was the one that had it right;
// `toggle.tsx`'s prose was describing the ported-with-siblings case and has been corrected.
//
// SO THE `·owned` ROWS ARE THE BOUND FOR EVERY EXODRA ROW ON THIS AXIS, and the shared-parent rows
// are NOT redundant: `floor·rebuild − floor·rebuild·owned` is what owning the parent is worth at
// this size with one statement changed and nothing else, and it is the floor for the OTHER shape
// of our own renderer — a children port with siblings, which is the `else` branch at (4) and what
// most real components look like.
//
// ── WHAT THE FLOOR IS ALLOWED TO DO ─────────────────────────────────────────────────────────
//
// A floor uses the cheapest form of everything, per contract. Concretely:
//
//   THE PANEL PROTOTYPE is parsed ONCE at module load, out of a `<template>`, and LEFT IN THE
//   TEMPLATE CONTENTS OWNER DOCUMENT — which is where `@exodra/dom`'s own prototypes live since
//   `importNode` was dropped from its schema compiler (`mount-floor.ts` documents that change and
//   prices the ownership at ~95 ns per clone; A CITATION). A page-owned prototype here would hand
//   the renderer 200 × 95 ns of free advantage every show.
//
//   THE TEXT PLACEHOLDER IS EMPTIED, exactly as the schema compiler leaves it: `<p>x</p>` is parsed
//   so the parser makes a Text node, and the `x` is then removed, so a fresh clone carries an
//   EMPTY Text node and the fill is a `.data` store rather than a node allocation.
//
//   THE LISTENER IS ONE SHARED MODULE-LEVEL NO-OP. The floor pays the 200 `addEventListener` calls
//   per show — the same registration `exodra`, `solid`, `react`, `voby`, `lit`, `stage0`, `uhtml`
//   and `sinuous` each pay — and does NOT pay a closure per panel, because a program with no state
//   has nothing to capture. `mount-floor` makes the same split for the same reason and states that
//   the closures belong on the framework's side of the gap.
//
//   THE WALK IS STRAIGHT-LINE property access — `panel.firstChild.nextSibling` to the `<p>`, its
//   `firstChild` to the Text, its `nextSibling` to the `<button>` — three hops, written out rather
//   than read from a table, because a floor may not pay for an indirection a renderer pays for
//   by choice.
//
//   EVERY PROGRAM IS WRITTEN OUT IN FULL AND NOTHING IS SHARED BETWEEN THEM. Six near-identical
//   function bodies, deliberately: a shared `hide(kind)` helper would put a branch inside the very
//   thing being priced, and a shared show would make the four cells four calls to one function
//   with one set of inline caches instead of four programs.
//
//   EACH PROGRAM HOLDS ITS PANELS IN ONE FLAT `HTMLElement[]`, allocated at mount and reused, and
//   clears it with `live.length = 0` after a hide. THAT IS NOT AN INDULGENCE OF THE `shared` ROWS:
//   `ExoChildList.removeAll` walks its own `order` array too, and BOTH of its branches end with
//   `order.length = 0` (`createExoChildList.ts:112-126`). So the array is in BOTH spellings of a pair, and the pair differs
//   by the hide call and by nothing else — which is what makes `owned − shared` readable.
//   ONE CONTAMINATION IS NAMED RATHER THAN HIDDEN: in the two `owned` rows the array is written
//   200 times per show and never read. It is on both sides of the `owned/shared` comparison, so
//   that difference is clean; it makes each `owned` row a slightly WEAKER (higher) bound than the
//   cheapest possible program, which is the safe direction for a floor.
//
// ── THE FIFTH ROW, WHICH IS A PROBE AND NOT A CELL: `floor·rebuild·frag` ────────────────────
//
// `mount-floor` asked whether batching insertions helps and could not answer it for a LIVE parent:
// its caveat (C) records that every program in that file assembles the whole tree detached and
// attaches it with ONE insertion at the end, so no row there ever inserted into a live region.
// THIS AXIS IS THE OPPOSITE CASE AND IT IS THE ONLY ONE IN THE SUITE THAT IS: the host is in the
// document for the whole sample, and every participant appends 200 children into it one at a time.
// A `DocumentFragment` exists for exactly that, so the question is asked here, once:
//
//   `floor·rebuild·frag`  the `owned` program with the 200 clones assembled into a module-level
//                         `DocumentFragment` and moved into the live host in ONE `appendChild`.
//                         Contract `(rebuild, owned)`. Nothing else differs.
//
// IT IS NOT AUTOMATICALLY THE FLOOR AND THE RUN DOES NOT ASSUME IT IS. The report picks the
// CHEAPEST ROW WITHIN EACH CONTRACT mechanically, whichever it turns out to be, so if the fragment
// wins it becomes the `(rebuild, owned)` floor and the header does not have to be right about it.
// AND THE ADOPTION MOVES RATHER THAN VANISHING: a fragment belongs to the page document, so each
// clone is adopted out of the template's document as it enters the fragment, and the single final
// `appendChild` adopts nothing. Same 200 adoptions of 4 nodes, paid at a different moment.
//
// WHAT WAS CONSIDERED AND NOT BUILT, so the spelling space is closed rather than sampled:
//
//  * `host.replaceChildren()` — a second one-call clear. `teardown-floor.ts` already carries
//    `dom·text` and `dom·replace` as a pair over a 641-element subtree and exists to price exactly
//    that substitution; a row here would re-ask a question another axis owns. (What that pair
//    printed, I have not read.)
//  * `host.remove()` and a fresh host per show — it would change the markup at the hidden state
//    (`<div></div>` becomes nothing) and fail the gate at 'hidden (as mounted)'.
//  * `host.innerHTML = ''` — the parser door to an act `textContent` performs with no parser.
//    Strictly more work for the identical end state.
//  * `innerHTML` ON ONE PRECOMPUTED STRING for the show, which is `mount-floor`'s cheapest row.
//    IT CANNOT BE A ROW HERE AND THE REASON IS THE AXIS, NOT THE GATE: every show carries a
//    DIFFERENT generation of 200 texts, so the string would have to be built inside the timed
//    region, and a prototype baked before the data existed is `mount-floor`'s `dataBlind` — a
//    bound nobody could adopt. This axis alternates two constant generations precisely so that a
//    cache cannot re-attach nodes that already read correctly.
//  * A POOL WITH A HIT RATE BELOW 1 — a half-kept block. It is neither contract, no participant
//    has it, and there is nothing on the axis it would bound.
//
// ── WHAT THIS FLOOR IS NOT A FLOOR FOR. Read before quoting it for anything. ────────────────
//
//  * IT IS NOT A FLOOR FOR HIDING. It bounds destroy-and-rebuild and detach-and-reattach. The
//    cheapest way to make a block stop being visible is `display: none` and it is not here, for
//    the reason spelled out at (1) above.
//  * IT IS NOT A FLOOR FOR MOUNTING, UPDATING IN PLACE, WHOLE-APP TEARDOWN, SSR OR HYDRATION.
//    Those are `mount-floor`, `update-floor`, `teardown-floor`, `ssr-floor` and `hydrate-floor`,
//    and none of them bounds this either — `mount-floor`'s header says so in as many words.
//  * IT IS NOT A FLOOR FOR A PARTIAL DIFF. Every transition on this axis is all-or-nothing: 0 → 200
//    or 200 → 0. A reconciler's real job — a list that changed by three items — is `reconcile`
//    and `list-update`, and neither has a floor at all.
//  * IT SAYS NOTHING ABOUT MEMORY. The `keep` rows hold 200 elements between shows and the
//    `rebuild` rows hold none; no heap column is printed and one would be a different axis.
//  * IT IS THIS BLOCK'S SHAPE ONLY — 200 instances of 4 elements with one text port and one event
//    port each. A panel with more static markup moves the gap towards zero (the clone dominates);
//    one with more ports moves it the other way.
//  * IT IS NOT A CLAIM THAT THE GAP IS REACHABLE. Everything above the floor buys something — a
//    lifetime, a subscription, a registry, an item→child mapping, a partial diff that this
//    program cannot do at all.
//
// ── WHAT WOULD MAKE IT LIE. Every one of them, here, rather than left to be found. ──────────
//
//  (A) BLINK DEFERS THE DETACH, AND THE REGION ENDS ON A HIDE. Detaching a subtree marks it; the
//      render objects and the style and layout invalidation are settled at the next lifecycle
//      update, which no code inside the page can observe. `teardown-phases.tsx` records that the
//      deferred part of a hide is paid on THE NEXT SHOW, and that is what saves most of it here:
//      the measured region is 20 hides and 20 shows strictly alternating, so 19 of the 20 hides
//      are followed by a show inside the same region and their deferred cost lands in the
//      measurement. THE TWENTIETH DOES NOT — `STATES` ends hidden — so ~5% of the detach work of
//      every row in this table falls outside its own number, and so does the invalidation from
//      the last show. EVERY ROW PAYS THAT EQUALLY, including the floor, so the RATIO is affected
//      far less than the absolute figures; but a floor row is a LOWER BOUND ON A LOWER BOUND and
//      must be quoted as one. A floor that hid once and never showed again would measure almost
//      nothing at all, which is why this file drives the axis's own sequence rather than a hide in
//      isolation.
//  (B) KEEP-ALIVE IS NOT DOING THE REBUILD'S JOB. `floor·kept` never creates an element inside the
//      timed region and `exodra` creates 4000 of them per sample. Quoting `exodra / floor·kept`
//      would print a number with no meaning. The report pairs only within a contract and prints
//      the contract on every line.
//  (C) THE CLOCK. `toggle.tsx` observes the timer's real quantum before the run and refuses the
//      whole table if the FASTEST row is under 10 quanta. A floor row is likely to BE that row.
//      In addition, the floor report refuses any individual floor row under THREE quanta by name:
//      a row on the clamp is not a bound, it is the clamp.
//  (D) THE NULL IS BIAS ONLY, AND IT IS WEAK. `floor·rebuild·twin` is an independently declared,
//      independently prototyped duplicate of `floor·rebuild`, so its true difference from it is
//      ZERO by construction. But the floor report subtracts the two MEDIANS, so what it prints is
//      `|median(a) − median(b)|` — BIAS, which is free to cancel — and not the round-to-round
//      scatter that `mount-floor` calls NOISE and reads everything against. So the resolution
//      printed here is a LOWER BOUND on this axis's real resolution, and a floor-to-floor
//      difference near it is a RANGE and not a size. The paired per-round series IS available —
//      `AbRow.samples` carries it, and `toggle.tsx`'s machine-keep null already reads NOISE off
//      it — so this is a limit of the floor report and no longer a limit of the harness.
//  (E) THE FLOOR IS NOT MEASURED OUT OF A BUILT PACKAGE. `@exodra/dom` is resolved to its tsup
//      `dist`, as every axis resolves it; this file goes through the dev server's esbuild. One
//      transpiler against another, and it is the only difference between these rows that is not a
//      program. `mount-floor` carries the same asymmetry and states it.
//  (F) MODULE-LOAD COST IS OUTSIDE EVERY TIMED REGION. One `<template>` parse for the prototype,
//      one more for the twin's. It is fair — the renderer compiles its schema once too, and
//      `Mikado.compile` and Solid's compiler get the same deal — and it would NOT be fair on a
//      page that paid it per navigation.
//  (G) THE MARKUP IN THIS FILE MUST NOT BE REFORMATTED. The prototype is a single-line string; a
//      formatter that broke it across lines would put whitespace text nodes inside the panel and
//      the byte gate would fail — or, worse, would not. A formatter rewriting markup inside tag
//      templates once killed this suite's mount axis for 17 hours. It is written as string
//      concatenation for that reason: a formatter may move the `+`, never the bytes.
//  (H) ONE AXIS AT A TIME. A multi-axis run in this repository has already died of memory
//      pressure. This file adds six participants to an axis that already has fifteen.
//
// ── THE GATE, WHICH RUNS BEFORE ANYTHING IS TIMED ──────────────────────────────────────────
//
// Every floor row goes through the axis's OWN gates, unwidened — `gateMarkup` (byte-identical
// against a fresh `exodra` reference fired in lockstep through all four states: hidden as
// mounted, shown, hidden again, shown again) plus the identity check that is the whole point:
// `gateRebuilds` demands that ZERO of the 200 panels visible after the second show are the nodes
// the first show put there, and `gateKeeps` demands that ALL 200 are. So each row is required to
// prove BOTH that it produces the reference's markup AND that it really drops or really keeps,
// whichever it claims. A row that claimed to keep and quietly rebuilt would be a second copy of
// its neighbour under a better name, and the gate throws rather than printing it.
//
// ── THE GAP, AND THE STAND-IN LADDER THAT ONCE CLAIMED TO SPLIT IT ─────────────────────────
//
// The floor answers "how far above the machine is `exodra`" and the answer is a SINGLE NUMBER —
// 1.17–1.18× on the runs recorded so far, i.e. ~0.900 ms over 20 cycles, i.e. 45 µs per cycle of
// 200 panels, i.e. 225 ns per panel built-and-destroyed. THAT NUMBER IS SOUND and `reportLayers` in
// `toggle.tsx` still prints it. What follows is the record of an attempt to SPLIT it that failed,
// kept here so that the next person to have the idea finds the refutation before spending a day on
// it.
//
// FIVE HAND-WRITTEN RUNGS USED TO STAND AT THE BOTTOM OF THIS FILE — `rung·1·child`, `rung·2·walk`,
// `rung·3·ports`, `rung·4·order`, `rung·5·list`. Each was the floor program plus one IMITATION of a
// renderer layer, read off `@exodra/dom` and re-typed here, so that each difference would price that
// layer. THEY WERE RUN TWICE AND THEY FAILED THEIR OWN GATES BOTH TIMES, IDENTICALLY. Medians, ms
// per 20 cycles:
//
//                            batch 1   batch 5
//     floor·rebuild·owned      5.040     5.040
//     rung·1·child             5.160     5.200
//     rung·2·walk              5.300     5.340
//     rung·3·ports             5.300     5.340
//     rung·4·order             5.400     5.440
//     rung·5·list              4.920     4.920   ← BELOW the floor it is grown from
//     exodra                   6.000     5.840
//     null (twin pair)         0.000     0.020
//
// THREE REFUSALS, REPRODUCED AT BOTH BATCHES:
//
//   * NOT MONOTONE. `rung·5·list` sits 0.520 ms BELOW `rung·4·order`, which it is supposed to
//     CONTAIN — rung 5 is rung 4 with the list layer's remap added and nothing taken away. At batch
//     5 the null is 0.020 ms, so the backwards step is 26× the resolution; it is not the clock.
//   * FOUR OF THE FIVE STEPS LAND UNDER THREE TIMER QUANTA. A step on the clamp is not a small
//     price, it is an unmeasured one, and the run refused each of them by name.
//   * UNATTRIBUTED RESIDUE 115% OF THE GAP. The five stand-ins collectively cost LESS than the floor
//     they were grown out of, so `exodra − rung·5·list` was larger than `exodra − floor`. A
//     decomposition whose residue exceeds the thing being decomposed has explained nothing.
//
// THE CONCLUSION, AND IT IS A CONCLUSION AND NOT A HYPOTHESIS TO RE-LITIGATE: HAND-WRITTEN STAND-INS
// CANNOT SPLIT THIS GAP. A rung that lands below the floor is doing a SMALLER JOB than the program
// it was grown from — which is exactly the `app-clone·fill` error this repository already ledgers,
// in miniature and five times over. The failure is structural rather than a matter of tuning: an
// imitation's cost is evidence about the imitation, and nothing forces an imitation to be as
// expensive as the layer it is named after. They are not parked behind a flag and they are not
// commented out; a known-invalid instrument is not kept "in case".
//
// WHAT REPLACED THEM IS IN `toggle.tsx`, AND IT IS MADE OF SHIPPING CODE. `exodraChildren` and
// `exodraPlaced` are the REAL renderer with one layer actually NOT USED, reached through the public
// API, gated by the same `gateMarkup` and `gateRebuilds` every other row goes through — the same
// kind of row `exodraDelegated` (a real composition) and `exodraKept` (real keep-alive) already are.
// `reportLayers` there prints the differences, and the three of them telescope onto this floor
// exactly, so there is no residue to hide in.
//
// THE TWO PHASE CENSUSES THIS REPOSITORY ALREADY HAS ARE A DIFFERENT SCALE AND MAY NOT BE CARRIED
// ACROSS. `measurements/mount-phases.published.json` (clone 0.085 → clone+walk 0.105 →
// clone+walk+insert 0.155 → mount 0.300, so wiring ≈ 0.145) and
// `measurements/teardown-phases.published.json` (hide 0.056, clear region 0.0563, textContent
// 0.0452, drop per child 0.0712, unmount loop 0.0105) are BOTH the 80-card app — 80 instances of an
// 8-node card, mounted once — and this axis is 200 instances of a 4-node panel torn down and rebuilt
// 20 times. Different instance count, different subtree size, different lifecycle, live parent
// instead of detached. Those figures are CITATIONS about another census and are quoted nowhere in
// this file's arithmetic.
//
// ── HOW TO RUN IT ──────────────────────────────────────────────────────────────────────────
//
//     npm run axis --workspace=@exodra/benchmarks -- toggle 100 1
//
// and nothing else at the same time (caveat H). `@exodra/dom` is resolved to its BUILT dist, so
// `npm run build` at the repo root has to have run or the `exodra` rows are last week's renderer
// and the floor is a floor to code that is not shipping.
//
// TO READ THE LAYER DECOMPOSITION ALONE, narrow the run — the two layer rows, the floor they
// telescope onto, the null and `exodra` are the whole field `reportLayers` needs, and it names
// anything missing rather than printing NaN. `--only` takes `.` where a row name has `·`, because a
// shell should not have to carry a middle dot (`run-one-axis.js`, above its AXES map):
//
//     npm run axis --workspace=@exodra/benchmarks -- toggle 100 1 \
//       --only=exodra,exodraChildren,exodraPlaced,floor.rebuild,floor.rebuild.owned,floor.rebuild.twin

/** The row this axis holds — structurally the row `toggle.tsx` declares. */
export type TFloorToggleRow = { id: number; text: string };

/** The outside surface every participant on this axis has: two calls and nothing else. */
export interface TFloorToggle {
    update(input: { rows: readonly TFloorToggleRow[] }): void;
    destroy(): void;
}

/**
 * ONE SHARED NO-OP FOR THE WHOLE PROCESS. The floor pays the registration and not the closure —
 * see the header. The same treatment `toggle.tsx` gives every other participant's handler.
 */
const NOOP = (): void => {};

/**
 * Parse one prototype and LEAVE IT WHERE THE PARSER PUT IT — the template contents owner document,
 * which is where the schema compiler's prototypes live. See the header for why moving it to the
 * page document would be handing the renderer free time.
 */
function protoOf(markup: string): HTMLElement {
    const t = document.createElement('template');
    t.innerHTML = markup;
    return t.content.firstElementChild as HTMLElement;
}

/**
 * THE PANEL. The same four elements every participant on this axis builds and tears down, 200 at a
 * time, and one line so that no formatter can put whitespace text nodes inside it (caveat G).
 *
 * The `<p>`'s `x` is parsed so the parser makes a Text node and is then emptied, so a clone carries
 * an EMPTY Text node and a fill is a `.data` store. That is what `set-text.ts` leaves behind in a
 * compiled schema, and the byte gate is what proves it rather than this comment.
 */
const PANEL_MARKUP =
    '<div class="panel">' + '<h4>Panel</h4>' + '<p>x</p>' + '<button>x</button>' + '</div>';

function panelProto(): HTMLElement {
    const proto = protoOf(PANEL_MARKUP);
    (((proto.firstChild as HTMLElement).nextSibling as HTMLElement).firstChild as Text).data = '';
    return proto;
}

/** The prototype the five rebuild/keep rows clone from. */
const PANEL = panelProto();

/**
 * THE NULL'S OWN PROTOTYPE — a second, independently parsed, identical tree. A null must share
 * nothing, or it measures what V8 already learned about the thing it is a null for.
 */
const PANEL_TWIN = panelProto();

/** ONE fragment for the process — see `floor·rebuild·frag`. A floor hoists what a careful caller would. */
const FRAGMENT = document.createDocumentFragment();

// ---------------------------------------------------------------------------------------
// (rebuild, shared) — THE FLOOR FOR EVERY COMPETING ROW THAT TAKES ITS CHILDREN OUT ONE AT A TIME.
//
// A hide is 200 × `remove()`; a show is 200 × (clone, three hops, one `.data` store, one
// `addEventListener`, one `appendChild` into the LIVE host). The array is walked and emptied
// exactly as a reconciler walks and empties its `order`.
// ---------------------------------------------------------------------------------------

export function mountFloorToggle(
    input: { rows: readonly TFloorToggleRow[] },
    host: HTMLElement
): TFloorToggle {
    const root = document.createElement('div');
    host.appendChild(root);
    const live: HTMLElement[] = [];

    const commit = (rows: readonly TFloorToggleRow[]): void => {
        if (rows.length === 0) {
            for (let i = 0; i < live.length; i++) live[i].remove();
            live.length = 0;
            return;
        }
        for (let i = 0; i < rows.length; i++) {
            const panel = PANEL.cloneNode(true) as HTMLElement;
            const p = (panel.firstChild as HTMLElement).nextSibling as HTMLElement;
            (p.firstChild as Text).data = rows[i].text;
            (p.nextSibling as HTMLElement).addEventListener('click', NOOP);
            root.appendChild(panel);
            live[i] = panel;
        }
    };
    commit(input.rows);

    return {
        update: (next) => {
            commit(next.rows);
        },
        destroy: () => {
            // Untimed, in `cleanup`, and here only so the surface matches every other participant's.
            root.remove();
            live.length = 0;
        },
    };
}

// ---------------------------------------------------------------------------------------
// THE NULL — `floor·rebuild` declared a second time, its own function object, its own inline
// caches, its own prototype, the identical work on the identical data.
//
// ITS TRUE DIFFERENCE FROM `floor·rebuild` IS ZERO BY CONSTRUCTION, so what the run measures
// between them is what this instrument returns when there is nothing to find. It is duplicated
// SOURCE and not a second call to one function on purpose — calling one function twice would share
// everything V8 learned about it and would print a resolution far below the one two genuinely
// separate programs sit on. Read caveat (D) before quoting it: the floor report subtracts the two
// medians, so this is BIAS and not NOISE, and it is therefore a LOWER bound on the real resolution.
// ---------------------------------------------------------------------------------------

export function mountFloorToggleTwin(
    input: { rows: readonly TFloorToggleRow[] },
    host: HTMLElement
): TFloorToggle {
    const root = document.createElement('div');
    host.appendChild(root);
    const live: HTMLElement[] = [];

    const commit = (rows: readonly TFloorToggleRow[]): void => {
        if (rows.length === 0) {
            for (let i = 0; i < live.length; i++) live[i].remove();
            live.length = 0;
            return;
        }
        for (let i = 0; i < rows.length; i++) {
            const panel = PANEL_TWIN.cloneNode(true) as HTMLElement;
            const p = (panel.firstChild as HTMLElement).nextSibling as HTMLElement;
            (p.firstChild as Text).data = rows[i].text;
            (p.nextSibling as HTMLElement).addEventListener('click', NOOP);
            root.appendChild(panel);
            live[i] = panel;
        }
    };
    commit(input.rows);

    return {
        update: (next) => {
            commit(next.rows);
        },
        destroy: () => {
            root.remove();
            live.length = 0;
        },
    };
}

// ---------------------------------------------------------------------------------------
// (rebuild, owned) — THE SAME SHOW, WITH THE HIDE AS ONE CALL.
//
// `root.textContent = ''` is the branch Mikado's `remove(0, length)` and stage0's `reconcile` both
// take when the whole list goes, and — SETTLED by reading `ownsElement` through to
// `clearOwnedExoChildList`, and gated twice in `toggle.tsx` — the branch OUR OWN hide takes on this
// block. THIS ROW IS THEREFORE THE BOUND FOR `exodra` AND `exodraDelegated`, and the one the
// headline ratio is computed from. It differs from `floor·rebuild`
// by ONE STATEMENT and by nothing else; the array is written and emptied in both, which is what
// makes the pair readable and is also what `clearOwnedExoChildList` does with `order`.
// ---------------------------------------------------------------------------------------

export function mountFloorToggleOwned(
    input: { rows: readonly TFloorToggleRow[] },
    host: HTMLElement
): TFloorToggle {
    const root = document.createElement('div');
    host.appendChild(root);
    const live: HTMLElement[] = [];

    const commit = (rows: readonly TFloorToggleRow[]): void => {
        if (rows.length === 0) {
            root.textContent = '';
            live.length = 0;
            return;
        }
        for (let i = 0; i < rows.length; i++) {
            const panel = PANEL.cloneNode(true) as HTMLElement;
            const p = (panel.firstChild as HTMLElement).nextSibling as HTMLElement;
            (p.firstChild as Text).data = rows[i].text;
            (p.nextSibling as HTMLElement).addEventListener('click', NOOP);
            root.appendChild(panel);
            live[i] = panel;
        }
    };
    commit(input.rows);

    return {
        update: (next) => {
            commit(next.rows);
        },
        destroy: () => {
            root.remove();
            live.length = 0;
        },
    };
}

// ---------------------------------------------------------------------------------------
// (rebuild, owned) + BATCHED INSERTION — the probe, not a cell. See the header: this is the only
// axis in the suite whose parent is LIVE while 200 children go into it one at a time, so it is the
// only place the fragment question can be asked at all. The fragment is module-level and reused;
// `appendChild(FRAGMENT)` empties it, so it comes back to the next show already empty.
// ---------------------------------------------------------------------------------------

export function mountFloorToggleFrag(
    input: { rows: readonly TFloorToggleRow[] },
    host: HTMLElement
): TFloorToggle {
    const root = document.createElement('div');
    host.appendChild(root);
    const live: HTMLElement[] = [];

    const commit = (rows: readonly TFloorToggleRow[]): void => {
        if (rows.length === 0) {
            root.textContent = '';
            live.length = 0;
            return;
        }
        for (let i = 0; i < rows.length; i++) {
            const panel = PANEL.cloneNode(true) as HTMLElement;
            const p = (panel.firstChild as HTMLElement).nextSibling as HTMLElement;
            (p.firstChild as Text).data = rows[i].text;
            (p.nextSibling as HTMLElement).addEventListener('click', NOOP);
            FRAGMENT.appendChild(panel);
            live[i] = panel;
        }
        root.appendChild(FRAGMENT);
    };
    commit(input.rows);

    return {
        update: (next) => {
            commit(next.rows);
        },
        destroy: () => {
            root.remove();
            live.length = 0;
        },
    };
}

// ---------------------------------------------------------------------------------------
// (keep, shared) and (keep, owned) — THE FLOOR FOR `exodraKept` AND `mikadoPooled`.
//
// The 200 panels are built ONCE, at mount, UNTIMED — which is exactly what `exodraKept` does in
// its wire and what `mikadoPooled`'s pool amounts to after its first hide. What is left inside the
// timed region is what a pool actually buys: write the new generation's text into each panel and
// put it back.
//
// THE TEXT NODES ARE HELD IN THEIR OWN FLAT ARRAY, so a show is a `.data` store per panel with no
// walk at all. That is the cheapest form and it is also what the participants have: `exodraKept`'s
// panels each hold a live subscription addressed to their own text node, and Mikado's recycled
// node carries a path array it builds on first reuse.
//
// NO LISTENER IS ATTACHED PER SHOW, because none is removed per hide — the panels keep the one
// they were built with. That is not a favour: `exo-event-slot-setter.ts` states that this core
// never unregisters a listener either ("measured at 21% of a mount+dispose cycle … to undo
// something the garbage collector was going to do anyway" — A CITATION, quoted through
// `teardown-phases.tsx`), and Mikado's pooled node keeps its delegated route attribute.
//
// THE COUNT COMES IN THROUGH A FACTORY because the axis owns it: `toggle.tsx` declares `PANELS`
// and the two-call surface has nowhere to put it. The currying happens once, when the scenario is
// constructed, and never inside a timed region.
// ---------------------------------------------------------------------------------------

export function floorKeptToggle(
    panels: number
): (input: { rows: readonly TFloorToggleRow[] }, host: HTMLElement) => TFloorToggle {
    return (input, host) => {
        const root = document.createElement('div');
        host.appendChild(root);
        const kept: HTMLElement[] = new Array<HTMLElement>(panels);
        const texts: Text[] = new Array<Text>(panels);
        for (let i = 0; i < panels; i++) {
            const panel = PANEL.cloneNode(true) as HTMLElement;
            const p = (panel.firstChild as HTMLElement).nextSibling as HTMLElement;
            (p.nextSibling as HTMLElement).addEventListener('click', NOOP);
            kept[i] = panel;
            texts[i] = p.firstChild as Text;
        }
        const commit = (rows: readonly TFloorToggleRow[]): void => {
            if (rows.length === 0) {
                for (let i = 0; i < panels; i++) kept[i].remove();
                return;
            }
            for (let i = 0; i < panels; i++) {
                texts[i].data = rows[i].text;
                root.appendChild(kept[i]);
            }
        };
        commit(input.rows);

        return {
            update: (next) => {
                commit(next.rows);
            },
            destroy: () => {
                root.remove();
            },
        };
    };
}

export function floorKeptOwnedToggle(
    panels: number
): (input: { rows: readonly TFloorToggleRow[] }, host: HTMLElement) => TFloorToggle {
    return (input, host) => {
        const root = document.createElement('div');
        host.appendChild(root);
        const kept: HTMLElement[] = new Array<HTMLElement>(panels);
        const texts: Text[] = new Array<Text>(panels);
        for (let i = 0; i < panels; i++) {
            const panel = PANEL.cloneNode(true) as HTMLElement;
            const p = (panel.firstChild as HTMLElement).nextSibling as HTMLElement;
            (p.nextSibling as HTMLElement).addEventListener('click', NOOP);
            kept[i] = panel;
            texts[i] = p.firstChild as Text;
        }

        const commit = (rows: readonly TFloorToggleRow[]): void => {
            if (rows.length === 0) {
                // ONE CALL, and the nodes survive it: `textContent = ''` detaches every child, and
                // `kept` still holds all 200 of them. That is the whole difference from
                // `floor·kept`, and the axis's `gateKeeps` is what proves the nodes really came
                // back rather than this comment.
                root.textContent = '';
                return;
            }
            for (let i = 0; i < panels; i++) {
                texts[i].data = rows[i].text;
                root.appendChild(kept[i]);
            }
        };
        commit(input.rows);

        return {
            update: (next) => {
                commit(next.rows);
            },
            destroy: () => {
                root.remove();
            },
        };
    };
}
