// DIAGNOSTIC — WHAT DOES IT COST TO ASSOCIATE DATA WITH A DOM ELEMENT: AN EXPANDO SLOT, OR A
// `WeakMap` ENTRY?
//
// It answers ONE question, about ONE engine question, on the app the mount axis already measures
// (the 80-card todo app in `apps/exodra/exodra.tsx`). It is not a framework comparison and it is
// not part of `npm run bench`; it is registered as an axis only so it can reuse the runner that
// already starts Vite, drives headless Chromium and forwards the browser's console.
//
// ── WHAT THIS FILE USED TO BE, AND WHY THE AXIS KEY DID NOT CHANGE WITH IT ───────────────────
//
// It was called "what does the `EXO_CHILD` mark cost", and `EXO_CHILD` was a symbol `@exodra/dom`
// stored on every element it built, pointing back at that element's `TExoDomChild`. THAT MARK WAS
// REMOVED FROM THE PACKAGE — an element carries no pointer back to its child any
// more — so the question "what does OUR
// mark cost in OUR mount" has no subject and every participant, census line and printed sentence
// that named the symbol is gone from this file.
//
// WHAT SURVIVED IS EVERYTHING THAT WAS NEVER ABOUT THAT SYMBOL. The ladder rungs, the pool rows
// and the read and walk phases price a STORAGE MECHANISM — one property store on a host object
// against one `WeakMap.set`, on the write; one property load against one `get`, on the read; and a
// climb over a run of nodes that mostly do not carry the association, on the walk. Nothing in any
// of that depended on which library wrote the property or what it pointed at, and the question
// comes straight back the moment anything needs to associate data with an element again — the
// walking reconciler's repair pass builds exactly such a table, per repair, today.
//
// THE AXIS KEY IS STILL `child-mark`, DELIBERATELY. `measurements/child-mark.pool.json` is a
// recording that exists on disk and carries `"axis":
// "child-mark"` as its key; renaming the axis would orphan a run nothing can re-derive from the
// rows it holds. Every one of that file's fifteen rows is a surviving row — `clone`, `clone+rec`,
// the two `slot` rungs, the two `weak` rungs, `read·*`, `walk·*` and the four `pool·*` — so the
// recording is intact and only the name is a fossil. Read the key as "the axis that was first
// written to price a child mark", not as a claim that one exists.
//
// ── WHY THE QUESTION IS BEING ASKED, AND WHY NO EXISTING AXIS CAN ANSWER IT ──────────────────
//
// Three shipped choices in this tree turn on it — two on the write side, one on the read side —
// and until this axis existed all three were argued rather than measured:
//
//   · hydration's build record is a `WeakMap` keyed by the CHILD, and the alternative it
//     rejects is an expando on the ELEMENT.
//   · a delegated event pack keeps its handler and subject in string-keyed slots on the
//     element, and the alternative is a `WeakMap` per event name.
//   · a child's old position lives in a field, and the alternative is a table keyed by
//     element — the READ half of the same trade, once per child per diff.
//
// None of the mount or update axes can separate the storage operation from what surrounds it:
// `update-floor`'s shuffled recording prices a whole per-child record — literal, array and store
// together — at 16.4062 µs of a 64.0625 µs gap, and its own header says there is no arrangement of
// a reconcile in which the record exists and the store does not. This file is the program in which
// those two can differ and nothing else can.
//
// WHAT POPULATION IT ASSOCIATES DATA FOR, and it is a DEFINITION now rather than a probe. The
// ladder and the pool associate one record with every COMPONENT INSTANCE ROOT the benchmark app
// builds — the app root, every card, every open details panel, every tag — because that is the
// granularity at which a renderer has anything worth hanging on an element, and it is the mix of
// element SHAPES a real mount would store onto (hazard 6). It used to be PROBED, by mounting the
// app and counting the elements carrying the symbol; with the symbol gone there is nothing to
// probe, so the census now COUNTS those roots in a real mount and refuses if the arithmetic this
// file does from the app spec disagrees with what the mount actually produced. That is a weaker
// gate than the probe was — it catches a stale dist rendering a different app, and it can no
// longer catch the renderer changing its mind about which elements it associates data with,
// because the renderer no longer associates data with any.
//
// ── WHAT THE FIRST TWO RUNS SHOWED, AND WHY THE LADDER IS NOW A DENOMINATOR ──────────────────
//
// This file was first written as a ladder alone. It was run at 100 rounds and again at 400, and it
// REFUSED ITSELF BOTH TIMES, identically. The refusal was right and its advice was wrong, and both
// halves of that are worth keeping in the file rather than quietly repaired.
//
// WHAT CAME BACK. Each rung's region landed at about 2.0 ms against an observed quantum of 0.1 ms
// — twenty ticks, comfortably over the three-tick bar. But the DIFFERENCES between rungs came back
// as 0.0000, ±0.0050 and 0.0100 ms, and a per-repetition median at twenty repetitions is quantised
// at `quantum / reps` = 0.005 ms. So every derived figure in that run was zero, one or two units of
// the quantisation grid: `slot·first` and `slot·second` were EXACTLY ZERO, `record` was MINUS ONE
// UNIT, and `weak·insert` was two.
//
// WHY MORE ROUNDS CANNOT HELP, WHICH IS WHAT THE OLD REFUSAL GOT WRONG. Rounds buy more samples of
// a difference the clock cannot represent. The median of quantised samples is quantised: 400 rounds
// of a difference smaller than one grid unit is 400 samples that all land on the same grid point.
// The knob that matters is the one that makes the DIFFERENCE bigger inside a single region, not the
// one that collects more regions. This file now says so, in the refusal, by name.
//
// WHAT FACTOR THE LADDER WOULD NEED, and the arithmetic is the whole argument. A difference `D` per
// repetition clears three ticks when `D × reps ≥ 3 × quantum`, i.e. `reps ≥ 3 × quantum / D`.
//   · Taking `D` at the resolution limit it was already under (0.005 ms) gives `reps ≥ 60` — three
//     times today's twenty, and useless, because the run proved `D` is BELOW that limit.
//   · The anchor for the size of `D` is now this file's OWN pool rows. What used to stand here was
//     a property load on a schema slot at 6.6 ns / 7.7 ns
//     (`docs-site/blog/2026-08-01-weakmap-vs-patching.md:77-78`, quoted by `exoTermSchemaOf.ts`
//     until that file struck it) — a blog table with no run behind it anywhere in
//     `measurements/`. `pool·slot·first` prices the very store this ladder cannot resolve, over
//     `POOL_N` of them in one region, and puts `D` in single-digit ns per association. So `D` for
//     one app is INSTANCES × (1…7) ns ≈ 0.24…1.7 µs, and `reps ≥ 3 × 0.1 / D` lands between about 180 and 1250.
//     THE CAVEAT THAT STOOD HERE IS DISCHARGED, AND IT IS WORTH SAYING WHAT IT WAS: `POOL_N` is
//     derived from the app census at run time, and it used to be PRINTED and never recorded, so
//     `child-mark.pool.json` carried no divisor and every per-store figure quoted from these rows
//     was arithmetic somebody did once at a console — the same defect as the blog table above, one
//     level down. The pool rows now carry `POOL_N` and their ns/store as the eighth and ninth
//     columns of the statistics table, which the recorder files as `trailing1` and `trailing2`
//     (see the table printer and `run-one-axis.js:1030-1031, 1351-1356`). A recording written
//     BEFORE that column existed still has no divisor, and a figure quoted from one is still
//     unrebuildable — quote its median, or re-run the axis.
//
// WHAT THAT COSTS, AND WHY IT IS NOT DONE. Every rung must keep everything it allocates alive to
// the end of its sample — that rule is the only reason the rungs share a GC regime and therefore
// the only reason the subtraction means anything. At `reps = 250` the live set is 250 apps' worth
// of clones, which the census prints as elements; at `reps = 1250` it is five times that, plus a
// record and a `disposers` array per mark. On this machine that is hundreds of megabytes standing
// at once, built and dropped once per sample, seven rungs × the round count. And the memory is not
// even the fatal part: at that live set a major collection lands INSIDE a timed region, and one GC
// pause is milliseconds against a signal of about one microsecond. The ladder would destroy the
// subtraction it was scaled up to make. So:
//
//   THE VERDICT: THIS DIFFERENCE CANNOT BE MEASURED BY THIS LADDER ON THIS MACHINE. The clone loop
//   is roughly twenty times the thing being priced and is carried inside every region for one
//   reason only — to produce an element that has never held the association.
//
// WHAT THE LADDER IS FOR NOW. It stays, unchanged, at twenty repetitions, and it is the
// DENOMINATOR: it is the only phase family that puts the store inside a mount-shaped loop, so it
// supplies "what a clone costs per associated instance" and it supplies the upper bound on the
// store and on the record — a quantity that reads zero on a known grid is bounded above by that
// grid, and that is a result. It no longer pretends to supply the numerator.
//
// WHAT REPLACES IT AS THE NUMERATOR — THE POOL. The clone is removed from the region entirely: a
// large pool of clones is built UNTIMED, its records are allocated UNTIMED, and the timed region is
// nothing but one storage operation per pool entry. The signal is then the whole region instead of
// a twentieth of it, and the pool's SIZE is the knob — it grows the difference rather than
// collecting more samples of it. What the pool gives up is context: it is not inside a mount, so it
// cannot say what fraction of a mount anything is. The ladder supplies that denominator; the pool
// supplies the numerator; neither is asked for the other's number.
//
// ── WHAT IS MEASURED ────────────────────────────────────────────────────────────────────────
//
// SEVEN LADDER RUNGS, every one of them a whole app's census of clones, all interleaved in one run
// with the order rotated per round and a GC before every sample. Rungs 1-3 are the pair the
// question needs; the rest exist to make that pair readable.
//
//   clone            every clone one mount makes, in mount order, and nothing else.
//   clone+rec        the same, plus ONE `TExoDomChild`-shaped literal per MARKED instance,
//                    written into a sink so it stays alive. No store onto any element.
//   clone+rec+slot   the same, plus `element[ASSOC] = rec` — one FIRST store per associated
//                    instance, onto a clone made microseconds earlier.
//   clone+rec2       two literals per associated instance, no store. The baseline for the next rung.
//   clone+rec2+slot2 two literals, and BOTH stored onto the same element, in order.
//   clone+rec+weak   one literal, and `table.set(element, rec)` into a WeakMap allocated untimed
//                    for this repetition. The counterfactual of alternative (2).
//   clone+rec2+weak2 two literals, two `set`s onto the same key — an insert then an update.
//
// FOUR ISOLATED PHASES over ONE real mounted app, built before the run and kept alive:
//
//   read·slot   one `element[ASSOC]` per associated element.
//   read·weak   one `table.get(element)` over a table holding exactly the same entries.
//   walk·slot   a climb from every `.tag` in the app to `null`, reading the association on every
//               ancestor. IT IS A COPY OF NO SHIPPED FUNCTION and does not claim to be: it was
//               `exoContextAt`'s loop verbatim until that function was deleted with the DOM
//               context walk. It is kept as a SYNTHETIC walk, because what it is here for is the
//               storage RATIO on a mostly-missing run — which is the shape any lookup over a chain
//               of nodes has — and not to price a call site.
//   walk·weak   the same climb, `table.get(at)` per ancestor. Most ancestors carry nothing, so
//               this prices a hash MISS where the slot prices an absent-property load. That
//               asymmetry is the whole reason the read side is in this file at all.
//
// FOUR POOL PHASES, described in their own section below, which is where the numerator now comes
// from: `pool·slot·first`, `pool·slot·repeat`, `pool·weak·first`, `pool·weak·repeat`.
//
// The ladder derives the five figures below, in ns per associated instance — and after the first
// two runs every one of them is printed in GRID UNITS beside its milliseconds, because a figure
// under one unit of `quantum / reps` is an upper BOUND and not a measurement, and printing
// "0.00 ns/assoc" for it would have claimed the opposite of what it means:
//
//   record      (clone+rec) − (clone)                   the literal alone — the half `update-floor`
//                                                       admits it cannot separate
//   slot·first  (clone+rec+slot) − (clone+rec)          THE ANSWER: what one expando store costs
//   slot·second (clone+rec2+slot2) − (clone+rec2)       two stores, minus …
//                 − slot·first                          … the first: a store with no transition
//   transition  slot·first − slot·second                the hidden-class cost of the FIRST store
//   weak·insert (clone+rec+weak) − (clone+rec)          the same work through a WeakMap
//
// ── HAZARD 1: WHICH STORE IS BEING MEASURED ─────────────────────────────────────────────────
//
// A symbol store onto a fresh clone may be a SHAPE TRANSITION, in which case the second store onto
// the same element is not the same price as the first. `slot·first` measures the FIRST store and
// only ever the first: every element it writes to was cloned inside the same timed region and has
// never carried the symbol. That is exactly the store the child maker performs, so it is the figure
// the design question needs.
//
// `slot·second` is how the transition gets isolated WITHOUT a second population and without a
// `delete`. The `slot2` rung stores TWO DISTINCT records onto each element in sequence; subtract
// the one-store rung and what is left is the second store — same clone, same instant, same cache
// residency, same allocation regime, differing from the first store in nothing but whether the
// property already existed. A separate pre-built population would have differed in residency too,
// and the difference would then have been unattributable.
//
// THE TWO RECORDS ARE DISTINCT OBJECTS ON PURPOSE. Storing the same value twice is a store an
// optimiser is allowed to reason about; storing two different objects is not. And the allocation
// is matched by `clone+rec2`, which allocates both literals and stores neither, so the subtraction
// is stores and nothing else.
//
// THIS REPOSITORY HOLDS BOTH ANSWERS TO THAT QUESTION AND HAS NEVER SETTLED IT. The claim on one
// side is that a symbol store onto a DOM element pays no shape transition at all, because a DOM
// element is a host object already in dictionary mode — which is what a symbol slot on an ordinary
// JS object (a *schema*, say) would not be. If that holds, `transition` comes out at zero and the
// claim is measured for the first time. If it does not, every argument built on it is wrong.
//
// ── HAZARD 2: NOTHING IS DELETED, ANYWHERE ──────────────────────────────────────────────────
//
// Deleting a property to reset an element pushes that object into dictionary mode permanently, and
// every later store measured on it is a store into a degraded object a fresh clone never is. This
// file therefore contains no `delete`, and every element it stores onto is either (a) cloned inside
// the timed region, or (b) part of the live app and read only.
//
// ── WHAT WOULD MAKE THE COMPARISON LIE ──────────────────────────────────────────────────────
//
// 1. A DEAD STORE. `element[ASSOC] = rec` on an element nothing reads is, in principle,
//    removable. In practice it crosses into Blink's named-property machinery on a host object and
//    cannot be folded away — but "in practice" is not a gate, so `gateStore` performs one rung's
//    worth of stores and reads every association back by identity before anything is timed. The
//    record sinks are module-level bindings and therefore escape.
//
// 2. THE LITERAL SWAMPING THE STORE. If `record` is very large next to `slot·first`, the answer is
//    a difference between two close medians and is noise. The run refuses by name when the ladder
//    does not nest (a rung measuring cheaper than the rung it contains) — the same refusal
//    `mount-phases` prints, for the same reason.
//
// 3. THE CLOCK. Chromium's `performance.now()` is clamped, and 240 stores is far under one tick.
//    The run OBSERVES its own quantum rather than assuming 0.1 ms, prints it, and refuses by name
//    any phase whose timed region landed under THREE of them. A row under three ticks is a row
//    whose median can move by a third of itself for no reason at all.
//
// 4. AN UNMATCHED GC REGIME. Every rung is handed its own sinks, allocated in the untimed `prep`,
//    and everything it allocates stays reachable until the sample ends — so no rung allocates into
//    a recycling nursery while another allocates into a growing live set. This is the rule
//    `mount-phases` states at its stage comments and it is the reason `clone` writes a sink it
//    never reads.
//
// 5. THE WEAKMAP TABLE'S FILL FACTOR. `clone+rec+weak` allocates a FRESH table per repetition, so
//    every `set` is an insert into a small, growing table. A process-lifetime table in a real
//    renderer would be larger and would rehash; a table that is thrown away every 240 inserts is
//    the WeakMap's FRIENDLIEST case. So `weak·insert` is a LOWER bound on what alternative (2)
//    would cost, which is the safe direction — if the friendliest WeakMap already loses, the real
//    one does too.
//
// 6. THE STORE SITE'S INLINE CACHE. A store site that saw one element shape would get a
//    monomorphic IC that a real renderer's site does not have. So the replica clones the app's
//    REAL MIX of four component roots (app, card, details, tag), in mount order, and stores onto
//    every one of them.
//
// 7. THE CENSUS DRIFTING FROM THE APP. The population is a definition (every component instance
//    root), but the COUNT is not taken on trust: the census mounts the real app, counts those
//    roots in the document, and refuses if the arithmetic this file derives from the app spec
//    disagrees. That catches a stale dist, a changed spec, and a mount that silently built
//    something else. What it can no longer catch — and this is the gate the mark's removal cost —
//    is the renderer changing which elements it associates data with, because it associates data
//    with none.
//
// 8. THE READ PHASES ARE NOT A MOUNT. `read·slot` and `walk·slot` run over an app that has been
//    resident for the whole run; a real lookup reads nodes that were touched moments ago by the
//    update underneath it. Both read phases are therefore the friendliest case for BOTH storage
//    choices, and their RATIO is what they are for — not their absolute values.
//
// ── HOW THIS FILE MEASURES, AND WHY NOT THROUGH `abBench` ───────────────────────────────────
//
// The same two reasons `mount-phases` gives: `abBench`'s `batch` is one number for the whole run
// and this run needs a repetition factor per phase (the isolated reads need three orders of
// magnitude more repetitions than the ladder), and `abBench` prints its medians where the whole
// output here is a set of DIFFERENCES. What is kept from `abBench` is everything that makes a
// number trustworthy: interleaving with the order rotated per round, a GC before every sample, and
// the full min/p25/median/p75/max spread rather than a mean.
//
//     npm run axis --workspace=@exodra/benchmarks -- child-mark
//     npm run axis --workspace=@exodra/benchmarks -- child-mark 200   # if any row was refused
//
// `@exodra/dom` is resolved to its BUILT dist, exactly as the axes are, so `npm run build` at the
// repo root has to have run or this attributes a stale renderer.
//
// ── WHAT IT DOES NOT ANSWER ─────────────────────────────────────────────────────────────────
//
// IT SAYS NOTHING ABOUT WHETHER ANY PARTICULAR ASSOCIATION IS WORTH HAVING. It prices the two
// mechanisms and it does not know what the data is for; the question of whether a given engine
// needs an element→data direction at all is a design question, and this repository has answered it
// "no" once already, on grounds that were never a speed argument.
//
// IT IS NOT A SHARE OF A MOUNT. The pool figures are ns per store and must never be quoted as a
// percentage of anything; the ladder is the only phase family that carries a mount-shaped
// denominator, and the ladder's own answer is a BOUND.
//
// AND ITS NUMBERS ARE NOT INTERCHANGEABLE WITH A TABLE KEYED BY SCHEMA. Everything here is keyed
// by ELEMENT — a host object — which is the one thing that makes the expando side interesting at
// all. A `WeakMap` keyed by an ordinary JS object is a different measurement and this axis does not
// make it.
import { EXO_NO_MANAGED_STATE, EXO_NO_STATE } from '@exodra/core';
import { ExoDomBackend, exoDomSchemaOf } from '@exodra/dom';
import type { TExoDomSchema, TExoDomChild } from '@exodra/dom';
import { APP, CARD, DETAILS, TAG, mountExodraApp } from '../../participants/exodra/app';
import { IDX, el, startsOpen, startCount, type AppHandle } from '../../shared/todo-spec';
import type { Scenario } from '../../../harness';

const EXO_BACKEND = new ExoDomBackend();

// eslint-disable-next-line no-console
const line = (s: string): void => console.log(`✅ ${s}`);
// eslint-disable-next-line no-console
const refuse = (s: string): void => console.log(`❌ ${s}`);

// ---------------------------------------------------------------------------------------
// THE SCHEMAS. The SAME objects a mount uses: `exoDomSchemaOf` caches on `machine.forms`
// and a render keys the cache on the same `EXO_BACKEND`'s `backendType`, so whichever of the two runs
// first, the other finds this schema.
// ---------------------------------------------------------------------------------------

const APP_PLAN = exoDomSchemaOf(APP, EXO_BACKEND);
const CARD_PLAN = exoDomSchemaOf(CARD, EXO_BACKEND);
const DETAILS_PLAN = exoDomSchemaOf(DETAILS, EXO_BACKEND);
const TAG_PLAN = exoDomSchemaOf(TAG, EXO_BACKEND);

const CARD_N = IDX.length;
const DETAILS_N = IDX.reduce((s, i) => s + (startsOpen(i) ? 1 : 0), 0);
const TAG_N = IDX.reduce((s, i) => s + startCount(i), 0);
const INSTANCES = 1 + CARD_N + DETAILS_N + TAG_N;

// ---------------------------------------------------------------------------------------
// THE ASSOCIATION, one of the two mechanisms under test.
//
// A SYMBOL AND NOT A STRING, because a string expando is visible to `for…in`, to `Object.keys` and
// to anything that serialises a node, and because that is the shape any engine that reached for
// this would use. `Symbol.for` rather than `Symbol` for no reason that matters here — nothing else
// in the process looks it up.
//
// THE HELPERS CARRY THE CAST AND NOTHING ELSE. A `hasOwnProperty` test or a `try` here would be
// measured as if it were part of the store.
// ---------------------------------------------------------------------------------------

const ASSOC = Symbol.for('exodra.bench.element-assoc');

type AssocSlot = Record<symbol, TExoDomChild | undefined>;

function assocOf(node: Node): TExoDomChild | undefined {
    return (node as unknown as AssocSlot)[ASSOC];
}

// ---------------------------------------------------------------------------------------
// THE RECORD, copied field for field out of `exo-dom-child-factory.ts` — the same twenty-four fields
// in the same order, with both hooks pointing at shared module-level functions so a record
// allocates no closures.
//
// FIELD ORDER IS LOAD-BEARING AND SO IS THE SHARING. The shipped form is a CONSTRUCTOR (`new
// ExoDomChild(…)`, not an object literal — that file's header prices the literal at ~107 ns more
// per object), every field is assigned in the constructor body because a field added later spills
// the object out of its in-object property store, and `live` stands last because moving it moves
// every other field's offset. A replica that got any of that wrong would price a record this
// renderer does not build, and `record` is one of the two figures this file exists to produce.
//
// IF `exo-dom-child-factory.ts` CHANGES AND THIS COPY DOES NOT, this diagnostic stops measuring the
// renderer and says nothing about it — the same hazard `mount-phases` carries for its copy of the
// walk replay, and the same answer: there is no way to reach the record without also running the
// mark, which is the separation this whole file is for. THAT HAZARD HAS ALREADY BEEN TAKEN ONCE:
// the per-instance record and the child are ONE object, so the eleven instance-record slots —
// `nodes`, `childLists`, `child`, `context`, `schema`, `written`, `writes`, `adopting`,
// `publishedChildListEnds`, `state`, `effectStops` — stand IN FRONT OF `node` in both makers, and a
// replica missing any of them is a different hidden class at a different size, priced by the
// `record` rung and reported as the renderer's.
// ---------------------------------------------------------------------------------------

/**
 * THE NODE TABLE OF AN INSTANCE WITH NOTHING TO RESOLVE — ONE array for the process, exactly as
 * `EXO_EMPTY_NODES` is in `@exodra/dom`, which is what every record leaves this literal
 * holding. A fresh `[]` per record would add an allocation the shipped literal does not make, and
 * this file's whole subject is what one record costs.
 */
const EMPTY_NODES: Node[] = [];

const NO_MOUNT = function (this: TExoDomChild): void {
    // Nothing. A child that wants a mount hook overwrites the field.
};

const DISPOSE_SELF = function (this: TExoDomChild): void {
    // MIRRORS `disposeExoChildSelf` AS IT IS NOW: `disposers` is null until a child's first
    // `onTeardown`, so a child that never subscribed has no loop to run. This replica exists to carry
    // the real record's cost, so it carries this test too.
    const disposers = this.disposers;
    if (disposers !== null) {
        for (let i = 0; i < disposers.length; i++) disposers[i]();
        disposers.length = 0;
    }
};

/** THE SCHEMA A MARKED CLONE BELONGS TO, by the same four classes the census decides kind with.
 *  Used only where the kind is not known statically, and never inside a timed region. */
function schemaOfMarked(node: Element): TExoDomSchema {
    const cls = node.classList;
    if (cls.contains('tag')) return TAG_PLAN;
    if (cls.contains('details')) return DETAILS_PLAN;
    if (cls.contains('card')) return CARD_PLAN;
    return APP_PLAN;
}

/** THE SCHEMA COMES FIRST, as it does in `createExoDomChildFactory`'s own constructor — one
 *  argument per call either way, so the replica is not made cheaper than the object it prices. */
function makeRecord(schema: TExoDomSchema, node: Element): TExoDomChild {
    return {
        // THE INSTANCE-RECORD SLOTS, FIRST AND IN THIS ORDER — a `TExoDomChild` IS the record
        // its instance is wired through (`TExoDomInstanceRecord`), and `createExoDomChildFactory` writes
        // them IN FRONT OF `node`, in exactly this sequence, so a record and a child fold
        // into one hidden-class shape at every shared offset. A replica that put them anywhere
        // else, or left any of them out, would be a different hidden class at a different size from
        // the object this file prices.
        //
        // THEY ARRIVE EMPTY IN THE SHIPPED CONSTRUCTOR TOO: the wire fills them afterwards, and the
        // node table starts as the shared empty one so the literal allocates exactly one object.
        nodes: EMPTY_NODES,
        childLists: null,
        child: null,
        context: null,
        schema,
        publishedChildListEnds: null,
        state: EXO_NO_STATE,
        managedState: EXO_NO_MANAGED_STATE,
        effectStops: null,
        transitionOverrides: null,
        serviceState: undefined,
        machine: null,
        portChildren: null,
        placedIn: null,
        node,
        mount: NO_MOUNT,
        unmount: DISPOSE_SELF,
        disposers: [],
        // LAST, AS IT IS IN THE SHIPPED CONSTRUCTOR: moving it moves every other field's in-object
        // offset, so a replica that put it anywhere else would be a different shape.
        live: null,
    };
}

// ---------------------------------------------------------------------------------------
// THE CENSUS — COUNTED OFF A REAL MOUNT, NOT WRITTEN DOWN.
//
// This is the one number every figure below is divided by, so it is the one number that must not
// be an assumption. A real app is mounted and its component instance roots are counted per kind.
// The replica is then built to reproduce that count exactly, and refused if it does not.
//
// KIND IS DECIDED BY THE SAME SELECTORS `mount-phases`' gate uses, plus the app root, because those
// are the four prototypes a mount clones. A kind the mount does not produce, or a count the app
// spec's arithmetic does not reproduce, is refused by name
// rather than letting the totals happen to agree.
// ---------------------------------------------------------------------------------------

interface Census {
    /** Every element under the container, associated or not. */
    readonly elements: number;
    /**
     * COMPONENT INSTANCE ROOTS COUNTED IN THE DOCUMENT — the population this axis associates a
     * record with, and the denominator of every per-association figure.
     *
     * IT IS A DEFINITION COUNTED, NOT A PROPERTY PROBED, and the difference is a gate this axis
     * used to have and no longer can. It used to look for a symbol the renderer wrote on every
     * child root; with that symbol removed from the package there is nothing on an
     * element to ask, so the four kinds are found by SELECTOR and counted. What survives is the
     * check that the count matches the arithmetic derived from the app spec — which catches a
     * stale dist and a changed app, and cannot catch a renderer changing its mind.
     */
    readonly roots: number;
    readonly appFound: boolean;
    readonly cardFound: boolean;
    readonly detailsFound: boolean;
    readonly tagFound: boolean;
}

function takeCensus(): Census {
    const c = el();
    const app = mountExodraApp(c);
    const root = c.firstElementChild;
    if (root === null) throw new Error('child-mark: the mounted app has no root element');

    const all = Array.from(c.querySelectorAll('*'));
    let roots = 0;
    let appFound = false;
    let cardFound = false;
    let detailsFound = false;
    let tagFound = false;
    for (const node of all) {
        if (node === root) {
            appFound = true;
        } else if (node.classList.contains('card')) {
            cardFound = true;
        } else if (node.classList.contains('details')) {
            detailsFound = true;
        } else if (node.classList.contains('tag')) {
            tagFound = true;
        } else {
            continue;
        }
        roots++;
    }

    app.teardown();
    c.remove();

    return { elements: all.length, roots, appFound, cardFound, detailsFound, tagFound };
}

const CENSUS = takeCensus();

/**
 * HOW MANY ASSOCIATIONS THE REPLICA MUST WRITE — one per component instance root, derived from the
 * app's own spec and gated against what a real mount actually built (`gateCensus`).
 *
 * IT IS THE SAME ARITHMETIC AS `INSTANCES` and is spelled out again rather than aliased, because
 * the two are different claims: `INSTANCES` is how many components the app builds, and this is how
 * many of them this axis chooses to hang a record on. They agree today because the population is
 * "every instance root"; a narrower population would change this line and not that one.
 */
const ASSOCS = 1 + CARD_N + DETAILS_N + TAG_N;

function printCensus(): void {
    line('ELEMENT-ASSOCIATION CENSUS — counted off a real mount, nothing measured');
    line(`  elements in one mounted app          ${CENSUS.elements}`);
    line(`  instances one mount builds           ${INSTANCES}`);
    line(`  component roots found in the tree    ${CENSUS.roots}`);
    line(
        `  which kinds were found               app=${CENSUS.appFound} card=${CENSUS.cardFound} ` +
            `details=${CENSUS.detailsFound} tag=${CENSUS.tagFound}`
    );
    line(`  associations the replica will write  ${ASSOCS}`);
    line(
        `  what the renderer itself associates   NOTHING — @exodra/dom stores nothing on an ` +
            `element, so this population is this axis's own definition`
    );
}

// ---------------------------------------------------------------------------------------
// THE LADDER. Seven functions rather than one with flags: a branch per instance that no
// implementation has is still a branch the measurement would carry, and V8 optimises a
// straight-line loop differently from one carrying a mode.
//
// EVERY RUNG KEEPS ITS CLONES AND ITS RECORDS ALIVE FOR THE WHOLE TIMED REGION. A timed region
// runs N repetitions before it stops; a rung that dropped each repetition's allocations on the
// floor would be allocating into a nursery that recycles instead of into a growing live set, and
// would read cheaper than the same allocations cost inside a mount. So each repetition is handed
// its OWN sinks, allocated in the untimed `prep`, and everything it makes is reachable until the
// sample ends. `stageClone` writes a sink it never reads for exactly this reason.
//
// THE MARKED KINDS ARE THE CENSUS'S, not a guess. If a mount marks card roots and not tag roots,
// the replica does the same, so the store site sees the shapes the renderer's store site sees.
// ---------------------------------------------------------------------------------------

/** One repetition's clones — `INSTANCES` slots, packed, allocated untimed. */
function makeCloneSink(): Element[] {
    return new Array<Element>(INSTANCES).fill(APP_PLAN.proto);
}

/** One repetition's records — `ASSOCS` slots, packed, allocated untimed. */
function makeRecordSink(): Array<TExoDomChild | null> {
    return new Array<TExoDomChild | null>(ASSOCS).fill(null);
}

const HAS_APP = CENSUS.appFound;
const HAS_CARD = CENSUS.cardFound;
const HAS_DETAILS = CENSUS.detailsFound;
const HAS_TAG = CENSUS.tagFound;

/** RUNG 1 — the clones and nothing else, in mount order. */
function stageClone(clones: Element[]): void {
    clones[0] = APP_PLAN.proto.cloneNode(true) as Element;
    let at = 1;
    for (let i = 0; i < CARD_N; i++) {
        clones[at++] = CARD_PLAN.proto.cloneNode(true) as Element;
        if (startsOpen(i)) clones[at++] = DETAILS_PLAN.proto.cloneNode(true) as Element;
        const n = startCount(i);
        for (let t = 0; t < n; t++) clones[at++] = TAG_PLAN.proto.cloneNode(true) as Element;
    }
}

/** RUNG 2 — the same clones, plus ONE record per associated instance. No store onto any element. */
function stageCloneRec(clones: Element[], recs: Array<TExoDomChild | null>): void {
    const appRoot = APP_PLAN.proto.cloneNode(true) as Element;
    clones[0] = appRoot;
    let at = 1;
    let r = 0;
    if (HAS_APP) recs[r++] = makeRecord(APP_PLAN, appRoot);
    for (let i = 0; i < CARD_N; i++) {
        const card = CARD_PLAN.proto.cloneNode(true) as Element;
        clones[at++] = card;
        if (HAS_CARD) recs[r++] = makeRecord(CARD_PLAN, card);
        if (startsOpen(i)) {
            const d = DETAILS_PLAN.proto.cloneNode(true) as Element;
            clones[at++] = d;
            if (HAS_DETAILS) recs[r++] = makeRecord(DETAILS_PLAN, d);
        }
        const n = startCount(i);
        for (let t = 0; t < n; t++) {
            const tag = TAG_PLAN.proto.cloneNode(true) as Element;
            clones[at++] = tag;
            if (HAS_TAG) recs[r++] = makeRecord(TAG_PLAN, tag);
        }
    }
}

/** RUNG 3 — rung 2 plus the FIRST store. This is `createExoDomChildFactory`, line for line. */
function stageCloneRecSlot(clones: Element[], recs: Array<TExoDomChild | null>): void {
    const appRoot = APP_PLAN.proto.cloneNode(true) as Element;
    clones[0] = appRoot;
    let at = 1;
    let r = 0;
    if (HAS_APP) {
        const rec = makeRecord(APP_PLAN, appRoot);
        recs[r++] = rec;
        (appRoot as unknown as AssocSlot)[ASSOC] = rec;
    }
    for (let i = 0; i < CARD_N; i++) {
        const card = CARD_PLAN.proto.cloneNode(true) as Element;
        clones[at++] = card;
        if (HAS_CARD) {
            const rec = makeRecord(CARD_PLAN, card);
            recs[r++] = rec;
            (card as unknown as AssocSlot)[ASSOC] = rec;
        }
        if (startsOpen(i)) {
            const d = DETAILS_PLAN.proto.cloneNode(true) as Element;
            clones[at++] = d;
            if (HAS_DETAILS) {
                const rec = makeRecord(DETAILS_PLAN, d);
                recs[r++] = rec;
                (d as unknown as AssocSlot)[ASSOC] = rec;
            }
        }
        const n = startCount(i);
        for (let t = 0; t < n; t++) {
            const tag = TAG_PLAN.proto.cloneNode(true) as Element;
            clones[at++] = tag;
            if (HAS_TAG) {
                const rec = makeRecord(TAG_PLAN, tag);
                recs[r++] = rec;
                (tag as unknown as AssocSlot)[ASSOC] = rec;
            }
        }
    }
}

/** RUNG 4 — TWO records per associated instance, no store. The baseline rung 5 subtracts. */
function stageCloneRec2(
    clones: Element[],
    recs: Array<TExoDomChild | null>,
    recs2: Array<TExoDomChild | null>
): void {
    const appRoot = APP_PLAN.proto.cloneNode(true) as Element;
    clones[0] = appRoot;
    let at = 1;
    let r = 0;
    if (HAS_APP) {
        recs[r] = makeRecord(APP_PLAN, appRoot);
        recs2[r] = makeRecord(APP_PLAN, appRoot);
        r++;
    }
    for (let i = 0; i < CARD_N; i++) {
        const card = CARD_PLAN.proto.cloneNode(true) as Element;
        clones[at++] = card;
        if (HAS_CARD) {
            recs[r] = makeRecord(CARD_PLAN, card);
            recs2[r] = makeRecord(CARD_PLAN, card);
            r++;
        }
        if (startsOpen(i)) {
            const d = DETAILS_PLAN.proto.cloneNode(true) as Element;
            clones[at++] = d;
            if (HAS_DETAILS) {
                recs[r] = makeRecord(DETAILS_PLAN, d);
                recs2[r] = makeRecord(DETAILS_PLAN, d);
                r++;
            }
        }
        const n = startCount(i);
        for (let t = 0; t < n; t++) {
            const tag = TAG_PLAN.proto.cloneNode(true) as Element;
            clones[at++] = tag;
            if (HAS_TAG) {
                recs[r] = makeRecord(TAG_PLAN, tag);
                recs2[r] = makeRecord(TAG_PLAN, tag);
                r++;
            }
        }
    }
}

/**
 * RUNG 5 — rung 4 plus BOTH stores, in order, onto the same element.
 *
 * THE SECOND STORE WRITES A DIFFERENT OBJECT. Storing the same value twice is a store an optimiser
 * is allowed to reason about; storing two distinct records is not. The allocation of that second
 * record is matched by rung 4, so `(rung 5) − (rung 4)` is two stores and nothing else, and
 * subtracting `slot·first` from it leaves the second store — the one whose property already exists.
 */
function stageCloneRec2Slot2(
    clones: Element[],
    recs: Array<TExoDomChild | null>,
    recs2: Array<TExoDomChild | null>
): void {
    const appRoot = APP_PLAN.proto.cloneNode(true) as Element;
    clones[0] = appRoot;
    let at = 1;
    let r = 0;
    if (HAS_APP) {
        const a = makeRecord(APP_PLAN, appRoot);
        const b = makeRecord(APP_PLAN, appRoot);
        recs[r] = a;
        recs2[r] = b;
        r++;
        (appRoot as unknown as AssocSlot)[ASSOC] = a;
        (appRoot as unknown as AssocSlot)[ASSOC] = b;
    }
    for (let i = 0; i < CARD_N; i++) {
        const card = CARD_PLAN.proto.cloneNode(true) as Element;
        clones[at++] = card;
        if (HAS_CARD) {
            const a = makeRecord(CARD_PLAN, card);
            const b = makeRecord(CARD_PLAN, card);
            recs[r] = a;
            recs2[r] = b;
            r++;
            (card as unknown as AssocSlot)[ASSOC] = a;
            (card as unknown as AssocSlot)[ASSOC] = b;
        }
        if (startsOpen(i)) {
            const d = DETAILS_PLAN.proto.cloneNode(true) as Element;
            clones[at++] = d;
            if (HAS_DETAILS) {
                const a = makeRecord(DETAILS_PLAN, d);
                const b = makeRecord(DETAILS_PLAN, d);
                recs[r] = a;
                recs2[r] = b;
                r++;
                (d as unknown as AssocSlot)[ASSOC] = a;
                (d as unknown as AssocSlot)[ASSOC] = b;
            }
        }
        const n = startCount(i);
        for (let t = 0; t < n; t++) {
            const tag = TAG_PLAN.proto.cloneNode(true) as Element;
            clones[at++] = tag;
            if (HAS_TAG) {
                const a = makeRecord(TAG_PLAN, tag);
                const b = makeRecord(TAG_PLAN, tag);
                recs[r] = a;
                recs2[r] = b;
                r++;
                (tag as unknown as AssocSlot)[ASSOC] = a;
                (tag as unknown as AssocSlot)[ASSOC] = b;
            }
        }
    }
}

/** RUNG 6 — rung 2 plus one `WeakMap.set` per associated instance. See hazard (5). */
function stageCloneRecWeak(
    clones: Element[],
    recs: Array<TExoDomChild | null>,
    table: WeakMap<Element, TExoDomChild>
): void {
    const appRoot = APP_PLAN.proto.cloneNode(true) as Element;
    clones[0] = appRoot;
    let at = 1;
    let r = 0;
    if (HAS_APP) {
        const rec = makeRecord(APP_PLAN, appRoot);
        recs[r++] = rec;
        table.set(appRoot, rec);
    }
    for (let i = 0; i < CARD_N; i++) {
        const card = CARD_PLAN.proto.cloneNode(true) as Element;
        clones[at++] = card;
        if (HAS_CARD) {
            const rec = makeRecord(CARD_PLAN, card);
            recs[r++] = rec;
            table.set(card, rec);
        }
        if (startsOpen(i)) {
            const d = DETAILS_PLAN.proto.cloneNode(true) as Element;
            clones[at++] = d;
            if (HAS_DETAILS) {
                const rec = makeRecord(DETAILS_PLAN, d);
                recs[r++] = rec;
                table.set(d, rec);
            }
        }
        const n = startCount(i);
        for (let t = 0; t < n; t++) {
            const tag = TAG_PLAN.proto.cloneNode(true) as Element;
            clones[at++] = tag;
            if (HAS_TAG) {
                const rec = makeRecord(TAG_PLAN, tag);
                recs[r++] = rec;
                table.set(tag, rec);
            }
        }
    }
}

/** RUNG 7 — rung 4 plus TWO `set`s per key: an insert, then an update. The WeakMap's `slot2`. */
function stageCloneRec2Weak2(
    clones: Element[],
    recs: Array<TExoDomChild | null>,
    recs2: Array<TExoDomChild | null>,
    table: WeakMap<Element, TExoDomChild>
): void {
    const appRoot = APP_PLAN.proto.cloneNode(true) as Element;
    clones[0] = appRoot;
    let at = 1;
    let r = 0;
    if (HAS_APP) {
        const a = makeRecord(APP_PLAN, appRoot);
        const b = makeRecord(APP_PLAN, appRoot);
        recs[r] = a;
        recs2[r] = b;
        r++;
        table.set(appRoot, a);
        table.set(appRoot, b);
    }
    for (let i = 0; i < CARD_N; i++) {
        const card = CARD_PLAN.proto.cloneNode(true) as Element;
        clones[at++] = card;
        if (HAS_CARD) {
            const a = makeRecord(CARD_PLAN, card);
            const b = makeRecord(CARD_PLAN, card);
            recs[r] = a;
            recs2[r] = b;
            r++;
            table.set(card, a);
            table.set(card, b);
        }
        if (startsOpen(i)) {
            const d = DETAILS_PLAN.proto.cloneNode(true) as Element;
            clones[at++] = d;
            if (HAS_DETAILS) {
                const a = makeRecord(DETAILS_PLAN, d);
                const b = makeRecord(DETAILS_PLAN, d);
                recs[r] = a;
                recs2[r] = b;
                r++;
                table.set(d, a);
                table.set(d, b);
            }
        }
        const n = startCount(i);
        for (let t = 0; t < n; t++) {
            const tag = TAG_PLAN.proto.cloneNode(true) as Element;
            clones[at++] = tag;
            if (HAS_TAG) {
                const a = makeRecord(TAG_PLAN, tag);
                const b = makeRecord(TAG_PLAN, tag);
                recs[r] = a;
                recs2[r] = b;
                r++;
                table.set(tag, a);
                table.set(tag, b);
            }
        }
    }
}

// ---------------------------------------------------------------------------------------
// THE READ SIDE — one real mounted app, kept alive for the whole run, and a WeakMap holding
// EXACTLY the entries its marks hold. Building the table from the app's own marks is what makes
// the two read phases comparable: same keys, same hits, same misses, same climb.
// ---------------------------------------------------------------------------------------

interface ReadWorld {
    readonly container: HTMLElement;
    readonly app: AppHandle;
    /** Every associated element in the app, in document order. */
    readonly marked: readonly Element[];
    /** Every `.tag` — the deepest leaves, and where a climb starts. */
    readonly leaves: readonly Element[];
    readonly table: WeakMap<Element, TExoDomChild>;
}

/**
 * ONE REAL MOUNT WITH BOTH ASSOCIATIONS LAID OVER IT, UNTIMED.
 *
 * THE POPULATION IS SELECTED, NOT PROBED, and that is the one place the read phases changed when
 * the renderer's own element mark was removed. This loop used to walk the mounted app
 * asking each element for the symbol the renderer had written; the answer told it which nodes to
 * read from and what to put in the `WeakMap` twin. Nothing writes that symbol now, so this builds
 * the population itself — every component instance root, the same four kinds the census counts —
 * and stores BOTH the expando and the table entry onto exactly those nodes, before anything is
 * timed. What the phases below measure is unchanged: the same nodes, the same hit count, and the
 * same miss ratio on the climb, because the climb's misses are the ancestors that were never in
 * the population either way.
 */
function buildReadWorld(): ReadWorld {
    const container = el();
    const app = mountExodraApp(container);
    const root = container.firstElementChild;
    const marked: Element[] = [];
    const table = new WeakMap<Element, TExoDomChild>();
    for (const node of Array.from(container.querySelectorAll('*'))) {
        if (
            node !== root &&
            !node.classList.contains('card') &&
            !node.classList.contains('details') &&
            !node.classList.contains('tag')
        ) {
            continue;
        }
        const rec = makeRecord(schemaOfMarked(node), node);
        (node as unknown as AssocSlot)[ASSOC] = rec;
        marked.push(node);
        table.set(node, rec);
    }
    const leaves = Array.from(container.querySelectorAll('.tag'));
    return { container, app, marked, leaves, table };
}

let WORLD: ReadWorld | null = null;
/** Kept out of the timed loops' arithmetic and read afterwards, so nothing folds the loop away. */
let SINK = 0;

/** One read per marked element, off the slot. */
function stageReadSlot(): void {
    const world = WORLD as ReadWorld;
    const marked = world.marked;
    let hits = 0;
    for (let i = 0; i < marked.length; i++) {
        if (assocOf(marked[i]) !== undefined) hits++;
    }
    SINK += hits;
}

/** One `get` per marked element, off a table holding the same entries. */
function stageReadWeak(): void {
    const world = WORLD as ReadWorld;
    const marked = world.marked;
    const table = world.table;
    let hits = 0;
    for (let i = 0; i < marked.length; i++) {
        if (table.get(marked[i]) !== undefined) hits++;
    }
    SINK += hits;
}

/**
 * A CLIMB FROM EVERY LEAF TO `null`, READING THE ASSOCIATION ON EVERY ANCESTOR.
 *
 * IT WAS `exoContextAt`'s LOOP, COPIED VERBATIM, and that function no longer exists: the DOM
 * context walk was removed, and with it the only climb in this library that read an element
 * association. What is left is SYNTHETIC — a run of reads over nodes that mostly do not carry one
 * — and it is kept because that shape is what the storage question is about, not because any
 * shipped line looks like it. The only thing dropped when the function went is the
 * `.context !== null` test on a hit; the walk still runs to the document root and still counts
 * hits without stopping, so the hop count and the miss ratio the pair is judged on are unchanged.
 *
 * IT CLIMBS ALL THE WAY OUT. The chain leaves the container and continues through `body` and
 * `html`, elements nothing here ever associated anything with: those hops are MISSES, and pricing
 * the miss is the point of running the WeakMap twin.
 */
function climbSlot(from: Node): number {
    let at: Node | null = from;
    let found = 0;
    while (at !== null) {
        const rec = assocOf(at);
        if (rec !== undefined) found++;
        at = at.parentNode;
    }
    return found;
}

function climbWeak(from: Node, table: WeakMap<Element, TExoDomChild>): number {
    let at: Node | null = from;
    let found = 0;
    while (at !== null) {
        const rec = table.get(at as Element);
        if (rec !== undefined) found++;
        at = at.parentNode;
    }
    return found;
}

function stageWalkSlot(): void {
    const leaves = (WORLD as ReadWorld).leaves;
    let n = 0;
    for (let i = 0; i < leaves.length; i++) n += climbSlot(leaves[i]);
    SINK += n;
}

function stageWalkWeak(): void {
    const world = WORLD as ReadWorld;
    const leaves = world.leaves;
    const table = world.table;
    let n = 0;
    for (let i = 0; i < leaves.length; i++) n += climbWeak(leaves[i], table);
    SINK += n;
}

/** Ancestors one climb visits, counted once so the walk figures can be quoted per hop. */
function hopsPerClimb(from: Node): number {
    let at: Node | null = from;
    let n = 0;
    while (at !== null) {
        n++;
        at = at.parentNode;
    }
    return n;
}

// ---------------------------------------------------------------------------------------
// THE POOL — THE STORE WITH THE CLONE TAKEN OUT OF THE REGION.
//
// This is what the ladder could not be. A large pool of clones is built UNTIMED, a record per
// entry is allocated UNTIMED, and the timed region is one storage operation per entry and nothing
// else: no clone, no allocation, no insertion. The signal is therefore the WHOLE region rather
// than a twentieth of it, and the pool's SIZE is the knob — it grows the difference itself, where
// rounds only collect more samples of a difference the clock cannot represent.
//
// FOUR PHASES, WHICH IS TWO QUESTIONS CROSSED WITH TWO STORAGES:
//
//   pool·slot·first    a never-associated pool, one `element[ASSOC] = rec` per entry
//   pool·slot·repeat   a pool that already carries the symbol, the same store again
//   pool·weak·first    a never-seen pool and a FRESH table, one `table.set` per entry
//   pool·weak·repeat   a pool already in the table, one `set` per key already present
//
// and the two differences that need no third rung to subtract:
//
//   transition   = slot·first − slot·repeat    the hidden-class cost of the first store
//   write trade  = weak·first ÷ slot·first     what alternative (2) would pay on the write
//
// THE POOL IS BUILT IN MOUNT ORDER, FROM THE PROTOTYPES THE CENSUS SAYS ARE MARKED, repeated. So
// the one store site sees the same sequence of element shapes the renderer's store site sees —
// hazard (6) again, and the reason the pool is not an array of identical `<span>`s.
//
// IT IS SIZED BY AN ELEMENT BUDGET, NOT BY A MARK COUNT. The marked kinds have different subtree
// sizes (a card root drags four children along, a tag root none), so the only quantity that can be
// held fixed while the census moves is the number of DOM elements standing at once. The budget is
// converted to a pool length at run time; both are printed, and the pool length is also RECORDED,
// as the eighth column of the statistics table — see the table printer for why eight was not enough
// and nine was.
//
// ── WHAT THE POOL GIVES UP, AND IT IS NOT NOTHING ───────────────────────────────────────────
//
// A. IT IS NOT INSIDE A MOUNT. There is no clone, no walk, no insertion and no wiring around the
//    store, so nothing here is a share of anything. The ladder's `clone` rung is the only
//    denominator in this file and the pool never borrows it silently — every pool figure is
//    printed in ns per store and never as a percentage.
//
// B. NO ALLOCATION IN THE REGION MEANS NO COLLECTION IN THE REGION, which the renderer does not
//    enjoy. Both storages get that same gift, so the RATIO between them survives it and the
//    absolute figures are lower bounds. Said plainly: the pool's ns/store is the friendliest
//    number either storage can be given.
//
// C. THE WRITE BARRIER, which is the one bias that may not cancel. Storing a YOUNG object into an
//    old or host object can cost a remembered-set entry that storing an old object does not, and
//    the two storages take different paths to it — a DOM expando goes through Blink's named
//    property machinery, a `WeakMap.set` through V8's ephemeron table. So the records are
//    allocated in the UNTIMED PREP OF EVERY SAMPLE, including the repeat phases', rather than once
//    at setup: that keeps every record young at region time and stops `transition` from being a
//    young-vs-old barrier difference wearing a hidden class's name. It does not make the two
//    storages' barriers identical, and nothing here can.
//
// D. THE REPEAT PHASES' FIRST SAMPLE IS A FIRST STORE, because their pool starts unmarked. The ten
//    untimed warm-up passes `runPhases` runs before any round cover exactly that, which is the one
//    thing those passes are load-bearing for in this file.
// ---------------------------------------------------------------------------------------

/**
 * HOW MANY DOM ELEMENTS THE POOL MAY HOLD. Raising this is the knob that helps when a POOL row is
 * refused — it makes the measured quantity larger, where `rounds` only samples it more often. It
 * costs live memory linearly and untimed setup time linearly, and both are printed.
 */
const POOL_ELEMENT_BUDGET = 200000;

/** Elements in a prototype's subtree, including the root — what one clone of it costs the budget. */
function subtreeSize(proto: Element): number {
    return 1 + proto.querySelectorAll('*').length;
}

/**
 * ONE APP'S WORTH OF ASSOCIATED PROTOTYPES, IN MOUNT ORDER. Derived from the census's answer about
 * which kinds the app builds, so if a kind stops being built the pool's shape sequence follows it
 * instead of going stale.
 */
function markedProtoSequence(): Element[] {
    const seq: Element[] = [];
    if (HAS_APP) seq.push(APP_PLAN.proto);
    for (let i = 0; i < CARD_N; i++) {
        if (HAS_CARD) seq.push(CARD_PLAN.proto);
        if (startsOpen(i) && HAS_DETAILS) seq.push(DETAILS_PLAN.proto);
        const n = startCount(i);
        if (HAS_TAG) for (let t = 0; t < n; t++) seq.push(TAG_PLAN.proto);
    }
    return seq;
}

const POOL_SEQ = markedProtoSequence();
/** Elements one app's worth of marked clones costs — the budget's exchange rate. */
const POOL_ELEMENTS_PER_APP = POOL_SEQ.reduce((s, p) => s + subtreeSize(p), 0);
/** How many app's worth fit in the budget. At least one, so the pool is never empty. */
const POOL_APPS = Math.max(1, Math.floor(POOL_ELEMENT_BUDGET / POOL_ELEMENTS_PER_APP));
/** Storage operations in one pool pass — the divisor of every ns/store figure below. */
const POOL_N = POOL_APPS * POOL_SEQ.length;

function buildPool(): Element[] {
    const out = new Array<Element>(POOL_N);
    let at = 0;
    for (let a = 0; a < POOL_APPS; a++) {
        for (let k = 0; k < POOL_SEQ.length; k++)
            out[at++] = POOL_SEQ[k].cloneNode(true) as Element;
    }
    return out;
}

/** A record per pool entry, allocated untimed. Young at region time — see caveat (C). */
function buildPoolRecords(pool: readonly Element[]): TExoDomChild[] {
    const out = new Array<TExoDomChild>(pool.length);
    for (let i = 0; i < pool.length; i++) out[i] = makeRecord(schemaOfMarked(pool[i]), pool[i]);
    return out;
}

/** THE TIMED REGION, slot: one store per entry and nothing else. */
function poolStoreSlot(pool: readonly Element[], recs: readonly TExoDomChild[]): void {
    for (let i = 0; i < pool.length; i++) {
        (pool[i] as unknown as AssocSlot)[ASSOC] = recs[i];
    }
}

/** THE TIMED REGION, WeakMap: one `set` per entry and nothing else. */
function poolStoreWeak(
    pool: readonly Element[],
    recs: readonly TExoDomChild[],
    table: WeakMap<Element, TExoDomChild>
): void {
    for (let i = 0; i < pool.length; i++) table.set(pool[i], recs[i]);
}

/**
 * THE REUSED POOLS, built once and stored onto every sample. `POOL_REPEAT_TABLE` is the twin the
 * WeakMap repeat phase updates, and it is populated by that phase's own warm-up passes rather than
 * here, so its entries were inserted the same way the timed ones are.
 */
const POOL_REPEAT = buildPool();
const POOL_REPEAT_TABLE = new WeakMap<Element, TExoDomChild>();

// ---------------------------------------------------------------------------------------
// THE GATES. Nothing is timed until the replica is shown to reproduce the app's real population,
// and until a store is shown to LAND. A rung whose store was folded away would produce a perfectly
// plausible `slot·first` of zero and a wrong answer.
// ---------------------------------------------------------------------------------------

function gateCensus(): void {
    if (!CENSUS.appFound || !CENSUS.cardFound || !CENSUS.detailsFound || !CENSUS.tagFound) {
        throw new Error(
            `child-mark: a real mount produced app=${CENSUS.appFound} card=${CENSUS.cardFound} ` +
                `details=${CENSUS.detailsFound} tag=${CENSUS.tagFound} — one of the four ` +
                `component roots is missing, so the replica would store onto a mix of element ` +
                `shapes the app does not build (hazard 6)`
        );
    }
    if (ASSOCS !== CENSUS.roots) {
        throw new Error(
            `child-mark: the replica would write ${ASSOCS} associations where a real mount builds ` +
                `${CENSUS.roots} component roots — the arithmetic derived from the app spec does ` +
                `not match the document, so every per-association figure below would be scaled ` +
                `wrong. Either @exodra/dom is a stale dist or the app changed.`
        );
    }
    line(
        `gate child-mark census: ${CENSUS.roots} component roots over ${CENSUS.elements} ` +
            `elements, all four kinds present`
    );
}

function gateStore(): void {
    const clones = makeCloneSink();
    const recs = makeRecordSink();
    stageCloneRecSlot(clones, recs);
    let landed = 0;
    for (let i = 0; i < recs.length; i++) {
        const rec = recs[i];
        if (rec === null) throw new Error(`child-mark: record sink hole at ${i}`);
        if (assocOf(rec.node) === rec) landed++;
    }
    if (landed !== ASSOCS) {
        throw new Error(
            `child-mark: ${landed} of ${ASSOCS} stores were readable back by identity — a store ` +
                `that does not land is a store this axis would price at zero`
        );
    }
    line(`gate child-mark store: all ${ASSOCS} associations readable back by identity`);
}

function gateWalk(): void {
    const world = WORLD as ReadWorld;
    if (world.leaves.length === 0) {
        throw new Error('child-mark: the mounted app has no .tag leaves to climb from');
    }
    // The climb must pass over associated elements — otherwise `walk·slot` is a `parentNode` loop
    // with a load that always misses, and the pair would price a pure-miss run rather than the
    // mixture a real lookup over a chain of nodes sees.
    let seen = 0;
    let at: Node | null = world.leaves[0];
    while (at !== null) {
        if (assocOf(at) !== undefined) seen++;
        at = at.parentNode;
    }
    if (seen === 0) {
        throw new Error(
            'child-mark: a climb from a .tag leaf to the document passed no associated element — ' +
                'the walk phases are not exercising the lookup at all'
        );
    }
    line(
        `gate child-mark walk: a leaf's climb is ${hopsPerClimb(
            world.leaves[0]
        )} hops and passes ` + `${seen} associated ancestors`
    );
}

/**
 * THE POOL'S STORES LAND, AND ITS SIZE IS WHAT THE BUDGET SAYS.
 *
 * Same argument as `gateStore` and a harder case: the pool's region is a loop whose only effect is
 * a store into an object the loop never reads back. If anything folded it away, `pool·slot·first`
 * would return a beautifully small number and the write trade would come out backwards.
 */
function gatePool(): void {
    const pool = buildPool();
    const recs = buildPoolRecords(pool);
    poolStoreSlot(pool, recs);
    let landed = 0;
    for (let i = 0; i < pool.length; i++) if (assocOf(pool[i]) === recs[i]) landed++;
    if (landed !== POOL_N) {
        throw new Error(
            `child-mark: ${landed} of ${POOL_N} pool stores were readable back by identity — a ` +
                `store that does not land is a store this axis would price at zero`
        );
    }
    const elements = POOL_APPS * POOL_ELEMENTS_PER_APP;
    if (elements > POOL_ELEMENT_BUDGET) {
        throw new Error(
            `child-mark: the pool holds ${elements} elements against a budget of ` +
                `${POOL_ELEMENT_BUDGET} — the sizing arithmetic is wrong`
        );
    }
    line(
        `gate child-mark pool: ${POOL_N} stores over ${elements} elements ` +
            `(${POOL_APPS} app's worth, budget ${POOL_ELEMENT_BUDGET}), all readable back`
    );
    // THE STANDING COST, PRINTED BECAUSE IT IS THE PRICE OF THE RESOLUTION. One pool is permanent
    // (the repeat phases reuse it) and the two `first` phases build another per sample and drop it,
    // so the peak is twice this. If a run on this machine starts swapping, this line and
    // `POOL_ELEMENT_BUDGET` are the two things to look at — in that order.
    line(
        `  standing: ${elements} elements held for the whole run, plus ${elements} more during ` +
            `each pool·*·first sample — peak ~${elements * 2} detached elements`
    );
}

// ---------------------------------------------------------------------------------------
// THE RUNNER — `abBench`'s sampling with a repetition factor per phase and the medians handed
// back, plus the REGION duration kept so a row can be refused against the observed clock.
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

/**
 * THE CLOCK THIS RUN ACTUALLY GOT, rather than the 0.1 ms the headless flags ask for. Chromium
 * clamps `performance.now()` differently under different flags and origins, and a row's refusal
 * threshold has to be built from the clock that was granted — otherwise the gate is a decoration.
 */
function observedQuantum(): number {
    let smallest = Infinity;
    // 200 observed advances of the clock. At a 0.1 ms clamp that is ~20 ms of busy-waiting, once,
    // before anything is timed — and it is the only way to know what the refusal below is refusing
    // against. If the loop somehow sees no advance at all, 0.1 ms is assumed and the tick counts
    // printed beside every region say which it was.
    for (let i = 0; i < 200; i++) {
        const a = performance.now();
        let b = performance.now();
        while (b === a) b = performance.now();
        const d = b - a;
        if (d > 0 && d < smallest) smallest = d;
    }
    return smallest === Infinity ? 0.1 : smallest;
}

interface Phase {
    readonly name: string;
    /** How many times one app's worth of this phase runs inside ONE timed region. */
    readonly reps: number;
    readonly prep: () => Scenario;
}

interface Sample {
    /** The whole timed region, in ms — what the refusal is judged against. */
    readonly region: number;
    /** The region divided by `reps` — what the tables print. */
    readonly per: number;
}

function sampleOnce(phase: Phase): Sample {
    const reps = phase.reps;
    const scenarios: Scenario[] = [];
    for (let b = 0; b < reps; b++) scenarios.push(phase.prep());
    const t0 = performance.now();
    for (let b = 0; b < reps; b++) scenarios[b].measure();
    const dt = performance.now() - t0;
    for (let b = 0; b < reps; b++) scenarios[b].cleanup();
    return { region: dt, per: dt / reps };
}

interface PhaseResult {
    readonly per: Stat;
    readonly regionMedian: number;
}

function runPhases(phases: readonly Phase[], rounds: number): Map<string, PhaseResult> {
    for (let w = 0; w < 10; w++) for (const p of phases) sampleOnce(p);

    const per = new Map<string, number[]>();
    const region = new Map<string, number[]>();
    for (const p of phases) {
        per.set(p.name, []);
        region.set(p.name, []);
    }
    for (let r = 0; r < rounds; r++) {
        const shift = r % phases.length;
        const forward = (r & 1) === 0;
        for (let k = 0; k < phases.length; k++) {
            const at = forward
                ? (k + shift) % phases.length
                : (shift + phases.length - 1 - k) % phases.length;
            const p = phases[at];
            gcIfPossible();
            const s = sampleOnce(p);
            (per.get(p.name) as number[]).push(s.per);
            (region.get(p.name) as number[]).push(s.region);
        }
    }
    const out = new Map<string, PhaseResult>();
    for (const p of phases) {
        out.set(p.name, {
            per: stat(per.get(p.name) as number[]),
            regionMedian: stat(region.get(p.name) as number[]).median,
        });
    }
    return out;
}

// ---------------------------------------------------------------------------------------
// REPETITION FACTORS. Each is chosen so its region clears three ticks of a 0.1 ms clock by a
// comfortable margin, and every one of them is CHECKED against the clock the run actually
// observed — see the refusal after the tables.
// ---------------------------------------------------------------------------------------

/**
 * ONE APP'S CLONES IS ~0.14 ms; 20 OF THEM IS A REGION OF TENS OF TICKS — AND THAT WAS NEVER THE
 * PROBLEM. The first two runs cleared the region bar at twenty and still resolved nothing, because
 * the region is not what has to clear three ticks: the DIFFERENCE between two regions is. See the
 * header's factor arithmetic for why the number that would fix that is 180-1250 and why it is not
 * written here — at that live set a collection lands inside the timed region and one GC pause is
 * three orders of magnitude larger than the signal. This stays at twenty and the ladder is read as
 * a denominator and an upper bound, which are the two things it can still honestly supply.
 */
const LADDER_REPS = 20;
/** One pool pass IS the repetition — its size is the factor. See `POOL_ELEMENT_BUDGET`. */
const POOL_REPS = 1;
/** `ASSOCS` property loads is a fraction of a tick; 4000 of them is a region with digits. */
const READ_REPS = 4000;
/** `leaves × hops` loads per repetition — an order more work than a bare read, so fewer. */
const WALK_REPS = 500;

export function benchmarkChildMark(rounds = 100): void {
    const f = (x: number): string => x.toFixed(4);
    const ns = (msPerApp: number): string => ((msPerApp * 1e6) / ASSOCS).toFixed(2);

    printCensus();
    gateCensus();
    gateStore();

    const world = buildReadWorld();
    WORLD = world;
    gateWalk();
    gatePool();

    const quantum = observedQuantum();
    const leaves = world.leaves.length;
    const hops = world.leaves.reduce((s, n) => s + hopsPerClimb(n), 0);

    const noop = (): void => undefined;
    const phases: readonly Phase[] = [
        {
            name: 'clone',
            reps: LADDER_REPS,
            prep: () => {
                const clones = makeCloneSink();
                return { measure: () => stageClone(clones), cleanup: noop };
            },
        },
        {
            name: 'clone+rec',
            reps: LADDER_REPS,
            prep: () => {
                const clones = makeCloneSink();
                const recs = makeRecordSink();
                return { measure: () => stageCloneRec(clones, recs), cleanup: noop };
            },
        },
        {
            name: 'clone+rec+slot',
            reps: LADDER_REPS,
            prep: () => {
                const clones = makeCloneSink();
                const recs = makeRecordSink();
                return { measure: () => stageCloneRecSlot(clones, recs), cleanup: noop };
            },
        },
        {
            name: 'clone+rec2',
            reps: LADDER_REPS,
            prep: () => {
                const clones = makeCloneSink();
                const recs = makeRecordSink();
                const recs2 = makeRecordSink();
                return { measure: () => stageCloneRec2(clones, recs, recs2), cleanup: noop };
            },
        },
        {
            name: 'clone+rec2+slot2',
            reps: LADDER_REPS,
            prep: () => {
                const clones = makeCloneSink();
                const recs = makeRecordSink();
                const recs2 = makeRecordSink();
                return { measure: () => stageCloneRec2Slot2(clones, recs, recs2), cleanup: noop };
            },
        },
        {
            name: 'clone+rec+weak',
            reps: LADDER_REPS,
            // A FRESH TABLE PER REPETITION, allocated untimed — hazard (5). This is the WeakMap's
            // friendliest case and therefore a lower bound on what it would really cost.
            prep: () => {
                const clones = makeCloneSink();
                const recs = makeRecordSink();
                const table = new WeakMap<Element, TExoDomChild>();
                return { measure: () => stageCloneRecWeak(clones, recs, table), cleanup: noop };
            },
        },
        {
            name: 'clone+rec2+weak2',
            reps: LADDER_REPS,
            prep: () => {
                const clones = makeCloneSink();
                const recs = makeRecordSink();
                const recs2 = makeRecordSink();
                const table = new WeakMap<Element, TExoDomChild>();
                return {
                    measure: () => stageCloneRec2Weak2(clones, recs, recs2, table),
                    cleanup: noop,
                };
            },
        },
        {
            name: 'read·slot',
            reps: READ_REPS,
            prep: () => ({ measure: stageReadSlot, cleanup: noop }),
        },
        {
            name: 'read·weak',
            reps: READ_REPS,
            prep: () => ({ measure: stageReadWeak, cleanup: noop }),
        },
        {
            name: 'walk·slot',
            reps: WALK_REPS,
            prep: () => ({ measure: stageWalkSlot, cleanup: noop }),
        },
        {
            name: 'walk·weak',
            reps: WALK_REPS,
            prep: () => ({ measure: stageWalkWeak, cleanup: noop }),
        },
        // THE POOL. A fresh pool and fresh records per sample for the FIRST phases — the pool is
        // consumed by being marked, so it cannot be reused without becoming a repeat. Both are
        // built in the untimed `prep`, and `cleanup` drops them so the next sample's GC reclaims
        // them rather than the next sample's timed region.
        {
            name: 'pool·slot·first',
            reps: POOL_REPS,
            prep: () => {
                const pool = buildPool();
                const recs = buildPoolRecords(pool);
                return { measure: () => poolStoreSlot(pool, recs), cleanup: noop };
            },
        },
        {
            name: 'pool·slot·repeat',
            reps: POOL_REPS,
            // THE POOL IS REUSED, THE RECORDS ARE NOT — caveat (C). Reusing the records too would
            // make this phase store an OLD object where `pool·slot·first` stores a young one, and
            // `transition` would then be a write-barrier difference wearing a hidden class's name.
            prep: () => {
                const recs = buildPoolRecords(POOL_REPEAT);
                return { measure: () => poolStoreSlot(POOL_REPEAT, recs), cleanup: noop };
            },
        },
        {
            name: 'pool·weak·first',
            reps: POOL_REPS,
            prep: () => {
                const pool = buildPool();
                const recs = buildPoolRecords(pool);
                const table = new WeakMap<Element, TExoDomChild>();
                return { measure: () => poolStoreWeak(pool, recs, table), cleanup: noop };
            },
        },
        {
            name: 'pool·weak·repeat',
            reps: POOL_REPS,
            prep: () => {
                const recs = buildPoolRecords(POOL_REPEAT);
                return {
                    measure: () => poolStoreWeak(POOL_REPEAT, recs, POOL_REPEAT_TABLE),
                    cleanup: noop,
                };
            },
        },
    ];

    const stats = runPhases(phases, rounds);
    const med = (name: string): number => (stats.get(name) as PhaseResult).per.median;

    line('');
    line(
        `CHILD MARK — the 80-card app, schema core [ms per app's worth] · interleaved · ` +
            `${rounds} rounds · GC/sample · observed clock ${f(quantum)} ms`
    );
    line(
        '                    reps    min      p25      median   p75      max      ' +
            'stores   ns/store'
    );
    // THE DIVISOR TRAVELS WITH THE POOL ROWS, IN THE TABLE, BECAUSE A PRINTED DIVISOR IS NOT A
    // RECORDED ONE. `POOL_N` is derived from the app census at run time; until this column existed
    // it was printed in the POOL paragraph below and nowhere else, so `child-mark.pool.json` carried
    // five statistics and no way to turn any of them into ns per store. Every per-store figure
    // quoted anywhere in this repository was therefore arithmetic somebody did once at a console —
    // the same defect as citing a blog table, wearing a benchmark's clothes.
    //
    // NINE FIELDS, NOT EIGHT, AND THAT IS THE WHOLE REASON THE SHAPE IS THIS ONE. `run-one-axis.js`
    // tries its row shapes most-specific-first: an EIGHTH column is filed under the key
    // `perElement` (`ROW_REPS_TAIL`, `run-one-axis.js:1038-1039`), which a store count is not, and
    // the comment above `REGION SIZE` below keeps that column out of this table for exactly that
    // reason. A NINTH lands on `ROW_REPS_TAIL2` (`run-one-axis.js:1030-1031`), whose two trailing
    // numbers are recorded under the positional keys `trailing1` and `trailing2` precisely because
    // the recorder cannot know their units and the axis's own header is what says so
    // (`run-one-axis.js:1351-1356`). So the header line names them: `trailing1` is `POOL_N`, the
    // storage operations in one region, and `trailing2` is `median × 1e6 / POOL_N`. The ladder,
    // read and walk rows keep the seven-field shape — their divisors (`ASSOCS`, `hops`) are already
    // in the census — and a mixed table is safe because the recorder matches per LINE.
    for (const p of phases) {
        const s = stats.get(p.name) as PhaseResult;
        const pool = p.name.startsWith('pool·')
            ? `   ${String(POOL_N).padStart(6)}   ${((s.per.median * 1e6) / POOL_N).toFixed(2)}`
            : '';
        line(
            `${p.name.padEnd(19)}${String(p.reps).padStart(5)}   ${f(s.per.min)}   ` +
                `${f(s.per.p25)}   ${f(s.per.median)}   ${f(s.per.p75)}   ${f(s.per.max)}${pool}`
        );
    }

    // THE TICK COLUMN IS PRINTED OUTSIDE THE TABLE, ON PURPOSE. `run-one-axis.js`'s recorder tries
    // its row shapes most-specific-first and files an eighth column under the key `perElement`
    // (`ROW_REPS_TAIL`, `run-one-axis.js:1038-1039`), which this column is not — and this is the
    // same fact the pool columns above are built on: they go to NINE fields so they land on
    // `trailing1`/`trailing2` instead. A recording of this axis would otherwise
    // carry tick counts under a name that says elements. Its own comment says every misparse of that
    // family got published before anybody opened it, so this block stays a paragraph, and a blank
    // line above it closes the table for the scraper.
    line('');
    line(`REGION SIZE — the timed region's median against the clock this run observed`);
    for (const p of phases) {
        const s = stats.get(p.name) as PhaseResult;
        line(
            `  ${p.name.padEnd(19)} ${f(s.regionMedian)} ms   ` +
                `${(s.regionMedian / quantum).toFixed(1)} ticks`
        );
    }

    const clone = med('clone');
    const record = med('clone+rec') - clone;
    const slotFirst = med('clone+rec+slot') - med('clone+rec');
    const slotBoth = med('clone+rec2+slot2') - med('clone+rec2');
    const slotSecond = slotBoth - slotFirst;
    const transition = slotFirst - slotSecond;
    const weakInsert = med('clone+rec+weak') - med('clone+rec');
    const weakBoth = med('clone+rec2+weak2') - med('clone+rec2');
    const weakUpdate = weakBoth - weakInsert;
    /** Rung-to-rung, needing no third rung: the two storages one loop apart, inside a mount. */
    const weakOverSlot = med('clone+rec+weak') - med('clone+rec+slot');

    // THE GRID. A per-repetition median is quantised at `quantum / reps`, so a derived figure is
    // only a number at all once it is bigger than that. Every ladder figure is therefore printed
    // in GRID UNITS beside its milliseconds: "0.0 units" says "this instrument cannot see it",
    // where "0.00 ns/assoc" would have said "this costs nothing", and those are opposite claims.
    const grid = quantum / LADDER_REPS;
    const units = (x: number): string => `${(x / grid).toFixed(1)}u`;
    /**
     * THE BAR IS THREE GRID UNITS, NOT ONE, because that is this file's bar everywhere else: a
     * difference `D` is worth reading when `D × reps ≥ 3 × quantum`, and `3 × quantum / reps` is
     * three units. A figure at one or two units has landed on a neighbouring grid point, which is
     * the smallest move quantisation can invent on its own.
     */
    const RESOLVED = grid * 3;
    const bound = (x: number): string =>
        Math.abs(x) < RESOLVED
            ? `< ${((RESOLVED * 1e6) / ASSOCS).toFixed(1)} ns/assoc (BOUND)`
            : `${ns(x)} ns/assoc`;

    line('');
    line(
        `THE LADDER'S SPLIT — medians per ${ASSOCS} marks. GRID = ${f(grid)} ms = ` +
            `${((RESOLVED * 1e6) / ASSOCS).toFixed(
                1
            )} ns/assoc at the three-unit bar; anything under it is BOUNDED, ` +
            `not measured`
    );
    line(`  clone             ${f(clone)} ms   ${INSTANCES} cloneNode(true), no record, no mark`);
    line(
        `  record            ${f(record)} ms   ${units(record)}   ${bound(record)}   ` +
            `the TExoDomChild literal and its disposers array, alone`
    );
    line(
        `  slot·first        ${f(slotFirst)} ms   ${units(slotFirst)}   ${bound(slotFirst)}   ` +
            `element[ASSOC] = rec on a fresh clone`
    );
    line(
        `  slot·second       ${f(slotSecond)} ms   ${units(slotSecond)}   ${bound(slotSecond)}   ` +
            `the same store onto an element that already has the property`
    );
    line(
        `  transition        ${f(transition)} ms   ${units(transition)}   ${bound(transition)}   ` +
            `slot·first − slot·second`
    );
    line(
        `  weak·insert       ${f(weakInsert)} ms   ${units(weakInsert)}   ${bound(weakInsert)}   ` +
            `WeakMap.set into a fresh table`
    );
    line(
        `  weak·update       ${f(weakUpdate)} ms   ${units(weakUpdate)}   ${bound(weakUpdate)}   ` +
            `WeakMap.set onto a key already present`
    );
    line(
        `  weak − slot       ${f(weakOverSlot)} ms   ${units(weakOverSlot)}   ` +
            `${bound(weakOverSlot)}   RUNG TO RUNG, no third rung subtracted`
    );
    line('');
    line(
        `  the clone this store rides on: ${((clone * 1e6) / ASSOCS).toFixed(1)} ns per marked ` +
            `instance. So the ladder bounds BOTH halves of the per-child record above by ` +
            `${(((RESOLVED * 1e6) / ASSOCS / ((clone * 1e6) / ASSOCS)) * 100).toFixed(
                1
            )}% of a clone ` +
            `each — which is all it can say, and it is a result rather than a failure: ` +
            `update-floor.shuffled.json prices the pair TOGETHER at 16.4062 µs of a 64.0625 µs ` +
            `gap and cannot separate them at all.`
    );

    const readSlot = med('read·slot');
    const readWeak = med('read·weak');
    const walkSlot = med('walk·slot');
    const walkWeak = med('walk·weak');

    line('');
    line(`THE READ SIDE — the trade the WeakMap would be buying its cheap writes with`);
    line(
        `  read·slot         ${f(readSlot)} ms   ${((readSlot * 1e6) / ASSOCS).toFixed(
            2
        )} ns/read` + `   ${ASSOCS} hits`
    );
    line(
        `  read·weak         ${f(readWeak)} ms   ${((readWeak * 1e6) / ASSOCS).toFixed(
            2
        )} ns/read` + `   ${ASSOCS} hits, ${(readWeak / readSlot).toFixed(2)}× the slot`
    );
    line(
        `  walk·slot         ${f(walkSlot)} ms   ${((walkSlot * 1e6) / hops).toFixed(2)} ns/hop` +
            `   ${leaves} climbs, ${hops} hops, mostly MISSES`
    );
    line(
        `  walk·weak         ${f(walkWeak)} ms   ${((walkWeak * 1e6) / hops).toFixed(2)} ns/hop` +
            `   ${(walkWeak / walkSlot).toFixed(2)}× the slot on the same climbs`
    );
    line('');
    line(
        `  AN ENGINE THAT ASSOCIATED DATA PER INSTANCE WOULD PAY THE WRITE ${ASSOCS} TIMES A ` +
            `MOUNT AND THE WALK NOT AT ALL — no shipped line climbs. So the WeakMap trade for ` +
            `this app is ${ns(weakInsert - slotFirst)} ns × ${ASSOCS} added to every mount ` +
            `against ${(((walkSlot - walkWeak) * 1e6) / leaves).toFixed(2)} ns saved on a climb ` +
            `NO SHIPPED CODE PERFORMS — the walk rows are a storage ratio, not a call site.`
    );

    // ── THE POOL. Its own section, its own divisor, and NEVER a share of a mount. ───────────
    const poolSlotFirst = med('pool·slot·first');
    const poolSlotRepeat = med('pool·slot·repeat');
    const poolWeakFirst = med('pool·weak·first');
    const poolWeakRepeat = med('pool·weak·repeat');
    const perStore = (x: number): string => ((x * 1e6) / POOL_N).toFixed(2);
    const poolTransition = poolSlotFirst - poolSlotRepeat;

    line('');
    line(
        `THE POOL — ${POOL_N} storage operations per region, no clone and no allocation inside it ` +
            `(${POOL_APPS} app's worth of marked clones, ${POOL_APPS * POOL_ELEMENTS_PER_APP} ` +
            `elements)`
    );
    line(`  pool·slot·first   ${f(poolSlotFirst)} ms   ${perStore(poolSlotFirst)} ns/store`);
    line(`  pool·slot·repeat  ${f(poolSlotRepeat)} ms   ${perStore(poolSlotRepeat)} ns/store`);
    line(`  pool·weak·first   ${f(poolWeakFirst)} ms   ${perStore(poolWeakFirst)} ns/store`);
    line(`  pool·weak·repeat  ${f(poolWeakRepeat)} ms   ${perStore(poolWeakRepeat)} ns/store`);
    line(
        `  transition        ${f(poolTransition)} ms   ${perStore(poolTransition)} ns/store   ` +
            `first − repeat: the hidden-class cost of the first store`
    );
    line(
        `  write trade       ${(poolWeakFirst / poolSlotFirst).toFixed(2)}×   ` +
            `WeakMap.set against the expando store, both on a never-seen element`
    );
    line(
        `  These are ns per STORE and not a share of anything — the pool is not inside a mount. ` +
            `For a share, multiply by the ${ASSOCS} associations a mount's worth would write and ` +
            `divide by the ladder's clone figure above.`
    );
    line(
        `  Both storages get a region with no allocation and therefore no collection in it, which ` +
            `the renderer does not get, so both figures are LOWER bounds and the ratio is the ` +
            `part that survives that. See caveats (B) and (C) in the header.`
    );

    // ── WHAT SURVIVES A REFUSED LADDER. Generated from the medians, not asserted. ───────────
    //
    // ITS CRITERION IS WEAKER THAN THIS FILE'S BAR AND SAYS SO. Three grid units is what makes a
    // figure a number here; this test asks only whether the two rungs landed on DIFFERENT grid
    // POINTS from a shared baseline, which is one unit. That is not enough to quote a size, and it
    // is enough to order two quantities: a difference that moves the median off its baseline's grid
    // point is larger than one that does not. It is printed because it held on two independent runs
    // at different round counts, and because "one side of this trade is visible to this instrument
    // and the other is not" is a statement even when neither side is a number.
    const slotOffBaseline = Math.round(slotFirst / grid) !== 0;
    const weakOffBaseline = Math.round(weakInsert / grid) !== 0;
    if (!slotOffBaseline && weakOffBaseline) {
        line('');
        line(
            `THE ASYMMETRY — an ORDERING, not a number, and it does not depend on the ladder ` +
                `nesting. At a grid of ${((grid * 1e6) / ASSOCS).toFixed(
                    1
                )} ns/assoc, weak·insert ` +
                `landed ${units(weakInsert)} from its baseline and slot·first landed ` +
                `${units(slotFirst)} from the SAME baseline. Two storages, one loop apart, and ` +
                `only one of them moved the median off its baseline's grid point: THE WEAKMAP ` +
                `WRITE IS LARGER THAN THE SLOT WRITE, inside a real mount. It is not a ratio — a ` +
                `quantity that reads zero has no ratio — and it is below this file's three-unit ` +
                `bar, so it is offered as an ordering and nothing more. The size of the gap is the ` +
                `pool's job, above.`
        );
    }

    // ── REFUSALS. Printed, not thrown, so one bad row does not cost the whole run. ──────────
    //
    // TWO FAILURE MODES, AND THE FIRST VERSION OF THIS FILE CONFLATED THEM. "The region is too
    // short" is fixed by more repetitions inside one region; "the difference is too small for the
    // grid" is fixed by NOTHING that collects more samples — not rounds, not reps of a region that
    // already clears the bar. Sending an operator to `rounds` for the second is sending them to a
    // knob that cannot move, which is what this axis did on its first two runs.
    let refused = false;
    for (const p of phases) {
        const s = stats.get(p.name) as PhaseResult;
        if (s.regionMedian < quantum * 3) {
            refused = true;
            const knob = p.name.startsWith('pool·')
                ? 'raise POOL_ELEMENT_BUDGET in this file — the pool size IS its repetition factor'
                : `raise this phase's repetition factor in this file (currently ${p.reps})`;
            refuse(
                `child-mark: "${p.name}" timed a region of ${f(s.regionMedian)} ms against an ` +
                    `observed clock of ${f(quantum)} ms — under three ticks. THE REGION IS TOO ` +
                    `SHORT, which more rounds do not fix: ${knob}.`
            );
        }
    }

    const ladderFigures: ReadonlyArray<readonly [string, number]> = [
        ['record', record],
        ['slot·first', slotFirst],
        ['slot·second', slotSecond],
        ['transition', transition],
        ['weak·insert', weakInsert],
        ['weak·update', weakUpdate],
    ];
    const unresolved = ladderFigures.filter(([, x]) => Math.abs(x) < RESOLVED).map(([n]) => n);
    if (unresolved.length > 0) {
        refused = true;
        // `reps ≥ 3 × quantum / D`. The largest `D` can be is one grid unit (it read under one),
        // so this is a FLOOR on the factor and the true one is larger — by how much depends on
        // `D`, which is the quantity that could not be measured. The two anchored figures below
        // take `D` at 5 ns and 1 ns per mark, the order of magnitude a property store sits at.
        const repsFloor = Math.ceil((3 * quantum) / grid);
        const repsAt5ns = Math.ceil((3 * quantum) / (5e-6 * ASSOCS));
        const repsAt1ns = Math.ceil((3 * quantum) / (1e-6 * ASSOCS));
        refuse(
            `child-mark: the ladder resolved nothing for [${unresolved.join(', ')}] — each is ` +
                `under the three-unit bar of ${f(RESOLVED)} ms (grid ${f(
                    grid
                )} ms). THE DIFFERENCE IS TOO SMALL FOR THE GRID, ` +
                `not the region too short (every ladder region above cleared three ticks). ` +
                `MORE ROUNDS CANNOT HELP: the median of quantised samples stays quantised. The ` +
                `only knob is the ladder's repetition factor, and it would have to go from ` +
                `${LADDER_REPS} to at least ${repsFloor} — and if the true difference is ` +
                `single-digit ns per mark, to ${repsAt5ns} (at 5 ns) or ${repsAt1ns} (at 1 ns). ` +
                `At that factor the live set is that many apps' worth of clones standing at once ` +
                `and a collection lands inside the timed region, where one pause is three orders ` +
                `of magnitude larger than the signal. READ THE POOL SECTION INSTEAD: it is the ` +
                `same question with the clone taken out of the region.`
        );
    }
    if (record < 0) {
        refused = true;
        refuse(
            `child-mark: "record" came out NEGATIVE (${f(record)} ms, ${units(record)}) — a rung ` +
                `containing ${ASSOCS} object literals and ${ASSOCS} arrays measured CHEAPER than ` +
                `the rung without them. Two readings, and the file will not choose between them: ` +
                `(a) the sign is grid noise, which is what a figure under one unit always permits; ` +
                `(b) the ladder's containment is a source-level claim and not a machine-level one ` +
                `— "clone" is a smaller loop body that V8 may schedule differently, so it is not ` +
                `strictly a subset of "clone+rec". EITHER WAY THE RESULT IS THE SAME AND IT IS A ` +
                `RESULT: the per-child record — ${ASSOCS} TExoDomChild-shaped literals and ${ASSOCS} arrays ` +
                `— is INVISIBLE against a ${INSTANCES}-clone loop at ` +
                `${((RESOLVED * 1e6) / ASSOCS).toFixed(
                    1
                )} ns/assoc of resolution, next to a clone of ` +
                `${((clone * 1e6) / ASSOCS).toFixed(
                    1
                )} ns per associated instance. That is the same ` +
                `shape as this repository's finding that cutting per-node allocations REGRESSED a ` +
                `mount by 11%: allocation count is not where mount time lives, and a correctly ` +
                `sized nursery literal is close to free beside cloneNode.`
        );
    }
    if (poolTransition < 0) {
        refused = true;
        refuse(
            `child-mark: the pool's first store measured cheaper than its repeat store ` +
                `(${f(poolTransition)} ms), so "transition" is unreadable and the claim at ` +
                `exoTermSchemaOf.ts:52-54 — that a DOM element is "a host object already in ` +
                `dictionary mode" and pays no shape transition — is neither confirmed nor refuted ` +
                `by this run. Raise POOL_ELEMENT_BUDGET.`
        );
    }

    line('');
    if (refused) {
        line(
            `ANSWER — the ladder is REFUSED above and none of its derived figures is a number. ` +
                `What this run does support: the store and the record are each BOUNDED ABOVE by ` +
                `${((RESOLVED * 1e6) / ASSOCS).toFixed(
                    1
                )} ns per child inside a real mount; the pool ` +
                `prices the store at ${perStore(poolSlotFirst)} ns and the WeakMap write at ` +
                `${perStore(poolWeakFirst)} ns, a trade of ` +
                `${(poolWeakFirst / poolSlotFirst).toFixed(2)}× paid ${ASSOCS} times per mount ` +
                `against ${(walkWeak / walkSlot).toFixed(2)}× on ONE walk per mount. Quote the ` +
                `pool figures as ns per store and never as a share of a mount.`
        );
    } else {
        line(
            `ANSWER — one expando store costs ${ns(slotFirst)} ns per associated element inside ` +
                `a mount-shaped loop (${units(
                    slotFirst
                )} of grid, so it cleared the resolution), the pool prices the ` +
                `same store at ${perStore(poolSlotFirst)} ns, and a WeakMap would trade ` +
                `${(poolWeakFirst / poolSlotFirst).toFixed(
                    2
                )}× on the write — paid ${ASSOCS} times ` +
                `per mount's worth — for ${(walkWeak / walkSlot).toFixed(2)}× on one walk. Read ` +
                `the header's hazard list before quoting any of it.`
        );
    }
    line(`  (SINK=${SINK} only proves the read loops ran; it is not a measurement.)`);

    // The one live app is torn down last: every read phase held it, and nothing else did.
    world.app.teardown();
    world.container.remove();
    WORLD = null;
}
