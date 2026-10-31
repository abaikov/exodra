// WHAT DOES THE NUMBER OF RECEIVER MAPS COST A SHARED BODY'S FIELD READS?
//
// IT IMPORTS NOTHING FROM `@exodra/*` — no dist, no source, no type. Fourteen straight-line
// JavaScript programs and a clock. It is registered as an axis only so it can reuse the runner that
// starts Vite, drives headless Chromium and forwards the browser's console. A figure it prints is a
// figure about V8 and about nothing in this repository.
//
// ═══ THE QUESTION, AND WHY IT IS ASKED FIRST ══════════════════════════════════════════════════
//
// A renderer's shared bodies read fields off the receiver. In the shipped shape every instance of
// every component carries one of only TWO receiver classes, so those reads see two maps and V8
// keeps them polymorphic and cheap. A design that gives EACH COMPONENT ITS OWN CLASS puts N maps
// through the same reads, and V8's inline caches go megamorphic past four. THE COST WOULD BE PAID
// BY THE BACKEND'S OWN BODIES, ON EVERY READ, not by the ports — which is why it is measured before
// anything is built on top of it.
//
// THE COUNT THAT MOTIVATES IT, counted with `grep -o` over
// `packages/dom/src/dom/EXO_DOM_NODE_VOCABULARY.ts` (253 lines): 31 reads of the five fields named below
// — `schema` 11, `nodes` 8, `written` 5, `childLists` 4, `child` 3 — and no assignment to any of them
// anywhere in the file (`this.<field> =` matches nothing). Across all ten `this.<field>` names the
// file reads 43 times. THIS AXIS DOES NOT MEASURE THAT FILE and does not import it; the count is
// here to say why five fields and not one.
//
// ═══ TABLE 1, THE LADDER — five rungs, one body each ═══════════════════════════════════════════
//
//   maps1    every receiver in the feed is of ONE class
//   maps2    two classes — the shipped shape's polymorphism
//   maps4    four classes — V8's usual polymorphic limit, right at the edge
//   maps8    eight classes — a real app's component count
//   maps16   sixteen classes — a big app
//
// Every class declares THE SAME FIVE FIELDS IN THE SAME ORDER with the same types (`nodes`, `schema`,
// `child`, `regions`, `written`, all numbers); only the constructor identity differs, so only the
// map differs. The shared body reads all five and folds them into an accumulator that is returned,
// stored per call, summed, printed and asserted.
//
// THE CALL FORM ON THIS TABLE IS A FREE FUNCTION, `fold(receiver)`, AND THAT IS THE DESIGN. Written
// as a method, `o.m()` would ALSO put N maps through the method LOAD at the call site, so rung 1
// would get a monomorphic call that TurboFan may inline and rung 16 a megamorphic one it may not —
// and the ladder would fuse "the reads went megamorphic" with "the call stopped being inlinable".
// The free-function form pins the callee to ONE function object at ONE call site at every rung, so
// the ONLY quantity that varies from rung to rung is the map count at the five in-object load sites
// inside one body. Table 2 is where the method form is priced, and it prices it with the dispatch
// held identical on both sides.
//
// EVERY RUNG HAS ITS OWN BODY AND ITS OWN LOOP, separately declared, AND THIS IS NOT STYLE. One
// body shared by two rungs would carry ONE feedback vector, its five load sites would see the UNION
// of both rungs' maps, and every rung of a five-rung ladder would be megamorphic. The pointer gate
// checks that no two of the fourteen programs share a body, a feed or a sink.
//
// ═══ TABLE 2, THE HONEST COMPARISON — the design does not only ADD maps, it REMOVES work ═══════
//
// At N = 8, both arms reach the body as a METHOD, `o.m()`, over eight classes built the identical
// way (a factory, then one assignment to the prototype):
//
//   sharedBodies   ONE function object installed on all eight prototypes. Inside it, the five load
//                  sites see eight maps. This is the proposed shape: the backend's body, reached
//                  through a megamorphic receiver.
//   ownBodies      EIGHT separately declared function objects, one per prototype. Inside each, the
//                  five load sites see ONE map. This is what a per-schema prototype would do:
//                  install the body per class and pay N copies of the code.
//
// THE PAIR IS FUSED, AND AN EARLIER DRAFT OF THIS HEADER SAID IT WAS NOT. THAT CLAIM WAS FALSE AND
// IS STRUCK. It read: "the method LOAD is megamorphic on both sides and cancels … the pair
// therefore isolates the field-read inline caches with the dispatch held constant". `o.m()` carries
// TWO inline caches, not one, and only the first of them cancels:
//
//   the PROPERTY LOAD of `m`   megamorphic on both sides — eight receiver maps either way. CANCELS.
//   the CALL TARGET            `sharedBodies` sees ONE callee, so the target feedback is
//                              MONOMORPHIC and TurboFan may inline the body into the loop.
//                              `ownBodies` sees EIGHT, so the target feedback is MEGAMORPHIC: no
//                              inlining, and an indirect call through the loaded closure per
//                              iteration. THIS DOES NOT CANCEL.
//
// So the pair is (eight maps against one at five field-load sites) FUSED WITH (one callee against
// eight at one call site), and the second term pushes the opposite way from the first. A megamorphic
// RECEIVER with a MONOMORPHIC TARGET is not the same thing as a megamorphic receiver with a
// MEGAMORPHIC TARGET, and this axis measures the two together.
//
// WHAT THE PAIR CAN THEREFORE SETTLE, and it is less than it was written to settle: whether, ON
// THIS SCENE, installing the body per class is a net win. IT CANNOT SETTLE whether the ladder's
// read penalty is recoverable, because a per-class body cannot be reached here without also making
// the call target megamorphic. THE ARM THAT WOULD SEPARATE THEM holds the target count at eight on
// both sides — eight separately declared bodies dispatched from a table indexed by the same shuffle
// that picks the class, so every body sees all eight maps — and it is NOT BUILT.
//
// `sharedBodies ↔ maps8` IS IN THE COMPARISONS FOR THIS REASON. Both have eight maps at the five
// field sites and identical reads; they differ in reaching the body THROUGH THE RECEIVER (a
// megamorphic property load, then a call to a known function) against calling a named free function
// directly. It prices the method-load term that Table 1's call form does not pay, and it is the only
// part of Table 2's fusion this run can take apart.
//
// THE EIGHT `ownBodies` FUNCTIONS ARE WRITTEN OUT, NOT PRODUCED BY A FACTORY. Closures made from
// ONE function literal share a SharedFunctionInfo and can share feedback, which would make the
// eight bodies one polymorphic body wearing eight names — the exact confound the arm exists to
// avoid. The gate checks all eight are distinct BY POINTER and that no prototype carries another's.
//
// ═══ THE INTERLEAVE, WHICH IS WHERE THIS AXIS WOULD MOST EASILY BECOME A LIE ═══════════════════
//
// N receivers reaching one site in N runs of one map each is N monomorphic phases, not a
// megamorphic site. So the feed is ONE module-level packed array of 4096 receivers whose CLASS
// SEQUENCE IS A FIXED SHUFFLE: a Fisher-Yates permutation of 0…4095 (xorshift32, one fixed seed,
// computed once at module load) taken modulo the rung's class count. That gives exactly 4096 ÷ N of
// each class and an APERIODIC order.
//
// ROUND-ROBIN (`i % N`) WAS REFUSED BY NAME: it is periodic with period N, so rung 2 would get a
// two-cycle a branch predictor learns perfectly while rung 16 got a sixteen-cycle, and the ladder
// would partly measure predictability against map count. THE SAME PERMUTATION IS USED AT EVERY
// RUNG — the same 4096 indices, in the same order, differing only in the modulus — so no rung is
// handed a more predictable order than another. The interleave gate REFUSES a feed whose adjacent
// repeats are zero (the round-robin signature) and prints the observed repeat count beside the
// count a uniform random order would give.
//
// The receivers are also allocated IN FEED ORDER at module load, so consecutive slots hold
// consecutively allocated objects at every rung alike.
//
// ═══ WHAT WAS DONE ABOUT INLINING, STATED PLAINLY ═════════════════════════════════════════════
//
// THE BODY WAS NOT BLOATED TO DEFEAT IT, and that is a choice with a reason: every operation added
// to make a body un-inlinable dilutes the five reads under test, and the quantity this axis quotes
// is the INCREMENT BETWEEN RUNGS, from which any constant body cost cancels exactly. What was done
// instead:
//
//  * The callee is ONE function object at ONE call site AT EVERY RUNG, so whatever TurboFan decides
//    about inlining it decides identically for all five — the decision is not a function of the
//    rung, and cannot appear in an increment.
//  * The body is five loads and fifteen arithmetic operations on the loaded locals, straight-line,
//    no branches — large enough not to be a one-liner, small enough that the reads are most of it.
//  * NO FIELD IS READ TWICE. Load elimination removes a repeated load of the same field from the
//    same object, so a body that read five fields eight times over would be a body that read them
//    once. That is the real hazard, and the shape of the fold is what closes it.
//  * The receiver arrives from a dynamically indexed array of mixed maps, so an inlined site cannot
//    be specialised to one map either.
//
// ═══ NOTHING ESCAPES ══════════════════════════════════════════════════════════════════════════
//
// The receivers are built at module load into arrays that live for the process, so no rung's
// objects can be scalarised — they are not allocated in the timed region at all. Each loop stores
// its per-call fold result into its OWN packed Smi array at slot `i` AND sums it into an
// accumulator that the phase stores into a holder. After the run a gate reads the WHOLE sink back
// and checks entry `i` against the value computed independently from the slot's own arithmetic,
// re-reads the receiver at three slots and checks its five fields, and checks that slot `i` still
// holds an object of the class the shuffle assigned it.
//
// WHAT THE ESCAPE COSTS, and it is a row's worth of work rather than a sentence: one bounds-checked
// Smi element store per call plus one addition, IDENTICAL IN ALL FOURTEEN PROGRAMS, so it cancels
// in every pair. It is inside every per-call and per-read figure printed and is NOT subtracted from
// them — those figures are UPPER BOUNDS on a read, and the increments are what is free of it.
//
// ═══ THE PRE-REGISTERED PREDICTIONS, WRITTEN BEFORE ANY ARM EXISTED ═══════════════════════════
//
// This is my model of V8, read from memory of its inline caches and its feedback vectors. I DID NOT
// OPEN V8. Every falsifier is judged mechanically at the end so that nobody — including me — picks
// them afterwards.
//
// (P1) THE PAIR THE AXIS EXISTS FOR: `maps2 ↔ maps8` — EIGHT MAPS IS DEARER THAN TWO, BY +5 TO +30
//      ns PER CALL, i.e. +1 to +6 ns per read over five reads. A direction and a size, committed.
//      MECHANISM: at two maps the feedback vector retains the map list, so TurboFan compiles each
//      load as two map compares and a fixed-offset load — a couple of cycles. Past four the IC
//      records the MEGAMORPHIC sentinel and DISCARDS the map list, so there is nothing left for
//      TurboFan to specialise on and it must emit a generic load: hash (map, name), probe the
//      process-wide stub cache, compare, run the handler. Call that ten to twenty cycles against
//      two, five times per call, at ~3 GHz. ABOVE 30 ns/call would mean the stub cache is MISSING
//      rather than hitting; below 5 ns/call would mean a megamorphic load on this machine is far
//      nearer a specialised one than I think.
//
// (P2) THE KILLER, AND IT IS AIMED AT MY OWN INSTRUMENT RATHER THAN AT THE HYPOTHESIS.
//      `maps1 ↔ maps16` — ONE map against SIXTEEN, the widest pair on the ladder, with the loop,
//      the feed, the body's arithmetic, the store and the escape held identical — MUST RESOLVE:
//      clear both arms' own resolutions and four grains, with `maps16` the dearer. IF IT DOES NOT,
//      this instrument cannot tell a monomorphic load from a megamorphic one, and NO FIGURE THIS
//      AXIS PRINTS ABOUT MAP COUNT MAY BE QUOTED — (P1), (P3), (P4) and (P5) are then printed NOT
//      JUDGED rather than reported as verdicts.
//
// (P3) THE PLATEAU, AND IT IS THE PREDICTION THAT DECIDES WHETHER COMPONENT COUNT IS A CEILING:
//      `maps8 ↔ maps16` DOES NOT RESOLVE. MECHANISM: eight maps and sixteen are the same IC STATE.
//      The feedback vector holds one sentinel either way, the compiled code is the same generic
//      load either way, and the only thing that could still differ is the collision rate in a
//      fixed-size stub cache. So megamorphic should be a STEP, not a slope.
//      KILLER: it resolves with `maps16` dearer. Then the cost keeps growing with the number of
//      component classes, the stub cache is thrashing, and COMPONENT COUNT IS A REAL CEILING rather
//      than a one-time toll. That reading is printed by name whichever way it lands.
//      THE EXPECTED OUTCOME OF THIS AXIS IS THEREFORE A REFUSAL: `maps16 ↔ maps8` lands under four
//      grains and THE COMPARISONS block prints `❌` for it. That `❌` is (P3) HOLDING, not the
//      instrument failing, and a reader who takes it for a fault has read the wrong line. What a
//      failure to resolve is NOT is a measured zero — the bound is the four-grain bar, printed.
//
// (P4) THE CLIFF IS BETWEEN 4 AND 8. The `maps4 → maps8` increment is the LARGEST of the four
//      adjacent increments AND is at least 3× the `maps2 → maps4` increment. MECHANISM: two and
//      four are both polymorphic states with a retained map list, and four differs from two by two
//      extra map compares per read; four to eight crosses from a specialised load to a generic one.
//      KILLER: the largest step is elsewhere. Then the four-entry limit is not where this engine
//      changes strategy and the model behind the whole axis is wrong.
//
// (P5) TABLE 2 — `ownBodies` IS CHEAPER THAN `sharedBodies`, resolved, BY AT LEAST HALF of the
//      `maps2 ↔ maps8` increment Table 1 measures. MECHANISM: the two arms differ in exactly one
//      thing — whether the five load sites inside the body see eight maps or one — with the
//      megamorphic method load and the eight-class feed identical on both sides.
//      KILLER: `ownBodies` dearer, or the pair not separating. Either says the penalty is NOT
//      escapable by installing the body per class on this scene, and a per-schema prototype buys
//      nothing at the field reads.
//
//      (P5) IS LEFT ABOVE EXACTLY AS COMMITTED, AND ITS MECHANISM LINE IS WRONG. It says the two
//      arms "differ in exactly one thing"; they differ in two, because the call TARGET goes
//      megamorphic on the `ownBodies` side while the receiver's property load is megamorphic on
//      both (see TABLE 2 above). A pre-registration is not rewritten after a run, so it stands, is
//      judged as written, and carries this correction beside it. WHAT THE CORRECTION CHANGES IS
//      WHAT A FAILURE LICENSES: (P5) failing does NOT establish that "a per-schema prototype buys
//      nothing at the field reads" — the second clause of the killer above is therefore also
//      withdrawn as an inference. It establishes only that dispatching to N distinct bodies at one
//      call site costs more than megamorphic reads save, on this scene. THE RUN PRINTS THIS BESIDE
//      THE VERDICT rather than leaving it in a header.
//
// (P6) ALL SEVEN NULL PAIRS ARE ORDERING OR NOTHING — `|intrinsic| ≤ noise` for every arm's twin.
//      KILLER: any pair whose intrinsic stands out of its own noise. That ARM is unquotable, not
//      merely its null.
//
// (P7) EVERY ONE OF THE FOURTEEN TIMED REGIONS CLEARS THIRTY TICKS of the observed clock at batch
//      1. KILLER: any region under the three-tick floor — that ARM, row and twin together, hence
//      its resolution, is struck out of every null, gap and prediction BEFORE they are computed.
//
// ═══ THE TWINS AND THE ORDER ══════════════════════════════════════════════════════════════════
//
// EACH OF THE SEVEN ARMS HAS ITS OWN SEPARATELY DECLARED TWIN — family `A` is the subject, family
// `B` is an independent declaration of the identical program with its own class factory, its own
// classes, its own body or bodies, its own feed and its own sink. A twin is DUPLICATED SOURCE and
// never a second call to one function. Their true difference is ZERO by construction, and what a
// pair returns is what this instrument returns when there is nothing to see.
//
// THE ONE THING THE TWO FAMILIES SHARE IS THE SHUFFLE, and it is DATA computed once at module load,
// never code in a timed region. Sharing it is what makes the twin a transcription of the subject
// rather than a second scene.
//
// ALL FOURTEEN PROGRAMS RUN IN ONE PHASE LIST, so every pair — within a table and across the two —
// is interleaved in the same rounds and balanced by the same alternating direction. Even rounds run
// the phase list forwards and odd rounds backwards; `pairedGap` splits what is left into the half
// that flips with the order (ORDER) and the half that does not (INTRINSIC), and INTRINSIC is the
// only figure quoted. This is why (P5) may compare its gap with a gap from the other table.
//
// TWO DEFECTS IN THAT SCHEDULE WERE FOUND BY ARITHMETIC AND FIXED. NEITHER TOUCHES AN ARM, THE
// RECEIVER INTERLEAVE, THE FEEDS, THE REPS OR THE ROUND COUNT — what changed is the order in which
// phases are SAMPLED, which is the estimator and not the program. Both are stated because a
// schedule that changes between runs is a reason to re-read the ladder, not to assume it stood.
//
//   THE LAYOUT. Subject and twin used to sit ADJACENT in the list. A rotation moves where a round
//   starts; it cannot change what runs IMMEDIATELY BEFORE a phase. So on every forward round the
//   twin's predecessor was its own subject while the subject's was a different arm, and on every
//   backward round the mirror — the pair's two members had systematically different neighbours,
//   which is a difference that does NOT flip with the direction and therefore lands in INTRINSIC.
//   The list is now ALL SEVEN SUBJECTS, THEN ALL SEVEN TWINS, so subject `k` and twin `k` are
//   preceded by subject `k−1` and twin `k−1`, transcriptions of each other, in both directions.
//
//   THE PARITY COUPLING. `shift` was `r % len` with `len` = 14, and `r % 14` carries `r`'s parity,
//   so FORWARD rounds used only EVEN shifts and BACKWARD only ODD. With the adjacent layout that
//   made the subject run first on 13 of 14 forward shifts and the twin first on 13 of 14 backward
//   ones, so `aFirst` was computed ENTIRELY from forward rounds and `bFirst` ENTIRELY from
//   backward ones: ORDER and DIRECTION were perfectly confounded, and `intrinsic = (aFirst +
//   bFirst) / 2` was averaging two disjoint populations rather than two orderings of one. `shift`
//   is now `(r >> 1) % len`, so every shift is visited once forward and once backward.
//   THE RUN PRINTS THE CHECK: each null line carries how many of its subject-first rounds were
//   forward and how many of its twin-first rounds were, and roughly half of each is the shape that
//   says the split is separating what it claims to separate.
//
// ═══ THE SCENE AND THE GRAIN, SET BEFORE ANYTHING WAS BUILT ═══════════════════════════════════
//
// 4096 CALLS PER PASS, 256 PASSES PER TIMED REGION (× batch) = 1 048 576 calls per region, each
// call five reads. A timed region is read off ONE clock, so every median is a multiple of
// `quantum ÷ passes`. At the 0.1 ms quantum this machine reports:
//
//   batch 1   0.100 / 256 = 0.000390625 ms per pass ÷ 4096 = 0.0954 ns PER CALL = 0.0191 ns/read
//             four grains = 0.381 ns per call
//
// (P1)'s LOWER BOUND, 5 ns per call, is 52 grains at batch 1. BATCH 1 IS THE ONE TO RUN and the
// escalation is batch 2, never more rounds: a quantised median moves in grains and only the batch
// moves the grain. The arithmetic is printed by the run from the OBSERVED quantum, not from this
// comment.
//
// ═══ WHAT THIS AXIS CANNOT SAY. Read this before quoting anything from it. ════════════════════
//
//  * NOTHING ABOUT ANY `@exodra` PACKAGE. It imports none, renders nothing, touches no DOM. The
//    grep count above is a count of a file's text, not a measurement of it.
//  * NOTHING ABOUT FIELDS THAT HOLD REFERENCES. All five here are numbers, so a read is a load and
//    an arithmetic use. A shipped body loads a schema, an array or a node AND THEN DEREFERENCES IT,
//    and the second access has its own inline cache this axis never builds.
//  * NOTHING ABOUT STORES. Every field here is written once, at construction, outside every timed
//    region. A megamorphic STORE is a different IC and is not measured.
//  * NOTHING ABOUT THE METHOD-LOAD DISPATCH ON TABLE 1, where it is pinned monomorphic by the free
//    function form; and nothing about the field reads separately from the dispatch on Table 2,
//    where the dispatch is pinned MEGAMORPHIC on both sides. Neither table prices a monomorphic
//    method call, and no rung of Table 1 is a re-declaration of a Table 2 arm.
//  * NOTHING ABOUT CODE SIZE. `ownBodies` pays N copies of the body, which at N = 8 is nothing and
//    at N = 2000 might be an instruction cache. Only N = 8 is measured.
//  * NOTHING ABOUT A REAL APP'S DISTRIBUTION. Every rung's feed is UNIFORM — 4096 ÷ N of each
//    class, shuffled. An app where one component is 90% of the instances has a hot map the stub
//    cache would keep, and that scene is not built.
//  * NOTHING ABOUT ALLOCATION, MEMORY, TEARDOWN, UPDATES OR ANY WALL-CLOCK QUANTITY.
//  * NOTHING ABOUT ANOTHER ENGINE. Every mechanism named above is V8's.
//
// ═══ HOW TO RUN IT ════════════════════════════════════════════════════════════════════════════
//
//     npm run axis --workspace=@exodra/benchmarks -- receiver-maps 100 1 --record=first
//
// Fourteen phases × a few ms of timed region per round plus a GC pair before each. THE ESCALATION
// IS `receiver-maps 100 2`, never more rounds.
//
// IF THE RUNNER'S STALE-`dist/` GATE REFUSES THE RECORDING, `--no-record` IS SAFE FOR THIS AXIS AND
// FOR ALMOST NO OTHER: that gate exists because this suite measures built packages, and this file
// reads none.
import { emitRecordedRows, type Scenario, type Stat } from '../../../harness';

// eslint-disable-next-line no-console
const line = (s: string): void => console.log(`✅ ${s}`);
// eslint-disable-next-line no-console
const refuse = (s: string): void => console.log(`❌ ${s}`);

const CALLS = 4096;
const READS = 5;
const REPS = 256;
const MIN_TICKS = 3;
const BODY_MAPS = 8;
const SHUFFLE_SEED = 987654321;
const FIELD_ORDER = 'nodes,schema,child,regions,written';

type Arm = 'maps1' | 'maps2' | 'maps4' | 'maps8' | 'maps16' | 'sharedBodies' | 'ownBodies';

const MAPS_ARMS: readonly Arm[] = ['maps1', 'maps2', 'maps4', 'maps8', 'maps16'];
const BODY_ARMS: readonly Arm[] = ['sharedBodies', 'ownBodies'];
const ALL_ARMS: readonly Arm[] = [...MAPS_ARMS, ...BODY_ARMS];

interface TReceiver {
    readonly nodes: number;
    readonly schema: number;
    readonly child: number;
    readonly regions: number;
    readonly written: number;
}

type TFold = (this: TReceiver) => number;

interface TCaller extends TReceiver {
    m: TFold;
}

interface TReceiverClass extends Function {
    new (nodes: number, schema: number, child: number, regions: number, written: number): TReceiver;
    readonly prototype: TReceiver;
}

interface TCallerClass extends Function {
    new (nodes: number, schema: number, child: number, regions: number, written: number): TCaller;
    readonly prototype: TCaller;
}

const fieldNodes = (i: number): number => (i & 1023) + 1;
const fieldPlan = (i: number): number => (i & 7) + 1;
const fieldChild = (i: number): number => (i & 3) + 1;
const fieldRegions = (i: number): number => (i & 15) + 1;
const fieldWritten = (i: number): number => (i & 63) + 1;

function foldOfSlot(i: number): number {
    const s1 = fieldNodes(i) + fieldPlan(i) * 3;
    const s2 = fieldChild(i) + fieldRegions(i) * 5;
    const s3 = fieldWritten(i) * 11;
    const s4 = (s1 ^ s2) + s3;
    const s5 = (s4 * 3 + s1) & 65535;
    const s6 = (s5 ^ (s2 * 7)) & 65535;
    return (s6 + s3) | 0;
}

function shuffledOrder(): Int32Array {
    const order = new Int32Array(CALLS);
    for (let i = 0; i < CALLS; i++) order[i] = i;
    let state = SHUFFLE_SEED >>> 0;
    for (let i = CALLS - 1; i > 0; i--) {
        state ^= state << 13;
        state >>>= 0;
        state ^= state >>> 17;
        state ^= state << 5;
        state >>>= 0;
        const j = state % (i + 1);
        const swap = order[i];
        order[i] = order[j];
        order[j] = swap;
    }
    return order;
}

const CLASS_ORDER = shuffledOrder();

const classAt = (i: number, count: number): number => CLASS_ORDER[i] % count;

function makeReceiverClassA(): TReceiverClass {
    return class {
        readonly nodes: number;
        readonly schema: number;
        readonly child: number;
        readonly regions: number;
        readonly written: number;

        constructor(
            nodes: number,
            schema: number,
            child: number,
            regions: number,
            written: number
        ) {
            this.nodes = nodes;
            this.schema = schema;
            this.child = child;
            this.regions = regions;
            this.written = written;
        }
    };
}

function makeReceiverClassB(): TReceiverClass {
    return class {
        readonly nodes: number;
        readonly schema: number;
        readonly child: number;
        readonly regions: number;
        readonly written: number;

        constructor(
            nodes: number,
            schema: number,
            child: number,
            regions: number,
            written: number
        ) {
            this.nodes = nodes;
            this.schema = schema;
            this.child = child;
            this.regions = regions;
            this.written = written;
        }
    };
}

function makeCallerClassA(body: TFold): TCallerClass {
    class Caller {
        readonly nodes: number;
        readonly schema: number;
        readonly child: number;
        readonly regions: number;
        readonly written: number;
        declare m: TFold;

        constructor(
            nodes: number,
            schema: number,
            child: number,
            regions: number,
            written: number
        ) {
            this.nodes = nodes;
            this.schema = schema;
            this.child = child;
            this.regions = regions;
            this.written = written;
        }
    }
    Caller.prototype.m = body;
    return Caller;
}

function makeCallerClassB(body: TFold): TCallerClass {
    class Caller {
        readonly nodes: number;
        readonly schema: number;
        readonly child: number;
        readonly regions: number;
        readonly written: number;
        declare m: TFold;

        constructor(
            nodes: number,
            schema: number,
            child: number,
            regions: number,
            written: number
        ) {
            this.nodes = nodes;
            this.schema = schema;
            this.child = child;
            this.regions = regions;
            this.written = written;
        }
    }
    Caller.prototype.m = body;
    return Caller;
}

function receiverClassesA(count: number): readonly TReceiverClass[] {
    const out: TReceiverClass[] = [];
    for (let k = 0; k < count; k++) out.push(makeReceiverClassA());
    return out;
}

function receiverClassesB(count: number): readonly TReceiverClass[] {
    const out: TReceiverClass[] = [];
    for (let k = 0; k < count; k++) out.push(makeReceiverClassB());
    return out;
}

function callerClassesA(bodies: readonly TFold[]): readonly TCallerClass[] {
    const out: TCallerClass[] = [];
    for (const body of bodies) out.push(makeCallerClassA(body));
    return out;
}

function callerClassesB(bodies: readonly TFold[]): readonly TCallerClass[] {
    const out: TCallerClass[] = [];
    for (const body of bodies) out.push(makeCallerClassB(body));
    return out;
}

function feedOf(classes: readonly TReceiverClass[]): readonly TReceiver[] {
    const count = classes.length;
    const out: TReceiver[] = [];
    for (let i = 0; i < CALLS; i++) {
        const Klass = classes[classAt(i, count)];
        out.push(
            new Klass(fieldNodes(i), fieldPlan(i), fieldChild(i), fieldRegions(i), fieldWritten(i))
        );
    }
    return out;
}

function callerFeedOf(classes: readonly TCallerClass[]): readonly TCaller[] {
    const count = classes.length;
    const out: TCaller[] = [];
    for (let i = 0; i < CALLS; i++) {
        const Klass = classes[classAt(i, count)];
        out.push(
            new Klass(fieldNodes(i), fieldPlan(i), fieldChild(i), fieldRegions(i), fieldWritten(i))
        );
    }
    return out;
}

const emptySink = (): number[] => new Array<number>(CALLS).fill(0);

function foldMaps1A(r: TReceiver): number {
    const s1 = r.nodes + r.schema * 3;
    const s2 = r.child + r.regions * 5;
    const s3 = r.written * 11;
    const s4 = (s1 ^ s2) + s3;
    const s5 = (s4 * 3 + s1) & 65535;
    const s6 = (s5 ^ (s2 * 7)) & 65535;
    return (s6 + s3) | 0;
}

function foldMaps2A(r: TReceiver): number {
    const s1 = r.nodes + r.schema * 3;
    const s2 = r.child + r.regions * 5;
    const s3 = r.written * 11;
    const s4 = (s1 ^ s2) + s3;
    const s5 = (s4 * 3 + s1) & 65535;
    const s6 = (s5 ^ (s2 * 7)) & 65535;
    return (s6 + s3) | 0;
}

function foldMaps4A(r: TReceiver): number {
    const s1 = r.nodes + r.schema * 3;
    const s2 = r.child + r.regions * 5;
    const s3 = r.written * 11;
    const s4 = (s1 ^ s2) + s3;
    const s5 = (s4 * 3 + s1) & 65535;
    const s6 = (s5 ^ (s2 * 7)) & 65535;
    return (s6 + s3) | 0;
}

function foldMaps8A(r: TReceiver): number {
    const s1 = r.nodes + r.schema * 3;
    const s2 = r.child + r.regions * 5;
    const s3 = r.written * 11;
    const s4 = (s1 ^ s2) + s3;
    const s5 = (s4 * 3 + s1) & 65535;
    const s6 = (s5 ^ (s2 * 7)) & 65535;
    return (s6 + s3) | 0;
}

function foldMaps16A(r: TReceiver): number {
    const s1 = r.nodes + r.schema * 3;
    const s2 = r.child + r.regions * 5;
    const s3 = r.written * 11;
    const s4 = (s1 ^ s2) + s3;
    const s5 = (s4 * 3 + s1) & 65535;
    const s6 = (s5 ^ (s2 * 7)) & 65535;
    return (s6 + s3) | 0;
}

function foldMaps1B(r: TReceiver): number {
    const s1 = r.nodes + r.schema * 3;
    const s2 = r.child + r.regions * 5;
    const s3 = r.written * 11;
    const s4 = (s1 ^ s2) + s3;
    const s5 = (s4 * 3 + s1) & 65535;
    const s6 = (s5 ^ (s2 * 7)) & 65535;
    return (s6 + s3) | 0;
}

function foldMaps2B(r: TReceiver): number {
    const s1 = r.nodes + r.schema * 3;
    const s2 = r.child + r.regions * 5;
    const s3 = r.written * 11;
    const s4 = (s1 ^ s2) + s3;
    const s5 = (s4 * 3 + s1) & 65535;
    const s6 = (s5 ^ (s2 * 7)) & 65535;
    return (s6 + s3) | 0;
}

function foldMaps4B(r: TReceiver): number {
    const s1 = r.nodes + r.schema * 3;
    const s2 = r.child + r.regions * 5;
    const s3 = r.written * 11;
    const s4 = (s1 ^ s2) + s3;
    const s5 = (s4 * 3 + s1) & 65535;
    const s6 = (s5 ^ (s2 * 7)) & 65535;
    return (s6 + s3) | 0;
}

function foldMaps8B(r: TReceiver): number {
    const s1 = r.nodes + r.schema * 3;
    const s2 = r.child + r.regions * 5;
    const s3 = r.written * 11;
    const s4 = (s1 ^ s2) + s3;
    const s5 = (s4 * 3 + s1) & 65535;
    const s6 = (s5 ^ (s2 * 7)) & 65535;
    return (s6 + s3) | 0;
}

function foldMaps16B(r: TReceiver): number {
    const s1 = r.nodes + r.schema * 3;
    const s2 = r.child + r.regions * 5;
    const s3 = r.written * 11;
    const s4 = (s1 ^ s2) + s3;
    const s5 = (s4 * 3 + s1) & 65535;
    const s6 = (s5 ^ (s2 * 7)) & 65535;
    return (s6 + s3) | 0;
}

const CLASSES_MAPS1_A = receiverClassesA(1);
const CLASSES_MAPS2_A = receiverClassesA(2);
const CLASSES_MAPS4_A = receiverClassesA(4);
const CLASSES_MAPS8_A = receiverClassesA(8);
const CLASSES_MAPS16_A = receiverClassesA(16);
const CLASSES_MAPS1_B = receiverClassesB(1);
const CLASSES_MAPS2_B = receiverClassesB(2);
const CLASSES_MAPS4_B = receiverClassesB(4);
const CLASSES_MAPS8_B = receiverClassesB(8);
const CLASSES_MAPS16_B = receiverClassesB(16);

const FEED_MAPS1_A = feedOf(CLASSES_MAPS1_A);
const FEED_MAPS2_A = feedOf(CLASSES_MAPS2_A);
const FEED_MAPS4_A = feedOf(CLASSES_MAPS4_A);
const FEED_MAPS8_A = feedOf(CLASSES_MAPS8_A);
const FEED_MAPS16_A = feedOf(CLASSES_MAPS16_A);
const FEED_MAPS1_B = feedOf(CLASSES_MAPS1_B);
const FEED_MAPS2_B = feedOf(CLASSES_MAPS2_B);
const FEED_MAPS4_B = feedOf(CLASSES_MAPS4_B);
const FEED_MAPS8_B = feedOf(CLASSES_MAPS8_B);
const FEED_MAPS16_B = feedOf(CLASSES_MAPS16_B);

const SINK_MAPS1_A = emptySink();
const SINK_MAPS2_A = emptySink();
const SINK_MAPS4_A = emptySink();
const SINK_MAPS8_A = emptySink();
const SINK_MAPS16_A = emptySink();
const SINK_MAPS1_B = emptySink();
const SINK_MAPS2_B = emptySink();
const SINK_MAPS4_B = emptySink();
const SINK_MAPS8_B = emptySink();
const SINK_MAPS16_B = emptySink();

function runMaps1A(): number {
    const feed = FEED_MAPS1_A;
    const sink = SINK_MAPS1_A;
    let acc = 0;
    for (let i = 0; i < CALLS; i++) {
        const v = foldMaps1A(feed[i]);
        sink[i] = v;
        acc += v;
    }
    return acc;
}

function runMaps2A(): number {
    const feed = FEED_MAPS2_A;
    const sink = SINK_MAPS2_A;
    let acc = 0;
    for (let i = 0; i < CALLS; i++) {
        const v = foldMaps2A(feed[i]);
        sink[i] = v;
        acc += v;
    }
    return acc;
}

function runMaps4A(): number {
    const feed = FEED_MAPS4_A;
    const sink = SINK_MAPS4_A;
    let acc = 0;
    for (let i = 0; i < CALLS; i++) {
        const v = foldMaps4A(feed[i]);
        sink[i] = v;
        acc += v;
    }
    return acc;
}

function runMaps8A(): number {
    const feed = FEED_MAPS8_A;
    const sink = SINK_MAPS8_A;
    let acc = 0;
    for (let i = 0; i < CALLS; i++) {
        const v = foldMaps8A(feed[i]);
        sink[i] = v;
        acc += v;
    }
    return acc;
}

function runMaps16A(): number {
    const feed = FEED_MAPS16_A;
    const sink = SINK_MAPS16_A;
    let acc = 0;
    for (let i = 0; i < CALLS; i++) {
        const v = foldMaps16A(feed[i]);
        sink[i] = v;
        acc += v;
    }
    return acc;
}

function runMaps1B(): number {
    const feed = FEED_MAPS1_B;
    const sink = SINK_MAPS1_B;
    let acc = 0;
    for (let i = 0; i < CALLS; i++) {
        const v = foldMaps1B(feed[i]);
        sink[i] = v;
        acc += v;
    }
    return acc;
}

function runMaps2B(): number {
    const feed = FEED_MAPS2_B;
    const sink = SINK_MAPS2_B;
    let acc = 0;
    for (let i = 0; i < CALLS; i++) {
        const v = foldMaps2B(feed[i]);
        sink[i] = v;
        acc += v;
    }
    return acc;
}

function runMaps4B(): number {
    const feed = FEED_MAPS4_B;
    const sink = SINK_MAPS4_B;
    let acc = 0;
    for (let i = 0; i < CALLS; i++) {
        const v = foldMaps4B(feed[i]);
        sink[i] = v;
        acc += v;
    }
    return acc;
}

function runMaps8B(): number {
    const feed = FEED_MAPS8_B;
    const sink = SINK_MAPS8_B;
    let acc = 0;
    for (let i = 0; i < CALLS; i++) {
        const v = foldMaps8B(feed[i]);
        sink[i] = v;
        acc += v;
    }
    return acc;
}

function runMaps16B(): number {
    const feed = FEED_MAPS16_B;
    const sink = SINK_MAPS16_B;
    let acc = 0;
    for (let i = 0; i < CALLS; i++) {
        const v = foldMaps16B(feed[i]);
        sink[i] = v;
        acc += v;
    }
    return acc;
}

function foldSharedA(this: TReceiver): number {
    const s1 = this.nodes + this.schema * 3;
    const s2 = this.child + this.regions * 5;
    const s3 = this.written * 11;
    const s4 = (s1 ^ s2) + s3;
    const s5 = (s4 * 3 + s1) & 65535;
    const s6 = (s5 ^ (s2 * 7)) & 65535;
    return (s6 + s3) | 0;
}

function foldSharedB(this: TReceiver): number {
    const s1 = this.nodes + this.schema * 3;
    const s2 = this.child + this.regions * 5;
    const s3 = this.written * 11;
    const s4 = (s1 ^ s2) + s3;
    const s5 = (s4 * 3 + s1) & 65535;
    const s6 = (s5 ^ (s2 * 7)) & 65535;
    return (s6 + s3) | 0;
}

function foldOwnFirstA(this: TReceiver): number {
    const s1 = this.nodes + this.schema * 3;
    const s2 = this.child + this.regions * 5;
    const s3 = this.written * 11;
    const s4 = (s1 ^ s2) + s3;
    const s5 = (s4 * 3 + s1) & 65535;
    const s6 = (s5 ^ (s2 * 7)) & 65535;
    return (s6 + s3) | 0;
}

function foldOwnSecondA(this: TReceiver): number {
    const s1 = this.nodes + this.schema * 3;
    const s2 = this.child + this.regions * 5;
    const s3 = this.written * 11;
    const s4 = (s1 ^ s2) + s3;
    const s5 = (s4 * 3 + s1) & 65535;
    const s6 = (s5 ^ (s2 * 7)) & 65535;
    return (s6 + s3) | 0;
}

function foldOwnThirdA(this: TReceiver): number {
    const s1 = this.nodes + this.schema * 3;
    const s2 = this.child + this.regions * 5;
    const s3 = this.written * 11;
    const s4 = (s1 ^ s2) + s3;
    const s5 = (s4 * 3 + s1) & 65535;
    const s6 = (s5 ^ (s2 * 7)) & 65535;
    return (s6 + s3) | 0;
}

function foldOwnFourthA(this: TReceiver): number {
    const s1 = this.nodes + this.schema * 3;
    const s2 = this.child + this.regions * 5;
    const s3 = this.written * 11;
    const s4 = (s1 ^ s2) + s3;
    const s5 = (s4 * 3 + s1) & 65535;
    const s6 = (s5 ^ (s2 * 7)) & 65535;
    return (s6 + s3) | 0;
}

function foldOwnFifthA(this: TReceiver): number {
    const s1 = this.nodes + this.schema * 3;
    const s2 = this.child + this.regions * 5;
    const s3 = this.written * 11;
    const s4 = (s1 ^ s2) + s3;
    const s5 = (s4 * 3 + s1) & 65535;
    const s6 = (s5 ^ (s2 * 7)) & 65535;
    return (s6 + s3) | 0;
}

function foldOwnSixthA(this: TReceiver): number {
    const s1 = this.nodes + this.schema * 3;
    const s2 = this.child + this.regions * 5;
    const s3 = this.written * 11;
    const s4 = (s1 ^ s2) + s3;
    const s5 = (s4 * 3 + s1) & 65535;
    const s6 = (s5 ^ (s2 * 7)) & 65535;
    return (s6 + s3) | 0;
}

function foldOwnSeventhA(this: TReceiver): number {
    const s1 = this.nodes + this.schema * 3;
    const s2 = this.child + this.regions * 5;
    const s3 = this.written * 11;
    const s4 = (s1 ^ s2) + s3;
    const s5 = (s4 * 3 + s1) & 65535;
    const s6 = (s5 ^ (s2 * 7)) & 65535;
    return (s6 + s3) | 0;
}

function foldOwnEighthA(this: TReceiver): number {
    const s1 = this.nodes + this.schema * 3;
    const s2 = this.child + this.regions * 5;
    const s3 = this.written * 11;
    const s4 = (s1 ^ s2) + s3;
    const s5 = (s4 * 3 + s1) & 65535;
    const s6 = (s5 ^ (s2 * 7)) & 65535;
    return (s6 + s3) | 0;
}

function foldOwnFirstB(this: TReceiver): number {
    const s1 = this.nodes + this.schema * 3;
    const s2 = this.child + this.regions * 5;
    const s3 = this.written * 11;
    const s4 = (s1 ^ s2) + s3;
    const s5 = (s4 * 3 + s1) & 65535;
    const s6 = (s5 ^ (s2 * 7)) & 65535;
    return (s6 + s3) | 0;
}

function foldOwnSecondB(this: TReceiver): number {
    const s1 = this.nodes + this.schema * 3;
    const s2 = this.child + this.regions * 5;
    const s3 = this.written * 11;
    const s4 = (s1 ^ s2) + s3;
    const s5 = (s4 * 3 + s1) & 65535;
    const s6 = (s5 ^ (s2 * 7)) & 65535;
    return (s6 + s3) | 0;
}

function foldOwnThirdB(this: TReceiver): number {
    const s1 = this.nodes + this.schema * 3;
    const s2 = this.child + this.regions * 5;
    const s3 = this.written * 11;
    const s4 = (s1 ^ s2) + s3;
    const s5 = (s4 * 3 + s1) & 65535;
    const s6 = (s5 ^ (s2 * 7)) & 65535;
    return (s6 + s3) | 0;
}

function foldOwnFourthB(this: TReceiver): number {
    const s1 = this.nodes + this.schema * 3;
    const s2 = this.child + this.regions * 5;
    const s3 = this.written * 11;
    const s4 = (s1 ^ s2) + s3;
    const s5 = (s4 * 3 + s1) & 65535;
    const s6 = (s5 ^ (s2 * 7)) & 65535;
    return (s6 + s3) | 0;
}

function foldOwnFifthB(this: TReceiver): number {
    const s1 = this.nodes + this.schema * 3;
    const s2 = this.child + this.regions * 5;
    const s3 = this.written * 11;
    const s4 = (s1 ^ s2) + s3;
    const s5 = (s4 * 3 + s1) & 65535;
    const s6 = (s5 ^ (s2 * 7)) & 65535;
    return (s6 + s3) | 0;
}

function foldOwnSixthB(this: TReceiver): number {
    const s1 = this.nodes + this.schema * 3;
    const s2 = this.child + this.regions * 5;
    const s3 = this.written * 11;
    const s4 = (s1 ^ s2) + s3;
    const s5 = (s4 * 3 + s1) & 65535;
    const s6 = (s5 ^ (s2 * 7)) & 65535;
    return (s6 + s3) | 0;
}

function foldOwnSeventhB(this: TReceiver): number {
    const s1 = this.nodes + this.schema * 3;
    const s2 = this.child + this.regions * 5;
    const s3 = this.written * 11;
    const s4 = (s1 ^ s2) + s3;
    const s5 = (s4 * 3 + s1) & 65535;
    const s6 = (s5 ^ (s2 * 7)) & 65535;
    return (s6 + s3) | 0;
}

function foldOwnEighthB(this: TReceiver): number {
    const s1 = this.nodes + this.schema * 3;
    const s2 = this.child + this.regions * 5;
    const s3 = this.written * 11;
    const s4 = (s1 ^ s2) + s3;
    const s5 = (s4 * 3 + s1) & 65535;
    const s6 = (s5 ^ (s2 * 7)) & 65535;
    return (s6 + s3) | 0;
}

const OWN_BODIES_A: readonly TFold[] = [
    foldOwnFirstA,
    foldOwnSecondA,
    foldOwnThirdA,
    foldOwnFourthA,
    foldOwnFifthA,
    foldOwnSixthA,
    foldOwnSeventhA,
    foldOwnEighthA,
];

const OWN_BODIES_B: readonly TFold[] = [
    foldOwnFirstB,
    foldOwnSecondB,
    foldOwnThirdB,
    foldOwnFourthB,
    foldOwnFifthB,
    foldOwnSixthB,
    foldOwnSeventhB,
    foldOwnEighthB,
];

const SHARED_BODIES_A: readonly TFold[] = new Array<TFold>(BODY_MAPS).fill(foldSharedA);
const SHARED_BODIES_B: readonly TFold[] = new Array<TFold>(BODY_MAPS).fill(foldSharedB);

const CLASSES_SHARED_A = callerClassesA(SHARED_BODIES_A);
const CLASSES_SHARED_B = callerClassesB(SHARED_BODIES_B);
const CLASSES_OWN_A = callerClassesA(OWN_BODIES_A);
const CLASSES_OWN_B = callerClassesB(OWN_BODIES_B);

const FEED_SHARED_A = callerFeedOf(CLASSES_SHARED_A);
const FEED_SHARED_B = callerFeedOf(CLASSES_SHARED_B);
const FEED_OWN_A = callerFeedOf(CLASSES_OWN_A);
const FEED_OWN_B = callerFeedOf(CLASSES_OWN_B);

const SINK_SHARED_A = emptySink();
const SINK_SHARED_B = emptySink();
const SINK_OWN_A = emptySink();
const SINK_OWN_B = emptySink();

function runSharedA(): number {
    const feed = FEED_SHARED_A;
    const sink = SINK_SHARED_A;
    let acc = 0;
    for (let i = 0; i < CALLS; i++) {
        const v = feed[i].m();
        sink[i] = v;
        acc += v;
    }
    return acc;
}

function runSharedB(): number {
    const feed = FEED_SHARED_B;
    const sink = SINK_SHARED_B;
    let acc = 0;
    for (let i = 0; i < CALLS; i++) {
        const v = feed[i].m();
        sink[i] = v;
        acc += v;
    }
    return acc;
}

function runOwnA(): number {
    const feed = FEED_OWN_A;
    const sink = SINK_OWN_A;
    let acc = 0;
    for (let i = 0; i < CALLS; i++) {
        const v = feed[i].m();
        sink[i] = v;
        acc += v;
    }
    return acc;
}

function runOwnB(): number {
    const feed = FEED_OWN_B;
    const sink = SINK_OWN_B;
    let acc = 0;
    for (let i = 0; i < CALLS; i++) {
        const v = feed[i].m();
        sink[i] = v;
        acc += v;
    }
    return acc;
}

interface Program {
    readonly name: string;
    readonly arm: Arm;
    readonly twin: boolean;
    readonly table: 'MAPS' | 'BODIES';
    readonly mapCount: number;
    readonly bodyCount: number;
    readonly dispatch: 'free' | 'method';
    readonly what: string;
    readonly run: () => number;
    readonly feed: readonly TReceiver[];
    readonly sink: number[];
    readonly classes: readonly TReceiverClass[];
    readonly bodies: readonly unknown[];
}

const rowName = (arm: Arm, twin: boolean): string => `${arm}${twin ? '·twin' : ''}`;

const LADDER_NOTE =
    'N classes, five identical fields in identical order, ONE shared body reached as a FREE ' +
    'FUNCTION so the callee is monomorphic at every rung and only the five in-object load sites ' +
    'see the map count';

const TWIN_NOTE =
    'the same program declared again — its own class factory, its own classes, its own body, its ' +
    'own feed, its own sink';

const PROGRAMS: readonly Program[] = [
    {
        name: rowName('maps1', false),
        arm: 'maps1',
        twin: false,
        table: 'MAPS',
        mapCount: 1,
        bodyCount: 1,
        dispatch: 'free',
        what: `${LADDER_NOTE} — ONE map, every load site MONOMORPHIC`,
        run: runMaps1A,
        feed: FEED_MAPS1_A,
        sink: SINK_MAPS1_A,
        classes: CLASSES_MAPS1_A,
        bodies: [foldMaps1A],
    },
    {
        name: rowName('maps1', true),
        arm: 'maps1',
        twin: true,
        table: 'MAPS',
        mapCount: 1,
        bodyCount: 1,
        dispatch: 'free',
        what: TWIN_NOTE,
        run: runMaps1B,
        feed: FEED_MAPS1_B,
        sink: SINK_MAPS1_B,
        classes: CLASSES_MAPS1_B,
        bodies: [foldMaps1B],
    },
    {
        name: rowName('maps2', false),
        arm: 'maps2',
        twin: false,
        table: 'MAPS',
        mapCount: 2,
        bodyCount: 1,
        dispatch: 'free',
        what: `${LADDER_NOTE} — TWO maps, THE SHIPPED SHAPE'S POLYMORPHISM`,
        run: runMaps2A,
        feed: FEED_MAPS2_A,
        sink: SINK_MAPS2_A,
        classes: CLASSES_MAPS2_A,
        bodies: [foldMaps2A],
    },
    {
        name: rowName('maps2', true),
        arm: 'maps2',
        twin: true,
        table: 'MAPS',
        mapCount: 2,
        bodyCount: 1,
        dispatch: 'free',
        what: TWIN_NOTE,
        run: runMaps2B,
        feed: FEED_MAPS2_B,
        sink: SINK_MAPS2_B,
        classes: CLASSES_MAPS2_B,
        bodies: [foldMaps2B],
    },
    {
        name: rowName('maps4', false),
        arm: 'maps4',
        twin: false,
        table: 'MAPS',
        mapCount: 4,
        bodyCount: 1,
        dispatch: 'free',
        what: `${LADDER_NOTE} — FOUR maps, V8's usual polymorphic limit, right at the edge`,
        run: runMaps4A,
        feed: FEED_MAPS4_A,
        sink: SINK_MAPS4_A,
        classes: CLASSES_MAPS4_A,
        bodies: [foldMaps4A],
    },
    {
        name: rowName('maps4', true),
        arm: 'maps4',
        twin: true,
        table: 'MAPS',
        mapCount: 4,
        bodyCount: 1,
        dispatch: 'free',
        what: TWIN_NOTE,
        run: runMaps4B,
        feed: FEED_MAPS4_B,
        sink: SINK_MAPS4_B,
        classes: CLASSES_MAPS4_B,
        bodies: [foldMaps4B],
    },
    {
        name: rowName('maps8', false),
        arm: 'maps8',
        twin: false,
        table: 'MAPS',
        mapCount: 8,
        bodyCount: 1,
        dispatch: 'free',
        what: `${LADDER_NOTE} — EIGHT maps, a real app's component count`,
        run: runMaps8A,
        feed: FEED_MAPS8_A,
        sink: SINK_MAPS8_A,
        classes: CLASSES_MAPS8_A,
        bodies: [foldMaps8A],
    },
    {
        name: rowName('maps8', true),
        arm: 'maps8',
        twin: true,
        table: 'MAPS',
        mapCount: 8,
        bodyCount: 1,
        dispatch: 'free',
        what: TWIN_NOTE,
        run: runMaps8B,
        feed: FEED_MAPS8_B,
        sink: SINK_MAPS8_B,
        classes: CLASSES_MAPS8_B,
        bodies: [foldMaps8B],
    },
    {
        name: rowName('maps16', false),
        arm: 'maps16',
        twin: false,
        table: 'MAPS',
        mapCount: 16,
        bodyCount: 1,
        dispatch: 'free',
        what: `${LADDER_NOTE} — SIXTEEN maps, a big app`,
        run: runMaps16A,
        feed: FEED_MAPS16_A,
        sink: SINK_MAPS16_A,
        classes: CLASSES_MAPS16_A,
        bodies: [foldMaps16A],
    },
    {
        name: rowName('maps16', true),
        arm: 'maps16',
        twin: true,
        table: 'MAPS',
        mapCount: 16,
        bodyCount: 1,
        dispatch: 'free',
        what: TWIN_NOTE,
        run: runMaps16B,
        feed: FEED_MAPS16_B,
        sink: SINK_MAPS16_B,
        classes: CLASSES_MAPS16_B,
        bodies: [foldMaps16B],
    },
    {
        name: rowName('sharedBodies', false),
        arm: 'sharedBodies',
        twin: false,
        table: 'BODIES',
        mapCount: BODY_MAPS,
        bodyCount: 1,
        dispatch: 'method',
        what:
            'THE PROPOSED SHAPE — eight classes, ONE function object installed on all eight ' +
            'prototypes and reached as `o.m()`. The method load is MEGAMORPHIC and so are the five ' +
            'field loads inside the one body',
        run: runSharedA,
        feed: FEED_SHARED_A,
        sink: SINK_SHARED_A,
        classes: CLASSES_SHARED_A,
        bodies: [foldSharedA],
    },
    {
        name: rowName('sharedBodies', true),
        arm: 'sharedBodies',
        twin: true,
        table: 'BODIES',
        mapCount: BODY_MAPS,
        bodyCount: 1,
        dispatch: 'method',
        what: TWIN_NOTE,
        run: runSharedB,
        feed: FEED_SHARED_B,
        sink: SINK_SHARED_B,
        classes: CLASSES_SHARED_B,
        bodies: [foldSharedB],
    },
    {
        name: rowName('ownBodies', false),
        arm: 'ownBodies',
        twin: false,
        table: 'BODIES',
        mapCount: BODY_MAPS,
        bodyCount: BODY_MAPS,
        dispatch: 'method',
        what:
            'THE ESCAPE ROUTE — the same eight classes built the same way, but EIGHT separately ' +
            'declared function objects, one per prototype. The method load is MEGAMORPHIC exactly ' +
            'as above and cancels; the five field loads inside each body see ONE map',
        run: runOwnA,
        feed: FEED_OWN_A,
        sink: SINK_OWN_A,
        classes: CLASSES_OWN_A,
        bodies: OWN_BODIES_A,
    },
    {
        name: rowName('ownBodies', true),
        arm: 'ownBodies',
        twin: true,
        table: 'BODIES',
        mapCount: BODY_MAPS,
        bodyCount: BODY_MAPS,
        dispatch: 'method',
        what: TWIN_NOTE,
        run: runOwnB,
        feed: FEED_OWN_B,
        sink: SINK_OWN_B,
        classes: CLASSES_OWN_B,
        bodies: OWN_BODIES_B,
    },
];

function expectedTotal(): number {
    let acc = 0;
    for (let i = 0; i < CALLS; i++) acc += foldOfSlot(i);
    return acc;
}

function gateShape(): string[] {
    const out: string[] = [];
    for (const p of PROGRAMS) {
        let checked = 0;
        for (let k = 0; k < p.classes.length; k++) {
            const Klass = p.classes[k];
            const one = new Klass(1, 2, 3, 4, 5);
            const keys = Object.keys(one).join(',');
            if (keys !== FIELD_ORDER) {
                throw new Error(
                    `receiver-maps: "${p.name}" class ${k} builds own keys [${keys}] where ` +
                        `[${FIELD_ORDER}] was declared. The classes do not have identical fields ` +
                        'in identical order, so they differ in more than their identity.'
                );
            }
            if (one.nodes !== 1 || one.schema !== 2 || one.child !== 3) {
                throw new Error(
                    `receiver-maps: "${p.name}" class ${k} does not read back the values it was ` +
                        'constructed with.'
                );
            }
            const hasMethod = 'm' in one;
            if (hasMethod !== (p.dispatch === 'method')) {
                throw new Error(
                    `receiver-maps: "${p.name}" class ${k} ${
                        hasMethod ? 'carries' : 'does not carry'
                    } an \`m\`, which is the opposite of its declared \`${p.dispatch}\` dispatch.`
                );
            }
            if (hasMethod && Object.prototype.hasOwnProperty.call(one, 'm')) {
                throw new Error(
                    `receiver-maps: "${p.name}" class ${k} carries \`m\` as an OWN property. The ` +
                        'body must live on the prototype or the receiver has six fields, not five.'
                );
            }
            checked++;
        }
        const protos = new Set<TReceiver>();
        for (const Klass of p.classes) protos.add(Klass.prototype);
        if (protos.size !== p.classes.length) {
            throw new Error(
                `receiver-maps: "${p.name}" declares ${p.classes.length} classes over only ` +
                    `${protos.size} distinct prototypes. Distinct prototypes are what makes the ` +
                    'maps distinct, and this arm does not have the map count it claims.'
            );
        }
        out.push(
            `  ${p.name.padEnd(20)}${checked} classes · own keys [${FIELD_ORDER}] · \`m\` ${
                p.dispatch === 'method' ? 'on the prototype' : 'absent'
            } · ${protos.size} distinct prototypes, hence ${protos.size} distinct maps`
        );
    }
    return out;
}

function gateSeparate(): string[] {
    const bodies = new Set<unknown>();
    let bodyTotal = 0;
    for (const p of PROGRAMS) {
        for (const b of p.bodies) bodies.add(b);
        bodyTotal += p.bodyCount;
    }
    if (bodies.size !== bodyTotal) {
        throw new Error(
            `receiver-maps: the ${PROGRAMS.length} programs declare ${bodyTotal} bodies over only ` +
                `${bodies.size} distinct function objects. Two programs sharing a body share one ` +
                'feedback vector, so its load sites would see the UNION of both programs’ ' +
                'maps and every rung of the ladder would be megamorphic.'
        );
    }
    const sinks = new Set<number[]>(PROGRAMS.map((p) => p.sink));
    if (sinks.size !== PROGRAMS.length) {
        throw new Error(
            `receiver-maps: the ${PROGRAMS.length} programs share ${
                PROGRAMS.length - sinks.size
            } sink array(s). Every program must own its escape route.`
        );
    }
    const feeds = new Set<readonly TReceiver[]>(PROGRAMS.map((p) => p.feed));
    if (feeds.size !== PROGRAMS.length) {
        throw new Error(
            `receiver-maps: the ${PROGRAMS.length} programs share ${
                PROGRAMS.length - feeds.size
            } feed array(s).`
        );
    }
    const classes = new Set<TReceiverClass>();
    let classTotal = 0;
    for (const p of PROGRAMS) {
        for (const k of p.classes) classes.add(k);
        classTotal += p.classes.length;
    }
    if (classes.size !== classTotal) {
        throw new Error(
            `receiver-maps: the ${PROGRAMS.length} programs declare ${classTotal} classes over ` +
                `only ${classes.size} distinct constructors. No two arms may share a map.`
        );
    }
    return [
        `  ${bodies.size} distinct body function objects across ${bodyTotal} declared bodies · ` +
            `${classes.size} distinct constructors across ${classTotal} declared classes · ` +
            `${feeds.size} distinct feeds · ${sinks.size} distinct sinks — all checked BY POINTER`,
        '  the eight `ownBodies` functions are written out one by one rather than produced by a ' +
            'factory: closures made from ONE function literal share a SharedFunctionInfo and can ' +
            'share feedback, which would make eight bodies one polymorphic body wearing eight names',
    ];
}

function gateInterleave(): string[] {
    const out: string[] = [];
    for (const p of PROGRAMS) {
        const count = p.mapCount;
        const per = new Int32Array(count);
        let repeats = 0;
        let roundRobinMatches = 0;
        for (let i = 0; i < CALLS; i++) {
            const at = classAt(i, count);
            per[at]++;
            if (i > 0 && at === classAt(i - 1, count)) repeats++;
            if (at === i % count) roundRobinMatches++;
        }
        const want = CALLS / count;
        for (let k = 0; k < count; k++) {
            if (per[k] !== want) {
                throw new Error(
                    `receiver-maps: "${p.name}" feeds class ${k} ${per[k]} times where ${want} ` +
                        'was expected. The classes do not reach the call site in equal numbers, ' +
                        'so the rung is not the map count it claims.'
                );
            }
        }
        if (count > 1 && repeats === 0) {
            throw new Error(
                `receiver-maps: "${p.name}" never feeds the same class twice in a row, which is ` +
                    'the ROUND-ROBIN signature. A periodic order of period N is one a branch ' +
                    'predictor learns, and the ladder would partly measure predictability against ' +
                    'map count.'
            );
        }
        const uniform = count > 1 ? (CALLS - 1) / count : CALLS - 1;
        out.push(
            `  ${p.name.padEnd(
                20
            )}${count} classes × ${want} calls · adjacent repeats ${repeats} ` +
                `(a uniform random order gives ~${uniform.toFixed(0)}) · agrees with round-robin ` +
                `at ${roundRobinMatches} of ${CALLS} positions`
        );
    }
    out.push(
        '  ONE permutation of 0…' +
            `${
                CALLS - 1
            } (Fisher-Yates, xorshift32, seed ${SHUFFLE_SEED}) taken modulo the rung's ` +
            'class count. THE SAME INDICES IN THE SAME ORDER AT EVERY RUNG, so no rung is handed a ' +
            'more predictable order than another, and both families read the same permutation so ' +
            'a twin is a transcription rather than a second scene.'
    );
    return out;
}

function gateWork(): string[] {
    const want = expectedTotal();
    const out = [
        `  the accumulator every program must return: ${want} — computed here from the slot ` +
            "arithmetic and not from any arm's receivers",
    ];
    for (const p of PROGRAMS) {
        const got = p.run();
        if (got !== want) {
            throw new Error(
                `receiver-maps: "${p.name}" returned ${got} where every program must return ` +
                    `${want}. The arms are not doing identical work and nothing may be timed.`
            );
        }
    }
    out.push(
        `  all ${PROGRAMS.length} programs return it — identical values, identical arithmetic, ` +
            `identical count of ${CALLS} calls × ${READS} reads`
    );
    return out;
}

function gateEscape(): string[] {
    const out: string[] = [];
    const probes = [0, 1, CALLS >> 1, CALLS - 1];
    for (const p of PROGRAMS) {
        p.run();
        const sink = p.sink;
        if (sink.length !== CALLS) {
            throw new Error(
                `receiver-maps: "${p.name}" left ${sink.length} entries in its sink where ${CALLS} ` +
                    'were expected — the array grew or shrank.'
            );
        }
        for (const at of probes) {
            const wantValue = foldOfSlot(at);
            if (sink[at] !== wantValue) {
                throw new Error(
                    `receiver-maps: "${p.name}" sink entry ${at} holds ${sink[at]} where ` +
                        `${wantValue} was expected — the per-call result did not escape, or slot ` +
                        'i does not hold the value computed at i.'
                );
            }
            const r = p.feed[at];
            if (
                r.nodes !== fieldNodes(at) ||
                r.schema !== fieldPlan(at) ||
                r.child !== fieldChild(at) ||
                r.regions !== fieldRegions(at) ||
                r.written !== fieldWritten(at)
            ) {
                throw new Error(
                    `receiver-maps: "${p.name}" feed entry ${at} does not read back its five ` +
                        'fields after the run.'
                );
            }
            const Klass = p.classes[classAt(at, p.mapCount)];
            if (!(r instanceof Klass)) {
                throw new Error(
                    `receiver-maps: "${p.name}" feed entry ${at} is not of the class the shuffle ` +
                        'assigned it, so the arm does not put the maps through the site it claims.'
                );
            }
        }
        out.push(
            `  ${p.name.padEnd(20)}${sink.length} sink entries · entries ${probes.join(', ')} ` +
                'carry the value computed at their own slot · the receiver at each still reads ' +
                'back its five fields and is still of the class the shuffle assigned it'
        );
    }
    return out;
}

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
    readonly prep: () => Scenario;
}

interface Series {
    readonly times: Map<string, number[]>;
    readonly position: Map<string, number[]>;
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

function runPhases(phases: readonly Phase[], rounds: number): Series {
    for (let w = 0; w < 6; w++) for (const p of phases) sampleOnce(p);
    const len = phases.length;
    const times = new Map<string, number[]>();
    const position = new Map<string, number[]>();
    for (const p of phases) {
        times.set(p.name, []);
        position.set(p.name, []);
    }
    for (let r = 0; r < rounds; r++) {
        const shift = (r >> 1) % len;
        const forward = r % 2 === 0;
        for (let k = 0; k < len; k++) {
            const at = forward ? (k + shift) % len : (shift + len - 1 - k) % len;
            const p = phases[at];
            (times.get(p.name) as number[]).push(sampleOnce(p));
            (position.get(p.name) as number[]).push(k);
        }
    }
    return { times, position };
}

interface Gap {
    readonly bias: number;
    readonly noise: number;
    readonly noiseP75: number;
    readonly worst: number;
    readonly resolution: number;
    readonly aFirst: number;
    readonly bFirst: number;
    readonly order: number;
    readonly intrinsic: number;
    readonly aFirstRounds: number;
    readonly bFirstRounds: number;
    readonly aFirstForward: number;
    readonly bFirstForward: number;
}

function medianOf(xs: readonly number[]): number {
    if (xs.length === 0) return 0;
    const s = [...xs].sort((x, y) => x - y);
    return s[Math.floor(s.length / 2)];
}

function pairedGap(a: number[], b: number[], aPos: number[], bPos: number[]): Gap {
    const n = Math.min(a.length, b.length);
    const diffs: number[] = new Array<number>(n);
    const whenAFirst: number[] = [];
    const whenBFirst: number[] = [];
    let aFirstForward = 0;
    let bFirstForward = 0;
    for (let r = 0; r < n; r++) {
        const signed = a[r] - b[r];
        diffs[r] = Math.abs(signed);
        const forward = r % 2 === 0;
        if (aPos[r] < bPos[r]) {
            whenAFirst.push(signed);
            if (forward) aFirstForward++;
        } else {
            whenBFirst.push(signed);
            if (forward) bFirstForward++;
        }
    }
    const d = stat(diffs);
    const bias = Math.abs(stat(a).median - stat(b).median);
    const aFirst = medianOf(whenAFirst);
    const bFirst = medianOf(whenBFirst);
    return {
        bias,
        noise: d.median,
        noiseP75: d.p75,
        worst: d.max,
        resolution: Math.max(bias, d.median),
        aFirst,
        bFirst,
        order: (aFirst - bFirst) / 2,
        intrinsic: (aFirst + bFirst) / 2,
        aFirstRounds: whenAFirst.length,
        bFirstRounds: whenBFirst.length,
        aFirstForward,
        bFirstForward,
    };
}

interface Comparison {
    readonly dearer: Arm;
    readonly cheaper: Arm;
    readonly note: string;
}

const COMPARISONS: readonly Comparison[] = [
    {
        dearer: 'maps2',
        cheaper: 'maps1',
        note: 'ADJACENT RUNG — two maps against one, the first step off monomorphic',
    },
    {
        dearer: 'maps4',
        cheaper: 'maps2',
        note:
            'ADJACENT RUNG — four maps against two, both polymorphic states with a retained map ' +
            'list, so this pair is two extra map compares per read and nothing else',
    },
    {
        dearer: 'maps8',
        cheaper: 'maps4',
        note:
            'ADJACENT RUNG — eight maps against four, and THE CROSSING (P4) NAMES: from a load ' +
            'TurboFan specialises on a retained map list to a generic load through the stub cache',
    },
    {
        dearer: 'maps16',
        cheaper: 'maps8',
        note:
            'ADJACENT RUNG AND THE PLATEAU QUESTION (P3) — sixteen maps against eight, the same ' +
            'IC state and the same compiled load either way, so anything here is stub-cache ' +
            'collision rate rather than a change of strategy',
    },
    {
        dearer: 'maps8',
        cheaper: 'maps2',
        note:
            "THE PRE-REGISTERED PAIR (P1) — a real app's component count against the shipped " +
            "shape's polymorphism. Same loop, same feed length, same body arithmetic, same store, " +
            'same escape; the map count at five load sites is the only difference',
    },
    {
        dearer: 'maps16',
        cheaper: 'maps1',
        note:
            'THE INSTRUMENT CHECK (P2) — sixteen maps against one, the widest pair on the ladder. ' +
            'IF THIS DOES NOT RESOLVE, this axis cannot tell a monomorphic load from a ' +
            'megamorphic one and NOTHING it prints about map count may be quoted',
    },
    {
        dearer: 'sharedBodies',
        cheaper: 'ownBodies',
        note:
            'TABLE 2 (P5) — AND IT IS FUSED TWO WAYS, WHICH AN EARLIER NOTE HERE DENIED. `o.m()` ' +
            'carries two inline caches: the PROPERTY LOAD of `m` is megamorphic on both sides and ' +
            'CANCELS, but the CALL TARGET is MONOMORPHIC for `sharedBodies` (one callee, ' +
            'inlinable) and MEGAMORPHIC for `ownBodies` (eight callees, no inlining, an indirect ' +
            'call per iteration). So this pair is (eight maps against one at five load sites) ' +
            'FUSED WITH (one callee against eight at one call site), and the two push OPPOSITE ' +
            'ways. `ownBodies` also pays eight copies of the body, negligible at eight and perhaps ' +
            'not at two thousand',
    },
    {
        dearer: 'sharedBodies',
        cheaper: 'maps8',
        note:
            'THE ONE PART OF TABLE 2’S FUSION THIS RUN CAN TAKE APART — eight maps at the five ' +
            'field sites on both sides, identical reads, identical arithmetic; they differ in ' +
            'REACHING THE BODY THROUGH THE RECEIVER (a megamorphic property load of `m`, then a ' +
            'call to a single known function) against calling a named free function directly. It ' +
            'prices the method-load term. FUSED with the receivers carrying a prototype method, ' +
            'and it is a CROSS-TABLE pair — legitimate only because all fourteen programs run in ' +
            'ONE phase list, interleaved in the same rounds',
    },
];

export function benchmarkReceiverMaps(rounds = 100, batch = 1): void {
    const f = (x: number): string => x.toFixed(4);
    const f6 = (x: number): string => x.toFixed(6);
    const sign = (x: number): string => (x >= 0 ? `+${x.toFixed(6)}` : x.toFixed(6));
    const nsCallRaw = (x: number): number => (x * 1e6) / CALLS;
    const nsReadRaw = (x: number): number => nsCallRaw(x) / READS;
    const nsCall = (x: number): string => `${nsCallRaw(x).toFixed(3)} ns/call`;

    const quantum = observeTimerQuantum();
    line(
        `receiver-maps: observed timer quantum (${quantum.toFixed(3)} ms) — every timed region ` +
            `below must clear ${(MIN_TICKS * quantum).toFixed(3)} ms (${MIN_TICKS}×) or its ` +
            'digits are quantisation. THE CLOCK CHECK RUNS BEFORE THE VERDICTS and strikes any ' +
            'such arm out of them.'
    );

    line('');
    line(
        'THE SHAPE, AS BUILT — checked by pointer and by key order, not assumed. Nothing here ' +
            'imports any @exodra package: this axis is fourteen straight-line programs and a clock.'
    );
    for (const l of gateShape()) line(l);
    for (const l of gateSeparate()) line(l);

    line('');
    line(
        'THE INTERLEAVE GATE — one call site must see all N maps in an order the engine cannot ' +
            'specialise. Round-robin is refused BY NAME.'
    );
    for (const l of gateInterleave()) line(l);

    line('');
    line(
        'THE WORK GATE — every program must return the same accumulator, so the arms differ in ' +
            'HOW MANY MAPS REACH THE READS and in nothing else.'
    );
    for (const l of gateWork()) line(l);

    line('');
    line(
        'THE ESCAPE GATE — the sink and the receivers read back after a run. This is what stops ' +
            'fourteen arms being fourteen measurements of an empty loop.'
    );
    for (const l of gateEscape()) line(l);

    const reps = REPS * batch;
    const grain = quantum / reps;
    const grainCall = (grain * 1e6) / CALLS;
    const grainRead = grainCall / READS;
    const grains = (x: number): number => Math.round(Math.abs(x) / grain);

    line('');
    line("CENSUS — read off this file's own text, nothing measured");
    line(`  calls per pass              ${CALLS}`);
    line(`  reads per call              ${READS}  (${FIELD_ORDER})`);
    line(`  passes per timed region     ${reps}  (REPS ${REPS} × batch ${batch})`);
    line(`  calls per timed region      ${CALLS * reps}`);
    line(`  reads per timed region      ${CALLS * reps * READS}`);
    line(
        `  live receivers              ${CALLS * PROGRAMS.length} — every one built at module ` +
            'load and kept for the process, so NO ARM ALLOCATES INSIDE A TIMED REGION and none ' +
            'of them can be scalarised'
    );
    for (const p of PROGRAMS) {
        if (p.twin) continue;
        line(
            `  ${p.arm.padEnd(14)}maps ${String(p.mapCount).padStart(2)} · bodies ` +
                `${String(p.bodyCount).padStart(2)} · dispatch ${p.dispatch.padEnd(7)} · ` +
                `${p.what}`
        );
    }
    line(
        '  THE ESCAPE                  one bounds-checked Smi element store per call into a ' +
            `packed module-level array of ${CALLS}, plus one addition. IDENTICAL IN ALL ` +
            `${PROGRAMS.length} PROGRAMS, so it cancels in every pair — and it is INSIDE every ` +
            'ns/call and ns/read figure below, which are therefore UPPER BOUNDS.'
    );
    line(
        '  INLINING                    the body was NOT bloated to defeat it. The callee is ONE ' +
            'function object at ONE call site at every rung, so the decision cannot vary with the ' +
            'rung and cannot appear in an increment; no field is read twice, so load elimination ' +
            'has nothing to remove.'
    );
    line(
        `  THE GRAIN                   ${f6(grain)} ms per pass = ${grainCall.toFixed(4)} ns PER ` +
            `CALL = ${grainRead.toFixed(4)} ns per read (quantum ${quantum.toFixed(3)} over ` +
            `${reps} passes). EVERY MEDIAN BELOW IS A MULTIPLE OF IT.`
    );
    line(
        `  FOUR GRAINS                 ${(4 * grainCall).toFixed(4)} ns per call. (P1)'s lower ` +
            `bound is 5 ns/call = ${Math.round(5 / grainCall)} grains, so this batch can express ` +
            'the smallest quantity the prediction commits to.'
    );
    line(
        "  THE QUOTING RULE            a difference must clear BOTH its own two arms' resolution " +
            'AND FOUR GRAINS to be quoted as a size, and the pair is REFUSED BY NAME otherwise.'
    );

    const PHASE_ORDER: readonly Program[] = [
        ...PROGRAMS.filter((p) => !p.twin),
        ...PROGRAMS.filter((p) => p.twin),
    ];

    line(
        `  THE PHASE LAYOUT            all ${PHASE_ORDER.length} subjects first, then all ` +
            'their twins — NOT subject beside twin. A rotation cannot change what runs ' +
            'IMMEDIATELY BEFORE a phase, only where the round starts, so an adjacent layout gives ' +
            "a twin its own subject as predecessor on every forward round and the pair's two " +
            'members systematically different neighbours — a difference that does NOT flip with ' +
            'the direction and therefore lands in INTRINSIC. Laid out this way, subject `k` and ' +
            'twin `k` are preceded by subject `k−1` and twin `k−1`, which are transcriptions of ' +
            'each other, in both directions.'
    );

    const phases: Phase[] = PHASE_ORDER.map((p) => ({
        name: p.name,
        reps,
        prep: (): Scenario => {
            const holder: { total: number } = { total: 0 };
            const run = p.run;
            return {
                measure: () => {
                    holder.total = run();
                },
                cleanup: () => {
                    holder.total = 0;
                },
            };
        },
    }));

    const series = runPhases(phases, rounds);
    const seriesOf = (name: string): number[] => series.times.get(name) as number[];
    const posOf = (name: string): number[] => series.position.get(name) as number[];
    const stats = new Map<string, Stat>();
    for (const p of PROGRAMS) stats.set(p.name, stat(seriesOf(p.name)));
    const median = (name: string): number => (stats.get(name) as Stat).median;

    const tableRows = (table: 'MAPS' | 'BODIES'): readonly (readonly [string, Stat])[] =>
        PROGRAMS.filter((p) => p.table === table).map(
            (p) => [p.name, stats.get(p.name) as Stat] as const
        );

    emitRecordedRows('MAPS', 'ms', 'pass', tableRows('MAPS'));
    emitRecordedRows('BODIES', 'ms', 'pass', tableRows('BODIES'));

    const printTable = (table: 'MAPS' | 'BODIES', title: string): void => {
        line('');
        line(
            `${title} — ${CALLS} calls per pass [ms per pass] · interleaved, direction ` +
                `alternating · ${rounds} rounds · batch ${batch} · ${reps} passes per timed ` +
                'region · GC before every timed region'
        );
        line(
            '                    maps bod   min      p25      median   p75      max      ' +
                'med/grain  ticks   ns/call  ns/read'
        );
        for (const p of PROGRAMS) {
            if (p.table !== table) continue;
            const s = stats.get(p.name) as Stat;
            const region = s.median * reps;
            line(
                `${p.name.padEnd(20)}${String(p.mapCount).padStart(4)}` +
                    `${String(p.bodyCount).padStart(4)}   ` +
                    `${f(s.min)}   ${f(s.p25)}   ${f(s.median)}   ${f(s.p75)}   ${f(s.max)}   ` +
                    `${(s.median / grain).toFixed(1).padStart(9)}  ${(region / quantum)
                        .toFixed(1)
                        .padStart(6)}   ${nsCallRaw(s.median).toFixed(3).padStart(7)}  ` +
                    `${nsReadRaw(s.median).toFixed(4)}`
            );
        }
        line(
            '  maps = DISTINCT RECEIVER MAPS REACHING THE READS. bod = DISTINCT BODIES THE ' +
                `READS LIVE IN. med/grain = the median over one grain (${f6(grain)} ms) — a ` +
                'small integer there means the row is the clock and not the program. ns/read = ' +
                `ns/call ÷ ${READS} AND IT CONTAINS THE TAIL (the loop, the element load, the ` +
                'call, the store, the addition), so it is an upper bound on one read.'
        );
    };

    printTable('MAPS', 'RECEIVER MAPS — THE LADDER');
    printTable('BODIES', 'SHARED BODY AGAINST OWN BODIES, AT EIGHT MAPS');

    line('');
    for (const p of PROGRAMS) line(`  ${p.name.padEnd(20)} ${p.what}`);

    line('');
    line(
        'THE CLOCK CHECK — run BEFORE the nulls, the gaps and the predictions. A region under ' +
            `${MIN_TICKS} ticks EXCLUDES its whole arm, row and twin together, from all three.`
    );
    const excluded = new Set<string>();
    const excludedArms = new Set<Arm>();
    for (const p of PROGRAMS) {
        const region = (stats.get(p.name) as Stat).median * reps;
        const ticks = region / quantum;
        if (ticks >= MIN_TICKS) {
            line(
                `  ${p.name.padEnd(20)}region ${region.toFixed(3)} ms = ${ticks.toFixed(
                    1
                )} ticks — clears the ${MIN_TICKS}× floor`
            );
            continue;
        }
        excluded.add(p.name);
        excludedArms.add(p.arm);
        const wantBatch = ticks > 0 ? Math.ceil((batch * MIN_TICKS) / ticks) : batch * 10;
        refuse(
            `receiver-maps: the "${p.name}" timed region is ${region.toFixed(
                3
            )} ms at ${reps} passes — ${ticks.toFixed(1)}× the observed quantum ` +
                `(${quantum.toFixed(3)} ms), under the ${MIN_TICKS}× floor. Its digits are ` +
                `quantisation, so THE WHOLE "${p.arm}" ARM — this row AND its twin, hence its ` +
                'resolution — IS EXCLUDED from every null, every gap and every prediction below. ' +
                `Re-run with batch ${wantBatch}: \`npm run axis ` +
                `--workspace=@exodra/benchmarks -- receiver-maps ${rounds} ${wantBatch}\``
        );
    }
    if (excluded.size === 0) {
        line(
            `  ALL ${PROGRAMS.length} REGIONS CLEAR THE FLOOR — nothing is excluded, and every ` +
                'block below is computed over the whole table.'
        );
    }
    const usable = (...arms: Arm[]): boolean => arms.every((a) => !excludedArms.has(a));

    const nullOf = new Map<Arm, Gap>();
    for (const arm of ALL_ARMS) {
        const a = rowName(arm, false);
        const b = rowName(arm, true);
        nullOf.set(arm, pairedGap(seriesOf(a), seriesOf(b), posOf(a), posOf(b)));
    }
    const resOf = (arm: Arm): number => (nullOf.get(arm) as Gap).resolution;

    const gapOf = new Map<string, Gap>();
    const keyOf = (cmp: Comparison): string => `${cmp.dearer}↔${cmp.cheaper}`;
    for (const cmp of COMPARISONS) {
        const a = rowName(cmp.dearer, false);
        const b = rowName(cmp.cheaper, false);
        gapOf.set(keyOf(cmp), pairedGap(seriesOf(a), seriesOf(b), posOf(a), posOf(b)));
    }
    const resolvedOf = (cmp: Comparison): boolean => {
        if (!usable(cmp.dearer, cmp.cheaper)) return false;
        const v = gapOf.get(keyOf(cmp)) as Gap;
        const res = Math.max(resOf(cmp.dearer), resOf(cmp.cheaper));
        return Math.abs(v.intrinsic) > res && grains(v.intrinsic) >= 4;
    };
    const intrinsicOf = (cmp: Comparison): number => (gapOf.get(keyOf(cmp)) as Gap).intrinsic;

    line('');
    line(
        `NULLS — ${ALL_ARMS.length} pairs, one per arm, each a separately declared copy of its ` +
            'program (its own class factory, its own classes, its own body or bodies, its own ' +
            'feed, its own sink). True Δ = 0.'
    );
    line(
        '  null            bias      noise     p75       worst     order     intrinsic  what it is'
    );
    let worstRes = 0;
    for (const arm of ALL_ARMS) {
        const name = rowName(arm, false);
        const v = nullOf.get(arm) as Gap;
        if (v.resolution > worstRes) worstRes = v.resolution;
        line(
            `  ${name.padEnd(14)}${f6(v.bias)}  ${f6(v.noise)}  ${f6(v.noiseP75)}  ` +
                `${f6(v.worst)}  ${f6(v.order).padStart(9)} ${f6(v.intrinsic).padStart(9)}  ` +
                `|${name} − its twin| ms/pass, true Δ = 0 (this pair's resolution ` +
                `${f6(v.resolution)} = ${nsCallRaw(v.resolution).toFixed(3)} ns/call; Δ when it ` +
                `ran first ${f6(v.aFirst)} over ${
                    v.aFirstRounds
                } rounds, when the twin ran first ` +
                `${f6(v.bFirst)} over ${v.bFirstRounds}${
                    excluded.has(name) || excluded.has(rowName(arm, true))
                        ? '; ONE HALF OF THIS PAIR IS EXCLUDED BY THE CLOCK CHECK'
                        : ''
                })`
        );
    }
    line(
        `  RESOLUTION FLOOR      ${f6(worstRes)} ms — THE COARSEST OF THE ${ALL_ARMS.length}, ` +
            'printed for the recorder. NO VERDICT BELOW USES IT: every quantity is judged against ' +
            'the resolution of ITS OWN two arms, which is on the lines above.'
    );

    line('');
    line(
        'THE ORDER SPLIT — is a null measuring two programs, or measuring which of them ran first?'
    );
    const notNull: string[] = [];
    for (const arm of ALL_ARMS) {
        const name = rowName(arm, false);
        const v = nullOf.get(arm) as Gap;
        const intr = Math.abs(v.intrinsic);
        const ord = Math.abs(v.order);
        let verdictWord: string;
        if (intr > v.noise) {
            notNull.push(name);
            verdictWord =
                'INTRINSIC — the two declarations differ in a way that does NOT flip with the ' +
                `order, so this pair is not a null and every figure printed for "${name}" is ` +
                'suspect';
        } else if (ord > v.noise) {
            verdictWord =
                'ORDERING — what the pair separates flips sign with which of the two ran first, ' +
                'so it is the position in the round and not the program';
        } else {
            verdictWord =
                "NEITHER stands out of this pair's own noise — the pair is a null and the " +
                'instrument has nothing to confess';
        }
        line(
            `  ${name.padEnd(14)}order ${f6(ord)} · intrinsic ${f6(intr)} · noise ${f6(v.noise)} ` +
                `ms/pass — intrinsic ${String(grains(intr)).padStart(4)} grains = ` +
                `${nsCallRaw(intr).toFixed(3)} ns/call, noise ${grains(v.noise)} grains, over ` +
                `${v.aFirstRounds} rounds with the subject first (${v.aFirstForward} of them ` +
                `forward) and ${v.bFirstRounds} with the twin first (${v.bFirstForward} forward) ` +
                `— ${verdictWord}`
        );
    }
    line(
        '  THE CONFOUND CHECK — the two bracketed counts above are what says whether ORDER and ' +
            'DIRECTION are separable at all. If every subject-first round is forward and every ' +
            'twin-first round is backward, `order` and `intrinsic` are (forward ± backward) ÷ 2 ' +
            'and any systematic forward-versus-backward difference in the pair is split between ' +
            'them rather than isolated by either. Roughly half of each count forward is the shape ' +
            'that says the split is doing its job.'
    );
    for (const name of notNull) {
        const arm = (PROGRAMS.find((p) => p.name === name) as Program).arm;
        const v = nullOf.get(arm) as Gap;
        const g = grains(v.intrinsic);
        refuse(
            `receiver-maps: the "${name}" null came back INTRINSIC — its order-balanced difference ` +
                `from its own twin is ${f6(v.intrinsic)} ms/pass (${g} grains, ` +
                `${nsCallRaw(v.intrinsic).toFixed(3)} ns/call) against a noise of ` +
                `${f6(v.noise)} ms (${grains(v.noise)} grains). Two declarations of one program ` +
                'that differ in a way which does not flip with the running order are two ' +
                `different programs. WHICH OF THE TWO READINGS THIS IS, THE RUN SAYS BY THE GRAIN ` +
                `COUNT: ${
                    g >= 4
                        ? `at ${g} grains it is ABOVE the four-grain bar every other figure on ` +
                          'this axis must clear, so it is a real difference between subject and ' +
                          'twin and the arm is not quotable. Open the twin first — its own ' +
                          'factory, its own classes, its own body, its own feed, its own sink — ' +
                          'and then the phase layout, since a pair whose two members have ' +
                          'different predecessors in the round differs in something that does not ' +
                          'flip with the direction'
                        : `at ${g} grains it is UNDER the four-grain bar every other figure on ` +
                          'this axis must clear, so this instrument cannot adjudicate it at all: ' +
                          'intrinsic and noise have both collapsed onto the same small multiple ' +
                          'of the grain and the verdict is decided by a rounding tie. THIS IS NOT ' +
                          'EVIDENCE THAT THE TWIN DIFFERS, and it is not evidence that it does ' +
                          `not. Halve the grain — \`receiver-maps ${rounds} ${batch * 2}\` — and ` +
                          'read the pair again'
                }.`
        );
        const contaminated = COMPARISONS.filter(
            (c) => (c.dearer === arm || c.cheaper === arm) && resolvedOf(c)
        );
        refuse(
            `receiver-maps: the pairs carrying "${arm}"'s resolution are ${
                COMPARISONS.filter((c) => c.dearer === arm || c.cheaper === arm)
                    .map(keyOf)
                    .join(', ') || 'none'
            }. Of those, ${
                contaminated.length === 0
                    ? 'NONE resolved, so nothing quotable rests on this null'
                    : `${contaminated.map(keyOf).join(', ')} resolved, and each is quotable only ` +
                      `if its own gap exceeds this null's ${g} grains by enough to survive it — ` +
                      `their grain counts are ${contaminated
                          .map((c) => `${keyOf(c)} ${grains(intrinsicOf(c))}`)
                          .join(', ')}`
            }.`
        );
    }

    line('');
    line(
        `THE ${COMPARISONS.length} COMPARISONS — every one through the SAME estimator as the ` +
            'nulls. A POSITIVE intrinsic means the arm with MORE maps (or the shared body) was ' +
            'DEARER, which is the predicted direction throughout. A pair is quotable only if it ' +
            "clears both its own two arms' resolutions and four grains."
    );
    const resolvedPairs: string[] = [];
    const unresolvedPairs: string[] = [];
    for (const cmp of COMPARISONS) {
        const key = keyOf(cmp);
        if (!usable(cmp.dearer, cmp.cheaper)) {
            line(
                `  ${key.padEnd(26)}EXCLUDED — an arm of this pair has a row under the clock ` +
                    'floor (see THE CLOCK CHECK). No figure is computed for this pair.'
            );
            continue;
        }
        const v = gapOf.get(key) as Gap;
        const res = Math.max(resOf(cmp.dearer), resOf(cmp.cheaper));
        const g = grains(v.intrinsic);
        const ok = resolvedOf(cmp);
        if (ok) resolvedPairs.push(key);
        else unresolvedPairs.push(key);
        line(
            `  ${key.padEnd(26)}intrinsic ${sign(v.intrinsic)} ms  ${nsCall(v.intrinsic).padEnd(
                16
            )}${nsReadRaw(v.intrinsic).toFixed(4).padStart(9)} ns/read ${String(g).padStart(
                6
            )} grains  (bias ${f6(v.bias)}, order ${f6(v.order)}, own resolution ${f6(res)})  ${
                ok
                    ? 'RESOLVED — quotable as a size'
                    : Math.abs(v.intrinsic) <= res
                    ? "NOT RESOLVED — inside its own two arms' resolution"
                    : 'NOT RESOLVED — under four grains, an ordering at best'
            }`
        );
        line(`  ${''.padEnd(26)}${cmp.note}`);
    }
    for (const key of unresolvedPairs) {
        const cmp = COMPARISONS.find((c) => keyOf(c) === key) as Comparison;
        const v = gapOf.get(key) as Gap;
        const res = Math.max(resOf(cmp.dearer), resOf(cmp.cheaper));
        refuse(
            `receiver-maps: "${key}" did not separate — the order-balanced difference is ` +
                `${f6(v.intrinsic)} ms per pass (${nsCall(v.intrinsic)}, ${grains(
                    v.intrinsic
                )} grains) against a four-grain bar of ${(4 * grainCall).toFixed(4)} ns/call and ` +
                `its own arms' resolution of ${f6(res)} ms. It may NOT be quoted as a size, in ` +
                'either direction. To resolve it, halve the grain: `npm run axis ' +
                `--workspace=@exodra/benchmarks -- receiver-maps ${rounds} ${batch * 2}\`, which ` +
                `doubles the passes per region to ${reps * 2}. More ROUNDS will not help — a ` +
                'quantised median moves in grains, and the batch is what moves the grain.'
        );
    }

    const ADJACENT: readonly Comparison[] = COMPARISONS.slice(0, 4);

    line('');
    line(
        'THE LADDER, RUNG BY RUNG — the per-read cost at each rung and the increment to the next. ' +
            'The per-read column contains the tail and is an upper bound; the INCREMENT column ' +
            'does not, because the tail is identical at every rung and cancels exactly.'
    );
    for (const arm of MAPS_ARMS) {
        const name = rowName(arm, false);
        const step = ADJACENT.find((c) => c.cheaper === arm);
        const stepText =
            step === undefined
                ? 'no rung above it on this ladder'
                : !usable(step.dearer, step.cheaper)
                ? `→ ${step.dearer}: EXCLUDED by the clock check`
                : `→ ${step.dearer}: ${sign(intrinsicOf(step))} ms/pass = ${nsCallRaw(
                      intrinsicOf(step)
                  ).toFixed(3)} ns/call = ${nsReadRaw(intrinsicOf(step)).toFixed(
                      4
                  )} ns/read over ${grains(intrinsicOf(step))} grains — ${
                      resolvedOf(step) ? 'RESOLVED' : 'NOT RESOLVED'
                  }`;
        line(
            `  ${name.padEnd(10)}${nsCallRaw(median(name)).toFixed(3).padStart(8)} ns/call  ` +
                `${nsReadRaw(median(name)).toFixed(4).padStart(8)} ns/read   ${stepText}`
        );
    }

    const usableAdjacent = ADJACENT.filter((c) => usable(c.dearer, c.cheaper));
    const resolvedAdjacent = usableAdjacent.filter(resolvedOf);
    line('');
    if (resolvedAdjacent.length === 0) {
        line(
            '  WHERE THE CLIFF IS — NO ADJACENT INCREMENT RESOLVED. This run does not locate a ' +
                'cliff anywhere on the ladder, and the honest word for its position is UNMEASURED.'
        );
    } else {
        const biggest = resolvedAdjacent.reduce((x, y) =>
            Math.abs(intrinsicOf(x)) >= Math.abs(intrinsicOf(y)) ? x : y
        );
        line(
            `  WHERE THE CLIFF IS — the largest RESOLVED adjacent increment is ` +
                `${keyOf(biggest)} at ${nsCallRaw(intrinsicOf(biggest)).toFixed(3)} ns/call ` +
                `(${nsReadRaw(intrinsicOf(biggest)).toFixed(4)} ns/read). ` +
                `${resolvedAdjacent.length} of ${usableAdjacent.length} adjacent increments ` +
                `resolved: ${resolvedAdjacent.map(keyOf).join(', ')}.`
        );
    }
    const plateau = ADJACENT[3];
    if (!usable(plateau.dearer, plateau.cheaper)) {
        line('  DOES IT KEEP GETTING WORSE — EXCLUDED by the clock check, so unanswered.');
    } else if (resolvedOf(plateau)) {
        line(
            '  DOES IT KEEP GETTING WORSE — YES ON THIS RUN. `maps16 ↔ maps8` RESOLVED at ' +
                `${nsCallRaw(intrinsicOf(plateau)).toFixed(
                    3
                )} ns/call, so eight maps and sixteen ` +
                'are NOT the same price. Megamorphic is a SLOPE here, not a plateau, and the ' +
                'number of component classes is a real ceiling rather than a one-time toll.'
        );
    } else {
        line(
            '  DOES IT KEEP GETTING WORSE — NO ON THIS RUN. `maps16 ↔ maps8` did not resolve, so ' +
                'eight maps and sixteen cost the same within this instrument. Megamorphic is a ' +
                'PLATEAU: the penalty is a STEP paid once at the fourth class, and adding more ' +
                'component classes past that does not add to it. THIS IS A FAILURE TO RESOLVE AND ' +
                'NOT A MEASURED ZERO — the bound is the four-grain bar printed above.'
        );
    }

    line('');
    line(
        'THE PREDICTIONS, JUDGED BY THE RUN — committed in the header before the programs existed'
    );
    const verdict = (id: string, ok: boolean, said: string, got: string): void =>
        line(`  ${ok ? '✔' : '✘'} ${id} ${ok ? 'HELD' : 'FAILED'} — said ${said}; got ${got}`);
    const skipped = (id: string, why: string): void => line(`  ⊘ ${id} NOT JUDGED — ${why}`);

    const killer = COMPARISONS[5];
    let instrumentOk = false;
    if (usable('maps1', 'maps16')) {
        const v = gapOf.get(keyOf(killer)) as Gap;
        const res = Math.max(resOf('maps16'), resOf('maps1'));
        const resolved = resolvedOf(killer);
        const rightWay = median(rowName('maps16', false)) >= median(rowName('maps1', false));
        instrumentOk = resolved && rightWay;
        verdict(
            '(P2)',
            instrumentOk,
            'the KILLER — `maps16 ↔ maps1` (sixteen maps against one, everything else identical) ' +
                'resolves, with maps16 the dearer',
            `${nsCall(v.intrinsic)} over ${grains(v.intrinsic)} grains against its own arms' ` +
                `resolution of ${f6(res)} ms — ${resolved ? 'RESOLVED' : 'NOT RESOLVED'}; maps16 ` +
                `${rightWay ? 'is' : 'is NOT'} at or above maps1 (${MAPS_ARMS.map(
                    (a) => `${a} ${nsCallRaw(median(rowName(a, false))).toFixed(3)}`
                ).join(', ')} ns/call)`
        );
        if (!instrumentOk) {
            refuse(
                'receiver-maps: THE INSTRUMENT FAILED ITS OWN KILLER. Either the difference ' +
                    'between a monomorphic load and a megamorphic one is invisible to this clock, ' +
                    'or the rung with sixteen maps came in below the rung with one. Both mean the ' +
                    'same thing: NO FIGURE IN THIS RUN MAY BE READ AS BEING ABOUT MAP COUNT, and ' +
                    '(P1), (P3), (P4) and (P5) are not judged. The first suspects, in order: the ' +
                    'body was inlined and the five loads were hoisted or eliminated (open the ' +
                    'fold and check that no field is read twice); the region is dominated by the ' +
                    'loop, the element load and the store rather than by the reads (raise the ' +
                    `batch to ${batch * 2}); the machine drifted more than the pair.`
            );
        }
    } else {
        skipped('(P2)', 'maps1 or maps16 is under the clock floor and was excluded');
    }

    const headline = COMPARISONS[4];
    let headlineNs = 0;
    if (!usable('maps2', 'maps8')) {
        skipped('(P1)', 'maps2 or maps8 is under the clock floor and was excluded');
    } else if (!instrumentOk) {
        skipped(
            '(P1)',
            '(P2) FAILED — this instrument did not demonstrate that it can see a map count at ' +
                'all, so a figure it prints for this pair is not evidence about one. The number ' +
                'is in THE COMPARISONS above and is not a verdict'
        );
    } else {
        const v = gapOf.get(keyOf(headline)) as Gap;
        const res = Math.max(resOf('maps8'), resOf('maps2'));
        const resolved = resolvedOf(headline);
        const ns = nsCallRaw(v.intrinsic);
        headlineNs = ns;
        verdict(
            '(P1)',
            resolved && ns >= 5 && ns <= 30,
            'maps8 is DEARER than maps2 by +5 to +30 ns per call (+1 to +6 ns per read)',
            `${nsCall(v.intrinsic)} = ${nsReadRaw(v.intrinsic).toFixed(4)} ns/read over ` +
                `${grains(v.intrinsic)} grains against its own two arms' resolution of ` +
                `${f6(res)} ms — ${
                    !resolved
                        ? 'THE PAIR DID NOT SEPARATE: eight maps and two sit on each other inside ' +
                          'their own resolution, so on this scene a per-component class costs the ' +
                          "backend's reads nothing this instrument can see"
                        : ns < 0
                        ? 'THE SIGN IS WRONG: eight maps came in CHEAPER than two, which no ' +
                          'mechanism in the header predicts and which condemns the pair'
                        : ns > 30
                        ? 'DEARER THAN THE BAND: the megamorphic path is costing more than a ' +
                          'stub-cache hit, and the next thing to open is the miss rate'
                        : ns < 5
                        ? 'DEARER BUT UNDER THE BAND: the direction held and the size did not'
                        : 'inside the band'
                }`
        );
    }

    if (!usable('maps8', 'maps16')) {
        skipped('(P3)', 'maps8 or maps16 is under the clock floor and was excluded');
    } else if (!instrumentOk) {
        skipped('(P3)', '(P2) FAILED — see above');
    } else {
        const v = gapOf.get(keyOf(plateau)) as Gap;
        verdict(
            '(P3)',
            !resolvedOf(plateau),
            '`maps16 ↔ maps8` does NOT resolve — eight maps and sixteen are the same IC state, so ' +
                'megamorphic is a step and not a slope',
            `${nsCall(v.intrinsic)} over ${grains(v.intrinsic)} grains — ${
                resolvedOf(plateau)
                    ? 'IT RESOLVED, so the cost keeps growing with the class count and COMPONENT ' +
                      'COUNT IS A REAL CEILING'
                    : 'it did not resolve, so the penalty is paid once at the fourth class'
            }`
        );
    }

    if (usableAdjacent.length < ADJACENT.length) {
        skipped('(P4)', 'an adjacent rung of the ladder is under the clock floor and was excluded');
    } else if (!instrumentOk) {
        skipped('(P4)', '(P2) FAILED — see above');
    } else {
        const crossing = ADJACENT[2];
        const lower = ADJACENT[1];
        const biggest = ADJACENT.reduce((x, y) =>
            Math.abs(intrinsicOf(x)) >= Math.abs(intrinsicOf(y)) ? x : y
        );
        const ratio =
            Math.abs(intrinsicOf(lower)) > 0
                ? Math.abs(intrinsicOf(crossing)) / Math.abs(intrinsicOf(lower))
                : Infinity;
        verdict(
            '(P4)',
            biggest === crossing && ratio >= 3,
            'the `maps4 → maps8` increment is the LARGEST of the four adjacent increments and at ' +
                'least 3× the `maps2 → maps4` increment — the cliff is at V8’s four-entry limit',
            `the largest is ${keyOf(biggest)}; maps8↔maps4 is ${nsCallRaw(
                intrinsicOf(crossing)
            ).toFixed(3)} ns/call against maps4↔maps2 at ${nsCallRaw(intrinsicOf(lower)).toFixed(
                3
            )} ns/call, a ratio of ${ratio === Infinity ? '∞' : ratio.toFixed(2)}× (${ADJACENT.map(
                (c) => `${keyOf(c)} ${nsCallRaw(intrinsicOf(c)).toFixed(3)}`
            ).join(', ')} ns/call)`
        );
    }

    const bodyPair = COMPARISONS[6];
    if (!usable('sharedBodies', 'ownBodies')) {
        skipped('(P5)', 'sharedBodies or ownBodies is under the clock floor and was excluded');
    } else if (!instrumentOk) {
        skipped('(P5)', '(P2) FAILED — see above');
    } else if (headlineNs === 0) {
        skipped(
            '(P5)',
            'the `maps8 ↔ maps2` increment that sets its bar was not measured, so the size half ' +
                'of this prediction has no bar to be judged against'
        );
    } else {
        const v = gapOf.get(keyOf(bodyPair)) as Gap;
        const ns = nsCallRaw(v.intrinsic);
        const bar = Math.abs(headlineNs) / 2;
        const resolved = resolvedOf(bodyPair);
        verdict(
            '(P5)',
            resolved && ns > 0 && ns >= bar,
            'ownBodies is CHEAPER than sharedBodies at eight maps, by at least half the ' +
                '`maps8 ↔ maps2` increment — installing the body per class ESCAPES the penalty',
            `${nsCall(v.intrinsic)} = ${nsReadRaw(v.intrinsic).toFixed(4)} ns/read over ` +
                `${grains(v.intrinsic)} grains against a bar of ${bar.toFixed(3)} ns/call (half ` +
                `of the measured maps8↔maps2 gap, ${headlineNs.toFixed(3)} ns/call) — ${
                    !resolved
                        ? 'THE PAIR DID NOT SEPARATE: one body over eight maps and eight bodies ' +
                          'over one map each cost the same here'
                        : ns <= 0
                        ? 'THE SIGN IS WRONG: eight own bodies came in DEARER than one shared ' +
                          'one, so on this scene installing the body per class costs more than ' +
                          'it saves'
                        : ns < bar
                        ? 'CHEAPER BUT UNDER THE BAR: the direction held and only part of the ' +
                          'ladder’s penalty came back'
                        : 'the direction and the size both held'
                }`
        );
        line(
            '     WHAT (P5) DOES NOT LICENSE, WHICHEVER WAY IT LANDS — this pair is FUSED. ' +
                '`o.m()` carries TWO inline caches: the property load of `m`, megamorphic on both ' +
                'sides and cancelling, and the CALL TARGET, monomorphic for `sharedBodies` (one ' +
                'callee, inlinable) and MEGAMORPHIC for `ownBodies` (eight callees, no inlining, ' +
                'an indirect call per iteration). The two terms push OPPOSITE ways, so the figure ' +
                'above is (eight maps against one at the reads) MINUS (eight callees against one ' +
                'at the call). It may be read as "is a per-class body a net win on this scene" ' +
                'and NOT as "is the ladder’s read penalty recoverable" — a per-class body cannot ' +
                'be reached here without a megamorphic target, and the arm that would hold the ' +
                'target count equal on both sides is NOT BUILT.'
        );
        if (usable('sharedBodies', 'maps8')) {
            const load = COMPARISONS[7];
            const w = gapOf.get(keyOf(load)) as Gap;
            const targetTerm = headlineNs - nsCallRaw(v.intrinsic);
            line(
                '     THE ONE TERM THIS RUN CAN TAKE APART — `sharedBodies ↔ maps8` is ' +
                    `${nsCall(w.intrinsic)} over ${grains(w.intrinsic)} grains, ${
                        resolvedOf(load) ? 'RESOLVED' : 'NOT RESOLVED'
                    }: eight maps at the five field sites on both sides, identical reads, ` +
                    'differing only in reaching the body through the receiver.'
            );
            line(
                '     AND THE ARITHMETIC THE FUSION FORCES, from the model `sharedBodies − ' +
                    'ownBodies = readSaving − targetCost`: with the read saving taken as the ' +
                    `measured maps8↔maps2 gap (${headlineNs.toFixed(3)} ns/call) and the pair at ` +
                    `${nsCallRaw(v.intrinsic).toFixed(
                        3
                    )} ns/call, the MEGAMORPHIC-TARGET TERM IS ` +
                    `${targetTerm.toFixed(3)} ns/call. It is a LOWER BOUND on that term, because ` +
                    '`ownBodies` reads are MONOMORPHIC and the saving it could recover is the ' +
                    'maps8↔maps1 penalty, which is larger than the maps8↔maps2 gap used here by ' +
                    'the whole maps2↔maps1 step. IT IS DERIVED FROM TWO MEASURED PAIRS AND WAS ' +
                    'NEVER MEASURED ON ITS OWN — the arm that would measure it is not built.'
            );
        }
    }

    verdict(
        '(P6)',
        notNull.length === 0,
        `all ${ALL_ARMS.length} null pairs are ordering or nothing`,
        notNull.length === 0
            ? `${ALL_ARMS.length} of ${ALL_ARMS.length} inside their own noise`
            : `${notNull.length} INTRINSIC — ${notNull.join(', ')}`
    );

    {
        const ticks = PROGRAMS.map((p) => ((stats.get(p.name) as Stat).median * reps) / quantum);
        verdict(
            '(P7)',
            Math.min(...ticks) >= 30,
            `every one of the ${PROGRAMS.length} timed regions clears thirty ticks of the ` +
                'observed clock',
            `the smallest region is ${Math.min(...ticks).toFixed(1)} ticks (${
                PROGRAMS[ticks.indexOf(Math.min(...ticks))].name
            }); the largest ${Math.max(...ticks).toFixed(1)}`
        );
    }

    line('');
    line(
        `SUMMARY — ${resolvedPairs.length} of ${COMPARISONS.length} pairs resolved: ` +
            `${resolvedPairs.join(', ') || 'none'}. Unresolved: ` +
            `${unresolvedPairs.join(', ') || 'none'}. Every resolved figure is quoted with its ` +
            "own two arms' resolution and its grain count on the line it appears on, and no " +
            'figure from this axis is a figure about any package in this repository.'
    );
}
