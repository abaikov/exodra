// DIAGNOSTIC — WHERE WAS THE CROSSOVER OF THE `importNode` TRADE? THERE WAS NONE, AND THE LINE
// THIS AXIS WAS BUILT TO PRICE HAS BEEN REMOVED.
//
// ── READ THIS BEFORE ANYTHING ELSE IN THIS FILE ─────────────────────────────────────────────
//
// THE QUESTION BELOW IS ANSWERED AND THE ANSWER WAS ACTED ON. `@exodra/dom` no longer imports its
// prototypes into the page: `packages/dom/src/dom/compileExoDomSchema.ts:1282-1314` now reads
// `const instanceProto = proto` and carries the whole reversal in the comment above it. Everything
// this header writes in the present tense about the shipped compiler was true when it was written
// and is not true now; the sections below have been moved into the past tense, and the prediction
// is kept word for word with its verdict attached, because a prediction edited after its run is
// not a prediction.
//
// WHAT THE RUNS SAID, and WHERE EACH FIGURE CAN BE OPENED, which is not the same place:
//
//   · cloning a PAGE-owned prototype cost ~95 ns MORE per clone than a template-owned one;
//   · inserting a page-owned clone saved ~26 ns by skipping the adopt;
//   · a clone is inserted exactly once, so the two rates apply the same number of times and the
//     trade was a straight loss at every subtree size this ladder swept;
//   · swept over 1..64 nodes it never crossed into profit AND THE LOSS GREW WITH SIZE — a
//     straight-line fit over the seven `flat` rungs moves AWAY from zero at 14.9 ns per node — so
//     there was no size for a threshold to be set at either, which was the fix this axis existed
//     to price.
//
// THOSE FOUR ARE THIS AXIS'S OWN OUTPUT AND THIS AXIS HAS NEVER BEEN RECORDED. There is no
// `import-node-trade.*.json` in `packages/benchmarks/measurements/` or in `.gate/`; they are quoted
// from the compiler's comment at the removal (`compileExoDomSchema.ts:1282-1314`), which is prose,
// not an artefact. What survives instead is
// `mount-floor`'s `CENSUS/clone` 0.2175 against `CENSUS/clone·page` 0.2387 — the evidence that
// survives — 0.0212 ms per mount of the 641-node app, against a null that reads 0.0000.
//
//   · removing the line measured -9.2% on the mount axis: `exodra` 0.413 -> 0.375 ms median,
//     row floor +-3.3%, machine drift x1.000 across ten control participants.
//
// THAT ONE IS RECORDED, and it is NOT this axis's output — `import-node-trade` reports nanoseconds
// per instance and never prints a 0.4 ms mount median. It is `initial-render`, recorded twice and
// read through `compare-axis.mjs`: `.gate/initial-render.importnode-before.json` has `exodra` at
// 0.413 and `.gate/initial-render.importnode-after.json` at 0.375, both at batch 8, both carrying
// the same participants, ten of them controls (the recordings carried a twelfth row, driving this
// repository's schema through a second backend, which was removed with that backend). The floor reproduces from the pair as well:
// the recordings carry `"quantum": null`, so `compare-axis.mjs` falls back to 0.1 ms and divides by
// the batch, and 0.0125 / 0.375 is the +-3.3% quoted. Taken on its own that -9.2% resolves to no
// recorded run at all; the pair above is where it resolves. Neither file has been promoted into
// `packages/benchmarks/measurements/`.
//
// AND THE AXIS IS KEPT ANYWAY, for the reason a working instrument is kept after the job it was
// bought for is finished: it is the only thing here that prices ownership against adoption at a
// swept subtree size, so it is what a future "should we import / adopt / move a prototype" question
// gets measured with instead of argued about. It also still runs — it parses and imports its own
// prototypes rather than reaching into `@exodra/dom`, so nothing in it depended on the line it was
// measuring.
//
// ────────────────────────────────────────────────────────────────────────────────────────────
//
// It answered ONE question about ONE line of `@exodra/dom`, and it compares no frameworks. It is
// registered as an axis only so it can reuse the runner that already starts Vite, drives headless
// Chromium and forwards the browser's console. It is written to the `mount-phases` /
// `teardown-phases` set: a phase per cell, every attributed quantity
// printed beside the floor the run measured for itself, every way it can mislead stated in this
// header and repeated in the answer, and a run that refuses its own numbers when they are
// unreadable.
//
// ── THE LINE THIS WAS BUILT TO SETTLE, AND WHAT IT TRADED ───────────────────────────────────
//
// THE TWO POINTERS THIS HEADER USED TO OPEN WITH, AND WHAT BOTH OF THEM DO NOW. It said:
//
//     `packages/dom/src/dom/compileExoDomSchema.ts:1261` ends the compiler with
//         const instanceProto = hasAdoptingSteps(html) ? proto : document.importNode(proto, true);
//     … `packages/dom/src/dom/has-adopting-steps.ts` is the predicate …
//
// BOTH POINTERS ARE DEAD, AND THEY DIED DIFFERENTLY, which is why one of them survived for weeks in
// a file nothing checks. `has-adopting-steps.ts` WAS DELETED with the import: the path resolves to
// nothing, and every other mention of it further down this header is a pointer at a file that is
// not there. `compileExoDomSchema.ts` still exists and its compiler still ends where that pointer
// aimed — `const instanceProto = proto`, at `:617` in a 756-line file — so a line number is the
// half of a citation that rots silently while the path keeps resolving. A deleted file is catchable
// by anything that opens paths; a line that quietly came to mean something else is not, and
// `scripts/check-doc-citations.mjs` reads neither, because it scans
// `docs-site/**` and `README.md` and no `.ts` source at all.
//
// What settled the question is the sweep in this file: no crossover anywhere in 1..64 nodes and the
// loss GROWING with subtree size, which is exactly what "a size threshold in the predicate" needed
// to not be true, so the predicate and the import went together.
//
// THE EVIDENCE THAT SURVIVES IS NOT THIS AXIS'S. `mount-floor` builds the same 641-node app twenty
// -one ways, gated byte-identical, and two of its rows differ only in which document owns the
// prototype: `CENSUS/clone` 0.2175 ms (template-owned, what ships) against `CENSUS/clone·page`
// 0.2387 ms, with the null control `CENSUS/clone·twin` at 0.2175. Page ownership therefore costs
// 0.0212 ms per mount of that app — roughly 66 ns over 321 clones — against a null that reads
// 0.0000. The "~95 ns more per clone against ~26 ns saved per insertion" and the "-9.2%" quoted at
// the removal came from THIS file and from a second axis that has since been deleted with the
// backend it priced; the provenance paragraph at the top of this header shows the pair the -9.2%
// reproduces from.
//
// AND THE REVERSAL IS THE INTERESTING PART. The original `importNode` line rested on numbers —
// 380 ns per insertion foreign-owned against 240 ns page-owned — and the file holding them said
// outright that nothing here reproduced them. It shipped on the hot path for months on an
// admittedly irreproducible measurement, and was overturned only when somebody measured BOTH
// HALVES OF THE TRADE IN ONE RUN. Isolated on "how do we make insertion cheaper", page ownership
// wins and always will.
//
// THE FILE IS KEPT AND STILL RUNS, because the instrument is what makes the removal re-checkable on
// a machine that is not this one — but read the rest of this header as the state of the question in
// the past, not as a description of `@exodra/dom` today.
//
// What the removed line traded, which is what everything below measures: the predicate was two
// regexes over the finished markup, and for nearly every schema it moved the prototype out of the
// inert template-contents owner document into the live page document, ONCE per schema. Its own
// header stated the reason and the price — a template-owned prototype's clone costing 380 ns per
// insertion against 240 ns for a page-owned one, 1.58x — and said outright that those were the
// change author's numbers and that NOTHING IN THIS REPOSITORY REPRODUCED THEM.
//
// The trade has two halves and they point in opposite directions:
//
//   IT BUYS   the DOM's pre-insertion step "adopt node into parent's node document" — a walk of
//             the WHOLE inserted subtree writing a document pointer into every node — never runs,
//             on any of the instances that schema will ever build.
//   IT COSTS  whatever cloning a page-owned prototype costs over cloning a template-owned one.
//
// ── WHAT IS ALREADY MEASURED, AND WHY IT DOES NOT ANSWER THE QUESTION ───────────────────────
//
// AN AXIS THAT NO LONGER EXISTS measured both halves in one run, at 321 instances of the 80-card
// benchmark app, 100 rounds, batch 8 — after first checking with `protoShapeReport()` that the
// prototypes on the two sides are byte-identical trees, so that only ownership varied. It was
// `dom-vs-stage0-phases`, it existed to compare `@exodra/dom` against a second backend, and it
// was DELETED together with that backend and every recording of it. The numbers below are
// therefore quoted from a run nobody can replay off disk, as the reason this file exists rather
// than as anything this file measured — and this file is now the only surviving instrument for
// the question:
//
//   clone, page-owned      0.1187 ms / 321 = ~370 ns each
//   clone, template-owned  0.0881 ms / 321 = ~275 ns each     penalty ~95 ns per clone
//   insert, page-owned     0.0437 ms / 321 = ~136 ns each
//   insert, template-owned 0.0519 ms / 321 = ~162 ns each     saving  ~26 ns per insertion
//   net                    −0.0219 ms per mount — the trade LOSES at that shape
//
// and the 2x2 that establishes OWNERSHIP as the cause rather than the trees: moving `@exodra/dom`'s
// own trees INTO a template made them 0.0306 cheaper to clone, and moving the stage0 backend's own
// trees INTO the page made them 0.0294 dearer — both swaps moving by about the original delta, in
// opposite directions.
//
// THE REASON THAT IS NOT AN ANSWER: the benchmark app's subtrees are small. APP is 1 node, CARD 8,
// DETAILS 2, TAG 2 — and TAG is 200 of the 321, so that run averages ~3.5 nodes per instance. The
// adoption walk the `importNode` removes is a walk of the WHOLE inserted subtree, so its saving
// must grow with node count. The clone penalty may or may not grow at the same rate. The change
// author's own measurement used a 5-NODE subtree and found a 140 ns saving where the run above
// measures 26 ns averaged over mostly-2-node subtrees.
//
// So the honest question is not "is the trade wrong". IT IS "WHERE IS THE CROSSOVER" — the subtree
// size, if there is one, above which `importNode` pays for itself. If such a size exists and any
// component would be built at it, the answer is a SIZE THRESHOLD in the predicate, not a removal.
//
// THIS FILE CHANGES NOTHING. It is the instrument. Whether `has-adopting-steps` gets a size
// threshold is a hot-path decision and is not this file's to take.
//
//   SINCE SETTLED, and the answer was neither a threshold nor the status quo: the predicate and the
//   import were both REMOVED, and `has-adopting-steps.ts` no longer exists. See the paragraph at the
//   top of this header.
//
// ── THE PREDICTION, COMMITTED BEFORE THE RUN — AND HOW IT CAME OUT ──────────────────────────
//
// THE VERDICT FIRST, so that nobody reads the model below as an open bet. IT HELD ON ITS HEADLINE
// AND ON ONE OF ITS FOUR FALSIFIERS, AND THE OTHER THREE CANNOT BE JUDGED FROM ANYTHING ON DISK:
//
//   (a) NOT TRIGGERED — no crossover at or below 64 nodes. The compiler's comment at the removal
//       records the sweep as never crossing into profit and the loss growing at 14.9 ns per node
//       over the seven `flat` rungs, which is also the headline claim: negative everywhere and
//       getting more negative. The predicted slope was "about −20 ns per node"; 14.9 is the same
//       sign and the same order and is not the same number, and the prediction is left standing
//       as written rather than trimmed to fit.
//   (b), (c), (d) UNJUDGEABLE AFTER THE FACT. The run prints all four checks mechanically, and
//       nothing kept the output: there is no `import-node-trade.*.json` anywhere in this
//       repository, so whether the penalty rose linearly, whether the saving per node stayed
//       constant, and whether `flat` and `chain` agreed are all questions this file can still
//       answer and no artefact currently does. The mechanism named below is therefore NOT
//       established — "no crossover" is compatible with several, and (b) and (c) were the two
//       that would have told them apart.
//
// So the decision the sweep supported (there is no size to set a threshold at) rests on (a) alone,
// and (a) alone is enough for it. The mechanism story does not have the same standing, and the way
// to give it one is to run this axis with `--record` and keep the block.
//
// This was my model, and it was JUDGEMENT plus one line of code-reading. Nothing in it was measured.
// It was written down first so that the run could be read as a test of it rather than as a story
// told afterwards, and it is reproduced here unedited.
//
//   I PREDICT: THERE IS NO CROSSOVER ANYWHERE IN 1..64 NODES, FOR EITHER SHAPE. `net` per
//   instance is negative at every rung and gets MORE negative, roughly linearly, as the subtree
//   grows — about −20 ns per node per instance, from the two per-node rates the run above implies
//   (~27 ns/node of penalty against ~7.4 ns/node of saving at 3.5 nodes per instance).
//
//   THE MECHANISM I AM BETTING ON: BOTH HALVES OF THE TRADE ARE PER-NODE WALKS OF THE SAME
//   SUBTREE, so their ratio is scale-invariant and the sign of `saving − penalty` cannot change
//   with size. The saving side is per-node by specification — adoption visits every node in the
//   subtree. The COST side I am claiming is per-node too, and that is the part that can be wrong:
//   a deep `cloneNode` creates each element THROUGH its owner document, and the page document has
//   a browsing context and a custom-element registry to consult where the template contents owner
//   document has neither. If that is what the 95 ns is, it is charged once per ELEMENT and it
//   scales exactly as the saving does.
//
//   WHAT WOULD PROVE THE MODEL WRONG — any one of these, and the first two are the ones that
//   matter, because they are the ones that would make a size threshold the right fix:
//     (a) `net` crosses zero at or below 64 nodes;
//     (b) `penalty` per instance is FLAT in size (inside the run's own floor) instead of rising
//         roughly linearly — that would say the clone penalty is per CALL, not per node, and then
//         the saving outgrows it and a threshold exists somewhere;
//     (c) `saving` per node is not roughly constant across the ladder;
//     (d) `flat` and `chain` disagree by more than the floor at equal node count — the model says
//         the adoption walk does not care how the nodes are arranged.
//
//   THE MODEL CAN ALSO BE RIGHT FOR THE WRONG REASON. "No crossover" is compatible with several
//   mechanisms; it is (b) and (c) that say whether the one I named is the one that happened. The
//   run prints all four checks mechanically so that nobody, including me, gets to pick afterwards.
//
// ── THE LADDER, AND HOW EACH RUNG IS BUILT ──────────────────────────────────────────────────
//
// Sizes 1, 2, 4, 8, 16, 32, 64 NODES. Two shapes, because depth-vs-breadth is a real variable and
// not a stylistic one: the adoption walk visits every node either way, but cloning a chain and
// cloning a fan are not obviously the same price, and the whole prediction rests on both halves
// scaling together.
//
//   flat    a `<div class="r">` root with N−1 `<span class="n">` SIBLINGS. Depth 2 at every size.
//   chain   a `<div class="r">` root with N−1 `<span class="n">` NESTED one inside the next.
//           Depth N.
//
// Both carry exactly N ELEMENTS, exactly one attribute per element, and NO TEXT NODES — so a
// rung's node count is unambiguous and is checked rather than assumed. `flat` is the primary
// ladder and is swept at all seven sizes; `chain` is a SHAPE CONTROL and is swept at 4, 16 and 64,
// which is enough to compare a slope, not enough to locate a crossover of its own.
//
// EVERY RUNG WAS A SHAPE THE THEN-SHIPPED PREDICATE WOULD IMPORT. `has-adopting-steps` was two
// regexes over the finished markup — a list of resource-loading tags, and any tag name containing a
// hyphen — and `div`/`span` with a `class` attribute matched neither. THAT FILE IS GONE; this
// paragraph used to cite `packages/dom/src/dom/has-adopting-steps.ts:98-106` "READ FROM CODE", and
// that path resolves to nothing now, so the description above is from the ladder's design and not
// re-readable. It also used to explain that the predicate was not imported here to be re-run
// because `@exodra/dom` did not export it; today there is nothing left to import, and the ladder's
// shapes are what they always were.
//
// ── THE FOUR CELLS AT EVERY RUNG — the same 2x2 that established ownership ──────────────────
//
//   clone page   INSTANCES × `cloneNode(true)` of the prototype AFTER `document.importNode`
//   clone tpl    INSTANCES × `cloneNode(true)` of the same tree left where the parser put it
//   ins page     INSTANCES × `appendChild` of page-owned clones into a CONNECTED container
//   ins tpl      INSTANCES × `appendChild` of template-owned clones into the same
//
//   penalty = clone page − clone tpl     what `importNode` COSTS, per instance, forever
//   saving  = ins tpl   − ins page       what it BUYS, per instance — the adoption walk
//   net     = saving − penalty           positive: the trade pays at this size
//
// The two prototypes at a rung are THE SAME TREE: the template-owned one is what the parser built,
// and the page-owned one is `document.importNode` of exactly that — which is what the compiler
// does. They are compared anyway, `outerHTML` and node count both, and the run throws before
// timing anything if they differ. (The reason is on the record: the first version of that refusal
// on a sibling axis ASSERTED that two prototypes were different trees without looking, and it was
// wrong.)
//
// THE INSERTION CONTAINER IS APPENDED TO `document.body`. Adoption is triggered by the parent's
// node document differing from the child's, so a DETACHED container measures the opposite of the
// question — the child would be adopted later, on some insertion this axis never times. The host
// carries `display: none` so that the 20 000-odd nodes a rung inserts do not drag layout into the
// timed region; that is a style decision and adoption is not gated on style.
//
// EACH REPETITION INSERTS ITS OWN FRESH CLONES, made in the UNTIMED `prep`. This is not tidiness:
// a node that has already been appended once is already page-owned, so appending it a second time
// would measure an adoption that cannot happen and the saving would collapse to zero for reasons
// that have nothing to do with the question.
//
// ── THE CONTROL THAT RESOLVES THE INSTRUMENT ────────────────────────────────────────────────
//
// At every `flat` rung there are two more cells whose TRUE VALUE IS KNOWN TO BE ZERO: a SECOND
// page-owned prototype, parsed separately from the same markup and imported separately, cloned in
// its own phase and inserted in its own phase. Same tree, same ownership, same instance count,
// same repetition factor — a different object and nothing else.
//
//   floor(size) = max( |clone page − clone pageB| , |ins page − ins pageB| )
//
// That is what this instrument returns when there is nothing to find, measured in the same
// session, interleaved with everything it judges, at the same size. It is the number every `net`
// is printed against, and a `net` under it is refused by name rather than attributed. It is a
// control rung with a known true value of zero, and it exists for the reason every one of them
// does: a hardcoded threshold would be a guess.
//
// The `chain` rungs have no null of their own — they reuse the `flat` floor at the same node
// count. The two shapes run the same instance count and the same repetition factor at a given
// size, so the regime is the same; that is an argument, not a measurement, and it is why `chain`
// is described above as a shape control rather than as a second answer.
//
// ── WHAT COULD NOT BE ISOLATED, and what blocked each one ───────────────────────────────────
//
//  A. THE COMPILE-TIME COST OF `importNode` ITSELF. It is one deep clone plus one adopt, ONCE per
//     schema, at module load. Nothing here measures it, and nothing here needs to: every figure
//     below is per INSTANCE, and a per-schema constant divided by the instances of a real list is
//     not what decides this trade. If a future question is "what does the import cost at import
//     time", this is not the instrument for it.
//  B. BLINK'S DEFERRED WORK. Style and layout invalidation from the insertions is charged to
//     whatever runs next, which here is the next repetition. Both insert cells pay it, the
//     `display: none` host means most of it is skipped, and neither timed region contains all of
//     its own. Same hazard as `teardown-phases` caveat (1), smaller.
//  C. TEXT NODES. This ladder is elements only, so a rung's node count IS its element count. A
//     real component is not: the 80-card app's CARD is 8 elements and carries text nodes besides,
//     and adoption walks those too while cloning them is cheaper than cloning an element. So a
//     real subtree of E elements sits at a node count HIGHER than rung E, and the crossover
//     expressed in elements would arrive sooner for a text-heavy component than this ladder says.
//     Not swept, named.
//  D. ATTRIBUTES. Every node here carries exactly one `class`. Cloning copies attributes and
//     adoption does not walk them, so the penalty side is attribute-sensitive and the saving side
//     is not: a component whose nodes carry five attributes each pushes the trade FURTHER into
//     loss than this ladder shows. Not swept, named, and it is the variable most likely to make
//     the real answer worse than the measured one.
//  E. THE INTERLEAVING A REAL MOUNT HAS. A mount clones, wires and inserts one instance at a time;
//     this axis clones all of them and then inserts all of them. Cache behaviour differs, and the
//     insert cells are handed clones made microseconds earlier in a `prep` rather than nodes just
//     built by the loop above them. `mount-phases` carries the same caveat for the same reason.
//  F. ONE INSERTION ORDER ONLY — `appendChild` into the end of a growing host. `@exodra/dom` in
//     fact always spells `insertBefore(root, before)` with a null anchor for an append
//     (`@exodra/dom`'s insertion path records this). Anchored insertion into the middle of a
//     region is not swept here, and adoption is upstream of where the anchor matters.
//
// ── HOW THIS FILE MEASURES ──────────────────────────────────────────────────────────────────
//
// The runner is `abBench`'s sampling with a repetition factor PER PHASE and the medians handed
// back: `prep()` is called `reps` times UNTIMED, then every
// `measure()` runs inside ONE timed region, then every `cleanup()` runs. GC sits after the preps
// and immediately before the timed region, so no region starts under a different pile of floating
// garbage than its neighbour. Phases are interleaved and the order rotates every round.
//
// THE REPETITION FACTOR VARIES WITH SIZE, and it has to: one rung of 321 single-node clones is a
// fraction of Chromium's ~100 µs tick while one rung of 321 sixty-four-node clones is milliseconds.
// Each size gets `reps ≈ 40 000 / (INSTANCES × nodes)`, clamped to 1..64, which lands every timed
// region in the same few-millisecond band. That makes repetition count part of a rung's
// conditions — so rungs are NOT perfectly comparable to each other. Every quantity this file
// attributes is computed WITHIN one size (penalty, saving, net and floor are all differences of
// cells that share a size and a repetition factor); comparison ACROSS sizes is used only for the
// shape of the trend, and the run says so in its answer.
//
// THE THIRD POSITIONAL IS THE BATCH AND IT IS HONOURED, as `teardown-phases`' is: it MULTIPLIES
// every phase's repetition factor, so when the clock check refuses a phase and names a factor,
// that factor is something the operator can type instead of editing this file.
//
//     npm run axis --workspace=@exodra/benchmarks -- import-node-trade 100 1
//     npm run axis --workspace=@exodra/benchmarks -- import-node-trade 100 4   # if it refused
//
// WHY 100 ROUNDS: the quantity reported is a difference of two medians and then a difference of
// two of those, so every median has to be settled; the null cells report what the run actually
// resolved, at each size, rather than leaving it to be assumed.
import type { Scenario } from '../../../harness';

// eslint-disable-next-line no-console
const line = (s: string): void => console.log(`✅ ${s}`);
// eslint-disable-next-line no-console
const refuse = (s: string): void => console.log(`❌ ${s}`);

// ---------------------------------------------------------------------------------------
// THE LADDER'S CONSTANTS.
// ---------------------------------------------------------------------------------------

/**
 * HOW MANY INSTANCES ONE REPETITION BUILDS.
 *
 * 321, which is the 80-card app's own instance count and therefore the count the run this file
 * exists to extend was taken at — so a figure here can be put beside that one without rescaling.
 * Every quantity below is also printed as ns PER INSTANCE, which divides this out; the choice
 * affects how long a timed region is and nothing else.
 */
const INSTANCES = 321;

/** The primary ladder — `flat`, seven rungs, powers of two from a bare root to 64 nodes. */
const FLAT_SIZES: readonly number[] = [1, 2, 4, 8, 16, 32, 64];

/**
 * The shape control — `chain`, three rungs. Not seven: `chain` exists to say whether depth changes
 * the slope, and three points spanning the ladder answer that. Locating a crossover is the `flat`
 * ladder's job.
 */
const CHAIN_SIZES: readonly number[] = [4, 16, 64];

/** Node visits per timed region the repetition factor aims at — see "HOW THIS FILE MEASURES". */
const TARGET_NODE_VISITS = 40000;

function repsFor(nodes: number): number {
    const want = Math.round(TARGET_NODE_VISITS / (INSTANCES * nodes));
    return Math.max(1, Math.min(64, want));
}

// ---------------------------------------------------------------------------------------
// THE SHAPES. Elements only, one attribute each, no text — see caveats (C) and (D).
// ---------------------------------------------------------------------------------------

type ShapeName = 'flat' | 'chain';

/**
 * `nodes` ELEMENTS, arranged by `shape`. The root is always a `div` and every other node a `span`,
 * so the two shapes differ in ARRANGEMENT and in nothing else — same tag census, same attribute
 * census, same node count.
 */
function shapeHtml(shape: ShapeName, nodes: number): string {
    if (nodes < 1) throw new Error('import-node-trade: a rung needs at least one node');
    const inner = nodes - 1;
    if (shape === 'flat') {
        return `<div class="r">${'<span class="n"></span>'.repeat(inner)}</div>`;
    }
    return `<div class="r">${'<span class="n">'.repeat(inner)}${'</span>'.repeat(inner)}</div>`;
}

// ---------------------------------------------------------------------------------------
// THE PROTOTYPES. Built exactly as `compileExoDomSchema` builds one: parsed inside a `<template>`
// (so the tree is owned by the template contents owner document), then `document.importNode`'d for
// the page-owned side. The template-owned side is the parsed tree itself, untouched.
//
// ONE ASYMMETRY IS KEPT ON PURPOSE, and it is production's: the template-owned prototype is still
// PARENTED by the template's content fragment, where the parser left it, while the page-owned one
// is DETACHED, because `importNode` returns a detached copy. That is exactly the pair the shipped
// compiler ends up holding on its two branches, so reproducing it is the point. `cloneNode` does
// not read the source's parent, so this is not expected to enter the measurement — but it is an
// expectation, not something this file proves, and it is written down rather than tidied away.
// ---------------------------------------------------------------------------------------

interface Parsed {
    /** Retained so that nothing about the tree's ownership can change under GC mid-run. */
    readonly holder: HTMLTemplateElement;
    readonly root: Element;
}

function parseInTemplate(html: string): Parsed {
    const holder = document.createElement('template');
    holder.innerHTML = html;
    const root = holder.content.firstElementChild;
    if (root === null) {
        throw new Error(`import-node-trade: the parser produced no element for \`${html}\``);
    }
    return { holder, root };
}

interface Cell {
    readonly shape: ShapeName;
    readonly nodes: number;
    /** Row label — `f16`, `c64`. Short because it prefixes six phase names. */
    readonly label: string;
    readonly html: string;
    /** What the parser built, where the parser left it: template contents owner document. */
    readonly tpl: Element;
    /** The same tree, moved into the page document — what the shipped compiler clones from. */
    readonly page: Element;
    /**
     * A SECOND page-owned prototype, parsed and imported independently from the same markup. Its
     * difference from `page` has a true value of zero, and that is this run's floor. `null` on the
     * `chain` rungs, which borrow the `flat` floor at the same node count.
     */
    readonly pageB: Element | null;
    /** Kept alive alongside the prototypes; see `Parsed`. */
    readonly holders: readonly HTMLTemplateElement[];
}

function buildCell(shape: ShapeName, nodes: number, withNull: boolean): Cell {
    const html = shapeHtml(shape, nodes);
    const first = parseInTemplate(html);
    const page = document.importNode(first.root, true);
    const holders: HTMLTemplateElement[] = [first.holder];
    let pageB: Element | null = null;
    if (withNull) {
        const second = parseInTemplate(html);
        holders.push(second.holder);
        pageB = document.importNode(second.root, true);
    }
    return {
        shape,
        nodes,
        label: `${shape === 'flat' ? 'f' : 'c'}${nodes}`,
        html,
        tpl: first.root,
        page,
        pageB,
        holders,
    };
}

/**
 * Built at MODULE LOAD, which is cheap here — ten prototypes of at most 64 elements — and is what
 * lets the gates run before a single timed region.
 */
const CELLS: readonly Cell[] = [
    ...FLAT_SIZES.map((n) => buildCell('flat', n, true)),
    ...CHAIN_SIZES.map((n) => buildCell('chain', n, false)),
];

// ---------------------------------------------------------------------------------------
// THE GATES. Nothing is timed until every rung has been shown to hold the SAME TREE on both sides
// of its 2x2, with the node count it claims, owned by the documents it claims.
//
// A rung whose two prototypes were different trees would produce a perfectly plausible `penalty`
// and a wrong answer — and a rung whose "page-owned" prototype was not in fact page-owned would
// produce a `saving` of zero and look like a discovery.
// ---------------------------------------------------------------------------------------

/** Every node in the subtree, elements and text and comments alike — iterative, no recursion. */
function countNodes(root: Node): number {
    let total = 0;
    const stack: Node[] = [root];
    while (stack.length > 0) {
        const cur = stack.pop() as Node;
        total++;
        for (let c = cur.firstChild; c !== null; c = c.nextSibling) stack.push(c);
    }
    return total;
}

/** How deep the subtree goes, root counted as 1 — printed so the shape claim is visible. */
function depthOf(root: Node): number {
    let deepest = 0;
    const stack: Array<{ node: Node; at: number }> = [{ node: root, at: 1 }];
    while (stack.length > 0) {
        const cur = stack.pop() as { node: Node; at: number };
        if (cur.at > deepest) deepest = cur.at;
        for (let c = cur.node.firstChild; c !== null; c = c.nextSibling) {
            stack.push({ node: c, at: cur.at + 1 });
        }
    }
    return deepest;
}

function gateCells(): void {
    line('GATE — the two sides of every 2x2 are the same tree, checked and not assumed');
    line(
        '  rung   nodes  depth  markup==  count==  page-owned  tpl-owned  null==  ' +
            '(all four must read yes)'
    );
    const broken: string[] = [];
    for (const cell of CELLS) {
        const tplHtml = cell.tpl.outerHTML;
        const pageHtml = cell.page.outerHTML;
        const tplN = countNodes(cell.tpl);
        const pageN = countNodes(cell.page);
        const markupSame = tplHtml === pageHtml;
        const countSame = tplN === pageN && tplN === cell.nodes;
        const pageOwned = cell.page.ownerDocument === document;
        const tplOwned = cell.tpl.ownerDocument !== document;
        let nullSame: boolean | null = null;
        if (cell.pageB !== null) {
            nullSame =
                cell.pageB.outerHTML === pageHtml &&
                countNodes(cell.pageB) === pageN &&
                cell.pageB.ownerDocument === document;
        }
        const yes = (b: boolean): string => (b ? 'yes' : 'NO');
        line(
            `  ${cell.label.padEnd(6)} ${String(cell.nodes).padStart(5)} ` +
                `${String(depthOf(cell.tpl)).padStart(6)} ${yes(markupSame).padStart(8)} ` +
                `${yes(countSame).padStart(8)} ${yes(pageOwned).padStart(11)} ` +
                `${yes(tplOwned).padStart(10)} ` +
                `${(nullSame === null ? '—' : yes(nullSame)).padStart(7)}  ` +
                `${tplN} nodes counted`
        );
        if (!markupSame) {
            broken.push(
                `${cell.label}: markup differs (tpl \`${tplHtml}\` vs page \`${pageHtml}\`)`
            );
        }
        if (!countSame) {
            broken.push(
                `${cell.label}: node count ${tplN} (tpl) / ${pageN} (page) against the ` +
                    `${cell.nodes} this rung claims`
            );
        }
        if (!pageOwned) broken.push(`${cell.label}: the imported prototype is NOT page-owned`);
        if (!tplOwned) broken.push(`${cell.label}: the parsed prototype is NOT template-owned`);
        if (nullSame === false) broken.push(`${cell.label}: the null's second prototype differs`);
    }
    if (broken.length > 0) {
        throw new Error(
            'import-node-trade: the 2x2 is not holding the tree fixed — ' +
                broken.join('; ') +
                '. Every penalty and saving below would be partly a tree difference.'
        );
    }
    line(
        `  all ${CELLS.length} rungs hold: identical markup and node count on both sides, the ` +
            'imported prototype owned by the page document and the parsed one not, and every ' +
            "null's second prototype identical to the first."
    );
}

// ---------------------------------------------------------------------------------------
// THE TWO MEASURED OPERATIONS.
//
// EVERY CLONE STAYS ALIVE FOR THE WHOLE TIMED REGION — `mount-phases`' rule and its reason: a
// stage that dropped each repetition's clones would allocate into a nursery that recycles instead
// of into a growing live set, and would read cheaper than the same work costs inside a mount. So
// each repetition is handed its OWN sink, allocated in the untimed `prep`, and everything it makes
// is reachable until the sample ends.
// ---------------------------------------------------------------------------------------

function makeSink(fill: Node): Node[] {
    return new Array<Node>(INSTANCES).fill(fill);
}

function cloneInto(proto: Node, sink: Node[]): void {
    for (let i = 0; i < INSTANCES; i++) sink[i] = proto.cloneNode(true);
}

/**
 * One insertion repetition: INSTANCES fresh clones made UNTIMED, then appended into a container
 * that is in the live document.
 *
 * The clones are fresh per repetition because a node appended once is page-owned afterwards — see
 * the header. The host is `display: none` so the insertions do not pull layout into the region.
 */
function prepInsert(proto: Node): Scenario {
    const host = document.createElement('div');
    host.style.display = 'none';
    document.body.appendChild(host);
    const ready = new Array<Node>(INSTANCES);
    for (let i = 0; i < INSTANCES; i++) ready[i] = proto.cloneNode(true);
    return {
        measure: () => {
            for (let i = 0; i < INSTANCES; i++) host.appendChild(ready[i]);
        },
        cleanup: () => host.remove(),
    };
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
// THE RUNNER — `abBench`'s, with a repetition factor per phase.
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

function runPhases(phases: readonly Phase[], rounds: number): Map<string, Stat> {
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
    const stats = new Map<string, Stat>();
    for (const p of phases) stats.set(p.name, stat(times.get(p.name) as number[]));
    return stats;
}

// ---------------------------------------------------------------------------------------
// A STRAIGHT LINE THROUGH THE LADDER, used ONLY to extrapolate past the swept range and always
// labelled as a fit. The per-node table beside it is what says whether a line was the right thing
// to fit — if `penalty` and `saving` per node are not flat across the rungs, the fit is describing
// a curve and its extrapolation is worth nothing.
// ---------------------------------------------------------------------------------------

interface Fit {
    slope: number;
    intercept: number;
}

function fitLine(xs: readonly number[], ys: readonly number[]): Fit {
    const n = xs.length;
    let sx = 0;
    let sy = 0;
    let sxx = 0;
    let sxy = 0;
    for (let i = 0; i < n; i++) {
        sx += xs[i];
        sy += ys[i];
        sxx += xs[i] * xs[i];
        sxy += xs[i] * ys[i];
    }
    const denom = n * sxx - sx * sx;
    if (denom === 0) return { slope: 0, intercept: sy / n };
    const slope = (n * sxy - sx * sy) / denom;
    return { slope, intercept: (sy - slope * sx) / n };
}

// ---------------------------------------------------------------------------------------

/** One rung's four medians and everything derived from them, in ms per INSTANCES instances. */
interface Row {
    readonly cell: Cell;
    readonly reps: number;
    readonly clonePage: number;
    readonly cloneTpl: number;
    readonly insPage: number;
    readonly insTpl: number;
    /** clone page − clone tpl: what `importNode` costs, per repetition. */
    readonly penalty: number;
    /** ins tpl − ins page: what it buys, per repetition. */
    readonly saving: number;
    readonly net: number;
    /** The null's reading at this size, or the `flat` reading at the same node count. */
    readonly floor: number;
    /** Whether that floor was measured at this rung or borrowed from the `flat` ladder. */
    readonly floorBorrowed: boolean;
}

export function benchmarkImportNodeTrade(rounds = 100, batch = 1): void {
    const f = (x: number): string => x.toFixed(4);
    /** ms per repetition → ns per instance, which is the unit every attribution is stated in. */
    const ns = (ms: number): number => (ms * 1e6) / INSTANCES;
    const nsStr = (ms: number): string => {
        const v = ns(ms);
        return v >= 0 ? `+${v.toFixed(1)}` : v.toFixed(1);
    };

    const quantum = observeTimerQuantum();
    line(
        `import-node-trade: observed timer quantum (${quantum.toFixed(3)} ms) — every timed ` +
            `region below must clear ${(MIN_TICKS * quantum).toFixed(3)} ms (${MIN_TICKS}×) or ` +
            'its digits are quantisation, and the run says so by name'
    );
    line(
        `import-node-trade: ${INSTANCES} instances per repetition, ${CELLS.length} rungs, ` +
            `${rounds} rounds, batch ${batch}. THE PREDICTION THIS RUN TESTS IS IN THE FILE ` +
            'HEADER and was committed before the run: no crossover in 1..64 nodes, because both ' +
            'halves of the trade are per-node walks of the same subtree.'
    );

    // ── GATES ───────────────────────────────────────────────────────────────────────────
    gateCells();

    // ── PHASES ──────────────────────────────────────────────────────────────────────────
    const phases: Phase[] = [];
    const noop = (): void => undefined;
    const repsOf = new Map<string, number>();

    for (const cell of CELLS) {
        const reps = repsFor(cell.nodes) * batch;
        repsOf.set(cell.label, reps);
        const per = `${INSTANCES} × ${cell.nodes}-node ${cell.shape}`;
        phases.push({
            name: `${cell.label} clone page`,
            reps,
            what: `${per}: cloneNode(true) of the IMPORTED prototype — what ships`,
            prep: () => {
                const sink = makeSink(cell.page);
                return { measure: () => cloneInto(cell.page, sink), cleanup: noop };
            },
        });
        phases.push({
            name: `${cell.label} clone tpl`,
            reps,
            what: `${per}: cloneNode(true) of the SAME tree left template-owned`,
            prep: () => {
                const sink = makeSink(cell.tpl);
                return { measure: () => cloneInto(cell.tpl, sink), cleanup: noop };
            },
        });
        phases.push({
            name: `${cell.label} ins page`,
            reps,
            what: `${per}: appendChild of page-owned clones into a connected host — no adopt walk`,
            prep: () => prepInsert(cell.page),
        });
        phases.push({
            name: `${cell.label} ins tpl`,
            reps,
            what: `${per}: appendChild of template-owned clones — the adopt walk runs`,
            prep: () => prepInsert(cell.tpl),
        });
        if (cell.pageB !== null) {
            const pageB = cell.pageB;
            phases.push({
                name: `${cell.label} null clone`,
                reps,
                what: `${per}: a SECOND page-owned prototype, cloned — true value ZERO`,
                prep: () => {
                    const sink = makeSink(pageB);
                    return { measure: () => cloneInto(pageB, sink), cleanup: noop };
                },
            });
            phases.push({
                name: `${cell.label} null ins`,
                reps,
                what: `${per}: the same second page-owned prototype, inserted — true value ZERO`,
                prep: () => prepInsert(pageB),
            });
        }
    }

    const stats = runPhases(phases, rounds);
    const median = (name: string): number => (stats.get(name) as Stat).median;

    // ── THE RAW TABLE ───────────────────────────────────────────────────────────────────
    line('');
    line(
        `THE IMPORTNODE TRADE — one line of @exodra/dom, swept by subtree size ` +
            `[ms per ${INSTANCES} instances] · interleaved · ${rounds} rounds · batch ${batch} · ` +
            'GC before every timed region'
    );
    line('phase                  reps   min      p25      median   p75      max');
    for (const p of phases) {
        const s = stats.get(p.name) as Stat;
        line(
            `${p.name.padEnd(20)}${String(p.reps).padStart(7)}   ${f(s.min)}   ${f(s.p25)}   ` +
                `${f(s.median)}   ${f(s.p75)}   ${f(s.max)}`
        );
    }

    // ── THE ROWS ────────────────────────────────────────────────────────────────────────
    const flatFloor = new Map<number, number>();
    const rows: Row[] = [];
    for (const cell of CELLS) {
        const reps = repsOf.get(cell.label) as number;
        const clonePage = median(`${cell.label} clone page`);
        const cloneTpl = median(`${cell.label} clone tpl`);
        const insPage = median(`${cell.label} ins page`);
        const insTpl = median(`${cell.label} ins tpl`);
        const penalty = clonePage - cloneTpl;
        const saving = insTpl - insPage;
        let floor: number;
        let floorBorrowed: boolean;
        if (cell.pageB !== null) {
            floor = Math.max(
                Math.abs(clonePage - median(`${cell.label} null clone`)),
                Math.abs(insPage - median(`${cell.label} null ins`))
            );
            flatFloor.set(cell.nodes, floor);
            floorBorrowed = false;
        } else {
            floor = flatFloor.get(cell.nodes) ?? 0;
            floorBorrowed = true;
        }
        rows.push({
            cell,
            reps,
            clonePage,
            cloneTpl,
            insPage,
            insTpl,
            penalty,
            saving,
            net: saving - penalty,
            floor,
            floorBorrowed,
        });
    }

    line('');
    line(
        'THE TRADE, PER INSTANCE [ns] — penalty is what importNode COSTS at clone time, saving is ' +
            'what it BUYS at insert time, net is saving − penalty. A positive net means the trade ' +
            'pays at that size. Read every net against the floor beside it and NOT against zero.'
    );
    line(
        '  rung   nodes  shape   reps   clone page  clone tpl   penalty   ins page  ins tpl   ' +
            'saving    net       floor     verdict'
    );
    for (const r of rows) {
        const under = Math.abs(r.net) < r.floor;
        const verdict = under ? 'under floor' : r.net > 0 ? 'PAYS' : 'loses';
        line(
            `  ${r.cell.label.padEnd(6)} ${String(r.cell.nodes).padStart(5)}  ` +
                `${r.cell.shape.padEnd(6)} ${String(r.reps).padStart(5)}   ` +
                `${f(r.clonePage).padStart(10)}  ${f(r.cloneTpl).padStart(9)}  ` +
                `${nsStr(r.penalty).padStart(8)}  ${f(r.insPage).padStart(8)}  ` +
                `${f(r.insTpl).padStart(7)}  ${nsStr(r.saving).padStart(8)}  ` +
                `${nsStr(r.net).padStart(8)}  ` +
                `${(r.floorBorrowed ? '~' : '') + ns(r.floor).toFixed(1)}`.padStart(9) +
                `  ${verdict}`
        );
    }
    line(
        '  A floor printed with a leading ~ was measured on the `flat` rung of the same node ' +
            'count and borrowed by a `chain` rung, which has no null of its own.'
    );

    // ── PER NODE, which is where the prediction lives ────────────────────────────────────
    line('');
    line(
        'PER NODE [ns per node per instance] — this is the table that tests the mechanism. The ' +
            'model in the header says BOTH columns are flat down the ladder (both halves are ' +
            'per-node walks). A flat `penalty/node` with a flat `saving/node` means the ratio ' +
            'cannot change with size and no threshold can exist. A `penalty/node` that FALLS ' +
            'towards zero means the clone penalty is per CALL, and then a threshold does exist.'
    );
    line('  rung   nodes  shape   penalty/node   saving/node   net/node   penalty ÷ saving');
    for (const r of rows) {
        const pn = ns(r.penalty) / r.cell.nodes;
        const sn = ns(r.saving) / r.cell.nodes;
        const ratio = r.saving === 0 ? '—' : (r.penalty / r.saving).toFixed(2);
        line(
            `  ${r.cell.label.padEnd(6)} ${String(r.cell.nodes).padStart(5)}  ` +
                `${r.cell.shape.padEnd(6)} ${pn.toFixed(2).padStart(13)}  ` +
                `${sn.toFixed(2).padStart(12)}  ${(pn - sn).toFixed(2).padStart(9)}  ` +
                `${ratio.padStart(16)}`
        );
    }

    // ── THE CROSSOVER ───────────────────────────────────────────────────────────────────
    const flatRows = rows.filter((r) => r.cell.shape === 'flat');
    const chainRows = rows.filter((r) => r.cell.shape === 'chain');
    const crossing = flatRows.find((r) => r.net >= 0);
    const fit = fitLine(
        flatRows.map((r) => r.cell.nodes),
        flatRows.map((r) => ns(r.net))
    );
    const biggest = flatRows[flatRows.length - 1];

    line('');
    line('THE CROSSOVER — the size at which the saving at insert overtakes the penalty at clone');
    if (crossing !== undefined) {
        const resolved = Math.abs(crossing.net) >= crossing.floor;
        line(
            `  MEASURED AT ${crossing.cell.nodes} NODES — net ${nsStr(crossing.net)} ns per ` +
                `instance, floor ${ns(crossing.floor).toFixed(1)} ns. ` +
                (resolved
                    ? "It clears this run's own floor at that size, so the sign is a reading " +
                      'and not a coin toss.'
                    : 'IT DOES NOT CLEAR THE FLOOR AT THAT SIZE, so the crossover is bracketed ' +
                      'by this rung and its neighbours rather than located at it.')
        );
    } else {
        line(
            `  NONE IN THE SWEPT RANGE (1..${biggest.cell.nodes} nodes). Every rung's net is ` +
                'negative: the trade loses at every subtree size this ladder covers.'
        );
        if (fit.slope > 0) {
            const at = -fit.intercept / fit.slope;
            line(
                `  EXTRAPOLATED (a straight-line FIT over the ${flatRows.length} flat rungs, not ` +
                    `a measurement): net rises ${fit.slope.toFixed(2)} ns per node from an ` +
                    `intercept of ${fit.intercept.toFixed(1)} ns, which would cross zero at ` +
                    `${at.toFixed(0)} nodes. Check the per-node table before believing it: a fit ` +
                    'through a curve extrapolates nonsense, and nothing here measured that size.'
            );
            if (at <= biggest.cell.nodes) {
                refuse(
                    `import-node-trade: the straight-line fit crosses zero at ${at.toFixed(0)} ` +
                        `nodes, INSIDE the swept range, where no rung actually did — so the fit ` +
                        'is not describing these seven readings and its extrapolation means ' +
                        'nothing. Read the measured rows and ignore the line above.'
                );
            }
        } else {
            line(
                `  AND THERE IS NO CROSSOVER ON THIS TREND AT ANY SIZE: net moves AWAY from zero ` +
                    `at ${fit.slope.toFixed(2)} ns per node (straight-line fit over the ` +
                    `${flatRows.length} flat rungs). Growing the subtree makes the trade worse, ` +
                    'not better, so a size threshold in `has-adopting-steps` would have no size ' +
                    'to be set to.'
            );
        }
    }

    // ── THE FOUR FALSIFIERS, CHECKED MECHANICALLY ───────────────────────────────────────
    const penPerNode = flatRows.map((r) => ns(r.penalty) / r.cell.nodes);
    const savPerNode = flatRows.map((r) => ns(r.saving) / r.cell.nodes);
    /**
     * How far a per-node column varies down the ladder, as a ratio of the largest reading to the
     * smallest.
     *
     * IT IS TAKEN OVER MAGNITUDES AND IT RETURNS `Infinity` WHEN THE SIGNS DISAGREE, which is not
     * a formatting choice. A column holding both −3 and +5 has a "max ÷ min" of −1.67, and a
     * flatness test written on the raw values would read that as flatter than a column of 3 and 5.
     * A column that changes sign down the ladder is not flat by any reading, so it fails loudly.
     */
    const spread = (xs: readonly number[]): number => {
        let lo = Infinity;
        let hi = 0;
        let sawNegative = false;
        let sawPositive = false;
        for (const x of xs) {
            const a = Math.abs(x);
            if (a < lo) lo = a;
            if (a > hi) hi = a;
            if (x < 0) sawNegative = true;
            else sawPositive = true;
        }
        return lo === 0 || (sawNegative && sawPositive) ? Infinity : hi / lo;
    };
    const penSpread = spread(penPerNode);
    const savSpread = spread(savPerNode);
    /** Whether flat and chain agree at the node counts both were swept at — falsifier (d). */
    const shapeDisagreements: string[] = [];
    for (const c of chainRows) {
        const flatTwin = flatRows.find((r) => r.cell.nodes === c.cell.nodes);
        if (flatTwin === undefined) continue;
        const dNet = Math.abs(c.net - flatTwin.net);
        const agree = dNet < Math.max(c.floor, flatTwin.floor);
        if (!agree) {
            shapeDisagreements.push(
                `${c.cell.nodes} nodes: chain net ${nsStr(c.net)} vs flat ${nsStr(flatTwin.net)} ` +
                    `ns/instance, apart by ${ns(dNet).toFixed(1)} ns against a floor of ` +
                    `${ns(Math.max(c.floor, flatTwin.floor)).toFixed(1)} ns`
            );
        }
    }

    line('');
    line(
        'THE PREDICTION, CHECKED — the four falsifiers written into this file before the run. ' +
            'They are printed mechanically so that nothing gets picked afterwards.'
    );
    line(
        `  (a) net crosses zero at ≤ ${biggest.cell.nodes} nodes?   ` +
            (crossing !== undefined
                ? `YES, at ${crossing.cell.nodes} — THE MODEL IS WRONG, and a size threshold in ` +
                  'the predicate is the shape of the fix.'
                : 'NO — the model survives this one.')
    );
    line(
        '  (b) penalty per NODE flat down the ladder?   ' +
            `${penPerNode[0].toFixed(2)} … ${penPerNode[penPerNode.length - 1].toFixed(2)} ` +
            `ns/node, spread ${penSpread.toFixed(1)}× — ` +
            (penSpread <= 2
                ? 'flat enough to call the clone penalty PER NODE, which is the mechanism bet.'
                : 'NOT flat. The clone penalty is not a clean per-node cost, so "no crossover" ' +
                  'here is not evidence FOR the mechanism even if it holds.')
    );
    line(
        '  (c) saving per NODE flat down the ladder?    ' +
            `${savPerNode[0].toFixed(2)} … ${savPerNode[savPerNode.length - 1].toFixed(2)} ` +
            `ns/node, spread ${savSpread.toFixed(1)}× — ` +
            (savSpread <= 2
                ? 'flat, as the adoption walk being per-node predicts.'
                : 'NOT flat, though the specification says adoption visits every node — the ' +
                  'per-insertion constant is dominating at the small end, or something else is.')
    );
    line(
        `  (d) flat and chain agree at equal node count?   ` +
            (shapeDisagreements.length === 0
                ? 'YES, inside the floor at every size both were swept at — arrangement does not ' +
                  'move this trade.'
                : `NO — ${shapeDisagreements.join('; ')}. Depth is a variable in this trade and ` +
                  'the ladder is one shape short of describing it.')
    );

    // ── THE ANSWER ──────────────────────────────────────────────────────────────────────
    const smallest = flatRows[0];
    line('');
    line(
        `ANSWER — at ${INSTANCES} instances, sweeping ${smallest.cell.nodes}..` +
            `${biggest.cell.nodes} nodes: the trade nets ${nsStr(smallest.net)} ns per instance ` +
            `at ${smallest.cell.nodes} node and ${nsStr(biggest.net)} ns at ` +
            `${biggest.cell.nodes} nodes` +
            (crossing !== undefined
                ? `, crossing into profit at ${crossing.cell.nodes} nodes. A component larger ` +
                  'than that is one `importNode` pays for; the question the predicate now faces ' +
                  'is a SIZE THRESHOLD, not a removal.'
                : ', and it does not cross into profit anywhere in that range. `importNode` is ' +
                  'bought at clone time, on every instance forever, for a saving at insert time ' +
                  'that this instrument does not see come back at any subtree size a component ' +
                  'would be built at.') +
            ` Read those against the floor this run measured for itself at each size ` +
            `(${ns(smallest.floor).toFixed(1)} ns at ${smallest.cell.nodes} node, ` +
            `${ns(biggest.floor).toFixed(1)} ns at ${biggest.cell.nodes}) and not against zero. ` +
            'And read caveats (C) and (D) before quoting any of it at a real component: this ' +
            'ladder is elements only with one attribute each, and BOTH of those omissions push ' +
            'the real trade further into loss than the numbers above.'
    );
    line(
        '  WHAT THIS DOES NOT SAY: nothing here is an instruction to change ' +
            '`compileExoDomSchema.ts`, where the line it prices lived. It is a measurement of ' +
            `one trade at ${CELLS.length} shapes, and the render path is not touched without an ` +
            'explicit go.'
    );

    // ── SELF-CHECKS: the ways this run could be lying about its own numbers ──────────────
    for (const r of rows) {
        if (Math.abs(r.net) >= r.floor) continue;
        refuse(
            `import-node-trade: the net at rung "${r.cell.label}" (${nsStr(r.net)} ns per ` +
                `instance) is under this run's own floor at that size ` +
                `(${ns(r.floor).toFixed(1)} ns, two identical page-owned prototypes measured ` +
                'against each other) — it is not distinguishable from nothing and must not be ' +
                'attributed, in either direction.'
        );
    }
    for (const r of rows) {
        if (r.saving >= -r.floor) continue;
        refuse(
            `import-node-trade: rung "${r.cell.label}" measured template-owned insertion CHEAPER ` +
                `than page-owned by ${ns(-r.saving).toFixed(1)} ns per instance, past the floor ` +
                `(${ns(r.floor).toFixed(1)} ns). The DOM specification says the template-owned ` +
                'side runs an adoption walk the page-owned side does not, so this reads as the ' +
                'instrument being wrong rather than as a finding: check that the host is still ' +
                'connected and that each repetition is inserting FRESH clones.'
        );
    }
    for (const series of [
        ['clone page', (r: Row): number => r.clonePage],
        ['clone tpl', (r: Row): number => r.cloneTpl],
        ['ins page', (r: Row): number => r.insPage],
        ['ins tpl', (r: Row): number => r.insTpl],
    ] as Array<[string, (r: Row) => number]>) {
        const [what, get] = series;
        for (let i = 1; i < flatRows.length; i++) {
            if (get(flatRows[i]) >= get(flatRows[i - 1])) continue;
            refuse(
                `import-node-trade: "${what}" did not nest on the flat ladder — ` +
                    `${flatRows[i].cell.nodes} nodes (${f(get(flatRows[i]))} ms) measured ` +
                    `cheaper than ${flatRows[i - 1].cell.nodes} nodes ` +
                    `(${f(get(flatRows[i - 1]))} ms), though it is strictly more work on a ` +
                    'strictly larger tree. Every per-node figure at or above that rung is noise; ' +
                    'raise `rounds`, or raise the batch.'
            );
        }
    }
    const maxNet = Math.max(...rows.map((r) => Math.abs(r.net)));
    for (const r of rows) {
        if (r.floorBorrowed || r.floor <= maxNet * 0.25) continue;
        refuse(
            `import-node-trade: the null at rung "${r.cell.label}" read ` +
                `${ns(r.floor).toFixed(1)} ns per instance where the largest net anywhere in the ` +
                `run is ${ns(maxNet).toFixed(1)} ns — two IDENTICAL page-owned prototypes ` +
                'differed by a quarter of the whole subject or worse, so no attribution at that ' +
                'size stands. Raise `rounds`, or raise the batch.'
        );
    }
    for (const p of phases) {
        const region = (stats.get(p.name) as Stat).median * p.reps;
        const clockFloor = MIN_TICKS * quantum;
        if (region >= clockFloor) continue;
        const factor = region > 0 ? clockFloor / region : Infinity;
        const wantBatch = Number.isFinite(factor) ? Math.ceil(batch * factor) : batch * 10;
        refuse(
            `import-node-trade: the "${p.name}" timed region is ${region.toFixed(3)} ms at ` +
                `${p.reps} reps — ${(region / quantum).toFixed(1)}× the observed quantum ` +
                `(${quantum.toFixed(3)} ms), under the ${MIN_TICKS}× floor. Its digits are ` +
                `quantisation, not measurement. Re-run with batch ${wantBatch}: ` +
                `\`npm run axis --workspace=@exodra/benchmarks -- import-node-trade ${rounds} ` +
                `${wantBatch}\``
        );
    }
}
