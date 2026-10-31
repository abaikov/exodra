// DIAGNOSTIC — HOW MUCH ROOM IS THERE BELOW `@exodra/dom` AT MOUNTING THIS APP, AT ALL?
//
// It answers ONE question about ONE renderer, on the 80-card todo app every mount axis already
// measures, and it compares no frameworks. It is registered as an axis only so it can reuse the
// runner that already starts Vite, drives headless Chromium and forwards the browser's console. It
// is written to the `mount-phases` / `teardown-phases` / `import-node-trade`
// set: a phase per program, a resolution floor measured from a control whose true value is zero,
// every way it can mislead stated in this header and repeated in the answer, and a run that refuses
// its own numbers when they are unreadable.
//
// ── THE QUESTION, AND THE QUESTION IT IS NOT ────────────────────────────────────────────────
//
// "Is our performance optimal" CANNOT BE PROVED and this file does not try. Optimal is a claim
// about a whole solution space nobody has enumerated, and nobody here has enumerated one.
//
// A BOUND CAN BE PROVED, and that is the whole of this file. Mounting a tree of N elements cannot
// cost less than creating those elements and putting them in the document. That work belongs to
// the browser and no framework can delete it. So this axis writes a program that produces the
// benchmark app's EXACT DOM, byte for byte, with no abstraction of any kind — no components,
// no declaration, no reactivity, no schema, no connector, no library, no indirection at all, just
// straight-line calls into Blink — and measures it in the same session, interleaved, against the
// real `mountExodraApp`.
//
// The distance between the two is the ENTIRE remaining headroom for any framework whatsoever, not
// just for us. Nobody can beat `@exodra/dom` at mounting this app by more than that gap, because
// below the floor there is nothing to beat it with. That is a far stronger and far more falsifiable
// statement than "we beat Solid", and it is the one this axis exists to make quotable.
//
// ── WHAT THE FLOOR IS ALLOWED TO DO — THE DESIGN QUESTION, AND WHY IT DECIDES EVERYTHING ────
//
// There is no obviously right answer, so all three candidates are BUILT and MEASURED and the run
// says which one it takes as the floor and why. A floor chosen by argument would be a floor chosen
// to flatter whoever argued.
//
//   (1) `innerHTML` ON ONE PRECOMPUTED STRING — the absolute cheapest way to produce this DOM. One
//       property store, one trip into the parser, 801 elements out the other side. The string is
//       built ONCE at module load out of the app's own spec (`IDX`, `POOL`, `startsOpen`,
//       `startCount`), never inside a timed region, because a bound is supposed to be the LOWEST
//       achievable number and charging it for string concatenation would only make it a worse bound.
//
//       IT IS NOT A FAIR FLOOR FOR A FRAMEWORK AND IT IS LABELLED AS WHAT IT IS. The tree it
//       produces has no addressable nodes: not one reference to a port survives the call, so
//       nothing in it can ever be updated, and a renderer that behaved this way would not be a
//       renderer. What it bounds is THE DOM WORK ALONE — "what does it cost this browser to have
//       these bytes become these nodes" — and knowing that number is worth something on its own,
//       because it is the part of the job that is not anybody's software.
//
//   (2) `cloneNode` FROM PROTOTYPES, THEN WALK TO THE PORTS AND FILL THEM — what every
//       template-based renderer in this suite does (ours, Solid's, lit's, mikado's, stage0's),
//       minus every piece of bookkeeping. Four prototypes parsed once at module load; per mount,
//       321 clones, a straight-line walk of `firstChild`/`nextSibling` to each port, the same fills
//       with the same values, the same insertions in the same order. THIS IS THE HONEST FLOOR: it
//       produces the same tree AND leaves the ports addressable, which is the minimum a framework
//       must also do.
//
//   (3) `document.createElement` PER NODE — neither a floor nor a ceiling, and included as a row
//       only because "cloning is cheaper than creating" is an assumption this suite has been
//       repeating without a number beside it. If it comes out below the clone row, that is a
//       finding about every template renderer here and not just about this axis.
//
// ── CLOSING THE VARIANT SPACE, AND WHY THREE PROGRAMS WERE NOT ENOUGH ───────────────────────
//
// THE FIRST RUN MEASURED THREE PROGRAMS AND CONCLUDED SOMETHING ABOUT ALL PROGRAMS. Its floor was
// `clone+refs` at 0.2137 ms against `create` 0.2575 and `html` 0.2625 (MEASURED by the
// orchestrator, 100 rounds, batch 4, gated byte-identical first), and off the back of that this
// repository started saying "cloning is the cheapest way to build this DOM". THAT SENTENCE WAS
// NOT SUPPORTED. It is a claim about every way anybody builds a DOM, and three programs is not
// every way. So the table now walks the space along the four axes a DOM-building program actually
// has, and each row is one coordinate changed and nothing else:
//
//   HOW THE NODES COME INTO EXISTENCE   parser (5 doors) · deep clone · shallow clone · create
//   AT WHAT GRANULARITY                 801 calls · 321 · 81 · 1
//   HOW THEY ARE INSERTED               one at a time · DocumentFragment · variadic append(…)
//   WHERE THE PROTOTYPE LIVES           template contents document · the page document
//   HOW THE PORTS ARE FOUND             straight-line walk · one grouped querySelectorAll
//   HOW MUCH THE SOURCE REPEATS         4 prototypes for 321 instances · 321 for 321
//
// EVERY ONE OF THEM GOES THROUGH THE SAME BYTE-IDENTICAL MARKUP GATE, before anything is timed,
// and the run throws otherwise. That is what makes this a table and not a collection of anecdotes.
//
// ── THE ONE DISTINCTION THAT DECIDES HOW EACH ROW MAY BE QUOTED: DATA-BLINDNESS ─────────────
//
// A program that clones the WHOLE APP in one call is the most likely thing in this file to beat
// the current floor, and it is worth measuring, and IT IS NOT A STRATEGY ANYBODY COULD ADOPT. It
// only works because this file knows the app's data at module load: `APP_HTML` already contains
// every `data-i`, every title and every tag label, so a mount is one clone and a walk and no
// fills. A RENDERER IS HANDED DATA IT HAS NOT SEEN, and a prototype compiled before that data
// existed cannot contain it.
//
// So every row carries a `dataBlind` flag and the run prints TWO floors:
//
//   THE FLOOR            the cheapest row that is addressable AND retained, whatever it is. The
//                        headline "no framework can be more than X% faster" is computed from it,
//                        and a cheaper row makes X LARGER — a WEAKER claim, and still true. It is
//                        a bound. It is not a target and the run says so in the same breath.
//   THE ADOPTABLE FLOOR  the cheapest of those whose prototypes could have been built WITHOUT the
//                        app's data. This is the number that says how close the renderer is to
//                        the best thing a renderer could BE, and it is the one to quote at
//                        anybody claiming they could do better.
//
// AND THE FLAG RECLASSIFIES A ROW THAT WAS ALREADY HERE: `html` builds its string at module load
// out of `IDX`, `POOL`, `startsOpen` and `startCount`, so the parser family is data-baked as well
// as un-addressable. The original header called it un-addressable and stopped there.
//
// FOUR SHAPES IS THE COARSEST DATA-BLIND GRANULARITY THIS APP ADMITS, and that is the real answer
// to "is cloning top". A whole-card prototype would have to contain the tag rows and the details
// block, and both are things the card's WIRE computes; a whole-app prototype would have to
// contain all of it. So `clone+refs` is not merely the row that won — it is the coarsest rung a
// renderer is allowed to stand on, and everything below it on the ladder measures what a mount
// spends on per-call overhead rather than what any renderer could take.
//
// ── WHAT WAS CONSIDERED AND NOT BUILT, AND WHY — so the space is closed, not just sampled ───
//
//  * `document.importNode(proto, true)` PER INSTANCE. Strictly dominated by importing ONCE at
//    module load and cloning from the result, which is the `clone·page` row: the per-instance
//    spelling pays the ownership move 321 times a mount to reach the same state. Nobody would
//    ship it and measuring it would only price the difference between two spellings of a row that
//    is already here.
//  * SIX SEPARATE `querySelectorAll` CALLS instead of one grouped selector. Six full tree walks
//    for an answer one walk returns in document order. The strong form is measured; this is the
//    same strategy played badly.
//  * A `TreeWalker`. It enumerates the same nodes in the same document order as the grouped
//    selector and pays one JS→C++ crossing per NODE where the selector pays one per LIST. I did
//    not build it and that ordering is JUDGEMENT, not a measurement.
//  * `replaceChildren(...nodes)`. On an empty parent it IS `append(...nodes)`, which is measured.
//  * `outerHTML` assignment. Requires a parent already in a tree and then does what `innerHTML`
//    on that parent does.
//  * `innerHTML` PER CARD — the parser family at a finer granularity. One crossing already lands
//    ABOVE the clone floor (MEASURED, first run, falsifier (c) fired); 80 crossings parse the
//    same elements and add 79 more parser set-ups, so it can only be worse. Rejected from a
//    measured row rather than from an opinion.
//  * `create` WITH FRAGMENT OR VARIADIC BATCHING. The clone and create programs perform the
//    IDENTICAL 321 insertions, so any insertion-side saving applies equally to both and cannot
//    reorder them. It is priced once, on the clone side, by `clone·frag` and `clone·append`.
//  * RECYCLING NODES FROM A POOL. It presumes a previous mount to take nodes from, and this axis
//    measures a COLD build of this DOM from nothing. It is a different question, and `@exodra/dom`
//    ships nothing that answers it — the node bank that once did has been removed.
//  * CUSTOM ELEMENTS / `DocumentFragment` UPGRADE PATHS. Strictly more work per element (a
//    registry consultation), and nothing in this app's markup needs them.
//
// ── DOES "CLONING IS TOP" SURVIVE A PAGE THAT DOES NOT REPEAT? THE BOUND ON THE WHOLE ANSWER ─
//
// THIS IS THE MOST IMPORTANT CAVEAT IN THE FILE AND IT IS NOT A FOOTNOTE. Cloning amortises ONE
// prepared source over many instances; `createElement` has nothing to amortise. This app is
// nearly maximally repetitive — 200 identical tag rows, 80 cards, FOUR shapes for 321 instances —
// so it is the friendliest possible page for the clone strategy. On a page whose structure does
// not repeat, the ranking could invert, and nothing in the first run's three programs could have
// noticed.
//
// THE STRONGEST PROBE THE GATE ADMITS is `clone·distinct`: the identical program over 321 DISTINCT
// prototypes, each cloned exactly once. It holds the node count, the walk, the fills, the
// insertions and the gated bytes constant and varies only how much the source repeats.
//
//   WHAT IT REPRODUCES  the timed half of low repetition — a clone source read cold from a
//                       different place in the heap every time, and a `cloneNode` callsite whose
//                       receiver is never the same object twice. The parse of 321 distinct
//                       prototypes is at module load, which is FAIR: a template renderer with 321
//                       distinct templates compiles them all at startup too.
//   WHAT IT CANNOT      differently SHAPED markup. The gate demands byte-identical output against
//                       a real `mountExodraApp`, and shapes that differ produce output that
//                       differs — so a genuine low-repetition census needs its own reference app,
//                       its own components and its own `exodra` row. THAT IS A SEPARATE AXIS and
//                       it is argued as one under (G) below, not smuggled in here.
//
// UNTIL THAT AXIS EXISTS, EVERY RANKING IN THIS FILE IS BOUNDED TO A HIGH-REPETITION TREE and the
// run prints that bound beside the repetition row rather than leaving it to whoever quotes it.
//
// ── DOES THE FLOOR HOLD REFERENCES? THAT SINGLE QUESTION IS MOST OF THE DIFFERENCE ──────────
//
// A program that walks to a port, writes it, and lets the local die has produced the right bytes
// and produced nothing a framework could use. A framework must be able to come back to that node.
// So both of the addressable strategies are built TWICE and both numbers are printed, because they
// are two different quantities and each is interesting on its own:
//
//   `clone`       / `create`        — fill and forget. The ports are reachable from the tree, but
//                                     the program keeps no reference and would have to walk again.
//   `clone+refs`  / `create+refs`   — the same, plus every node a later update could need, stored
//                                     in ONE FLAT `Node[]` allocated per mount. 640 references:
//                                     per card its element, its headline Text node, its `.tog`
//                                     button (where `aria-expanded` is written), its `div.tags`
//                                     and its `.count` Text node; per tag row its Text node; per
//                                     open details block its element.
//
// THE RETENTION IS THE CHEAPEST RETENTION THAT EXISTS — one flat array of the exact final length,
// no per-instance objects, no map, no keys, no records — because this is a floor and a floor uses
// the cheapest form of everything. `@exodra/dom` does something structurally different (its node
// array is per SCHEMA and reused by every instance, and it allocates a `TExoDomChild` per BOUND-list
// child), and that difference is part of what the gap contains rather than something this file
// tries to reproduce.
//
// ── DOES THE FLOOR FILL THE SAME PORTS WITH THE SAME VALUES? YES, AND IT IS GATED ───────────
//
// It must, or it is not producing the same DOM. Every floor program writes `data-i`, writes the
// card's HEADLINE through `headlineOf(titleOf(i), open)`, writes `aria-expanded` on the `.tog`
// button, writes the `.count` span's label through `tagsLabel`, attaches BOTH click listeners,
// places the details block when the spec says the card starts open, and builds exactly the tags
// the spec gives that card. THE FORMULAE ARE IMPORTED FROM `todo-spec.ts`, never re-spelled — a
// floor that clipped the title at its own idea of fourteen characters would fail the gate over a
// character and the run would be reading a wrong answer as a hard bound. Nothing is timed until every
// program has been shown to produce BYTE-IDENTICAL markup against a real `mountExodraApp`, through
// the same `markupOf` the rest of the suite gates with, and the run THROWS if any of them differs.
// Without that gate this axis measures two different programs and every number in it is noise
// wearing a decimal point.
//
// TWO FILLS ARE DELIBERATELY NOT IDENTICAL, and both are named here because both are inside the
// gap this file reports:
//
//   THE HANDLERS ARE ONE SHARED MODULE-LEVEL NO-OP, not two closures per card. A program with no
//   reactivity has no per-card state for a closure to capture, so allocating one would be
//   pantomime. The floor therefore pays the same 160 `addEventListener` calls (`@exodra/dom`'s
//   direct event pack calls exactly that for a function handler — READ FROM CODE,
//   `packages/dom/src/dom/exo-event-slot-setter.ts:46`) and does NOT pay the 160 closures. The
//   closures are on the framework's side of the gap, correctly: they are what makes the app
//   interactive, and the floor's app is not.
//
//   THE FLOOR ALLOCATES NO PER-CARD DATA. The real card's wire builds `tagsOfCard(i)` — four
//   objects, each carrying a label and a user — plus two `slice`s and two reactive cells per card,
//   and it resolves each tag's user to a CELL so that a setting change reaches it. The floor reads
//   `POOL[t]` out of the module constant and computes the tag's text on the spot from
//   `startChars(tagUserOf(i, t))`, which is the same two pure functions of an index that
//   `todo-spec.ts` hands everybody. Same again: the plumbing that makes a value able to MOVE is
//   plumbing a program with nothing to update has no reason to have, and it belongs inside the gap.
//
//   AND THE FLOOR HAS NO USERS, only the functions that say what a user's setting IS. Every other
//   participant holds five records per mount because its tags have to be notified when one moves;
//   the floor mounts once and never moves anything, so `startChars(u)` is the whole of what a user
//   is to it. That, too, is inside the gap and not a shortcut taken here.
//
// ── WHAT THIS NUMBER DOES NOT BOUND. Read this before quoting it for anything. ──────────────
//
//  * IT SAYS NOTHING ABOUT UPDATES. A program with no reactivity does not update — it rebuilds.
//    There is no floor here for "flip 80 details blocks and advance 80 tag lists", and this axis
//    must never be quoted as one. `exodra-app-update`, `toggle`, `reactive-update` and
//    `list-update` are where that question lives, and none of them has a floor at all.
//  * IT SAYS NOTHING ABOUT TEARDOWN. The floor's cleanup is `container.remove()` and it ends no
//    subscriptions because it has none. `teardown-phases` is that direction.
//  * IT SAYS NOTHING ABOUT MEMORY. No heap column is printed and none would mean anything: the
//    floor retains 640 references where a framework retains records, listeners, registries and
//    subscriber lists, and comparing those two is a different axis.
//  * IT SAYS NOTHING ABOUT HYDRATION, SSR, OR A SECOND MOUNT INTO A WARM PAGE.
//  * IT IS THIS APP'S SHAPE ONLY — 321 instances averaging ~4.5 nodes each, 801 elements, 760 port
//    fills. A floor is not scale-invariant: a component with more static markup per instance moves
//    the gap towards zero (the clone dominates), and one with more ports per element moves it the
//    other way. One shape, one machine, one browser.
//  * IT IS NOT A CLAIM THAT THE GAP IS REACHABLE. Everything in it buys something — addressability
//    that survives a rebuild, lifetimes, teardown, reactivity, a component contract. The bound says
//    how much there is, not that any of it is free to take.
//
// ── THE PREDICTION, COMMITTED BEFORE THE FIRST RUN ──────────────────────────────────────────
//
// This is my model. It is JUDGEMENT plus one citation, nothing in it is measured by me, and it is
// written down first so the run can be read as a test of it rather than as a story told afterwards.
//
//   I PREDICT: `exodra / clone+refs` LANDS BETWEEN 1.4 AND 1.8, i.e. between 29% and 44% of our
//   mount is above the floor.
//
//   THE MECHANISM I AM BETTING ON: `mount-phases` cuts this very mount into clone / walk / insert /
//   wire+plumbing, and the first three are precisely what `clone+refs` does — the same 321 clones,
//   the same hops, the same insertions in the same order. This repository's records put the clone at
//   roughly a third of a mount and the insertions at roughly a sixth (A CITATION, from earlier runs
//   on this machine, NOT something this file measured — the table below replaces it). If that is
//   near right, the floor keeps a bit over half the mount and the residue is the wiring call with
//   everything around it: the connector bracket, the per-instance records, the region anchors, the
//   list registry, the reactive cells and the closures.
//
//   I ALSO PREDICT, and these are the ones that say whether the mechanism is the one I named:
//     (i)   `html` measures BELOW `clone` — one crossing into the parser beats ~1000 separate
//           crossings (321 clones + 321 insertions + 400 fills).
//     (ii)  `create` measures ABOVE `clone` — 801 `createElement` plus the appends and the class
//           stores cost more than 321 deep clones of prepared trees.
//     (iii) `clone+refs − clone` lands at or under a small multiple of the resolution floor —
//           holding references is one array allocation and 640 stores, and is NOT what separates a
//           framework from bare DOM.
//
//   WHAT WOULD PROVE THE MODEL WRONG — printed mechanically at the end of the run so that nobody,
//   including me, gets to choose afterwards:
//     (a) the ratio comes out BELOW 1.15. Then the mount is already browser-bound, the wire and its
//         plumbing are nearly free, and the recorded phase split is wrong. This is the result that
//         would be best for the renderer and worst for my model.
//     (b) the ratio comes out ABOVE 2.5. Then well over half of a mount is abstraction and the
//         recorded clone share cannot be right either.
//     (c) `html` measures at or above `clone` — (i) is wrong, and the parser is not the cheap path.
//     (d) `create` measures at or below `clone` — (ii) is wrong, and cloning from a prototype is
//         not the cheapest way to build this tree, which is a finding about every template renderer
//         in this suite.
//     (e) `+refs − no-refs` exceeds three times the resolution floor on either strategy — (iii) is
//         wrong, retention is a real cost, and "floor-with-references ≈ floor" must not be said.
//
// ── PREDICTION II, COMMITTED BEFORE THE RUN THAT ADDED THE RUNGS ────────────────────────────
//
// Same rules as Prediction I: written down BEFORE the run, mechanism named, falsifiers printed
// mechanically at the end so nobody including me gets to choose afterwards. It is JUDGEMENT plus
// two citations from this repository. I MEASURED NONE OF IT.
//
//   (f) THE COARSE CLONE WINS, by 0.05-0.09 ms — `app-clone` lands around 0.13-0.17 ms against
//       the first run's 0.2137 floor. MECHANISM: 320 clone calls and 320 insertions deleted, all
//       600 value fills deleted, and — the part that makes the arithmetic work — THE ADOPT WALK
//       UNCHANGED. Both programs adopt all 801 nodes exactly once, at the final live insertion:
//       every insertion before it joins two template-owned nodes and adopts nothing. So what the
//       coarse rung deletes is per-CALL overhead and nothing structural, and what it pays for it
//       is a walk of ~800 hops where the fine program already walks ~640. If it LOSES, per-call
//       overhead is not where a mount's time is and the walk is dearer than the calls it replaced.
//
//   (g) THE FIVE PARSER DOORS LAND TOGETHER, inside 25% of the cheapest, with `html·tpl` and
//       `html·doc` on the dear side because they move 801 nodes across documents and the other
//       three parse in the page. Then "the parser is not the cheap path to this DOM" is one
//       answer for the whole family and the question closes. If they SCATTER, the door matters
//       more than the parser does, which is worth knowing on its own.
//
//   (h) NEITHER FRAGMENTS NOR VARIADIC `append` HELP. MECHANISM: a `DocumentFragment` exists to
//       keep repeated insertions out of a LIVE tree, and this app has none to keep out — every
//       program assembles detached and inserts live exactly once (caveat C). So a fragment can
//       only add a staging hop and `append` can only add argument marshalling. If either WINS,
//       insertion into a DETACHED parent is dearer than it looks, and that is a finding about
//       every renderer in this suite and not about this axis.
//
//   (i) `clone·page` LOSES BY 0.02-0.03 ms. ARITHMETIC, from the measurement recorded in
//       `packages/dom/src/dom/compileExoDomSchema.ts:1282-1314` (A CITATION — that run is not
//       this one): ~95 ns dearer per clone × 321 clones = +0.030 ms, against ~7.4 ns per node of
//       adoption saved × 801 nodes = −0.005 ms on the ONE adopt walk this program performs. If it
//       WINS, the `document.importNode` line the compiler dropped should not have been dropped,
//       and that is a hot-path decision this file does not get to take.
//
//   (j) SHALLOW CLONE LANDS WITH `create`, NOT WITH `clone`. MECHANISM: `cloneNode(false)`
//       produces one element per call exactly as `createElement` does; the only thing it saves is
//       having `class` copied instead of stored. If it BEAT the deep clone, then deep cloning is
//       dominated by something other than its call count and the granularity ladder is measuring
//       the wrong variable.
//
//   (k) REPETITION DOES NOT MOVE THE ANSWER — `clone·distinct` sits ON `clone+refs`, inside the
//       resolution floor. MECHANISM: the parse is amortised at module load in BOTH cases, so what
//       is left inside the timed region is only the source's cache locality and a callsite whose
//       receiver is never the same object twice. IF THIS ONE FAILS IT IS THE MOST IMPORTANT LINE
//       IN THE RUN: cloning's margin over creating is then partly a repetition effect, every
//       "cloning is top" sentence in this repository has to be re-scoped to trees that repeat, and
//       the separate axis argued for under (G) stops being optional.
//
//   (l) THE GRANULARITY LADDER IS MONOTONE — 801 calls ≥ 321 ≥ 81 ≥ 1. An inversion says the walk
//       a coarse program pays outgrows the calls it deleted, and names the rung where it happens.
//
//   THE MODEL CAN BE RIGHT FOR THE WRONG REASON, as it could in Prediction I. (f) holding while
//   (l) fails would mean the coarse rung wins for some reason other than call count; (k) is the
//   only one whose failure changes what may be SAID rather than what is true of this app.
//
// ── THE RESOLUTION FLOOR, MEASURED FROM SOMETHING WHOSE TRUE VALUE IS ZERO ──────────────────
//
// `clone` is built TWICE. `clone·twin` is a second, independently declared function with its own
// independently parsed set of prototypes, doing the identical work on the identical data — a
// different set of objects and a different function object and nothing else. Its true difference
// from `clone` is ZERO, by construction, so
//
//     bias = |median(clone) − median(clone·twin)|
//
// is what this instrument returns when there is nothing to find, measured in the same session, on
// the same machine, interleaved with everything it judges. That is `import-node-trade`'s second
// prototype in this axis's costume, and it exists for its reason: a hardcoded threshold would be
// a guess.
//
// BIAS ALONE WAS NOT ENOUGH, AND THE FIRST RUN SHOWED IT: it printed 0.0000 at four decimals,
// which reads as "this instrument is perfect" and means "the two halves of the null cancelled at
// the median". A difference of medians is free to cancel; the round-to-round scatter is not. So
// the null is now TWO numbers over the same paired series, and every attribution is read against
// the larger:
//
//     noise = median over rounds of |clone_r − clone·twin_r|      (its p75 and worst are printed too)
//     resolution = max(bias, noise)
//
// The two halves of a null are sampled in the SAME round, adjacent in the rotation, so `noise` is
// the scatter that any comparison of two rows in this table carries — the nulls are only where it
// can be seen for what it is. Six decimals, because four is the precision of a row that takes a
// fifth of a millisecond and not of a quantity whose whole job is to be small.
//
// AND THERE ARE TWO NULLS, ONE PER FAMILY. `app-clone·twin` is to `app-clone` what `clone·twin` is
// to `clone`, and it exists because a null is only a null for the shape it was taken on: a
// 321-clone program and a 1-clone-plus-640-hop-walk program spend their time in different places
// and there is no reason their scatter should match. The run prints both, reads everything against
// the larger, and refuses the granularity ladder separately if the COARSE null cannot separate the
// coarse rungs from each other.
//
// ── WHAT COULD NOT BE MADE COMPARABLE, and what blocked each one ────────────────────────────
//
//  A. THE FLOOR IS NOT MEASURED OUT OF A BUILT PACKAGE. `@exodra/dom` is resolved to its tsup
//     `dist`, exactly as every axis resolves it, and the floor programs are in this file and go
//     through the dev server's esbuild. Both are unminified ESM with the same `define`, but that is
//     one transpiler against another, and it is the one difference between these rows that is not a
//     program. It cannot be removed without publishing this file as a package.
//  B. BLINK'S DEFERRED WORK. Style and layout invalidation from 321 insertions is charged to
//     whatever runs next, which here is the next repetition. Every row pays it, no row's timed
//     region contains all of its own, and the floor rows pay LESS of it in absolute terms only
//     because they finish sooner. Same hazard as `mount-phases` and `import-node-trade`.
//  C. THE APP ROOT'S SINGLE LIVE INSERTION. Every program here assembles the whole tree detached
//     and attaches it with ONE `appendChild` at the end, which is what `mountExoInstance` does and
//     is also the cheapest available order. So none of these rows measures anchored insertion into
//     a live region, and neither does the app.
//  D. THE PROTOTYPES ARE NOT PROVED IDENTICAL TO THE RENDERER'S, ONLY REPORTED BESIDE THEM. The
//     compiler emits a placeholder character inside a text port's element and then EMPTIES it out
//     of the prototype again, and it removes an attribute port's placeholder wherever nothing needs
//     the position (READ FROM CODE: `packages/dom/src/dom/setExoText.ts:7-27` and
//     `packages/dom/src/dom/exo-attr-setter.ts:264-267`). This file's prototypes are built to match
//     that — empty Text node in the `<h3>`, no `data-i` until the fill writes one — and the run
//     PRINTS both trees side by side so a divergence is visible. It does not throw on it, because
//     the thing that must be identical is the FINAL MARKUP and that is gated properly; a prototype
//     difference that does not reach the output is a fact about the two compilers, not a reason to
//     refuse the run.
//  E. `@exodra/dom` RE-ADDRESSES EVERY INSTANCE INTO ONE PER-SCHEMA NODE ARRAY, where `clone+refs`
//     writes into one per-MOUNT array. The two are not the same retention and neither is a superset
//     of the other. `clone+refs` is the cheapest thing that answers "can this program come back to
//     that node later"; it is not a replica of what the renderer keeps, and it is not offered as one.
//  F. THE COARSE RUNGS BAKE THE APP'S DATA INTO A PROTOTYPE AND CANNOT BE A TECHNIQUE. `app-clone`,
//     `app-clone·fill`, `app-clone·qsa`, `card-clone` and all five parser rows were prepared at
//     module load out of `IDX`, `POOL`, `startsOpen` and `startCount`. A renderer receives its data
//     at render time and cannot prepare any of it. They are BOUNDS — a lower floor makes the
//     headline weaker and safer — and the run refuses to let the headline be read as a target when
//     the winning row is one of them.
//  G. THERE IS NO LOW-REPETITION CENSUS IN THIS FILE, AND THAT IS A DECISION, NOT AN OMISSION.
//     A second census over a tree of many distinct shapes would have nothing to gate against:
//     `markupOf(mountExodraApp(…))` is what makes every number here a comparison of the SAME job,
//     and a differently shaped tree has no `mountExodraApp`. Building one means a second app, a
//     second set of components, a second `exodra` row and a second set of hand-written
//     straight-line programs — at which point it is an axis, not a section. What lives here instead
//     is `clone·distinct`, which varies repetition as far as a byte-identical gate permits, and the
//     header says at length what that does and does not cover. NOTHING IN THIS FILE MAY BE QUOTED
//     AS A RESULT ABOUT TREES THAT DO NOT REPEAT.
//  H. MODULE-LOAD COST IS OUTSIDE EVERY TIMED REGION AND IS NOT EQUAL ACROSS ROWS. `clone` parses
//     4 prototypes; `clone·distinct` parses 321; `app-clone` parses a 801-node tree; the parser
//     rows carry a whole-app string. None of it is timed, for the reason the header already gives
//     for `APP_HTML` — a bound should be the LOWEST achievable number and charging it for set-up
//     would make it a worse bound — and it is fair to the renderer, which compiles its schemas once
//     at module load too. IT WOULD NOT BE FAIR ON A PAGE THAT PAID IT PER NAVIGATION, and a mobile
//     browser parsing 321 prototypes on every cold start is a real cost this axis prices at zero.
//  I. THE COARSE ROWS' WALK IS WRITTEN AGAINST A TREE THIS FILE PARSED. It branches on
//     `startsOpen(i)` and consumes `startCount(i)` tag rows, i.e. it knows the shape it is walking
//     before it walks it. A renderer's equivalent knows the shape too (that is what a compiled
//     schema is), so this is not an unfair advantage — but it does mean the coarse rows measure a
//     walk over a KNOWN tree and not a discovery of an unknown one.
//
// ── HOW THIS FILE MEASURES ──────────────────────────────────────────────────────────────────
//
// The runner is `abBench`'s sampling with a repetition factor per phase and the medians handed
// back: `prep()` runs `reps` times UNTIMED, then every `measure()` runs
// inside ONE timed region, then every `cleanup()` runs. GC sits after the preps and immediately
// before the timed region, so no region starts under a different pile of floating garbage than its
// neighbour. Phases are interleaved and the order rotates every round.
//
// EVERY REPETITION'S OUTPUT STAYS ALIVE FOR THE WHOLE TIMED REGION — that is `mount-phases`' sink
// rule and it is not tidiness. A region holds all `reps` mounts in all `reps` containers until the
// untimed cleanup; a floor program that dropped each repetition's tree on the floor would be
// allocating into a nursery that recycles rather than into a growing live set, and would read
// cheaper than the same work costs inside a real mount. For the tree it is free: each repetition's
// tree is held by the container it was mounted into and the container is removed in `cleanup`. For
// the `+refs` rows it is not free and is arranged explicitly — each mount pushes its reference array
// into a sink allocated in the UNTIMED prep, so all `reps` arrays are live at once, exactly as all
// `reps` trees are.
//
// THE THIRD POSITIONAL IS THE BATCH AND IT IS HONOURED, as `teardown-phases`' is: it MULTIPLIES
// every phase's repetition factor, so when the clock check refuses a phase and names a factor, that
// factor is something the operator can type instead of editing this file.
//
//     npm run axis --workspace=@exodra/benchmarks -- mount-floor 100 4
//
// BATCH 4 IS THE ONE TO RUN, and it is not the default for the reason the default exists: batch 1
// clears the clock (one region is 20 mounts of a 0.1-0.45 ms program — 2 to 9 ms, 20 to 90 ticks of
// the observed clock against a 3-tick floor) but it does NOT clear the null. At batch 1 the nulls
// are a large fraction of the differences this table is now asked to resolve — a granularity rung,
// an insertion mechanism and a repetition probe are all small quantities — and a run whose null
// swallows its subject prints an ordering, not sizes. The run refuses by name when that happens.
//
// IT IS ~21 PHASES NOW AND IT TAKES MINUTES, not seconds. That is the price of closing the variant
// space in ONE table instead of asking the same question five times in five sessions on five
// slightly different machine states — which is the failure mode this repository has actually had.
// Cut `rounds` to 60 for a first look at the ordering; do not quote a size off a 60-round run.
// WHY 100 ROUNDS: the quantity reported is a RATIO of two medians and the control is a DIFFERENCE
// of two more, so every median has to be settled before any of it means anything.
//
// `@exodra/dom` is resolved to its BUILT dist, so `npm run build` at the repo root has to have run
// or the `exodra` row is a stale renderer and the gap is a gap to last week's code.
import { ExoDomBackend, exoDomSchemaOf } from '@exodra/dom';
import { APP, CARD, DETAILS, TAG, mountExodraApp } from '../../participants/exodra/app';
// THE ONE RENDERER ROW, AND THE ONE THIS AXIS EXISTS TO MAKE READABLE. Everything else here is a
// hand-written program with no abstraction, and `exodra` is the renderer measured against them.
//
// SO THIS AXIS PUBLISHES A GAP AND NOT ITS PARTS. Two more Exodra rungs stood here and both called
// the same mount as this one, which made every term they were subtracted into meaningless. Saying
// how much of the gap is the engine and how much is the idiom needs a second program that genuinely
// does less — see the withdrawal where the split used to be printed.
//
// IT IS NOT ELIGIBLE TO BE THE FLOOR and the `renderer` flag on `Program` is what says so — a
// floor is a program with NO abstraction, and this one is the abstraction. Filtering it out by
// that flag rather than by its name is the only reason a third renderer row added later cannot
// silently become the headline.
// THE MACHINE'S IMPERATIVE SPELLING OF THE SAME APP — the third renderer row, declared beside the
// hand-written wire it is paired with. See its entry in `PROGRAMS`.
import { markupOf } from '../../gates/markup-gate';
import {
    IDX,
    POOL,
    el,
    startCount,
    startsOpen,
    titleOf,
    headlineOf,
    tagsLabel,
    expandedOf,
    // THE USERS. `userNameOf(cardUserOf(i))` is the card's `<span class="user">` and
    // `tagTextOf(POOL[t], startChars(tagUserOf(i, t)))` is a tag's text at the mount — both are
    // PURE FUNCTIONS OF AN INDEX, so a floor computes them where it writes them and stays
    // data-blind. Imported, never re-spelled, for the reason every other formula here is.
    userNameOf,
    cardUserOf,
    tagUserOf,
    startChars,
    tagTextOf,
    DECKS,
    CARDS_PER_DECK,
    DECK_IDX,
    deckNameOf,
    startDeckName,
    deckUserOf,
    deckDateOf,
    dateTextOf,
} from '../../shared/todo-spec';
import type { Scenario } from '../../../harness';
import { appLinesOf } from '../../shared/app-lines';

const EXO_BACKEND = new ExoDomBackend();

// eslint-disable-next-line no-console
const line = (s: string): void => console.log(`✅ ${s}`);
// eslint-disable-next-line no-console
const refuse = (s: string): void => console.log(`❌ ${s}`);

// ---------------------------------------------------------------------------------------
// THE CENSUS, derived from the app's own spec rather than written down, so it cannot drift from
// the app. `mount-phases` derives the same four numbers the same way.
// ---------------------------------------------------------------------------------------

const CARD_N = IDX.length;
const DETAILS_N = IDX.reduce((s, i) => s + (startsOpen(i) ? 1 : 0), 0);
const TAG_N = IDX.reduce((s, i) => s + startCount(i), 0);
/** How many decks the shell holds, and how many elements one of them is: `div.deck` and its five
 *  children — h2, span.author, time.date, button.ren, div.cards. */
const DECK_N = DECKS;
const DECK_ELEMENTS = 6;
/** Instances a mount builds: the shell, the decks, the cards, the open details, the tag rows. */
const INSTANCES = 1 + DECK_N + CARD_N + DETAILS_N + TAG_N;
/**
 * ELEMENTS PER CARD, DERIVED ONCE AND USED EVERYWHERE — `div.card` and its six children, in the
 * order the contract fixes: `h3`, `span.user`, `button.tog`, `div.tags`, `span.count`,
 * `button.addtag`. The details block and the tag rows are counted separately below because their
 * number is a function of the card's data.
 *
 * IT IS A NAMED CONSTANT AND NOT A `6` (nor a `7`) SPELLED INTO TWO EXPRESSIONS. This file carried
 * the count twice — in `ELEMENTS` and in `FRAME_ELEMENTS` — and the day the card gained its
 * `<span class="user">` both were wrong in the same direction, which is a census that agrees with
 * itself about the wrong app.
 */
const CARD_ELEMENTS = 7;
/** Elements in the finished tree: 1 app + 6 per deck + 7 per card + 1 per details + 1 per tag. */
const ELEMENTS = 1 + DECK_N * DECK_ELEMENTS + CARD_N * CARD_ELEMENTS + DETAILS_N + TAG_N;
/** Elements the frame alone carries — the app, the decks and the cards, no children placed. */
const FRAME_ELEMENTS = 1 + DECK_N * DECK_ELEMENTS + CARD_N * CARD_ELEMENTS;

/**
 * HOW MANY NODE REFERENCES A LATER UPDATE COULD NEED — the length of the `+refs` array.
 *
 * Per card, FIVE, and the two that were added are the app's two new derived values rather than
 * bookkeeping: its element (`data-i`, and the parent a details block is inserted into), its
 * headline Text node, its `.tog` button (the element `aria-expanded` is written on), its `div.tags`
 * (the region a tag list reconciles inside) and its `.count` Text node. Per tag row: its Text node.
 * Per open details block: its element, because a program that will later remove it has to hold it.
 *
 * IT GREW BECAUSE THE JOB GREW, not because the programs got looser. A `.tog` click now moves the
 * headline AND the disclosure attribute, and an `.addtag` click now moves the count label as well
 * as the list — so a program that kept only the three old slots would be claiming it could serve
 * an update it would have to go looking for two nodes to serve.
 *
 * AND THE `<span class="user">`'s TEXT NODE IS NOT A SLOT, though it is a FILL. It carries
 * `userNameOf(cardUserOf(i))`, and a user's NAME is the one shared read in this app that NEVER
 * MOVES (`todo-spec.ts`, THE USERS) — no click and no round operation can change it, so a program
 * that retained it would be holding a reference against an update that cannot happen. The TAG's
 * text node IS retained, because a user's SETTING moves and forty tags rewrite when it does.
 */
const REF_SLOTS = DECK_N * 2 + CARD_N * 5 + TAG_N + DETAILS_N;

/**
 * ONE SHARED NO-OP FOR THE WHOLE PROCESS — see the header. The floor pays the
 * `addEventListener` and not the closure, deliberately, and that is inside the gap.
 */
const NOOP = (): void => undefined;

// ---------------------------------------------------------------------------------------
// THE PROTOTYPES. Parsed once at module load, out of a `<template>`, and LEFT WHERE THE PARSER
// PUT THEM — template-contents owner document, which is where `@exodra/dom`'s own prototypes now
// live since `importNode` was dropped from its compiler. Ownership is worth ~95 ns per clone on
// this machine (`import-node-trade` sweeps it; the 2×2 that first measured it was recorded by an
// axis since deleted), so a
// floor that page-owned its prototypes where the renderer does not would be handing the renderer
// 321 × 95 ns of free advantage.
//
// THE TEXT PLACEHOLDER IS EMPTIED OUT AGAIN, which is what the real compiler does: a text port's
// element is emitted with a character inside it so the parser makes a Text node, and the character
// is then removed from the prototype, so a fresh clone always has an EMPTY Text node there and the
// first write is a `.data` store rather than a node allocation (READ FROM CODE:
// `packages/dom/src/dom/setExoText.ts`).
//
// NEITHER `data-i` NOR `aria-expanded` IS IN THE CARD'S MARKUP, for the same reason: the compiler
// emits a placeholder for every attribute port and takes it back out of the prototype wherever
// nothing needs the position (READ FROM CODE: `packages/dom/src/dom/exo-attr-setter.ts`). It costs
// one attribute less to clone, and the fill's `setAttribute` puts it after `class` in the
// serialisation either way — which is what the markup gate proves rather than what this comment
// asserts, and it is why the contract's attribute order costs nobody anything.
//
// THERE ARE THREE TEXT PLACEHOLDERS NOW, not two: the `<h3>`'s headline, the `<span class="user">`'s
// name and the `.count` span's label. All three are emptied, all three are `.data` stores at the
// fill, and all three are ports for the same reason — a value the four prototypes cannot contain.
// The USER's is the odd one and it is named as such: it holds one of FIVE strings rather than 80,
// and it is the only fill in this file that can never be written a second time (see `REF_SLOTS`).
// ---------------------------------------------------------------------------------------

const APP_MARKUP = '<div class="app"></div>';
// THE DECK, WHOSE THREE TEXTS ARE PORTS AND WHOSE `rename` IS STATIC — the same split the
// card carries, in the child order the schema fixes: h2, .author, .date, .ren, .cards.
const DECK_MARKUP =
    '<div class="deck">' +
    '<h2>x</h2>' +
    '<span class="author">x</span>' +
    '<time class="date">x</time>' +
    '<button class="ren">rename</button>' +
    '<div class="cards"></div>' +
    '</div>';
const CARD_MARKUP =
    '<div class="card">' +
    '<h3>x</h3>' +
    '<span class="user">x</span>' +
    '<button class="tog">details</button>' +
    '<div class="tags"></div>' +
    '<span class="count">x</span>' +
    '<button class="addtag">+</button>' +
    '</div>';
const DETAILS_MARKUP = '<div class="details">details…</div>';
const TAG_MARKUP = '<span class="tag">x</span>';

/** Parse one prototype and leave it in the template's owner document. */
function protoOf(markup: string): Element {
    const t = document.createElement('template');
    t.innerHTML = markup;
    return t.content.firstElementChild as Element;
}

/** Empty a text port's placeholder, exactly as the schema compiler does. */
function emptyPlaceholder(node: Node): void {
    (node as Text).data = '';
}

/**
 * Empty ALL THREE of a card prototype's text placeholders — the `<h3>`'s headline, the
 * `<span class="user">`'s name and the `.count` span's label. Walked rather than selected because
 * the walk is the card's own child order (h3 → .user → .tog → .tags → .count → .addtag) and this
 * file states that order in six other places. Module load, so nothing here is inside a timed region.
 */
function emptyDeckPlaceholders(deck: Element): void {
    const h2 = deck.firstChild as Element;
    emptyPlaceholder(h2.firstChild as Node);
    const author = h2.nextSibling as Element;
    emptyPlaceholder(author.firstChild as Node);
    const date = author.nextSibling as Element;
    emptyPlaceholder(date.firstChild as Node);
}

function emptyCardPlaceholders(card: Element): void {
    const h3 = card.firstChild as Element;
    emptyPlaceholder(h3.firstChild as Node);
    const user = h3.nextSibling as Element;
    emptyPlaceholder(user.firstChild as Node);
    const tog = user.nextSibling as Element;
    const tags = tog.nextSibling as Element;
    const count = tags.nextSibling as Element;
    emptyPlaceholder(count.firstChild as Node);
}

/** One independently parsed set of the four prototypes. Built twice — see `clone·twin`. */
interface ProtoSet {
    readonly app: Element;
    readonly deck: Element;
    readonly card: Element;
    readonly details: Element;
    readonly tag: Element;
}

function makeProtoSet(): ProtoSet {
    const app = protoOf(APP_MARKUP);
    const deck = protoOf(DECK_MARKUP);
    const card = protoOf(CARD_MARKUP);
    const details = protoOf(DETAILS_MARKUP);
    const tag = protoOf(TAG_MARKUP);
    emptyDeckPlaceholders(deck);
    emptyCardPlaceholders(card);
    emptyPlaceholder(tag.firstChild as Node);
    return { app, deck, card, details, tag };
}

const P1 = makeProtoSet();
const P2 = makeProtoSet();

// ---------------------------------------------------------------------------------------
// FLOOR (1) — `innerHTML` ON ONE PRECOMPUTED STRING.
//
// The string is built at MODULE LOAD out of the app's own spec, so it cannot drift from the app and
// so that no timed region pays for concatenation. This is the cheapest thing that can produce these
// bytes as nodes, and it is NOT a fair floor for a framework: nothing addressable survives it.
// ---------------------------------------------------------------------------------------

function buildAppHtml(): string {
    let s = '<div class="app">';
    for (let dk = 0; dk < DECK_N; dk++) {
        const du = deckUserOf(dk);
        s +=
            '<div class="deck">' +
            `<h2>${deckNameOf(dk, startDeckName(dk))}</h2>` +
            `<span class="author">${userNameOf(du)}</span>` +
            `<time class="date">${dateTextOf(deckDateOf(dk), startChars(du))}</time>` +
            '<button class="ren">rename</button>' +
            '<div class="cards">';
        for (let k = 0; k < CARDS_PER_DECK; k++) {
            const i = dk * CARDS_PER_DECK + k;
            const open = startsOpen(i);
            const n = startCount(i);
            s +=
                `<div class="card" data-i="${i}">` +
                `<h3>${headlineOf(titleOf(i), open)}</h3>` +
                `<span class="user">${userNameOf(cardUserOf(i))}</span>` +
                `<button class="tog" aria-expanded="${expandedOf(open)}">details</button>`;
            if (open) s += DETAILS_MARKUP;
            s += '<div class="tags">';
            // A TAG'S TEXT IS ITS LABEL CUT TO ITS OWN USER'S SETTING, and the user is `tagUserOf(i, t)`
            // — NOT the card's. A string built from `POOL[t]` alone was the app before the users
            // existed and would now fail the byte gate on the first tag of card 0.
            for (let t = 0; t < n; t++) {
                s += `<span class="tag">${tagTextOf(POOL[t], startChars(tagUserOf(i, t)))}</span>`;
            }
            s += `</div><span class="count">${tagsLabel(n)}</span>`;
            s += '<button class="addtag">+</button></div>';
        }
        s += '</div></div>';
    }
    return s + '</div>';
}

const APP_HTML = buildAppHtml();

function mountHtml(container: HTMLElement): void {
    container.innerHTML = APP_HTML;
}

// ---------------------------------------------------------------------------------------
// THE OTHER FOUR PARSER DOORS. `innerHTML` is not the only way to hand a browser a string and
// get nodes back, and "the parser is/is not the cheap path" is a claim about the FAMILY, not
// about one spelling of it. All five are built so the question is closed in one table instead
// of being re-asked once per door.
//
// EACH IS IN ITS STRONGEST FORM — the module-level Range and the module-level `<template>` and
// the module-level `DOMParser` are allocated ONCE, because a floor uses the cheapest form of
// everything and charging a door for an allocation a careful caller would hoist would only make
// it a worse bound.
//
// TWO OF THEM MOVE NODES ACROSS DOCUMENTS AND THAT IS NOT A DETAIL. `template.content` belongs
// to the template contents owner document and `DOMParser` returns a whole separate `Document`,
// so `appendChild` runs the DOM's pre-insertion "adopt node into parent's node document" step
// over ALL 801 nodes. `insertAdjacentHTML` and `createContextualFragment` parse in the page's
// own document and adopt nothing. That is the axis the family splits on, and it is why they are
// not four spellings of one row.
// ---------------------------------------------------------------------------------------

/** ONE Range for the process — `createContextualFragment` needs a context node, not a fresh Range. */
const RANGE = document.createRange();
/** ONE `<template>` for the process. Assigning `innerHTML` clears whatever the last mount left. */
const TEMPLATE = document.createElement('template');
/** ONE parser for the process. It still allocates a whole `Document` per parse — see the header. */
const PARSER = new DOMParser();

function mountHtmlAdjacent(container: HTMLElement): void {
    container.insertAdjacentHTML('beforeend', APP_HTML);
}

function mountHtmlRange(container: HTMLElement): void {
    RANGE.selectNodeContents(container);
    container.appendChild(RANGE.createContextualFragment(APP_HTML));
}

function mountHtmlTemplate(container: HTMLElement): void {
    TEMPLATE.innerHTML = APP_HTML;
    container.appendChild(TEMPLATE.content);
}

function mountHtmlDocument(container: HTMLElement): void {
    const doc = PARSER.parseFromString(APP_HTML, 'text/html');
    container.appendChild(doc.body.firstElementChild as Element);
}

// ---------------------------------------------------------------------------------------
// THE COARSE PROTOTYPE — THE WHOLE APP, PARSED ONCE, CLONED IN ONE CALL.
//
// READ THE CAVEAT BEFORE THE NUMBER. This is a BOUND AND NOT A STRATEGY. It only exists because
// this file knows the app's data at module load: `APP_HTML` carries every `data-i`, every title
// and every tag label already written into it, so a mount is one clone and a walk and no fills
// at all. A RENDERER CANNOT DO THIS — it is handed data it has not seen, and a prototype it
// parsed before that data existed cannot contain it. So if this rung wins, what it has measured
// is how much of a mount is the per-call overhead of cloning and inserting 321 times rather than
// once, which is a real and useful quantity, and NOT a technique anybody could adopt.
//
// IT IS STILL A LEGITIMATE LOWER BOUND. The ANSWER's headline is "nothing can produce this DOM
// cheaper than X, therefore no framework can be more than Y% faster" — a cheaper program makes Y
// LARGER, i.e. makes the claim WEAKER and still true. What it must never be read as is a target.
// ---------------------------------------------------------------------------------------

const APP_TREE_1 = protoOf(APP_HTML);
/** The coarse family's own null — see `app-clone·twin`. Independently parsed, identical tree. */
const APP_TREE_2 = protoOf(APP_HTML);

// ---------------------------------------------------------------------------------------
// THE MIDDLE RUNG — ONE PROTOTYPE PER WHOLE CARD.
//
// The granularity ladder is the substance of "is cloning top": 801 `createElement`, 321 clones,
// 81 clones, 1 clone, at constant node count and byte-identical output. This is the 81 rung.
//
// THERE ARE TWENTY DISTINCT WHOLE-CARD SHAPES IN THIS APP — `startsOpen`, `startCount` and
// `cardUserOf` are all pure functions of the card index — so 80 cards come out of 20 prototypes,
// each used 4 times. The shapes are DERIVED by keying on the triple rather than on `i % 20`,
// because the three spec functions could stop agreeing and a hardcoded modulus would silently
// build the wrong card.
//
// IT WAS FOUR SHAPES UNTIL THE APP GAINED ITS USERS, and the third key is not decoration: a card's
// `<span class="user">` holds `userNameOf(cardUserOf(i))` and each of its tag rows holds
// `tagTextOf(POOL[t], startChars(tagUserOf(i, t)))`, and `tagUserOf(i, t) = (i + t) % USERS` is
// fixed by `i % USERS` for every position. So `cardUserOf(i)` decides SIX baked values in the
// prototype — the name and up to four tag texts — and two cards that agree on `open` and `count`
// and disagree on their user are different trees. Keyed on the pair alone, this rung would have
// cloned card 0's user into cards 20, 40 and 60 and the markup gate would have caught it as a
// difference with no name on it.
//
// IT IS DATA-BAKED, like the coarse rung and for the same reason: the tag labels and the presence
// of the details block are things the card's WIRE computes, and a prototype that contains them
// was built from data. It is a rung on the ladder, not a strategy.
// ---------------------------------------------------------------------------------------

function cardMarkupFor(i: number): string {
    const open = startsOpen(i);
    const n = startCount(i);
    // `aria-expanded`, THE USER'S NAME, THE COUNT LABEL AND EVERY TAG TEXT ARE BAKED IN, and that
    // is not a liberty this rung took: each is a function of `startsOpen(i)`, `startCount(i)` or
    // `cardUserOf(i)`, which are the three parts of the SHAPE KEY below, so two cards that share a
    // prototype necessarily share all of them. The headline cannot be baked — it reads the card's
    // title, of which there are 80.
    let s =
        '<div class="card"><h3>x</h3>' +
        `<span class="user">${userNameOf(cardUserOf(i))}</span>` +
        `<button class="tog" aria-expanded="${expandedOf(open)}">details</button>`;
    if (open) s += DETAILS_MARKUP;
    s += '<div class="tags">';
    for (let t = 0; t < n; t++) {
        s += `<span class="tag">${tagTextOf(POOL[t], startChars(tagUserOf(i, t)))}</span>`;
    }
    return (
        s +
        `</div><span class="count">${tagsLabel(n)}</span>` +
        '<button class="addtag">+</button></div>'
    );
}

const CARD_SHAPES = new Map<string, Element>();
/** The prototype each card index clones from — 80 entries over `CARD_SHAPES.size` objects. */
const CARD_SHAPE_AT: readonly Element[] = IDX.map((i) => {
    const key = `${startsOpen(i) ? 'open' : 'shut'}:${startCount(i)}:${cardUserOf(i)}`;
    let proto = CARD_SHAPES.get(key);
    if (!proto) {
        proto = protoOf(cardMarkupFor(i));
        // The HEADLINE is the ONE thing a whole-card prototype still cannot carry: 80 distinct
        // values. So it keeps the emptied text placeholder and stays a port. The `.count` label
        // does not — it is one of `1 tag`…`4 tags` and the shape key already fixes which — and
        // neither does the user's NAME, which the third part of the key fixes to one of five.
        emptyPlaceholder((proto.firstChild as Element).firstChild as Node);
        CARD_SHAPES.set(key, proto);
    }
    return proto;
});

// ---------------------------------------------------------------------------------------
// THE REPETITION PROBE — 321 PROTOTYPES INSTEAD OF 4, EACH CLONED EXACTLY ONCE.
//
// THIS IS THE ONLY THING IN THIS FILE THAT ASKS WHETHER "CLONING IS TOP" SURVIVES A PAGE THAT
// DOES NOT REPEAT, and the header says at length why it is the strongest form the gate admits.
// Cloning amortises one parsed source over 321 instances; `createElement` has nothing to
// amortise. On a page of 321 distinct shapes the source is never reused — so this row gives the
// clone rows 321 distinct sources, one per instance, and holds EVERYTHING else identical:
// the same node count, the same walk, the same fills, the same insertions, the same gated bytes.
//
// WHAT IT REPRODUCES: the timed half of low repetition — a clone source read cold from a
// different place in the heap every time, and a `cloneNode` callsite whose receiver is never the
// same object twice.
// WHAT IT CANNOT REPRODUCE: differently SHAPED markup, because the gate demands byte-identical
// output and shapes that differ produce output that differs. That half needs its own reference
// app and therefore its own axis — argued in the header under (G).
// ---------------------------------------------------------------------------------------

const D_APP = protoOf(APP_MARKUP);
const D_DECKS: readonly Element[] = DECK_IDX.map(() => {
    const e = protoOf(DECK_MARKUP);
    emptyDeckPlaceholders(e);
    return e;
});
const D_CARDS: readonly Element[] = IDX.map(() => {
    const c = protoOf(CARD_MARKUP);
    emptyCardPlaceholders(c);
    return c;
});
const D_DETAILS: readonly Element[] = Array.from({ length: DETAILS_N }, () =>
    protoOf(DETAILS_MARKUP)
);
const D_TAGS: readonly Element[] = Array.from({ length: TAG_N }, () => {
    const t = protoOf(TAG_MARKUP);
    emptyPlaceholder(t.firstChild as Node);
    return t;
});

// ---------------------------------------------------------------------------------------
// THE PAGE-OWNED PROTOTYPE SET — THE CONFIGURATION `@exodra/dom` DROPPED, PRICED HERE.
//
// `packages/dom/src/dom/compileExoDomSchema.ts:1282-1314` used to end with
// `document.importNode(proto, true)` and now ends with `const instanceProto = proto;` (READ FROM
// CODE). That comment carries the measurement that removed it — ~95 ns dearer per clone against
// ~26 ns saved per insertion — and states that removing it moved the mount axis −9.2%.
//
// THIS ROW IS THAT TRADE WITH NOTHING ELSE IN THE FRAME. In a renderer the trade is buried under
// the wire, the records and the connector; here the only difference between `clone+refs` and
// `clone·page` is which document the four prototypes belong to, so whatever separates them IS
// the trade and cannot be anything else.
//
// AND IT IS ONE ADOPT WALK, NOT 321. Every insertion inside the fine clone program joins two
// nodes of the SAME document (a template-owned card into a template-owned app root), so it
// adopts nothing; the whole 801-node adopt happens once, at the final `container.appendChild`.
// A page-owned prototype removes that single walk and pays the clone penalty 321 times. That is
// the arithmetic the prediction in the header is built out of.
//
// IT SHARES `mountCloneRefs` WITH `clone+refs` ON PURPOSE, where the NULL does not. A null must
// not share what V8 learned, because it is measuring zero. This row is measuring a specific
// non-zero effect, and giving it its own copy of the function would put function identity inside
// the very difference being priced. Both `ProtoSet`s are the same object literal shape and a
// page-owned `HTMLDivElement` has the same map as a template-owned one, so the callsites stay
// monomorphic either way (JUDGEMENT, from V8's object model — not measured).
// ---------------------------------------------------------------------------------------

const P_PAGE: ProtoSet = {
    app: document.importNode(P1.app, true),
    deck: document.importNode(P1.deck, true),
    card: document.importNode(P1.card, true),
    details: document.importNode(P1.details, true),
    tag: document.importNode(P1.tag, true),
};

// ---------------------------------------------------------------------------------------
// THE SHALLOW-CLONE SET — `cloneNode(false)` PER ELEMENT, ASSEMBLED BY HAND.
//
// One prototype per DISTINCT ELEMENT rather than per subtree, cloned WITHOUT its children. It
// sits between `create` and `clone` by construction: it pays a clone call per element as `create`
// pays a `createElement` per element, and it gets the element's attributes copied for free where
// `create` has to store `className`.
//
// TEXT IS HANDLED EXACTLY AS `create` HANDLES IT — `textContent` for the three fixed strings,
// `createTextNode` for the two that vary — so the row differs from `create` by ONE substitution
// (`cloneNode(false)` for `createElement` + `className`) and by nothing else. Shallow-cloning
// the Text nodes too would have been a second variable in the same row.
// ---------------------------------------------------------------------------------------

interface ShallowSet {
    readonly app: Element;
    readonly deck: Element;
    readonly h2deck: Element;
    readonly author: Element;
    readonly date: Element;
    readonly ren: Element;
    readonly cards: Element;
    readonly card: Element;
    readonly h3: Element;
    readonly user: Element;
    readonly tog: Element;
    readonly tags: Element;
    readonly count: Element;
    readonly addtag: Element;
    readonly details: Element;
    readonly tag: Element;
}

const SHALLOW: ShallowSet = {
    app: protoOf('<div class="app"></div>'),
    deck: protoOf('<div class="deck"></div>'),
    h2deck: protoOf('<h2></h2>'),
    author: protoOf('<span class="author"></span>'),
    date: protoOf('<time class="date"></time>'),
    ren: protoOf('<button class="ren"></button>'),
    cards: protoOf('<div class="cards"></div>'),
    card: protoOf('<div class="card"></div>'),
    h3: protoOf('<h3></h3>'),
    user: protoOf('<span class="user"></span>'),
    tog: protoOf('<button class="tog"></button>'),
    tags: protoOf('<div class="tags"></div>'),
    count: protoOf('<span class="count"></span>'),
    addtag: protoOf('<button class="addtag"></button>'),
    details: protoOf('<div class="details"></div>'),
    tag: protoOf('<span class="tag"></span>'),
};

// ---------------------------------------------------------------------------------------
// FLOOR (2) — CLONE, WALK, FILL, INSERT. THE HONEST FLOOR.
//
// The walk is STRAIGHT-LINE property access and not a loop over a table: nine hops per card
// (card→h3, h3→its Text node, then five `nextSibling` steps along h3 → span.user → button.tog →
// div.tags → span.count → button.addtag, plus user→its Text node and count→its Text node) and one
// per tag row. That is the same hop COUNT the compiled schemas carry for this app, and it is
// written out rather than read from an array because a floor may not pay for an indirection a
// renderer pays for by choice.
//
// IT WAS FIVE HOPS BEFORE THE APP HAD DERIVED VALUES and SEVEN BEFORE IT HAD USERS. The two the
// derived values added are the two those values are written through: the `.count` span stands
// between `.tags` and `.addtag`, so reaching the `.addtag` button costs one more `nextSibling`
// whether or not a program writes the label, and the label itself is one more `firstChild`.
// `aria-expanded` cost NO hop — the `.tog` button was already in hand for its listener. THE TWO THE
// USERS ADDED are the same shape one step earlier: `<span class="user">` stands between the `<h3>`
// and the `.tog` button, so every element after it costs one more `nextSibling` to reach, and its
// name is one more `firstChild`. It is the ONLY one of the four new hops that buys a write nothing
// can ever repeat (`REF_SLOTS`).
//
// THE ORDER IS THE MOUNT'S: the card is walked and filled while detached, its details block and its
// tag rows go into it while it is still detached, the card goes into the app root, and the app root
// goes into the live container in ONE final insertion at the very end. That is what
// `mountExoInstance` does and it is also the cheapest available order — a floor that inserted the
// app root first would pay layout invalidation 321 times.
//
// THE FILLS ARE IN THE CARD'S OWN DOM ORDER — index, headline, user name, toggle, aria-expanded,
// details, tags, count, addTag — so that nothing in the comparison is a difference of ordering. The
// wire now groups differently (its scalars, then its two regions, then its two handlers) and that
// is the same nine writes on the same nine objects in a different sequence; a straight-line
// program writes each node as its walk reaches it, and that is what is written here.
//
// `startsOpen(i)` AND `startCount(i)` ARE READ INTO LOCALS AT THE TOP OF THE CARD, because each is
// now needed TWICE — `open` by the disclosure attribute and by the details branch, `n` by the tag
// loop and by the count label. Calling a pure spec function twice for the same card would be the
// floor paying for something no hand-written program would pay for.
// ---------------------------------------------------------------------------------------

function mountClone(container: HTMLElement, P: ProtoSet): void {
    const appRoot = P.app.cloneNode(true) as Element;
    for (let dk = 0; dk < DECK_N; dk++) {
        const deck = P.deck.cloneNode(true) as Element;
        const h2 = deck.firstChild as Element;
        const author = h2.nextSibling as Element;
        const date = author.nextSibling as Element;
        const ren = date.nextSibling as Element;
        const cards = ren.nextSibling as Element;
        const du = deckUserOf(dk);
        (h2.firstChild as Text).data = deckNameOf(dk, startDeckName(dk));
        (author.firstChild as Text).data = userNameOf(du);
        (date.firstChild as Text).data = dateTextOf(deckDateOf(dk), startChars(du));
        ren.addEventListener('click', NOOP);
        for (let k = 0; k < CARDS_PER_DECK; k++) {
            const i = dk * CARDS_PER_DECK + k;
            const open = startsOpen(i);
            const n = startCount(i);
            const card = P.card.cloneNode(true) as Element;
            const h3 = card.firstChild as Element;
            const title = h3.firstChild as Text;
            const user = h3.nextSibling as Element;
            const tog = user.nextSibling as Element;
            const tags = tog.nextSibling as Element;
            const count = tags.nextSibling as Element;
            const label = count.firstChild as Text;
            const addtag = count.nextSibling as Element;

            card.setAttribute('data-i', String(i));
            title.data = headlineOf(titleOf(i), open);
            (user.firstChild as Text).data = userNameOf(cardUserOf(i));
            tog.addEventListener('click', NOOP);
            tog.setAttribute('aria-expanded', expandedOf(open));
            if (open) card.insertBefore(P.details.cloneNode(true), tags);
            for (let t = 0; t < n; t++) {
                const tag = P.tag.cloneNode(true) as Element;
                (tag.firstChild as Text).data = tagTextOf(POOL[t], startChars(tagUserOf(i, t)));
                tags.appendChild(tag);
            }
            label.data = tagsLabel(n);
            addtag.addEventListener('click', NOOP);
            cards.appendChild(card);
        }
        appRoot.appendChild(deck);
    }
    container.appendChild(appRoot);
}

/**
 * THE NULL. A SECOND, INDEPENDENTLY DECLARED COPY of `mountClone` — its own function object, its
 * own inline caches, its own prototype set (`P2`), the identical work on the identical data.
 *
 * ITS TRUE DIFFERENCE FROM `mountClone` IS ZERO BY CONSTRUCTION, so what the run measures between
 * them is what this instrument returns when there is nothing to find. It is duplicated SOURCE and
 * not a second call to the same function on purpose: calling one function twice would share
 * everything V8 learned about it and would measure a floor far below the one a real pair of
 * programs sits on.
 */
function mountCloneTwin(container: HTMLElement, P: ProtoSet): void {
    const appRoot = P.app.cloneNode(true) as Element;
    for (let dk = 0; dk < DECK_N; dk++) {
        const deck = P.deck.cloneNode(true) as Element;
        const h2 = deck.firstChild as Element;
        const author = h2.nextSibling as Element;
        const date = author.nextSibling as Element;
        const ren = date.nextSibling as Element;
        const cards = ren.nextSibling as Element;
        const du = deckUserOf(dk);
        (h2.firstChild as Text).data = deckNameOf(dk, startDeckName(dk));
        (author.firstChild as Text).data = userNameOf(du);
        (date.firstChild as Text).data = dateTextOf(deckDateOf(dk), startChars(du));
        ren.addEventListener('click', NOOP);
        for (let k = 0; k < CARDS_PER_DECK; k++) {
            const i = dk * CARDS_PER_DECK + k;
            const open = startsOpen(i);
            const n = startCount(i);
            const card = P.card.cloneNode(true) as Element;
            const h3 = card.firstChild as Element;
            const title = h3.firstChild as Text;
            const user = h3.nextSibling as Element;
            const tog = user.nextSibling as Element;
            const tags = tog.nextSibling as Element;
            const count = tags.nextSibling as Element;
            const label = count.firstChild as Text;
            const addtag = count.nextSibling as Element;

            card.setAttribute('data-i', String(i));
            title.data = headlineOf(titleOf(i), open);
            (user.firstChild as Text).data = userNameOf(cardUserOf(i));
            tog.addEventListener('click', NOOP);
            tog.setAttribute('aria-expanded', expandedOf(open));
            if (open) card.insertBefore(P.details.cloneNode(true), tags);
            for (let t = 0; t < n; t++) {
                const tag = P.tag.cloneNode(true) as Element;
                (tag.firstChild as Text).data = tagTextOf(POOL[t], startChars(tagUserOf(i, t)));
                tags.appendChild(tag);
            }
            label.data = tagsLabel(n);
            addtag.addEventListener('click', NOOP);
            cards.appendChild(card);
        }
        appRoot.appendChild(deck);
    }
    container.appendChild(appRoot);
}

/**
 * THE SAME PROGRAM THAT KEEPS ITS PORTS — one flat `Node[]` of the exact final length, filled in
 * one pass, held by the caller for the life of the mount.
 *
 * It differs from `mountClone` by ONE array allocation, `REF_SLOTS` array stores and ONE push into
 * the scenario's sink, and by nothing else — which is what makes `clone+refs − clone` readable as
 * the price of being able to come back to a port later.
 */
function mountCloneRefs(container: HTMLElement, P: ProtoSet, refs: Node[]): void {
    const appRoot = P.app.cloneNode(true) as Element;
    let at = 0;
    for (let dk = 0; dk < DECK_N; dk++) {
        const deck = P.deck.cloneNode(true) as Element;
        const h2 = deck.firstChild as Element;
        const author = h2.nextSibling as Element;
        const date = author.nextSibling as Element;
        const ren = date.nextSibling as Element;
        const cards = ren.nextSibling as Element;
        const du = deckUserOf(dk);
        (h2.firstChild as Text).data = deckNameOf(dk, startDeckName(dk));
        (author.firstChild as Text).data = userNameOf(du);
        (date.firstChild as Text).data = dateTextOf(deckDateOf(dk), startChars(du));
        ren.addEventListener('click', NOOP);
        refs[at++] = h2.firstChild as Text;
        refs[at++] = date.firstChild as Text;
        for (let k = 0; k < CARDS_PER_DECK; k++) {
            const i = dk * CARDS_PER_DECK + k;
            const open = startsOpen(i);
            const n = startCount(i);
            const card = P.card.cloneNode(true) as Element;
            const h3 = card.firstChild as Element;
            const title = h3.firstChild as Text;
            const user = h3.nextSibling as Element;
            const tog = user.nextSibling as Element;
            const tags = tog.nextSibling as Element;
            const count = tags.nextSibling as Element;
            const label = count.firstChild as Text;
            const addtag = count.nextSibling as Element;

            card.setAttribute('data-i', String(i));
            title.data = headlineOf(titleOf(i), open);
            (user.firstChild as Text).data = userNameOf(cardUserOf(i));
            refs[at++] = card;
            refs[at++] = title;
            refs[at++] = tog;
            refs[at++] = tags;
            refs[at++] = label;
            tog.addEventListener('click', NOOP);
            tog.setAttribute('aria-expanded', expandedOf(open));
            if (open) {
                const d = P.details.cloneNode(true) as Element;
                card.insertBefore(d, tags);
                refs[at++] = d;
            }
            for (let t = 0; t < n; t++) {
                const tag = P.tag.cloneNode(true) as Element;
                const text = tag.firstChild as Text;
                text.data = tagTextOf(POOL[t], startChars(tagUserOf(i, t)));
                tags.appendChild(tag);
                refs[at++] = text;
            }
            label.data = tagsLabel(n);
            addtag.addEventListener('click', NOOP);
            cards.appendChild(card);
        }
        appRoot.appendChild(deck);
    }
    container.appendChild(appRoot);
}

// ---------------------------------------------------------------------------------------
// FLOOR (3) — `document.createElement` PER NODE.
//
// Neither a floor nor a ceiling. `className` rather than `setAttribute('class', …)` because it is
// the cheaper spelling and this is a floor — and because it is the spelling `@exodra/dom`'s own
// attribute setter uses for `class` (READ FROM CODE: `exo-attr-setter.ts:220-228`). `textContent`
// for the three static texts, one call instead of two; `createTextNode` for the headline and for
// the count label, because the `+refs` variant must be able to keep those nodes and the two
// variants have to differ by the record and nothing else.
//
// `aria-expanded` IS A `setAttribute` HERE AND EVERYWHERE ELSE — there is no property spelling of
// it that `exo-attr-setter` would take (its property path is for hyphenated custom elements, not
// for ARIA), so `create` gets no cheaper spelling than the clone family does.
// ---------------------------------------------------------------------------------------

function mountCreate(container: HTMLElement): void {
    const appRoot = document.createElement('div');
    appRoot.className = 'app';
    for (let dk = 0; dk < DECK_N; dk++) {
        const deck = document.createElement('div');
        deck.className = 'deck';
        const du = deckUserOf(dk);
        const h2 = document.createElement('h2');
        h2.appendChild(document.createTextNode(deckNameOf(dk, startDeckName(dk))));
        deck.appendChild(h2);
        const author = document.createElement('span');
        author.className = 'author';
        author.appendChild(document.createTextNode(userNameOf(du)));
        deck.appendChild(author);
        const date = document.createElement('time');
        date.className = 'date';
        date.appendChild(document.createTextNode(dateTextOf(deckDateOf(dk), startChars(du))));
        deck.appendChild(date);
        const ren = document.createElement('button');
        ren.className = 'ren';
        ren.textContent = 'rename';
        ren.addEventListener('click', NOOP);
        deck.appendChild(ren);
        const cards = document.createElement('div');
        cards.className = 'cards';
        deck.appendChild(cards);
        for (let k = 0; k < CARDS_PER_DECK; k++) {
            const i = dk * CARDS_PER_DECK + k;
            const open = startsOpen(i);
            const n = startCount(i);
            const card = document.createElement('div');
            card.className = 'card';
            card.setAttribute('data-i', String(i));

            const h3 = document.createElement('h3');
            h3.appendChild(document.createTextNode(headlineOf(titleOf(i), open)));
            card.appendChild(h3);

            // THE USER'S NAME — `textContent` and not a `createTextNode`, in BOTH create rows, because
            // it is the one fill in this app that can never be written again (`REF_SLOTS`): no program
            // here retains it, so neither row needs the Text node in hand and the two still differ by
            // the record and nothing else.
            const userEl = document.createElement('span');
            userEl.className = 'user';
            userEl.textContent = userNameOf(cardUserOf(i));
            card.appendChild(userEl);

            const tog = document.createElement('button');
            tog.className = 'tog';
            tog.setAttribute('aria-expanded', expandedOf(open));
            tog.textContent = 'details';
            tog.addEventListener('click', NOOP);
            card.appendChild(tog);

            if (open) {
                const d = document.createElement('div');
                d.className = 'details';
                d.textContent = 'details…';
                card.appendChild(d);
            }

            const tags = document.createElement('div');
            tags.className = 'tags';
            card.appendChild(tags);
            for (let t = 0; t < n; t++) {
                const tag = document.createElement('span');
                tag.className = 'tag';
                tag.appendChild(
                    document.createTextNode(tagTextOf(POOL[t], startChars(tagUserOf(i, t))))
                );
                tags.appendChild(tag);
            }

            const count = document.createElement('span');
            count.className = 'count';
            count.appendChild(document.createTextNode(tagsLabel(n)));
            card.appendChild(count);

            const addtag = document.createElement('button');
            addtag.className = 'addtag';
            addtag.textContent = '+';
            addtag.addEventListener('click', NOOP);
            card.appendChild(addtag);

            cards.appendChild(card);
        }
        appRoot.appendChild(deck);
    }
    container.appendChild(appRoot);
}

function mountCreateRefs(container: HTMLElement, refs: Node[]): void {
    const appRoot = document.createElement('div');
    appRoot.className = 'app';
    let at = 0;
    for (let dk = 0; dk < DECK_N; dk++) {
        const deck = document.createElement('div');
        deck.className = 'deck';
        const du = deckUserOf(dk);
        const h2 = document.createElement('h2');
        h2.appendChild(document.createTextNode(deckNameOf(dk, startDeckName(dk))));
        deck.appendChild(h2);
        const author = document.createElement('span');
        author.className = 'author';
        author.appendChild(document.createTextNode(userNameOf(du)));
        deck.appendChild(author);
        const date = document.createElement('time');
        date.className = 'date';
        date.appendChild(document.createTextNode(dateTextOf(deckDateOf(dk), startChars(du))));
        deck.appendChild(date);
        const ren = document.createElement('button');
        ren.className = 'ren';
        ren.textContent = 'rename';
        ren.addEventListener('click', NOOP);
        deck.appendChild(ren);
        const cards = document.createElement('div');
        cards.className = 'cards';
        deck.appendChild(cards);
        refs[at++] = h2.firstChild as Text;
        refs[at++] = date.firstChild as Text;
        for (let k = 0; k < CARDS_PER_DECK; k++) {
            const i = dk * CARDS_PER_DECK + k;
            const open = startsOpen(i);
            const n = startCount(i);
            const card = document.createElement('div');
            card.className = 'card';
            card.setAttribute('data-i', String(i));

            const h3 = document.createElement('h3');
            const title = document.createTextNode(headlineOf(titleOf(i), open));
            h3.appendChild(title);
            card.appendChild(h3);

            // THE USER'S NAME — `textContent` and not a `createTextNode`, in BOTH create rows, because
            // it is the one fill in this app that can never be written again (`REF_SLOTS`): no program
            // here retains it, so neither row needs the Text node in hand and the two still differ by
            // the record and nothing else.
            const userEl = document.createElement('span');
            userEl.className = 'user';
            userEl.textContent = userNameOf(cardUserOf(i));
            card.appendChild(userEl);

            const tog = document.createElement('button');
            tog.className = 'tog';
            tog.setAttribute('aria-expanded', expandedOf(open));
            tog.textContent = 'details';
            tog.addEventListener('click', NOOP);
            card.appendChild(tog);

            if (open) {
                const d = document.createElement('div');
                d.className = 'details';
                d.textContent = 'details…';
                card.appendChild(d);
                refs[at++] = d;
            }

            const tags = document.createElement('div');
            tags.className = 'tags';
            card.appendChild(tags);
            refs[at++] = card;
            refs[at++] = title;
            refs[at++] = tog;
            refs[at++] = tags;
            for (let t = 0; t < n; t++) {
                const tag = document.createElement('span');
                tag.className = 'tag';
                const text = document.createTextNode(
                    tagTextOf(POOL[t], startChars(tagUserOf(i, t)))
                );
                tag.appendChild(text);
                tags.appendChild(tag);
                refs[at++] = text;
            }

            const count = document.createElement('span');
            count.className = 'count';
            const label = document.createTextNode(tagsLabel(n));
            count.appendChild(label);
            card.appendChild(count);
            refs[at++] = label;

            const addtag = document.createElement('button');
            addtag.className = 'addtag';
            addtag.textContent = '+';
            addtag.addEventListener('click', NOOP);
            card.appendChild(addtag);

            cards.appendChild(card);
        }
        appRoot.appendChild(deck);
    }
    container.appendChild(appRoot);
}

// ---------------------------------------------------------------------------------------
// THE INSERTION FAMILY — DOES BATCHING THE 321 INSERTIONS HELP?
//
// `clone+refs` inserts one node at a time: 200 tags into their `.tags` div, 40 details blocks,
// 80 cards into the app root, 1 app root into the container. The two standard ways to do fewer
// insertions are a `DocumentFragment` and the variadic `append(...)`, and they are DIFFERENT
// MECHANISMS rather than two spellings — a fragment is a staging parent whose children are moved
// in one call, `append` never allocates a parent at all — so both are built.
//
// I EXPECT BOTH TO LOSE, AND THE REASON IS THE ONE THING THIS APP ALREADY DOES RIGHT: every
// program here assembles the entire tree DETACHED and attaches it with ONE live insertion at the
// very end (caveat C). A fragment's whole purpose is to keep repeated insertions out of a LIVE
// tree, and there are none to keep out — so a fragment can only add a staging hop, and `append`
// can only add argument marshalling. If either of them wins anyway, then insertion into a
// detached parent is dearer than it looks and that is a finding about every renderer here.
//
// THEY RETAIN, like every rung added after the first run, so that each is eligible to BE the
// floor. The floor is chosen mechanically over the rows that are addressable AND retaining, and
// a mechanism that could beat `clone+refs` but was built without references could not be seen.
// ---------------------------------------------------------------------------------------

function mountCloneFragRefs(container: HTMLElement, P: ProtoSet, refs: Node[]): void {
    const appRoot = P.app.cloneNode(true) as Element;
    // TWO fragments for the whole mount, not one per card: a fragment is EMPTY again once its
    // children have been moved, so the tag fragment is reused 80 times. Allocating one per card
    // would have charged the mechanism for 80 allocations no careful caller would make.
    const cardsFrag = document.createDocumentFragment();
    const tagsFrag = document.createDocumentFragment();
    let at = 0;
    for (let dk = 0; dk < DECK_N; dk++) {
        const deck = P.deck.cloneNode(true) as Element;
        const h2 = deck.firstChild as Element;
        const author = h2.nextSibling as Element;
        const date = author.nextSibling as Element;
        const ren = date.nextSibling as Element;
        const deckCards = ren.nextSibling as Element;
        const du = deckUserOf(dk);
        (h2.firstChild as Text).data = deckNameOf(dk, startDeckName(dk));
        (author.firstChild as Text).data = userNameOf(du);
        (date.firstChild as Text).data = dateTextOf(deckDateOf(dk), startChars(du));
        ren.addEventListener('click', NOOP);
        refs[at++] = h2.firstChild as Text;
        refs[at++] = date.firstChild as Text;
        for (let k = 0; k < CARDS_PER_DECK; k++) {
            const i = dk * CARDS_PER_DECK + k;
            const open = startsOpen(i);
            const n = startCount(i);
            const card = P.card.cloneNode(true) as Element;
            const h3 = card.firstChild as Element;
            const title = h3.firstChild as Text;
            const user = h3.nextSibling as Element;
            const tog = user.nextSibling as Element;
            const tags = tog.nextSibling as Element;
            const count = tags.nextSibling as Element;
            const label = count.firstChild as Text;
            const addtag = count.nextSibling as Element;

            card.setAttribute('data-i', String(i));
            title.data = headlineOf(titleOf(i), open);
            (user.firstChild as Text).data = userNameOf(cardUserOf(i));
            refs[at++] = card;
            refs[at++] = title;
            refs[at++] = tog;
            refs[at++] = tags;
            refs[at++] = label;
            tog.addEventListener('click', NOOP);
            tog.setAttribute('aria-expanded', expandedOf(open));
            // NOT BATCHABLE, and left alone rather than forced: zero or one details block is not a
            // batch, and staging a single node through a fragment would be a strictly extra hop.
            if (open) {
                const d = P.details.cloneNode(true) as Element;
                card.insertBefore(d, tags);
                refs[at++] = d;
            }
            for (let t = 0; t < n; t++) {
                const tag = P.tag.cloneNode(true) as Element;
                const text = tag.firstChild as Text;
                text.data = tagTextOf(POOL[t], startChars(tagUserOf(i, t)));
                tagsFrag.appendChild(tag);
                refs[at++] = text;
            }
            tags.appendChild(tagsFrag);
            label.data = tagsLabel(n);
            addtag.addEventListener('click', NOOP);
            cardsFrag.appendChild(card);
        }
        deckCards.appendChild(cardsFrag);
        appRoot.appendChild(deck);
    }
    container.appendChild(appRoot);
}

/**
 * THE SAME, THROUGH THE VARIADIC `append(...)` — no staging parent at all.
 *
 * THE TAG ARM IS A NEST OF `if`s AND NOT AN ARRAY, and that is the whole point of the row: an
 * array would have to be allocated or sliced per card, which is exactly the marshalling cost the
 * mechanism is supposed to avoid, and it would have made this a measurement of `slice`. Every
 * card in this app carries 1-4 tags — CHECKED at module load by `gateAddedRungs`, not assumed —
 * so the four arms are total, and a fifth count would be refused before anything is timed.
 */
function mountCloneAppendRefs(container: HTMLElement, P: ProtoSet, refs: Node[]): void {
    const appRoot = P.app.cloneNode(true) as Element;
    const batch = new Array<Node>(CARDS_PER_DECK);
    let at = 0;
    for (let dk = 0; dk < DECK_N; dk++) {
        const deck = P.deck.cloneNode(true) as Element;
        const h2 = deck.firstChild as Element;
        const author = h2.nextSibling as Element;
        const date = author.nextSibling as Element;
        const ren = date.nextSibling as Element;
        const deckCards = ren.nextSibling as Element;
        const du = deckUserOf(dk);
        (h2.firstChild as Text).data = deckNameOf(dk, startDeckName(dk));
        (author.firstChild as Text).data = userNameOf(du);
        (date.firstChild as Text).data = dateTextOf(deckDateOf(dk), startChars(du));
        ren.addEventListener('click', NOOP);
        refs[at++] = h2.firstChild as Text;
        refs[at++] = date.firstChild as Text;
        for (let k = 0; k < CARDS_PER_DECK; k++) {
            const i = dk * CARDS_PER_DECK + k;
            const open = startsOpen(i);
            const n = startCount(i);
            const card = P.card.cloneNode(true) as Element;
            const h3 = card.firstChild as Element;
            const title = h3.firstChild as Text;
            const user = h3.nextSibling as Element;
            const tog = user.nextSibling as Element;
            const tags = tog.nextSibling as Element;
            const count = tags.nextSibling as Element;
            const label = count.firstChild as Text;
            const addtag = count.nextSibling as Element;

            card.setAttribute('data-i', String(i));
            title.data = headlineOf(titleOf(i), open);
            (user.firstChild as Text).data = userNameOf(cardUserOf(i));
            refs[at++] = card;
            refs[at++] = title;
            refs[at++] = tog;
            refs[at++] = tags;
            refs[at++] = label;
            tog.addEventListener('click', NOOP);
            tog.setAttribute('aria-expanded', expandedOf(open));
            if (open) {
                const d = P.details.cloneNode(true) as Element;
                card.insertBefore(d, tags);
                refs[at++] = d;
            }

            const g0 = P.tag.cloneNode(true) as Element;
            const x0 = g0.firstChild as Text;
            x0.data = tagTextOf(POOL[0], startChars(tagUserOf(i, 0)));
            refs[at++] = x0;
            if (n === 1) {
                tags.append(g0);
            } else {
                const g1 = P.tag.cloneNode(true) as Element;
                const x1 = g1.firstChild as Text;
                x1.data = tagTextOf(POOL[1], startChars(tagUserOf(i, 1)));
                refs[at++] = x1;
                if (n === 2) {
                    tags.append(g0, g1);
                } else {
                    const g2 = P.tag.cloneNode(true) as Element;
                    const x2 = g2.firstChild as Text;
                    x2.data = tagTextOf(POOL[2], startChars(tagUserOf(i, 2)));
                    refs[at++] = x2;
                    if (n === 3) {
                        tags.append(g0, g1, g2);
                    } else {
                        const g3 = P.tag.cloneNode(true) as Element;
                        const x3 = g3.firstChild as Text;
                        x3.data = tagTextOf(POOL[3], startChars(tagUserOf(i, 3)));
                        refs[at++] = x3;
                        tags.append(g0, g1, g2, g3);
                    }
                }
            }

            label.data = tagsLabel(n);
            addtag.addEventListener('click', NOOP);
            batch[k] = card;
        }
        deckCards.append(...batch);
        appRoot.appendChild(deck);
    }
    container.appendChild(appRoot);
}

/**
 * THE REPETITION PROBE — the identical program over 321 prototypes instead of 4.
 *
 * It differs from `mountCloneRefs` by THREE ARRAY LOADS per instance and by which object each
 * `cloneNode` is called on, and by nothing else. See the prototype block above for what that
 * does and does not reproduce about a page whose structure never repeats.
 *
 * IT NEEDS ITS OWN DECLARATION where `clone·page` did not: the prototypes arrive out of arrays
 * rather than out of a `ProtoSet`, so there is no way to express it as the same function called
 * with a different argument.
 */
function mountCloneDistinctRefs(container: HTMLElement, refs: Node[]): void {
    const appRoot = D_APP.cloneNode(true) as Element;
    let at = 0;
    let dAt = 0;
    let gAt = 0;
    for (let dk = 0; dk < DECK_N; dk++) {
        const deck = D_DECKS[dk].cloneNode(true) as Element;
        const h2 = deck.firstChild as Element;
        const author = h2.nextSibling as Element;
        const date = author.nextSibling as Element;
        const ren = date.nextSibling as Element;
        const cards = ren.nextSibling as Element;
        const du = deckUserOf(dk);
        (h2.firstChild as Text).data = deckNameOf(dk, startDeckName(dk));
        (author.firstChild as Text).data = userNameOf(du);
        (date.firstChild as Text).data = dateTextOf(deckDateOf(dk), startChars(du));
        ren.addEventListener('click', NOOP);
        refs[at++] = h2.firstChild as Text;
        refs[at++] = date.firstChild as Text;
        for (let k = 0; k < CARDS_PER_DECK; k++) {
            const i = dk * CARDS_PER_DECK + k;
            const open = startsOpen(i);
            const n = startCount(i);
            const card = D_CARDS[i].cloneNode(true) as Element;
            const h3 = card.firstChild as Element;
            const title = h3.firstChild as Text;
            const user = h3.nextSibling as Element;
            const tog = user.nextSibling as Element;
            const tags = tog.nextSibling as Element;
            const count = tags.nextSibling as Element;
            const label = count.firstChild as Text;
            const addtag = count.nextSibling as Element;

            card.setAttribute('data-i', String(i));
            title.data = headlineOf(titleOf(i), open);
            (user.firstChild as Text).data = userNameOf(cardUserOf(i));
            refs[at++] = card;
            refs[at++] = title;
            refs[at++] = tog;
            refs[at++] = tags;
            refs[at++] = label;
            tog.addEventListener('click', NOOP);
            tog.setAttribute('aria-expanded', expandedOf(open));
            if (open) {
                const d = D_DETAILS[dAt++].cloneNode(true) as Element;
                card.insertBefore(d, tags);
                refs[at++] = d;
            }
            for (let t = 0; t < n; t++) {
                const tag = D_TAGS[gAt++].cloneNode(true) as Element;
                const text = tag.firstChild as Text;
                text.data = tagTextOf(POOL[t], startChars(tagUserOf(i, t)));
                tags.appendChild(tag);
                refs[at++] = text;
            }
            label.data = tagsLabel(n);
            addtag.addEventListener('click', NOOP);
            cards.appendChild(card);
        }
        appRoot.appendChild(deck);
    }
    container.appendChild(appRoot);
}

/**
 * SHALLOW CLONE — `cloneNode(false)` per element, children joined by hand.
 *
 * Compare it against `create+refs` and against nothing else: the two programs are the same
 * program with `SHALLOW.x.cloneNode(false)` where the other has `document.createElement(tag)`
 * followed by a `className` store. The insertion order, the text handling, the listener count
 * and the reference slots are identical.
 */
function mountShallowRefs(container: HTMLElement, refs: Node[]): void {
    const appRoot = SHALLOW.app.cloneNode(false) as Element;
    let at = 0;
    for (let dk = 0; dk < DECK_N; dk++) {
        const deck = SHALLOW.deck.cloneNode(false) as Element;
        const du = deckUserOf(dk);
        const h2 = SHALLOW.h2deck.cloneNode(false) as Element;
        const deckName = document.createTextNode(deckNameOf(dk, startDeckName(dk)));
        h2.appendChild(deckName);
        deck.appendChild(h2);
        const author = SHALLOW.author.cloneNode(false) as Element;
        author.textContent = userNameOf(du);
        deck.appendChild(author);
        const date = SHALLOW.date.cloneNode(false) as Element;
        const deckDate = document.createTextNode(dateTextOf(deckDateOf(dk), startChars(du)));
        date.appendChild(deckDate);
        deck.appendChild(date);
        const ren = SHALLOW.ren.cloneNode(false) as Element;
        ren.textContent = 'rename';
        ren.addEventListener('click', NOOP);
        deck.appendChild(ren);
        const deckCards = SHALLOW.cards.cloneNode(false) as Element;
        deck.appendChild(deckCards);
        refs[at++] = deckName;
        refs[at++] = deckDate;
        for (let k = 0; k < CARDS_PER_DECK; k++) {
            const i = dk * CARDS_PER_DECK + k;
            const open = startsOpen(i);
            const n = startCount(i);
            const card = SHALLOW.card.cloneNode(false) as Element;
            card.setAttribute('data-i', String(i));

            const h3 = SHALLOW.h3.cloneNode(false) as Element;
            const title = document.createTextNode(headlineOf(titleOf(i), open));
            h3.appendChild(title);
            card.appendChild(h3);

            const userEl = SHALLOW.user.cloneNode(false) as Element;
            userEl.textContent = userNameOf(cardUserOf(i));
            card.appendChild(userEl);

            const tog = SHALLOW.tog.cloneNode(false) as Element;
            tog.setAttribute('aria-expanded', expandedOf(open));
            tog.textContent = 'details';
            tog.addEventListener('click', NOOP);
            card.appendChild(tog);

            if (open) {
                const d = SHALLOW.details.cloneNode(false) as Element;
                d.textContent = 'details…';
                card.appendChild(d);
                refs[at++] = d;
            }

            const tags = SHALLOW.tags.cloneNode(false) as Element;
            card.appendChild(tags);
            refs[at++] = card;
            refs[at++] = title;
            refs[at++] = tog;
            refs[at++] = tags;
            for (let t = 0; t < n; t++) {
                const tag = SHALLOW.tag.cloneNode(false) as Element;
                const text = document.createTextNode(
                    tagTextOf(POOL[t], startChars(tagUserOf(i, t)))
                );
                tag.appendChild(text);
                tags.appendChild(tag);
                refs[at++] = text;
            }

            const count = SHALLOW.count.cloneNode(false) as Element;
            const label = document.createTextNode(tagsLabel(n));
            count.appendChild(label);
            card.appendChild(count);
            refs[at++] = label;

            const addtag = SHALLOW.addtag.cloneNode(false) as Element;
            addtag.textContent = '+';
            addtag.addEventListener('click', NOOP);
            card.appendChild(addtag);

            deckCards.appendChild(card);
        }
        appRoot.appendChild(deck);
    }
    container.appendChild(appRoot);
}

// ---------------------------------------------------------------------------------------
// THE COARSE FAMILY — 81 CLONES, THEN 1. BOTH ARE DATA-BAKED AND NEITHER IS A STRATEGY.
//
// THE WALK IS WHAT THEY TRADE FOR. A fine program reaches a port because it JUST CLONED the
// subtree the port is in — nine hops from a card it is holding. A coarse program holds one root
// and has to walk to all 640 of them through a tree it did not build piece by piece. So the
// ladder is not "fewer calls is better": it is per-call overhead against walk length, and which
// side wins is exactly what has never been measured here.
//
// THE ORDER OF A CARD'S CHILDREN IS `h3, tog, [details], tags, count, addtag`, so the walk BRANCHES
// on `startsOpen(i)` — the details block, when present, stands between the toggle and the tag list,
// which is where the schema's children port declares it and where `buildAppHtml` writes it. The
// `.count` span is AFTER the tag list and outside it, so it is reached by one `nextSibling` from
// `.tags` and the `.addtag` button by one more; nothing about the branch changed.
// ---------------------------------------------------------------------------------------

function mountAppClone(container: HTMLElement, tree: Element, refs: Node[]): void {
    const appRoot = tree.cloneNode(true) as Element;
    let at = 0;
    let deck = appRoot.firstChild as Element;
    for (let dk = 0; dk < DECK_N; dk++) {
        const h2 = deck.firstChild as Element;
        const author = h2.nextSibling as Element;
        const date = author.nextSibling as Element;
        const ren = date.nextSibling as Element;
        const deckCards = ren.nextSibling as Element;
        ren.addEventListener('click', NOOP);
        refs[at++] = h2.firstChild as Text;
        refs[at++] = date.firstChild as Text;
        let card = deckCards.firstChild as Element;
        for (let k = 0; k < CARDS_PER_DECK; k++) {
            const i = dk * CARDS_PER_DECK + k;
            const h3 = card.firstChild as Element;
            const title = h3.firstChild as Text;
            // The `<span class="user">` is BAKED into every coarse prototype — its text is
            // `userNameOf(cardUserOf(i))` and both the whole-app tree and the whole-card shapes were
            // prepared from the app's own data — so it costs this walk ONE `nextSibling` and, in every
            // coarse row but `app-clone·fill`, no fill. That row re-writes it like every other fill the
            // fine program pays, which is the whole of what it is for.
            const user = h3.nextSibling as Element;
            const tog = user.nextSibling as Element;
            let tags: Element;
            if (startsOpen(i)) {
                const d = tog.nextSibling as Element;
                tags = d.nextSibling as Element;
                refs[at++] = card;
                refs[at++] = title;
                refs[at++] = tog;
                refs[at++] = tags;
                refs[at++] = d;
            } else {
                tags = tog.nextSibling as Element;
                refs[at++] = card;
                refs[at++] = title;
                refs[at++] = tog;
                refs[at++] = tags;
            }
            const count = tags.nextSibling as Element;
            refs[at++] = count.firstChild as Text;
            tog.addEventListener('click', NOOP);
            const n = startCount(i);
            let tag = tags.firstChild as Element;
            for (let t = 0; t < n; t++) {
                refs[at++] = tag.firstChild as Text;
                tag = tag.nextSibling as Element;
            }
            (count.nextSibling as Element).addEventListener('click', NOOP);
            card = card.nextSibling as Element;
        }
        deck = deck.nextSibling as Element;
    }
    container.appendChild(appRoot);
}

/**
 * THE COARSE FAMILY'S NULL — a duplicated declaration of `mountAppClone` over its own
 * independently parsed 801-node tree. True difference from `mountAppClone`: ZERO.
 *
 * The fine family already had one (`clone·twin`) and the coarse family needs its own, because a
 * resolution floor measured on a 321-clone program is not the resolution floor of a 1-clone
 * program: they spend their time in different places and a null is only a null for the shape it
 * was taken on. The run reports both and reads every attribution against the LARGER.
 */
function mountAppCloneTwin(container: HTMLElement, tree: Element, refs: Node[]): void {
    const appRoot = tree.cloneNode(true) as Element;
    let at = 0;
    let deck = appRoot.firstChild as Element;
    for (let dk = 0; dk < DECK_N; dk++) {
        const h2 = deck.firstChild as Element;
        const author = h2.nextSibling as Element;
        const date = author.nextSibling as Element;
        const ren = date.nextSibling as Element;
        const deckCards = ren.nextSibling as Element;
        ren.addEventListener('click', NOOP);
        refs[at++] = h2.firstChild as Text;
        refs[at++] = date.firstChild as Text;
        let card = deckCards.firstChild as Element;
        for (let k = 0; k < CARDS_PER_DECK; k++) {
            const i = dk * CARDS_PER_DECK + k;
            const h3 = card.firstChild as Element;
            const title = h3.firstChild as Text;
            // The `<span class="user">` is BAKED into every coarse prototype — its text is
            // `userNameOf(cardUserOf(i))` and both the whole-app tree and the whole-card shapes were
            // prepared from the app's own data — so it costs this walk ONE `nextSibling` and, in every
            // coarse row but `app-clone·fill`, no fill. That row re-writes it like every other fill the
            // fine program pays, which is the whole of what it is for.
            const user = h3.nextSibling as Element;
            const tog = user.nextSibling as Element;
            let tags: Element;
            if (startsOpen(i)) {
                const d = tog.nextSibling as Element;
                tags = d.nextSibling as Element;
                refs[at++] = card;
                refs[at++] = title;
                refs[at++] = tog;
                refs[at++] = tags;
                refs[at++] = d;
            } else {
                tags = tog.nextSibling as Element;
                refs[at++] = card;
                refs[at++] = title;
                refs[at++] = tog;
                refs[at++] = tags;
            }
            const count = tags.nextSibling as Element;
            refs[at++] = count.firstChild as Text;
            tog.addEventListener('click', NOOP);
            const n = startCount(i);
            let tag = tags.firstChild as Element;
            for (let t = 0; t < n; t++) {
                refs[at++] = tag.firstChild as Text;
                tag = tag.nextSibling as Element;
            }
            (count.nextSibling as Element).addEventListener('click', NOOP);
            card = card.nextSibling as Element;
        }
        deck = deck.nextSibling as Element;
    }
    container.appendChild(appRoot);
}

/**
 * THE COARSE CLONE CHARGED THE FINE PROGRAM'S FILLS — the apples-to-apples rung.
 *
 * `app-clone` writes nothing, because the clone already carries every value. That makes its
 * distance from `clone+refs` two effects at once: 320 fewer clone-and-insert pairs, AND 600
 * fills that stopped happening — the card's five scalars (`data-i`, the headline, the user's name,
 * `aria-expanded`, the count label) and the 200 tag texts. This row re-writes every one of those
 * fills with the value that
 * is already there, so `app-clone·fill` vs `clone+refs` isolates the GRANULARITY alone and
 * `app-clone·fill` vs `app-clone` prices the fills alone.
 *
 * Re-writing an attribute that already holds the value does not move it in the serialisation, so
 * the output is byte-identical — which the gate proves rather than this comment asserting it.
 */
function mountAppCloneFill(container: HTMLElement, tree: Element, refs: Node[]): void {
    const appRoot = tree.cloneNode(true) as Element;
    let at = 0;
    let deck = appRoot.firstChild as Element;
    for (let dk = 0; dk < DECK_N; dk++) {
        const h2 = deck.firstChild as Element;
        const author = h2.nextSibling as Element;
        const date = author.nextSibling as Element;
        const ren = date.nextSibling as Element;
        const deckCards = ren.nextSibling as Element;
        ren.addEventListener('click', NOOP);
        refs[at++] = h2.firstChild as Text;
        refs[at++] = date.firstChild as Text;
        let card = deckCards.firstChild as Element;
        for (let k = 0; k < CARDS_PER_DECK; k++) {
            const i = dk * CARDS_PER_DECK + k;
            const open = startsOpen(i);
            const n = startCount(i);
            const h3 = card.firstChild as Element;
            const title = h3.firstChild as Text;
            // The `<span class="user">` is BAKED into every coarse prototype — its text is
            // `userNameOf(cardUserOf(i))` and both the whole-app tree and the whole-card shapes were
            // prepared from the app's own data — so it costs this walk ONE `nextSibling` and, in every
            // coarse row but `app-clone·fill`, no fill. That row re-writes it like every other fill the
            // fine program pays, which is the whole of what it is for.
            const user = h3.nextSibling as Element;
            const tog = user.nextSibling as Element;
            let tags: Element;
            if (open) {
                const d = tog.nextSibling as Element;
                tags = d.nextSibling as Element;
                refs[at++] = card;
                refs[at++] = title;
                refs[at++] = tog;
                refs[at++] = tags;
                refs[at++] = d;
            } else {
                tags = tog.nextSibling as Element;
                refs[at++] = card;
                refs[at++] = title;
                refs[at++] = tog;
                refs[at++] = tags;
            }
            const count = tags.nextSibling as Element;
            const label = count.firstChild as Text;
            refs[at++] = label;
            card.setAttribute('data-i', String(i));
            title.data = headlineOf(titleOf(i), open);
            (user.firstChild as Text).data = userNameOf(cardUserOf(i));
            tog.addEventListener('click', NOOP);
            tog.setAttribute('aria-expanded', expandedOf(open));
            let tag = tags.firstChild as Element;
            for (let t = 0; t < n; t++) {
                const text = tag.firstChild as Text;
                text.data = tagTextOf(POOL[t], startChars(tagUserOf(i, t)));
                refs[at++] = text;
                tag = tag.nextSibling as Element;
            }
            label.data = tagsLabel(n);
            (count.nextSibling as Element).addEventListener('click', NOOP);
            card = card.nextSibling as Element;
        }
        deck = deck.nextSibling as Element;
    }
    container.appendChild(appRoot);
}

/** Every port-bearing element of a card, in one grouped selector. See `mountAppCloneQsa`.
 *  `.count` is in it — the label is a port now — and it is listed where it stands in the tree,
 *  which is what makes the NodeList's document order match the walk below. */
const PORT_SELECTOR = 'h2,.date,.ren,.card,h3,.tog,.details,.tags,.tag,.count,.addtag';

/**
 * THE COARSE CLONE ADDRESSED BY SELECTOR INSTEAD OF BY WALK.
 *
 * ONE `querySelectorAll` WITH A GROUPED SELECTOR, not six calls: a NodeList comes back in
 * DOCUMENT ORDER, so a single grouped selector is one tree walk in C++ that returns every port
 * element in exactly the order a pre-order walk would meet them, and the JS side is an index
 * that only ever increments. Six separate calls would be six full tree walks for the same
 * answer, so the strong form is the one that is measured and the weak one is named in the
 * header's rejected list.
 *
 * The THREE Text ports still cost one hop each (`h3.firstChild`, `span.tag`'s and `span.count`'s)
 * — a selector cannot match a text node, and that is a real limit of the strategy rather than a
 * shortcut taken here.
 */
function mountAppCloneQsa(container: HTMLElement, tree: Element, refs: Node[]): void {
    const appRoot = tree.cloneNode(true) as Element;
    const all = appRoot.querySelectorAll(PORT_SELECTOR);
    let at = 0;
    let p = 0;
    for (let dk = 0; dk < DECK_N; dk++) {
        refs[at++] = all[p++].firstChild as Text;
        refs[at++] = all[p++].firstChild as Text;
        all[p++].addEventListener('click', NOOP);
        for (let k = 0; k < CARDS_PER_DECK; k++) {
            const i = dk * CARDS_PER_DECK + k;
            const card = all[p++];
            const h3 = all[p++];
            const tog = all[p++];
            const d = startsOpen(i) ? all[p++] : null;
            const tags = all[p++];
            refs[at++] = card;
            refs[at++] = h3.firstChild as Text;
            refs[at++] = tog;
            refs[at++] = tags;
            if (d !== null) refs[at++] = d;
            tog.addEventListener('click', NOOP);
            const n = startCount(i);
            for (let t = 0; t < n; t++) refs[at++] = all[p++].firstChild as Text;
            // `.count` comes after the tag rows and before `.addtag`, in document order, which is the
            // order this NodeList is in — so it is the next index and costs no search.
            refs[at++] = all[p++].firstChild as Text;
            all[p++].addEventListener('click', NOOP);
        }
    }
    container.appendChild(appRoot);
}

/**
 * THE MIDDLE RUNG — one clone per whole card, 81 clones a mount.
 *
 * Two fills survive at this granularity and no more: `data-i` and the HEADLINE. Everything else
 * about a card — its details block, its tag rows, its tag texts, its user's NAME, its
 * `aria-expanded` and its count label — is inside the clone, because all of those are functions of
 * the three numbers the shape key is built from. That is what makes it data-baked and what makes it
 * a rung rather than a technique.
 */
function mountCardClone(container: HTMLElement, refs: Node[]): void {
    const appRoot = P1.app.cloneNode(true) as Element;
    let at = 0;
    for (let dk = 0; dk < DECK_N; dk++) {
        const deck = P1.deck.cloneNode(true) as Element;
        const h2 = deck.firstChild as Element;
        const author = h2.nextSibling as Element;
        const date = author.nextSibling as Element;
        const ren = date.nextSibling as Element;
        const cards = ren.nextSibling as Element;
        const du = deckUserOf(dk);
        (h2.firstChild as Text).data = deckNameOf(dk, startDeckName(dk));
        (author.firstChild as Text).data = userNameOf(du);
        (date.firstChild as Text).data = dateTextOf(deckDateOf(dk), startChars(du));
        ren.addEventListener('click', NOOP);
        refs[at++] = h2.firstChild as Text;
        refs[at++] = date.firstChild as Text;
        for (let k = 0; k < CARDS_PER_DECK; k++) {
            const i = dk * CARDS_PER_DECK + k;
            const open = startsOpen(i);
            const card = CARD_SHAPE_AT[i].cloneNode(true) as Element;
            const h3 = card.firstChild as Element;
            const title = h3.firstChild as Text;
            // The `<span class="user">` is BAKED into every coarse prototype — its text is
            // `userNameOf(cardUserOf(i))` and both the whole-app tree and the whole-card shapes were
            // prepared from the app's own data — so it costs this walk ONE `nextSibling` and, in every
            // coarse row but `app-clone·fill`, no fill. That row re-writes it like every other fill the
            // fine program pays, which is the whole of what it is for.
            const user = h3.nextSibling as Element;
            const tog = user.nextSibling as Element;
            let tags: Element;
            if (open) {
                const d = tog.nextSibling as Element;
                tags = d.nextSibling as Element;
                refs[at++] = card;
                refs[at++] = title;
                refs[at++] = tog;
                refs[at++] = tags;
                refs[at++] = d;
            } else {
                tags = tog.nextSibling as Element;
                refs[at++] = card;
                refs[at++] = title;
                refs[at++] = tog;
                refs[at++] = tags;
            }
            const count = tags.nextSibling as Element;
            refs[at++] = count.firstChild as Text;
            // TWO FILLS AND NO MORE, and the user's name is deliberately not among them: the shape key
            // includes `cardUserOf(i)`, so the prototype this card was cloned from already carries the
            // right one of the five strings. Writing it again here would charge this rung a fill its
            // granularity bought it out of, which is the one thing the ladder must not do.
            card.setAttribute('data-i', String(i));
            title.data = headlineOf(titleOf(i), open);
            tog.addEventListener('click', NOOP);
            const n = startCount(i);
            let tag = tags.firstChild as Element;
            for (let t = 0; t < n; t++) {
                refs[at++] = tag.firstChild as Text;
                tag = tag.nextSibling as Element;
            }
            (count.nextSibling as Element).addEventListener('click', NOOP);
            cards.appendChild(card);
        }
        appRoot.appendChild(deck);
    }
    container.appendChild(appRoot);
}

// ---------------------------------------------------------------------------------------
// THE PROGRAMS, AS ONE TABLE. Every phase and every gate is read from this list, so a program
// cannot be gated and then measured through a different entry point.
// ---------------------------------------------------------------------------------------

interface Program {
    /** Row label. */
    readonly name: string;
    /** What it does, printed beside the number. */
    readonly what: string;
    /** Whether the tree it leaves behind has addressable ports a framework could use. */
    readonly addressable: boolean;
    /** Whether it retains a reference to every port after the mount returns. */
    readonly retains: boolean;
    /**
     * WHETHER ITS PROTOTYPES COULD HAVE BEEN BUILT WITHOUT SEEING THE APP'S DATA — the single
     * flag that separates a rung a renderer could adopt from a rung that is only a bound.
     *
     * `false` means the program's prepared markup contains something a RENDER computes: a
     * `data-i`, a title, a tag label, the presence of a details block. A framework is handed its
     * data after its templates are compiled, so it can never prepare those, and a program that
     * did is measuring a job nobody can be given.
     *
     * IT DOES NOT DISQUALIFY A ROW FROM BEING THE FLOOR. A cheaper program makes the headline
     * bound LARGER, i.e. weaker and still true. What it does is make the run print a SECOND,
     * tighter floor over the data-blind rows only, which is the number that says how close the
     * renderer is to the best thing a renderer could be.
     *
     * NOTE WHICH SIDE `html` FALLS ON: its string is built at module load out of `IDX`, `POOL`,
     * `startsOpen` and `startCount`, so the parser family is data-baked as well as
     * un-addressable. The original header called it un-addressable and stopped there.
     */
    readonly dataBlind: boolean;
    /**
     * The row this one is the retaining twin of, when it has one — `clone+refs`/`clone` and
     * `create+refs`/`create`. It is what the retention self-check subtracts, and it is a field
     * rather than a name comparison so that a rung added later cannot be silently matched to the
     * wrong partner.
     */
    readonly twinOf?: string;
    /**
     * WHETHER THIS ROW IS A RENDERER RATHER THAN A HAND-WRITTEN PROGRAM — the flag that keeps it
     * out of the floor set.
     *
     * A floor is the best a program with NO abstraction can do at this job; a renderer is the
     * thing being bounded. One row carries it — `exodra`, the app — and it may not be `reduce`d
     * into the headline.
     *
     * IT IS A FLAG AND NOT A NAME COMPARISON, and that is the whole point of adding it. `FAIR`
     * used to read `p.name !== 'exodra'`, so the day a second renderer row arrived it would have
     * been eligible to BE the floor — and a renderer row that won would silently rewrite the
     * published headline into "the renderer is 1.0× its own floor". A flag cannot be forgotten in
     * the same way: a row without it is claiming to be abstraction-free.
     */
    readonly renderer?: boolean;
    /**
     * Mount it into a fresh container; returns the disposer the scenario calls UNTIMED.
     *
     * `held` IS ALLOCATED IN THE UNTIMED PREP AND IS THE SINK. A `+refs` program pushes its
     * per-mount reference array into it, so nothing that array holds can be collected while the
     * timed region runs — `mount-phases`' rule, and here it is also what keeps the two `+refs`
     * rows honest against their twins: they must differ by ONE array allocation, `REF_SLOTS`
     * stores and ONE push, and by nothing else. Returning a fresh closure to hold the array
     * instead — which is what this did first — would have charged them for a closure their twins
     * never allocate, and that closure would have sat inside the very difference being priced.
     */
    readonly mount: (c: HTMLElement, held: Node[][]) => () => void;
}

/** Nothing to dispose: the tree dies with the container the scenario removes. ONE shared
 *  constant for the whole process, so a program that has nothing to undo allocates nothing. */
const NOTHING = (): void => undefined;

/** One retaining rung's boilerplate: the array is the exact final length and goes into the sink. */
function retaining(mount: (c: HTMLElement, refs: Node[]) => void): Program['mount'] {
    return (c, held) => {
        const refs = new Array<Node>(REF_SLOTS);
        held.push(refs);
        mount(c, refs);
        return NOTHING;
    };
}

const PROGRAMS: readonly Program[] = [
    // ── THE PARSER FAMILY. Five doors into the same parser; none of them leaves an
    //    addressable node behind, and all five are built from a string that already contains the
    //    app's data. Their value is a single answer for the whole family.
    {
        name: 'html',
        what:
            'container.innerHTML = one precomputed string — NOT a fair floor: no addressable ' +
            'node survives it, so nothing it builds can ever be updated',
        addressable: false,
        retains: false,
        dataBlind: false,
        mount: (c) => {
            mountHtml(c);
            return NOTHING;
        },
    },
    {
        name: 'html·adj',
        what: 'insertAdjacentHTML("beforeend", …) — the same parser, in the PAGE document, no adopt',
        addressable: false,
        retains: false,
        dataBlind: false,
        mount: (c) => {
            mountHtmlAdjacent(c);
            return NOTHING;
        },
    },
    {
        name: 'html·range',
        what: 'Range.createContextualFragment(…) then ONE appendChild — page-owned, no adopt',
        addressable: false,
        retains: false,
        dataBlind: false,
        mount: (c) => {
            mountHtmlRange(c);
            return NOTHING;
        },
    },
    {
        name: 'html·tpl',
        what: `template.innerHTML then appendChild(content) — moves ${ELEMENTS} nodes across documents`,
        addressable: false,
        retains: false,
        dataBlind: false,
        mount: (c) => {
            mountHtmlTemplate(c);
            return NOTHING;
        },
    },
    {
        name: 'html·doc',
        what: 'DOMParser.parseFromString — a whole Document per mount, then a cross-document adopt',
        addressable: false,
        retains: false,
        dataBlind: false,
        mount: (c) => {
            mountHtmlDocument(c);
            return NOTHING;
        },
    },

    // ── THE FINE CLONE FAMILY. 321 clones, four prototypes, everything a renderer could do.
    {
        name: 'clone',
        what: `${INSTANCES} cloneNode(true), straight-line walk, the same fills, the same inserts`,
        addressable: true,
        retains: false,
        dataBlind: true,
        mount: (c) => {
            mountClone(c, P1);
            return NOTHING;
        },
    },
    {
        name: 'clone·twin',
        what: 'THE NULL — a duplicated declaration of `clone` with its own prototypes. True Δ = 0',
        addressable: true,
        retains: false,
        dataBlind: true,
        mount: (c) => {
            mountCloneTwin(c, P2);
            return NOTHING;
        },
    },
    {
        name: 'clone+refs',
        what: `the same, plus ${REF_SLOTS} port references kept in ONE flat Node[]`,
        addressable: true,
        retains: true,
        dataBlind: true,
        twinOf: 'clone',
        mount: retaining((c, refs) => mountCloneRefs(c, P1, refs)),
    },
    {
        name: 'clone·page',
        what:
            'the same over PAGE-OWNED prototypes — the `document.importNode` line the compiler ' +
            'dropped, priced with nothing else in the frame',
        addressable: true,
        retains: true,
        dataBlind: true,
        mount: retaining((c, refs) => mountCloneRefs(c, P_PAGE, refs)),
    },
    {
        name: 'clone·frag',
        what: "the same, with the cards and each card's tags staged through a DocumentFragment",
        addressable: true,
        retains: true,
        dataBlind: true,
        mount: retaining((c, refs) => mountCloneFragRefs(c, P1, refs)),
    },
    {
        name: 'clone·append',
        what: 'the same, with the cards and the tags inserted through the variadic append(…)',
        addressable: true,
        retains: true,
        dataBlind: true,
        mount: retaining((c, refs) => mountCloneAppendRefs(c, P1, refs)),
    },
    {
        name: 'clone·shallow',
        what: `${ELEMENTS} cloneNode(false) and manual assembly — clone WITHOUT the deep copy`,
        addressable: true,
        retains: true,
        dataBlind: true,
        mount: retaining(mountShallowRefs),
    },
    {
        name: 'clone·distinct',
        what:
            `THE REPETITION PROBE — the identical program over ${INSTANCES} DISTINCT prototypes, ` +
            'each cloned exactly once, as a page whose structure never repeats would',
        addressable: true,
        retains: true,
        dataBlind: true,
        mount: retaining(mountCloneDistinctRefs),
    },

    // ── THE COARSE FAMILY. Fewer, bigger clones — and every one of them DATA-BAKED, so each is a
    //    bound and none is a technique. See the prototype block and caveat (F).
    {
        name: 'card-clone',
        what:
            `${1 + CARD_N} cloneNode(true) — one per whole card out of ${
                CARD_SHAPES.size
            } shapes ` +
            '— DATA-BAKED: the tag rows and the details block are inside the prototype',
        addressable: true,
        retains: true,
        dataBlind: false,
        mount: retaining(mountCardClone),
    },
    {
        name: 'app-clone',
        what:
            `ONE cloneNode(true) of the whole ${ELEMENTS}-element app, then a walk to all ` +
            `${REF_SLOTS} ports — DATA-BAKED: nothing is filled, the clone already carries it`,
        addressable: true,
        retains: true,
        dataBlind: false,
        mount: retaining((c, refs) => mountAppClone(c, APP_TREE_1, refs)),
    },
    {
        name: 'app-clone·twin',
        what: 'THE COARSE NULL — a duplicated declaration of `app-clone` with its own tree. True Δ = 0',
        addressable: true,
        retains: true,
        dataBlind: false,
        mount: retaining((c, refs) => mountAppCloneTwin(c, APP_TREE_2, refs)),
    },
    {
        name: 'app-clone·fill',
        what:
            "the coarse clone charged the fine program's fills — the rung that isolates " +
            'GRANULARITY from the fills that disappear with it',
        addressable: true,
        retains: true,
        dataBlind: false,
        mount: retaining((c, refs) => mountAppCloneFill(c, APP_TREE_1, refs)),
    },
    {
        name: 'app-clone·qsa',
        what: 'the coarse clone addressed by ONE grouped querySelectorAll instead of a walk',
        addressable: true,
        retains: true,
        dataBlind: false,
        mount: retaining((c, refs) => mountAppCloneQsa(c, APP_TREE_1, refs)),
    },

    // ── BUILDING WITHOUT A PROTOTYPE AT ALL.
    {
        name: 'create',
        what: `${ELEMENTS} document.createElement, the same fills, the same inserts`,
        addressable: true,
        retains: false,
        dataBlind: true,
        mount: (c) => {
            mountCreate(c);
            return NOTHING;
        },
    },
    {
        name: 'create+refs',
        what: `the same, plus ${REF_SLOTS} port references kept in ONE flat Node[]`,
        addressable: true,
        retains: true,
        dataBlind: true,
        twinOf: 'create',
        mount: retaining(mountCreateRefs),
    },

    {
        name: 'exodra',
        what: 'mountExodraApp — @exodra/core schemas through @exodra/dom, out of its built dist',
        addressable: true,
        retains: true,
        dataBlind: true,
        renderer: true,
        mount: (c) => mountExodraApp(c).teardown,
    },
    // ONE RENDERER ROW, AND IT IS THE WHOLE FIELD. Two more stood here — a WIRE spelling and an
    // IMPERATIVE MACHINE spelling of the same app — and both are gone: the wire form of the app was
    // deleted, and the rung that named it was calling the row above it. A renderer rung added here
    // carries `renderer: true` or it becomes eligible to BE the floor, and a floor is a program with
    // no abstraction in it.
];

/**
 * THE ROWS ELIGIBLE TO BE THE FLOOR: addressable AND retaining AND not a renderer. The floor is
 * the MINIMUM over this set and is never named in advance — if a rung added later beats
 * `clone+refs`, the headline recomputes from it without a line of this file changing.
 *
 * THE THIRD TEST USED TO BE `p.name !== 'exodra'` and that was a hazard waiting for a second
 * renderer row. See `Program.renderer`.
 */
const FAIR = PROGRAMS.filter((p) => p.addressable && p.retains && p.renderer !== true);

/** The renderer rows — bounded by the floor, never part of it. */
const RENDERERS = PROGRAMS.filter((p) => p.renderer === true);

/** The subset of those a renderer could actually be — the tighter, more useful floor. */
const ADOPTABLE = FAIR.filter((p) => p.dataBlind);

/** The un-addressable rows: they bound the DOM WORK, and they bound nothing about a framework. */
const DOM_WORK = PROGRAMS.filter((p) => !p.addressable);

// ---------------------------------------------------------------------------------------
// THE GATES. Nothing is timed until every program has been shown to build the REFERENCE APP'S
// TREE, byte for byte, through the same `markupOf` the rest of the suite gates with.
//
// This is the gate without which the axis is worthless: a floor that emits one element fewer is a
// floor for a different job, and it would produce a perfectly plausible ratio.
// ---------------------------------------------------------------------------------------

/**
 * THE ASSUMPTIONS THE ADDED RUNGS ARE BUILT ON, CHECKED RATHER THAN COMMENTED.
 *
 * Both of these would otherwise fail QUIETLY and plausibly. A whole-app prototype that parsed to
 * the wrong element count would still produce a tree and would still be timed; a card with five
 * tags would fall off the end of `clone·append`'s four arms and simply lose a tag. The markup
 * gate catches both after the fact, but it catches them as "different tree" with no clue why, and
 * the point of a gate is that it names its own failure.
 */
function gateAddedRungs(): void {
    const coarseN = APP_TREE_1.querySelectorAll('*').length + 1;
    if (coarseN !== ELEMENTS) {
        throw new Error(
            `mount-floor: the whole-app prototype parsed to ${coarseN} elements where the app has ` +
                `${ELEMENTS} — the coarse rungs would be cloning a different tree from the one ` +
                'every other row builds, and their walk would land on the wrong nodes'
        );
    }
    for (const i of IDX) {
        const n = startCount(i);
        if (n >= 1 && n <= 4) continue;
        throw new Error(
            `mount-floor: card ${i} starts with ${n} tags, outside 1..4 — \`clone·append\` is ` +
                'written as four total arms with no array allocation, and a fifth count would ' +
                'make it silently drop tags. Widen the arms in the same change that widens POOL.'
        );
    }
    line(
        `gate mount-floor: whole-app prototype ${coarseN} elements, ${CARD_SHAPES.size} distinct ` +
            `whole-card shapes over ${CARD_N} cards, ${INSTANCES} distinct prototypes for the ` +
            `repetition probe, tags per card within 1..4`
    );
}

function gateMarkupAgainstReference(): string {
    const ref = el();
    const refApp = mountExodraApp(ref);
    const want = markupOf(ref);
    const wantN = ref.querySelectorAll('*').length;
    refApp.teardown();
    ref.remove();

    if (wantN !== ELEMENTS) {
        throw new Error(
            `mount-floor: the reference app mounted ${wantN} elements where the spec says ` +
                `${ELEMENTS} (1 app + ${CARD_N}×${CARD_ELEMENTS} card + ${DETAILS_N} details + ` +
                `${TAG_N} tags) — ` +
                'the census this axis normalises by does not describe the app it is measuring'
        );
    }
    line(
        `gate mount-floor: reference = mountExodraApp — ${wantN} elements ` +
            `(${FRAME_ELEMENTS} in the frame, ${DETAILS_N + TAG_N} children), ` +
            `${want.length} chars, ${INSTANCES} instances`
    );

    for (const p of PROGRAMS) {
        if (p.name === 'exodra') continue;
        const c = el();
        const dispose = p.mount(c, []);
        const got = markupOf(c);
        const gotN = c.querySelectorAll('*').length;
        dispose();
        c.remove();
        if (got !== want) {
            let at = 0;
            while (at < want.length && at < got.length && want[at] === got[at]) at++;
            const from = Math.max(0, at - 80);
            refuse(
                `mount-floor: "${p.name}" builds a DIFFERENT tree from the reference — ` +
                    `${wantN} elements (exodra) / ${gotN} elements (${p.name}), first difference ` +
                    `at char ${at}\n` +
                    `  exodra    : …${want.slice(from, at + 160)}…\n` +
                    `  ${p.name.padEnd(10)}: …${got.slice(from, at + 160)}…`
            );
            throw new Error(
                `mount-floor: "${p.name}" does not produce the app's DOM (${wantN} vs ${gotN} ` +
                    `elements, first difference at char ${at}) — it is a floor for a different ` +
                    'job, and the ratio below would be a comparison of two different programs'
            );
        }
        line(
            `gate mount-floor: "${p.name}" — byte-identical to the reference, ${gotN} elements, ` +
                `${got.length} chars`
        );
    }
    return want;
}

/**
 * WHETHER THIS FILE'S PROTOTYPES ARE THE RENDERER'S — REPORTED, NOT ENFORCED. See caveat (D).
 *
 * A difference here does not invalidate anything (the final markup is gated properly and that is
 * what must match), but it is the first thing to look at if the clone rows read oddly: a prototype
 * carrying one attribute more, or one Text node fewer, is a different clone at 321 clones a mount.
 */
function protoReport(): string[] {
    const rows: Array<[string, Element, Element]> = [
        ['APP', P1.app, exoDomSchemaOf(APP, EXO_BACKEND).proto as Element],
        ['CARD', P1.card, exoDomSchemaOf(CARD, EXO_BACKEND).proto as Element],
        ['DETAILS', P1.details, exoDomSchemaOf(DETAILS, EXO_BACKEND).proto as Element],
        ['TAG', P1.tag, exoDomSchemaOf(TAG, EXO_BACKEND).proto as Element],
    ];
    const lines: string[] = [];
    for (const [name, mine, theirs] of rows) {
        const a = mine.outerHTML;
        const b = theirs.outerHTML;
        const nodesOf = (e: Element): number => e.querySelectorAll('*').length + 1;
        lines.push(
            `  ${name.padEnd(8)} ${a === b ? 'same tree' : 'DIFFERENT'}  ` +
                `floor ${nodesOf(mine)} elements, page-owned=${
                    mine.ownerDocument === document
                }  |  ` +
                `dom ${nodesOf(theirs)} elements, page-owned=${theirs.ownerDocument === document}`
        );
        if (a !== b) {
            lines.push(`    floor  ${a}`);
            lines.push(`    dom    ${b}`);
        }
    }
    return lines;
}

// ---------------------------------------------------------------------------------------
// THE CLOCK, OBSERVED — copied from `teardown-phases`, which copied it from `toggle`, where the same clamp made a whole axis print the timer thirteen
// times. Spin until the clock moves and keep the SMALLEST step it ever takes.
// ---------------------------------------------------------------------------------------

function observeTimerQuantum(): number {
    let smallest = Infinity;
    for (let s = 0; s < 100; s++) {
        const t0 = performance.now();
        let t1 = performance.now();
        while (t1 === t0) t1 = performance.now();
        const step = t1 - t0;
        if (step > 0 && step < smallest) smallest = step;
    }
    return smallest === Infinity ? 0.1 : smallest;
}

/** How many quanta ONE TIMED REGION must clear for its digits to be measurement, not rounding. */
const MIN_TICKS = 3;

// ---------------------------------------------------------------------------------------
// THE RUNNER — `abBench`'s sampling with a repetition factor per phase and the medians handed back.
// Identical in shape to `import-node-trade`'s, for its reason: this
// run reports DIFFERENCES and RATIOS, where `abBench` prints medians and returns a ranking.
// ---------------------------------------------------------------------------------------

interface Stat {
    min: number;
    p25: number;
    median: number;
    p75: number;
    max: number;
}

function stat(xs: number[]): Stat {
    const s = [...xs].sort((a, b) => a - b);
    const q = (p: number): number => s[Math.min(s.length - 1, Math.floor(s.length * p))];
    return { min: s[0], p25: q(0.25), median: q(0.5), p75: q(0.75), max: s[s.length - 1] };
}

function gcIfPossible(): void {
    const gc = (globalThis as { gc?: () => void }).gc;
    if (gc) {
        gc();
        gc();
    }
}

interface Phase {
    readonly name: string;
    readonly reps: number;
    readonly what: string;
    readonly prep: () => Scenario;
}

function sampleOnce(phase: Phase): number {
    const reps = phase.reps;
    const scenarios: Scenario[] = [];
    for (let b = 0; b < reps; b++) scenarios.push(phase.prep());
    gcIfPossible();
    const t0 = performance.now();
    for (let b = 0; b < reps; b++) scenarios[b].measure();
    const dt = performance.now() - t0;
    for (let b = 0; b < reps; b++) scenarios[b].cleanup();
    return dt / reps;
}

/**
 * THE SERIES COME BACK, NOT JUST THE MEDIANS — see `pairedNull`.
 *
 * A difference of two medians is a BIAS and it is the wrong number on its own: two rows can
 * agree to four decimal places on their medians while disagreeing by ten times that on every
 * individual round, and the first run of this axis printed exactly that — a resolution floor of
 * `0.0000`, which is not "the instrument is perfect", it is "the two halves of the null cancelled
 * at the median and the run has no idea how far apart they were on the way there".
 */
function runPhases(phases: readonly Phase[], rounds: number): Map<string, number[]> {
    for (let w = 0; w < 6; w++) for (const p of phases) sampleOnce(p);

    const times = new Map<string, number[]>();
    for (const p of phases) times.set(p.name, []);
    for (let r = 0; r < rounds; r++) {
        const shift = r % phases.length;
        const forward = (r & 1) === 0;
        for (let k = 0; k < phases.length; k++) {
            const at = forward
                ? (k + shift) % phases.length
                : (shift + phases.length - 1 - k) % phases.length;
            const p = phases[at];
            (times.get(p.name) as number[]).push(sampleOnce(p));
        }
    }
    return times;
}

/**
 * WHAT THIS INSTRUMENT RETURNS WHEN THE TRUE DIFFERENCE IS ZERO, in two numbers rather than one.
 *
 *   bias   |median(a) − median(b)|. What a systematic difference between two rows would have to
 *          clear. This is what the axis printed before, and on its own it is optimistic: the two
 *          medians are free to cancel.
 *   noise  the MEDIAN of the per-round |a_r − b_r|, and its p90. The two halves of a null are
 *          sampled in the same round, adjacent in the rotation, so this is the round-to-round
 *          scatter that ANY comparison of two rows in this table carries — including the ones
 *          that are not nulls. It cannot cancel, and it is the honest resolution.
 *
 * The run reads every attribution against `max(bias, noise)`, which is never smaller than what it
 * used before and is usually much more informative.
 */
interface Null {
    readonly bias: number;
    readonly noise: number;
    /** The upper quartile of the same per-round |a−b| — how bad a single round's read can be. */
    readonly noiseP75: number;
    readonly worst: number;
    readonly resolution: number;
}

function pairedNull(a: number[], b: number[]): Null {
    const n = Math.min(a.length, b.length);
    const diffs: number[] = new Array<number>(n);
    for (let r = 0; r < n; r++) diffs[r] = Math.abs(a[r] - b[r]);
    const d = stat(diffs);
    const bias = Math.abs(stat(a).median - stat(b).median);
    return {
        bias,
        noise: d.median,
        noiseP75: d.p75,
        worst: d.max,
        resolution: Math.max(bias, d.median),
    };
}

/** Repetitions per timed region. 20 mounts of a 0.1-0.45 ms program is 2-9 ms — 20-90 ticks. */
const MOUNT_REPS = 20;

// ---------------------------------------------------------------------------------------

export function benchmarkMountFloor(rounds = 100, batch = 1): void {
    const f = (x: number): string => x.toFixed(4);
    // SIX DECIMALS FOR THE NULLS ONLY. Four is right for a row that takes a fifth of a
    // millisecond and wrong for a quantity whose whole job is to be small: the first run printed
    // its resolution floor as `0.0000`, which says nothing at all.
    const f6 = (x: number): string => x.toFixed(6);
    const sign = (x: number): string => (x >= 0 ? `+${x.toFixed(4)}` : x.toFixed(4));
    const pct = (x: number, of: number): string => `${((x / of) * 100).toFixed(1)}%`;

    const quantum = observeTimerQuantum();
    line(
        `mount-floor: observed timer quantum (${quantum.toFixed(3)} ms) — every timed region ` +
            `below must clear ${(MIN_TICKS * quantum).toFixed(3)} ms (${MIN_TICKS}×) or its ` +
            'digits are quantisation, and the run says so by name'
    );

    // ── GATES ───────────────────────────────────────────────────────────────────────────
    gateAddedRungs();
    gateMarkupAgainstReference();
    line('');
    line("THE PROTOTYPES — this file's against @exodra/dom's. Reported, not enforced (caveat D)");
    for (const l of protoReport()) line(l);

    line('');
    line("CENSUS — read off the app's spec, nothing measured");
    line(
        `  instances a mount builds     ${INSTANCES}  (1 app + ${CARD_N} cards + ` +
            `${DETAILS_N} details + ${TAG_N} tags)`
    );
    line(
        `  elements in the finished DOM ${ELEMENTS}  (${FRAME_ELEMENTS} frame + ` +
            `${DETAILS_N + TAG_N} children)`
    );
    line(
        `  port fills per mount         ${CARD_N * 7 + TAG_N}  (${CARD_N} data-i + ` +
            `${CARD_N} headlines + ${CARD_N} user names + ${CARD_N} aria-expanded + ` +
            `${CARD_N} count labels + ${CARD_N * 2} listeners + ${TAG_N} tag texts)`
    );
    line(
        `  references the +refs rows keep ${REF_SLOTS}  (${CARD_N}×5 card + ${TAG_N} tag text + ` +
            `${DETAILS_N} details)`
    );
    line(`  precomputed HTML string      ${APP_HTML.length} chars`);
    line(
        `  programs measured            ${PROGRAMS.length}  (${DOM_WORK.length} parser doors, ` +
            `${FAIR.length} addressable+retained of which ${ADOPTABLE.length} are data-blind, ` +
            `2 nulls, 2 un-retained controls, ${RENDERERS.length} renderers)`
    );
    line(
        `  prototypes at module load    4 fine + ${CARD_SHAPES.size} whole-card + 1 whole-app ` +
            `(${ELEMENTS} elements) + ${INSTANCES} distinct + 4 page-owned + 9 shallow — all of ` +
            'it outside every timed region, and NOT equal across rows (caveat H)'
    );
    // WHAT THE APP COST TO WRITE, FOR THE ONE ROW HERE THAT IS AN APP, printed as a census line
    // and NOT as a table column. This axis's table is read back by the recorder's shape ladder,
    // and one more number on a row would shift every statistic on it by a place — the failure that
    // once put nanoseconds in `p75` in a published file.
    //
    // AND IT IS ONE ROW OF MANY BY CONSTRUCTION. Every other program in this table is a
    // straight-line mount written INSIDE THIS FILE, between the prose that argues it; there is no
    // app file to count and none is invented. That the floor programs cannot be counted the way the
    // renderer is counted is a real gap in what this axis can say, and it is stated rather than
    // filled with a number nobody could check.
    const exodraLines = appLinesOf('exodra');
    line(
        `  app LOC (exodra)             ${exodraLines === null ? '—' : exodraLines}  ` +
            "(lines of the renderer's app that carry code, comments and blank lines excluded, " +
            'counted from source over the files `app-files.ts` lists — the floor programs in this ' +
            'file are not counted, see the note above this line)'
    );

    // ── THE PHASES ──────────────────────────────────────────────────────────────────────
    const reps = MOUNT_REPS * batch;
    const phases: Phase[] = PROGRAMS.map((p) => ({
        name: p.name,
        reps,
        what: p.what,
        prep: (): Scenario => {
            const c = el();
            // THE SINK, allocated untimed. See `Program.mount`.
            const held: Node[][] = [];
            let dispose: () => void;
            return {
                measure: () => {
                    dispose = p.mount(c, held);
                },
                cleanup: () => {
                    dispose();
                    c.remove();
                },
            };
        },
    }));

    const series = runPhases(phases, rounds);
    const seriesOf = (name: string): number[] => series.get(name) as number[];
    const stats = new Map<string, Stat>();
    for (const p of phases) stats.set(p.name, stat(seriesOf(p.name)));
    const median = (name: string): number => (stats.get(name) as Stat).median;

    // ── THE RAW TABLE ───────────────────────────────────────────────────────────────────
    line('');
    line(
        `MOUNT FLOOR — the 80-card app, ${ELEMENTS} elements [ms per mount] · interleaved · ` +
            `${rounds} rounds · batch ${batch} · ${reps} mounts per timed region · GC before every ` +
            'timed region'
    );
    line('                     reps   min      p25      median   p75      max');
    for (const p of phases) {
        const s = stats.get(p.name) as Stat;
        line(
            `${p.name.padEnd(17)}${String(p.reps).padStart(6)}   ${f(s.min)}   ${f(s.p25)}   ` +
                `${f(s.median)}   ${f(s.p75)}   ${f(s.max)}`
        );
    }
    line('');
    for (const p of phases) line(`  ${p.name.padEnd(15)} ${p.what}`);

    // ── THE RESOLUTION FLOOR, FROM TWO CONTROLS WHOSE TRUE VALUE IS ZERO ─────────────────
    //
    // TWO NULLS, ONE PER FAMILY, because a null is only a null for the shape it was taken on: a
    // 321-clone program and a 1-clone-plus-long-walk program spend their time in different places
    // and there is no reason their round-to-round scatter should be the same. Everything below is
    // read against the LARGER of the two, which is the honest thing to do when the instrument
    // resolves one family better than the other.
    const fineNull = pairedNull(seriesOf('clone'), seriesOf('clone·twin'));
    const coarseNull = pairedNull(seriesOf('app-clone'), seriesOf('app-clone·twin'));
    const resolution = Math.max(fineNull.resolution, coarseNull.resolution);

    const exodra = median('exodra');
    const html = median('html');
    const create = median('create');
    const cloneA = median('clone');
    const cloneRefs = median('clone+refs');
    const createRefs = median('create+refs');
    const appClone = median('app-clone');
    const appCloneFill = median('app-clone·fill');
    const cloneDistinct = median('clone·distinct');
    const clonePage = median('clone·page');

    line('');
    line('THE CONTROL — what this run resolved, from two pairs of duplicated declarations');
    line('  null            bias      noise     p75       worst     what it is');
    const nullRow = (name: string, n: Null, what: string): void =>
        line(
            `  ${name.padEnd(14)}${f6(n.bias)}  ${f6(n.noise)}  ${f6(n.noiseP75)}  ` +
                `${f6(n.worst)}  ${what}`
        );
    nullRow('clone', fineNull, '|clone − clone·twin|, true Δ = 0');
    nullRow('app-clone', coarseNull, '|app-clone − app-clone·twin|, true Δ = 0');
    line(
        '  BIAS is the difference of the two medians and NOISE is the median of the per-round ' +
            '|a−b|. The first run of this axis printed bias alone, at four decimals, and got ' +
            '0.0000 — which reads as "the instrument is perfect" and means "the two halves ' +
            'cancelled at the median". Noise cannot cancel, and it is the scatter every ' +
            'comparison in this table carries, null or not.'
    );
    line(
        `  RESOLUTION FLOOR      ${f6(resolution)} ms = max(bias, noise) over both families, ` +
            `${pct(resolution, exodra)} of a mount. Read every figure below against this and ` +
            'not against zero; anything smaller is what this instrument returns when nothing ' +
            'is there.'
    );

    // ── THE FLOOR, AND THE GAP ──────────────────────────────────────────────────────────
    //
    // THE FLOOR IS THE MINIMUM OVER THE FAIR PROGRAMS, not whichever one this file likes: a floor
    // is the best a program can do at the job, so if `create+refs` beats `clone+refs` then the
    // floor is `create+refs` and the clone strategy was not the cheapest way to build this tree.
    // NOTHING BELOW NAMES A WINNER IN ADVANCE — every rung is chosen by `reduce` over a median.
    const cheapest = (rows: readonly Program[]): { name: string; v: number } =>
        rows
            .map((p) => ({ name: p.name, v: median(p.name) }))
            .reduce((a, b) => (b.v < a.v ? b : a));

    const fairRows = FAIR.map((p) => ({ name: p.name, v: median(p.name) }));
    const best = cheapest(FAIR);
    const floorMs = best.v;
    const bestIsBaked = !(FAIR.find((p) => p.name === best.name) as Program).dataBlind;

    const adopt = cheapest(ADOPTABLE);
    const adoptMs = adopt.v;
    const domWork = cheapest(DOM_WORK);

    const ratio = floorMs === 0 ? Infinity : exodra / floorMs;
    const adoptRatio = adoptMs === 0 ? Infinity : exodra / adoptMs;
    const headroom = exodra === 0 ? 0 : (1 - floorMs / exodra) * 100;
    const adoptHeadroom = exodra === 0 ? 0 : (1 - adoptMs / exodra) * 100;
    const htmlHeadroom = exodra === 0 ? 0 : (1 - html / exodra) * 100;

    line('');
    line('THE GAP — @exodra/dom against every program that produces this DOM without abstraction');
    line('  row               ms        vs exodra   vs floor   what it is');
    for (const p of PROGRAMS) {
        const v = median(p.name);
        const rel = exodra === 0 ? '—' : `${(v / exodra).toFixed(3)}×`;
        const vsFloor = floorMs === 0 || p.name === 'exodra' ? '—' : `${(v / floorMs).toFixed(3)}×`;
        const kind =
            p.name === 'exodra'
                ? 'the renderer'
                : p.renderer === true
                ? 'THE SAME RENDERER WRITING DIRECTLY — its own ceiling, NOT a floor for anything'
                : !p.addressable
                ? 'DOM-work only — un-addressable AND data-baked, NOT a floor for anything'
                : !p.retains
                ? 'addressable but not retained — an under-bound of a fair floor'
                : p.dataBlind
                ? 'A FAIR FLOOR: addressable, retained, and buildable without the data'
                : 'a BOUND only: addressable and retained, but its prototype contains the data';
        line(
            `  ${p.name.padEnd(15)} ${f(v)}   ${rel.padStart(9)}   ${vsFloor.padStart(8)}   ${kind}`
        );
    }

    line('');
    line(
        `  THE FLOOR IS "${best.name}" at ${f(floorMs)} ms — the cheapest of the ` +
            `${fairRows.length} programs that produce this DOM AND leave every port addressable ` +
            'and retained. It is chosen by minimum over that set and by nothing else.'
    );
    line(
        `  THE ADOPTABLE FLOOR IS "${adopt.name}" at ${f(adoptMs)} ms — the cheapest of the ` +
            `${ADOPTABLE.length} of those whose prototypes could have been built WITHOUT the ` +
            "app's data, which is the only kind of program a renderer could ever be."
    );
    if (bestIsBaked) {
        line(
            `  THOSE ARE DIFFERENT ROWS, AND THAT IS THE FINDING: "${best.name}" is ` +
                `${(((adoptMs - floorMs) / floorMs) * 100).toFixed(1)}% under "${adopt.name}", ` +
                'and every millisecond of that difference is bought with data baked into a ' +
                'prototype at module load. A framework is handed its data AFTER its templates ' +
                'are compiled, so it cannot buy any of it. The headline below still uses the ' +
                'lower number, because a lower floor makes the bound WEAKER and therefore safer ' +
                '— it is not a target and must never be quoted as one.'
        );
    } else {
        line(
            `  THEY ARE THE SAME ROW: the cheapest program that produces this DOM addressably ` +
                'is one a renderer could actually have been, so the bound and the target coincide.'
        );
    }
    line(
        `  the DOM work alone    ${f(domWork.v)} ms ("${domWork.name}") — the cheapest of the ` +
            `${DOM_WORK.length} parser doors. It bounds what it costs this browser to have these ` +
            'bytes become these nodes, and it bounds nothing about a framework: no addressable ' +
            'node survives any of them.'
    );
    line(
        `  gap                   ${sign(exodra - floorMs)} ms per mount to the floor ` +
            `(${ratio.toFixed(3)}×), ${sign(exodra - adoptMs)} ms to the adoptable floor ` +
            `(${adoptRatio.toFixed(3)}×)`
    );

    // ── WHAT THE GAP IS MADE OF — WITHDRAWN, BECAUSE IT SUBTRACTED A ROW FROM ITSELF ────
    //
    // IT PRINTED THREE TERMS — ENGINE, IDIOM and SHAPE — out of `exodra·direct`, `exodra` and
    // `exodra·machineDirect`. TWO OF THOSE RUNGS CALLED THE SAME `mountExodraApp` and the third
    // had already been deleted, so `median()` was being asked for a name no program carried. The
    // split was arithmetic over one number and a hole, and no reading of it meant anything.
    //
    // WHAT IS LEFT IS THE UNDECOMPOSED GAP, printed above: how far the renderer sits over a
    // program with no abstraction. Splitting it again needs a SECOND Exodra program that genuinely
    // does less — not a second name for the first one — gated byte for byte like every rung here.

    // ── THE SENTENCE THIS AXIS EXISTS TO PRODUCE ────────────────────────────────────────
    line('');
    line(
        `ANSWER — NO FRAMEWORK CAN BE MORE THAN ${headroom.toFixed(1)}% FASTER THAN @exodra/dom ` +
            `AT MOUNTING THIS APP, because ${headroom.toFixed(1)}% is all that is left above the ` +
            `floor: ${f(exodra)} ms against ${f(floorMs)} ms for a straight-line program with no ` +
            'components, no declaration, no reactivity, no schema, no connector and no library, ' +
            'producing byte-identical DOM with every port addressable and retained. A rival that ' +
            "deleted ALL of its own abstraction and none of the browser's work would land there " +
            `and no lower. Read it against this run's resolution floor (${f(resolution)} ms, ` +
            `${pct(
                resolution,
                exodra
            )} of the mount) and against every line of "WHAT THIS NUMBER ` +
            'DOES NOT BOUND" in this file\'s header — it covers MOUNTING THIS APP ON THIS MACHINE ' +
            'and nothing else: not updates, not teardown, not memory, not hydration, not another ' +
            'shape.'
    );
    line(
        `  AND THE TIGHTER ONE: no framework that is handed its data at render time — which is ` +
            `every framework — can be more than ${adoptHeadroom.toFixed(1)}% faster, because ` +
            `"${adopt.name}" at ${f(adoptMs)} ms is the cheapest such program in this table. ` +
            `${
                bestIsBaked
                    ? `The ${headroom.toFixed(1)}% above is the weaker, safer bound and includes ` +
                      "rows whose prototypes were built out of the app's own data. THIS is the " +
                      'number to quote at anybody claiming they could do better.'
                    : 'The two coincide in this run.'
            }`
    );
    // THIS LINE USED TO CALL `html` A LOWER BOUND — "NOTHING can produce these 801 elements faster
    // than that in this browser" — and the table above it disproved that on the first run: `clone`
    // came in FASTER. The parser crossing is not the cheapest way to build this tree, which was
    // falsifier (c) and it fired. So the sentence is now written from the comparison rather than
    // from the assumption, and it says which way round they actually landed.
    line(
        `  one innerHTML crossing   ${f(html)} ms, ${htmlHeadroom.toFixed(
            1
        )}% under the renderer ` +
            `and ${(((html - floorMs) / floorMs) * 100).toFixed(1)}% ${
                html > floorMs ? 'ABOVE' : 'below'
            } the floor. A precomputed string handed to the parser in ONE crossing ` +
            (html > floorMs
                ? 'is NOT the cheapest way to produce this DOM — cloning beats it. Whatever the ' +
                  'parser saves on call count, it pays back somewhere this axis does not open.'
                : 'is the cheapest way to produce this DOM, cheaper even than cloning.') +
            ' Either way it is not a floor for a RENDERER: the tree it makes has no addressable ' +
            'node in it, so nothing built that way could ever be updated.'
    );

    // ── THE PARSER FAMILY, ANSWERED ONCE ────────────────────────────────────────────────
    //
    // Five doors, one verdict. If they land together the family has ONE answer and this question
    // never has to be re-opened door by door; if they scatter, the door matters more than the
    // parser does and that is worth knowing on its own.
    line('');
    line('THE PARSER FAMILY — five doors into the same parser, on the same precomputed string');
    for (const p of DOM_WORK) {
        const v = median(p.name);
        line(
            `  ${p.name.padEnd(15)} ${f(v)}   ${sign(v - domWork.v)} vs the family's best, ` +
                `${(((v - floorMs) / floorMs) * 100).toFixed(1)}% vs the floor`
        );
    }
    const parserSpread = Math.max(...DOM_WORK.map((p) => median(p.name))) - domWork.v;
    line(
        `  spread ${f(parserSpread)} ms across the family (${(parserSpread / resolution).toFixed(
            1
        )}× the resolution floor). ` +
            (domWork.v > floorMs
                ? 'EVERY door is above the fair floor, so the answer for the whole family is the ' +
                  'same as the answer for `html`: the parser is not the cheap path to this DOM, ' +
                  'and no door changes that.'
                : 'At least one door is BELOW the fair floor — the parser IS the cheap path to ' +
                  'these bytes, and the fair floor pays for addressability on top of it.') +
            ' The two doors that move nodes across documents (`html·tpl`, `html·doc`) pay a ' +
            `${ELEMENTS}-node adopt walk the other three do not.`
    );

    // ── THE GRANULARITY LADDER — THE SUBSTANCE OF "IS CLONING TOP" ──────────────────────
    //
    // Four programs at constant node count and byte-identical output, differing only in how many
    // calls the 801 elements arrive through. Everything below 321 is data-baked and therefore a
    // bound rather than a technique — but the SHAPE of the curve is what says whether a mount is
    // spending its time in per-call overhead or in the work the calls do.
    const ladder: Array<[string, number, string]> = [
        ['create+refs', 0, `${ELEMENTS} createElement`],
        [
            'clone+refs',
            INSTANCES,
            `${INSTANCES} cloneNode(true) from 4 shapes — the COARSEST data-blind rung`,
        ],
        ['card-clone', 1 + CARD_N, `${1 + CARD_N} cloneNode(true) from ${CARD_SHAPES.size} shapes`],
        ['app-clone·fill', 1, "1 cloneNode(true), the fine program's fills still paid"],
        ['app-clone', 1, '1 cloneNode(true), no fills at all'],
    ];
    line('');
    line(`THE GRANULARITY LADDER — same ${ELEMENTS} nodes, same bytes, fewer and bigger calls`);
    for (const [name, calls, what] of ladder) {
        const v = median(name);
        line(
            `  ${name.padEnd(15)} ${f(v)}   ${sign(v - cloneRefs)} vs clone+refs   ` +
                `${String(calls).padStart(3)} clones   ${what}`
        );
    }
    const monotone =
        appClone <= appCloneFill && appCloneFill <= cloneRefs && cloneRefs <= createRefs;
    line(
        `  monotone in call count: ${monotone ? 'YES' : 'NO'}. ` +
            (monotone
                ? 'Fewer, bigger calls is cheaper at every rung, so a real part of a mount is the ' +
                  'per-call overhead of cloning and inserting rather than the node work itself — ' +
                  'and 4 shapes is the COARSEST granularity this app admits without baking data ' +
                  'into a prototype, so `clone+refs` is where a renderer has to stop.'
                : 'The curve is NOT monotone, so "fewer calls is cheaper" is false somewhere on ' +
                  'this ladder and the rung that breaks it is where the explanation has to start.')
    );
    line(
        `  the fills alone       ${sign(appCloneFill - appClone)}   app-clone·fill − app-clone: ` +
            `${CARD_N} data-i, ${CARD_N} headlines, ${CARD_N} user names, ${CARD_N} ` +
            `aria-expanded, ${CARD_N} count labels and ${TAG_N} tag texts written over values that ` +
            'were already there. Everything else about the two rows is identical.'
    );
    line(
        `  granularity alone     ${sign(appCloneFill - cloneRefs)}   app-clone·fill − ` +
            `clone+refs: ${INSTANCES - 1} clone-and-insert pairs deleted, at equal fills and ` +
            "equal output. This is the honest size of the coarse rung's advantage."
    );

    // ── REPETITION — THE ONE THING THAT COULD INVERT THE WHOLE TABLE ────────────────────
    //
    // READ THIS BEFORE QUOTING "CLONING IS TOP" ANYWHERE. Cloning amortises one prepared source
    // over many instances and `createElement` has nothing to amortise, so the ranking above is a
    // function of how repetitive this app is — and it is nearly maximally repetitive: 200
    // identical tag rows, 80 cards, 4 shapes for 321 instances.
    const repetition = cloneDistinct - cloneRefs;
    const repetitionReal = Math.abs(repetition) > resolution;
    line('');
    line('REPETITION — does cloning still win when the source is never reused?');
    line(
        `  clone·distinct        ${f(cloneDistinct)}   ${sign(repetition)} vs clone+refs, ` +
            `${(Math.abs(repetition) / resolution).toFixed(1)}× the resolution floor — the ` +
            `identical program over ${INSTANCES} distinct prototypes, each cloned exactly once`
    );
    line(
        `  ${
            repetitionReal
                ? 'THE PROBE MOVED. Losing the shared source costs a measurable amount inside the ' +
                  "timed region, so cloning's margin over creating IS partly a repetition " +
                  'effect, and "cloning is top" is bounded to trees that repeat. ' +
                  `Against create+refs (${f(createRefs)}) the distinct-source clone is still ` +
                  `${cloneDistinct < createRefs ? 'AHEAD' : 'BEHIND'}, which is the number that ` +
                  'actually decides it.'
                : "THE PROBE DID NOT MOVE, inside this run's resolution. Cloning's advantage " +
                  'over creating survives its source never being reused, so on the part of ' +
                  'repetition that lands inside a timed mount the ranking is NOT a repetition ' +
                  'effect.'
        }`
    );
    line(
        '  WHAT IT STILL DOES NOT COVER: differently SHAPED markup. The gate demands ' +
            'byte-identical output, and shapes that differ produce output that differs, so a real ' +
            'low-repetition census needs its own reference app and therefore its own axis. This ' +
            'row covers the timed half — a cold source and a callsite whose receiver is never the ' +
            'same object twice — and the header says so under (G).'
    );

    // ── THE INSERTION AND OWNERSHIP MECHANISMS ──────────────────────────────────────────
    line('');
    line('THE MECHANISMS — each is `clone+refs` with exactly one thing changed');
    const mech = (name: string, what: string): void => {
        const d = median(name) - cloneRefs;
        const verdictWord =
            Math.abs(d) <= resolution ? 'UNRESOLVED' : d < 0 ? 'WINS      ' : 'LOSES     ';
        line(
            `  ${name.padEnd(15)} ${f(median(name))}   ${sign(d)}   ${(Math.abs(d) / resolution)
                .toFixed(1)
                .padStart(5)}× floor   ${verdictWord}   ${what}`
        );
    };
    mech(
        'clone·frag',
        `the ${CARD_N + TAG_N} batchable insertions staged through a DocumentFragment`
    );
    mech('clone·append', 'the same insertions through the variadic append(…), no staging parent');
    mech('clone·page', 'page-owned prototypes — the importNode line the compiler dropped');
    mech('clone·shallow', `cloneNode(false) per element instead of ${INSTANCES} deep clones`);
    mech('clone·distinct', `${INSTANCES} distinct prototypes instead of 4`);
    line(
        `  app-clone·qsa   ${f(median('app-clone·qsa'))}   ` +
            `${sign(median('app-clone·qsa') - appClone)} vs app-clone   one grouped ` +
            'querySelectorAll instead of a structural walk, on the same coarse clone'
    );

    // ── WHAT THE GAP IS MADE OF, as far as this axis can say ────────────────────────────
    const retainClone = cloneRefs - cloneA;
    const retainCreate = createRefs - create;
    line('');
    line(
        'THE PIECES — each a difference of two directly measured programs, not a subtraction chain'
    );
    line(
        `  retention (clone)     ${sign(
            retainClone
        )}   clone+refs − clone: one Node[${REF_SLOTS}] ` +
            `and ${REF_SLOTS} stores. This is the whole price of being able to come back to a port.`
    );
    line(
        `  retention (create)    ${sign(
            retainCreate
        )}   create+refs − create: the same array, the ` + 'same stores, built the other way'
    );
    line(
        `  clone vs create       ${sign(create - cloneA)}   ${INSTANCES} deep clones against ` +
            `${ELEMENTS} createElement plus the appends and the class stores — a positive number ` +
            'says the template strategy every renderer in this suite uses is the cheaper one'
    );
    line(
        `  parse vs build        ${sign(
            cloneA - html
        )}   clone − html: what it costs to make the ` +
            'tree addressable at all, versus letting the parser produce it in one crossing'
    );

    // ── THE PREDICTION'S FALSIFIERS, PRINTED MECHANICALLY ───────────────────────────────
    line('');
    line(
        'PREDICTION I, COMMITTED IN THE HEADER BEFORE THE FIRST RUN: ratio 1.4-1.8×; html < ' +
            'clone; create > clone; retention at or under a small multiple of the resolution ' +
            'floor. Its falsifiers, evaluated mechanically:'
    );
    const verdict = (ok: boolean): string => (ok ? 'HOLDS ' : 'FAILED');
    // (a) AND (b) ARE READ AGAINST THE ADOPTABLE FLOOR AND NOT THE ABSOLUTE ONE. The prediction
    // was made about "the cheapest program a framework could be", when `clone+refs` was the only
    // candidate for that; the data-baked rungs added later are bounds and were not in its scope.
    // Scoring it against a number it was not about would be scoring a different prediction.
    line(
        `  (a) ratio < 1.15                 ${verdict(
            adoptRatio >= 1.15
        )}  ratio ${adoptRatio.toFixed(3)}× (vs the ADOPTABLE floor) ` +
            '— if it failed, the mount is already browser-bound and the model is wrong in the ' +
            'direction that flatters the renderer'
    );
    line(
        `  (b) ratio > 2.5                  ${verdict(
            adoptRatio <= 2.5
        )}  ratio ${adoptRatio.toFixed(3)}× ` +
            '— if it failed, over half of a mount is above the floor'
    );
    line(
        `  (c) html >= clone                ${verdict(html < cloneA)}  html ${f(html)} vs clone ` +
            `${f(cloneA)} — if it failed, one parser crossing is NOT cheaper than ${INSTANCES} ` +
            'clones and ~1000 calls'
    );
    line(
        `  (d) create <= clone              ${verdict(create > cloneA)}  create ${f(create)} vs ` +
            `clone ${f(cloneA)} — if it failed, cloning a prototype is not the cheapest way to ` +
            'build this tree, which is a finding about every template renderer in this suite'
    );
    const retainOk =
        Math.abs(retainClone) <= 3 * resolution && Math.abs(retainCreate) <= 3 * resolution;
    line(
        `  (e) retention > 3× the floor     ${verdict(retainOk)}  ${sign(retainClone)} / ` +
            `${sign(retainCreate)} against 3× ${f(resolution)} = ${f(3 * resolution)} — if it ` +
            'failed, holding references is a real cost and "floor-with-references ≈ floor" must ' +
            'not be said'
    );
    line(
        '  A prediction that HOLDS on (a)/(b) and FAILS on (c)/(d)/(e) was right for the wrong ' +
            'reason: the ratio is what it is, and the mechanism I named is not what produced it.'
    );

    // ── PREDICTION II — THE RUNGS ADDED TO CLOSE THE VARIANT SPACE ──────────────────────
    line('');
    line(
        'PREDICTION II, COMMITTED IN THE HEADER BEFORE THE RUN THAT ADDED THE RUNGS ABOVE. It is ' +
            'JUDGEMENT plus two citations and nothing in it was measured by me. Its falsifiers:'
    );
    line(
        `  (f) app-clone >= clone+refs      ${verdict(appClone < cloneRefs)}  ${f(appClone)} vs ${f(
            cloneRefs
        )} ` +
            `— I predicted the coarse clone WINS by 0.05-0.09 ms. Mechanism: ${INSTANCES - 1} ` +
            'clone calls and ' +
            `${INSTANCES - 1} insertions deleted, the ${CARD_N * 5 + TAG_N} value fills deleted, ` +
            'and ' +
            `the adopt walk UNCHANGED (both programs adopt all ${ELEMENTS} nodes exactly once, at the ` +
            'final live insertion — every insertion before it joins two template-owned nodes). ' +
            'If it failed, the per-call overhead of cloning is not what a mount is spending and ' +
            'the walk is dearer than the calls it replaces.'
    );
    line(
        `  (g) parser family scatters       ${verdict(
            parserSpread <= 0.25 * domWork.v
        )}  spread ${f(parserSpread)} on a best of ${f(domWork.v)} ` +
            '— I predicted the five doors land TOGETHER (inside 25% of the cheapest), with ' +
            `\`html·tpl\` and \`html·doc\` on the dear side because they adopt ${ELEMENTS} nodes across ` +
            'documents. If it failed, the door matters more than the parser and "the parser ' +
            'family" is not one answer.'
    );
    line(
        `  (h) clone·frag or ·append wins   ${verdict(
            median('clone·frag') >= cloneRefs - resolution &&
                median('clone·append') >= cloneRefs - resolution
        )}  ${sign(median('clone·frag') - cloneRefs)} / ${sign(
            median('clone·append') - cloneRefs
        )} ` +
            '— I predicted NEITHER helps, because this app already assembles everything detached ' +
            'and inserts live exactly once, so batching has no live insertions to keep out and ' +
            'can only add a staging hop or argument marshalling. If it failed, insertion into a ' +
            'DETACHED parent is dearer than it looks, which is a finding about every renderer here.'
    );
    line(
        `  (i) clone·page wins              ${verdict(clonePage >= cloneRefs - resolution)}  ` +
            `${sign(clonePage - cloneRefs)} ` +
            '— I predicted it LOSES by 0.02-0.03 ms. Arithmetic, from the numbers in ' +
            '`compileExoDomSchema.ts:1282-1314` (A CITATION, not measured here): ~95 ns dearer ' +
            `per clone × ${INSTANCES} clones = +0.030 ms, against ~7.4 ns per node of adopt ` +
            `saved × ${ELEMENTS} nodes = −0.005 ms, on the ONE adopt walk this program performs. ` +
            'If it failed, the line the compiler dropped should not have been dropped, and that ' +
            'is a hot-path decision this file does not get to take.'
    );
    line(
        `  (j) clone·shallow beats clone    ${verdict(
            median('clone·shallow') >= cloneRefs - resolution
        )}  ${sign(median('clone·shallow') - cloneRefs)} vs clone+refs, ` +
            `${sign(median('clone·shallow') - createRefs)} vs create+refs ` +
            '— I predicted it lands WITH `create+refs`, not with `clone+refs`: a shallow clone ' +
            'produces one element per call exactly as `createElement` does, and getting `class` ' +
            'copied instead of stored is the only thing it saves. If it beat the deep clone, ' +
            'then deep cloning is dominated by something other than its call count.'
    );
    line(
        `  (k) repetition moves the answer  ${verdict(!repetitionReal)}  ${sign(repetition)} ` +
            `= ${(Math.abs(repetition) / resolution).toFixed(1)}× the floor ` +
            '— I predicted `clone·distinct` sits ON `clone+refs`, because the parse is amortised ' +
            "at module load in BOTH cases and only the source's cache locality differs inside " +
            "the timed region. IF IT FAILED, THIS IS THE MOST IMPORTANT LINE IN THE RUN: cloning's " +
            'margin is partly a repetition effect, and every "cloning is top" sentence in this ' +
            'repository has to be re-scoped to trees that repeat.'
    );
    line(
        `  (l) the ladder is not monotone   ${verdict(monotone)}  create+refs ${f(
            createRefs
        )} ≥ clone+refs ${f(cloneRefs)} ≥ app-clone·fill ${f(appCloneFill)} ≥ app-clone ${f(
            appClone
        )} ` +
            '— I predicted fewer, bigger calls is cheaper at every rung. An inversion says the ' +
            'walk a coarse program pays outgrows the calls it deleted, and locates exactly where.'
    );

    // ── SELF-CHECKS: the ways this run could be lying about its own numbers ──────────────
    if (exodra <= floorMs) {
        refuse(
            `mount-floor: the renderer (${f(exodra)} ms) measured at or below the floor ` +
                `(${f(floorMs)} ms, "${best.name}"). A floor a framework can beat is not a floor ` +
                '— either a floor program is doing work the renderer does not (read the markup ' +
                'gate output and the prototype report), or this run resolved nothing. Nothing ' +
                'below the ANSWER line may be quoted.'
        );
    }
    if (resolution > Math.abs(exodra - floorMs) * 0.25) {
        refuse(
            `mount-floor: the null moved by ${f(resolution)} ms where the whole gap is ` +
                `${f(exodra - floorMs)} ms — this run resolved a quarter of its own subject or ` +
                'worse, so the headroom figure is a range and not a number. Raise `rounds`, or ' +
                'raise the batch.'
        );
    }
    for (const p of PROGRAMS) {
        const twin = p.twinOf;
        if (twin === undefined) continue;
        const delta = median(p.name) - median(twin);
        if (delta >= -resolution) continue;
        refuse(
            `mount-floor: "${p.name}" (${f(median(p.name))} ms) measured CHEAPER than "${twin}" ` +
                `(${f(median(twin))} ms) by ${f(-delta)} ms, past the resolution floor ` +
                `(${f(resolution)} ms), though it does everything that program does and ` +
                `${REF_SLOTS} array stores more. That is not a retention cost, it is the ` +
                'instrument — raise `rounds` before reading the retention lines.'
        );
    }
    // THE COARSE FAMILY'S OWN NULL, CHECKED AGAINST THE COARSE FAMILY'S OWN CLAIM. The fine null
    // says nothing about whether a 1-clone program's rows are separable from each other.
    if (coarseNull.resolution > Math.abs(cloneRefs - appClone) * 0.25) {
        refuse(
            `mount-floor: the COARSE null resolved ${f6(coarseNull.resolution)} ms where the ` +
                `granularity claim it supports is ${f(Math.abs(cloneRefs - appClone))} ms — this ` +
                'run cannot separate the coarse rungs from each other, so the ladder above is an ' +
                'ordering and not a set of sizes. Raise `rounds`, or raise the batch.'
        );
    }
    // A REFUSAL, AND THE COMMENT HERE USED TO SAY THE OPPOSITE OF WHAT THE CODE DOES — it read "a
    // refusal is not the right answer here, but a loud line is" while calling `refuse`. An agent
    // reading this file reported the behaviour off the comment and got it backwards, which is what
    // a comment disagreeing with its own call site is for.
    //
    // THE REFUSAL IS THE RIGHT ANSWER, and the reason is what the ANSWER line above it does: it
    // quotes the CHEAPEST addressable+retained row as the headline. When that row baked the app's
    // data into its prototype, the headline is a bound nobody could ever build against, and a
    // reader who takes only the ANSWER walks away with it. The ❌ is what stops that, and it names
    // the ADOPTABLE floor to quote instead.
    if (bestIsBaked) {
        refuse(
            `mount-floor: the cheapest addressable+retained row is "${best.name}", whose ` +
                "prototype was built from the app's own data at module load. THAT IS A BOUND AND " +
                'NOT A TECHNIQUE — a renderer is handed its data after its templates are ' +
                `compiled. Quote the ADOPTABLE floor ("${adopt.name}", ${f(adoptMs)} ms, ` +
                `${adoptHeadroom.toFixed(
                    1
                )}%) for anything about what a framework could achieve; ` +
                `the ${headroom.toFixed(1)}% headline is the weaker, safer form of the same claim.`
        );
    }
    for (const p of phases) {
        const region = (stats.get(p.name) as Stat).median * p.reps;
        const clockFloor = MIN_TICKS * quantum;
        if (region >= clockFloor) continue;
        const factor = region > 0 ? clockFloor / region : Infinity;
        const wantBatch = Number.isFinite(factor) ? Math.ceil(batch * factor) : batch * 10;
        refuse(
            `mount-floor: the "${p.name}" timed region is ${region.toFixed(3)} ms at ${p.reps} ` +
                `reps — ${(region / quantum).toFixed(1)}× the observed quantum ` +
                `(${quantum.toFixed(3)} ms), under the ${MIN_TICKS}× floor. Its digits are ` +
                `quantisation, not measurement. Re-run with batch ${wantBatch}: ` +
                `\`npm run axis --workspace=@exodra/benchmarks -- mount-floor ${rounds} ` +
                `${wantBatch}\``
        );
    }
}
