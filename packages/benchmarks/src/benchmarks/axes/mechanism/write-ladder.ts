// DOES A PORT HELD AS A DIRECT REFERENCE BEAT AN INDEX INTO AN ARRAY WHEN THE PORT IS WRITTEN MANY
// TIMES? THREE ARMS ON A LADDER OF 1, 4 AND 16 WRITES PER PORT.
//
// IT IMPORTS NOTHING FROM `@exodra/*` — not a dist, not a source file, not a type. Eighteen
// straight-line JavaScript programs and a clock, registered as an axis only to reuse the runner
// that starts Vite, drives headless Chromium and forwards the browser's console.
//
// ═══ THE QUESTION, AND WHY IT IS THE ONE LEFT ═════════════════════════════════════════════════
//
// `IDEAL.md` §0 names ONE unmeasured thing the settled design leans on: that A PORT HELD AS A
// DIRECT REFERENCE BEATS AN INDEX INTO AN ARRAY, ON UPDATE-HEAVY SCENES. At ONE write per port that
// is already REFUTED, and the figures are quoted in §3 of that file — `walk ↔ accessor` 1 grain,
// `walk ↔ protoPort` 4 grains, `accessor ↔ protoPort` 5 grains, all NOT RESOLVED, in a run that
// resolved 427 and 629 grains on neighbouring pairs. QUOTED SECOND-HAND from `IDEAL.md`; the
// recording behind them was not opened in the turn that wrote this file, which makes them this
// axis's SOFTEST INPUT and the reason (P1)'s mechanism is stated as an inference from them rather
// than as a measurement of its own.
//
// AT MANY WRITES PER PORT NOBODY HAS MEASURED IT. That is the gap, and it is a gap with a shape:
// construction is paid ONCE PER INSTANCE and writes are paid PER WRITE, so every arm is a SLOPE
// plus an INTERCEPT and the only question that matters is whether the ranking turns over as writes
// per instance grow. A single rung cannot answer it. A ladder can.
//
// ═══ THE THREE ARMS ═══════════════════════════════════════════════════════════════════════════
//
//   indexed  THE SHIPPED SHAPE — `writers[i](slots[elem[i]], v)`, BOTH TABLES READ ON EVERY WRITE.
//            `writers` and `elem` belong to the schema and are module-level here; `slots` is the
//            instance's own row of cells, taken from a pool. Nothing is resolved at construction,
//            so this arm's intercept is zero by construction and everything it costs is slope.
//
//   direct   A PER-PORT REFERENCE RESOLVED ONCE PER INSTANCE AND THEN CALLED — `h[i](v)`, where
//            each handle is a closure over its own cell whose body IS the writer. ONE builder call
//            per instance reads `elem` four times, loads four cells and returns four closures over
//            ONE shared context. Every table read the `indexed` arm repeats is paid here exactly
//            once, and six allocations are paid for the privilege.
//
//   floor    STRAIGHT-LINE WRITES, NO PORT ABSTRACTION — the four cells hoisted into locals with
//            the permutation baked in as literals, then the store and the advance in source. ONE
//            FRAME BY CONSTRUCTION: it calls nothing, allocates nothing and resolves nothing. IT IS
//            NEVER USED AS ANOTHER ARM'S CONTROL. It is here to say what a write costs when nothing
//            dispatches it, and its MARGINAL write is what (P6) holds the shipped shape's marginal
//            write against.
//
// ═══ THE LADDER, WHICH IS THE WHOLE POINT ═════════════════════════════════════════════════════
//
// THREE RUNGS — 1, 4 and 16 WRITES PER PORT — and every arm runs at every rung as its own
// separately declared program with its own pool, its own tables and its own unrolled body. Nine
// subjects, nine twins, eighteen programs. With four ports that is 4, 16 and 64 WRITES PER
// INSTANCE, and those three numbers are the measured range of every slope and every crossing point
// printed below.
//
// A rung's body is the SAME FOUR PORT WRITES REPEATED W TIMES IN SOURCE, round-major: port 0..3,
// then port 0..3 again, W times over. IT IS UNROLLED RATHER THAN LOOPED ON PURPOSE — a `for` loop
// over the repetitions would make every table load loop-invariant and the engine would hoist the
// whole question out of the measurement. What an unrolled body cannot prevent is the engine reading
// a table ONCE and keeping the value across the repetitions, and (P6) is the diagnostic that says
// whether it did.
//
// WHAT THE RUN PRINTS PER ARM PER RUNG: median, median in grains, ns PER WRITE and ns PER INSTANCE
// — and then the figure the axis exists for, THE PER-WRITE INCREMENT BETWEEN RUNGS (n1→n4 and
// n4→n16), which is what separates the slope from the intercept. Where two arms' slopes resolve and
// their intercepts differ, the CROSSING POINT is printed in writes per instance. Where a slope does
// not resolve, the line reads "same slope, different intercept, no crossing" and no number is
// computed.
//
// ═══ THE TRAP THAT KILLED THE LAST ATTEMPT AT THIS ════════════════════════════════════════════
//
// ON THE STRING BACKEND A SECOND WRITE TO A PORT IS INERT: only the last one reaches the markup, so
// writing 4 or 16 times produces byte-identical output and NO GATE CAN PROVE THE EXTRA WRITES
// HAPPENED. A ladder built on such a target measures whatever the engine felt like keeping.
//
// SO EVERY WRITE HERE IS OBSERVABLE AND UNFOLDABLE. Each instance carries an accumulator that
// starts at `(j + 1) | 0`; a write stores the accumulator into its cell and ADVANCES IT — the write
// itself returns `(x * 5 + 1) | 0` and the next write consumes that. Drop ONE write anywhere and
// the final accumulator changes, every later cell value changes, and the gate that reads all 2048
// accumulators and all 8192 cells back after a run fails by name. A repeated write is not inert
// here; it is the only reason the next value is what it is.
//
// WHAT THE CHAIN COSTS, AND IT IS ON EVERY ARM EQUALLY: one dependent multiply-add per write, in
// the callee for `indexed` and `direct` and in source for `floor`. It is a LATENCY chain, and that
// is the honest hazard of it: the extra loads `indexed` pays are independent of the chain, so an
// out-of-order core may hide them behind it. A null on the slope may therefore be a fact about the
// chain and not about the tables — which is what (P6) is for, and why a null slope is reported as a
// refusal to compute a crossing rather than as "the tables are free".
//
// ═══ THE ARMS DO DIFFERENT WORK, COUNTED RATHER THAN DESCRIBED ════════════════════════════════
//
// Read off this file's own text. NOTHING HERE IS MEASURED; it is printed in the CENSUS and carried
// as columns on the table so a reader who sees three medians land on top of each other can still
// see what was supposed to separate them.
//
//             alloc/inst  fr/inst  fr/write  loads/write   what the loads are
//   floor         0          0        0          0         the four cells are LOCALS; four element
//                                                          loads per instance, once
//   indexed       0          0        1          3         `writers[i]`, `elem[i]`, `slots[e]`
//   direct        6          1        1          2         `h[i]`, then the cell out of the
//                                                          closure's context
//
//   alloc/inst   `direct` allocates ONE context (four cells), FOUR closures and ONE array. The
//                other two allocate nothing per instance: their cells come from a pool built
//                untimed at module load.
//   fr/inst      SOURCE call frames per instance. `direct`'s is its builder.
//   fr/write     SOURCE call frames per write. TurboFan may inline every one of them, which makes
//                the two dispatching arms CHEAPER than the column suggests and (P1) harder to
//                hold, not easier.
//   loads/write  `indexed` pays one element load for the writer, one `Int32Array` load for the
//                slot number and one element load for the slot. `direct` pays one element load for
//                the handle and one context load inside it. `floor` pays none.
//
//   ON EVERY ARM EQUALLY, per instance: one element store of the container into a module-level
//   packed array (its write barrier and its bounds check), one `Int32Array` store of the final
//   accumulator, one add into the returned total, and the row of cells read out of the pool.
//
// ═══ THREE FUSIONS NO ARM CAN BE SPELLED WITHOUT, NAMED BEFORE ANY NUMBER ══════════════════════
//
//  * `indexed` HERE IS THE FAVOURABLE SPELLING OF THE SHIPPED SHAPE. In the renderer these writes
//    go through ONE `set` body, so ONE call site sees every writer kind in the process. Here each
//    write has its own site and every site sees the SAME one function object — monomorphic and
//    inlinable. This axis therefore prices the table reads and not the megamorphic call the real
//    shape also carries.
//  * `direct`'s CALL SITES SEE A NEW FUNCTION OBJECT PER INSTANCE — same code, fresh closure, 2048
//    of them per pass. Whether V8 keeps such a site monomorphic on the shared code or degrades it
//    is NOT read from V8 here and is fused into this arm's number. It is also not an artefact: any
//    per-instance handle has it.
//  * FOUR PORTS IS `direct`'s BEST SHOT AND NOT A NEUTRAL CHOICE. An instance with eight ports
//    would allocate four more closures and read four more table entries at construction — a bigger
//    intercept, crossing later. The port count sets the intercept; the rungs set the slope; only
//    the rungs are the experiment.
//
// ═══ THE PRE-REGISTERED PREDICTIONS, WRITTEN BEFORE ANY ARM EXISTED ════════════════════════════
//
// (P1) DIRECTION AND SIZE FOR `indexed ↔ direct` AT n16: DIRECT IS DEARER, BY +10 TO +60 ns PER
//      INSTANCE (64 writes, so +0.16 to +0.94 ns per write). A direction and a size, committed, and
//      it says the design's expectation does NOT arrive by sixteen writes per port.
//      MECHANISM: §3 measured the per-write difference between resolving on every write and baking
//      the address in as unresolvable at 1 to 5 grains — under ~0.2 ns per write. Sixty-four writes
//      at 0.2 ns is 13 ns, and six allocations plus a builder frame plus eight loads is more than
//      that. THE 1-5 GRAIN FIGURE IS QUOTED SECOND-HAND and is the softest input here.
//      KILLER: `direct` CHEAPER at n16, clear of both rows' resolutions and four grains. Then the
//      design's expectation holds by sixteen writes per port and this prediction is dead.
//
// (P2) NO CROSSING INSIDE THE MEASURED RANGE — `indexed` is cheaper at 4 writes per instance AND at
//      64, so the ranking does not turn over on this ladder. KILLER: a sign change between the
//      rungs; then the crossing is real, it is printed in writes per instance, and the design has
//      its number.
//
// (P3) THE KILLER AIMED AT THIS INSTRUMENT RATHER THAN AT THE HYPOTHESIS. For EVERY arm the
//      per-instance median must RISE from n1 to n4 and again from n4 to n16, each step clear of its
//      own two rows' resolutions and of four grains of the coarser rung; AND `floor` must be the
//      cheapest arm at every rung. If either half fails, this instrument cannot see the writes it
//      is laddering and NO SLOPE, NO INTERCEPT AND NO CROSSING may be quoted from this run, (P1),
//      (P2) and (P6) included. They are then printed NOT JUDGED, mechanically.
//
// (P4) ALL NINE NULL PAIRS ARE ORDERING OR NOTHING — `|intrinsic| ≤ noise` for every arm at every
//      rung. KILLER: any pair whose intrinsic stands out of its own noise. That ROW is unquotable
//      and so is every quantity computed from it.
//
// (P5) EVERY ONE OF THE EIGHTEEN TIMED REGIONS CLEARS THIRTY TICKS at batch 1. KILLER: any region
//      under the three-tick floor — that ARM AT THAT RUNG, the row and its twin, hence its
//      resolution, is struck out of every null, gap and prediction BEFORE they are computed.
//
// (P6) THE HOISTING DIAGNOSTIC, AND IT IS A FINDING EITHER WAY. `indexed`'s MARGINAL write (n4→n16)
//      is DEARER than `floor`'s marginal write, resolved. KILLER: they are equal. Then the two
//      table reads are not being executed per write on a straight-line body — the engine read them
//      once — and every slope on this axis is the slope of a body the engine rewrote. The crossing
//      point is then not quotable and the run says so in those words rather than reporting "the
//      tables are free".
//
// ═══ THE FAILURE MODES THIS FILE IS BUILT AGAINST ═════════════════════════════════════════════
//
//  * NOTHING ESCAPES. Every arm stores its container into a module-level packed array of exactly
//    `INSTANCES` entries (prefilled at module load, never grown, never re-kinded) and its final
//    accumulator into an `Int32Array`. A gate reads BOTH back after a run: every accumulator
//    against an expectation computed here from the loop's own arithmetic, every cell against
//    theirs, every container for identity, and — for `direct` — one handle is taken OUT of the sink
//    and CALLED, and must write through to its own cell. A closure that was scalarised cannot
//    answer that.
//  * THE ARMS DO DIFFERENT WORK. Counted above, printed in the census and carried as columns, so no
//    gap is read without them.
//  * THE CLOCK CANNOT SEE IT. The observed quantum, the grain PER RUNG and every median in grains
//    are printed. Any pair under four grains of its own rung is REFUSED BY NAME and told the batch
//    that would clear it, rather than quoted as a size.
//  * IT MEASURED THE ORDER. Every arm at every rung has its own separately declared twin, and the
//    phase list is ALL NINE SUBJECTS AND THEN ALL NINE TWINS — a subject and its twin are nine
//    apart in a list of eighteen, so no rotation ever makes one the other's predecessor. The
//    schedule is `shift = (r >> 1) % len` with the direction alternating, so each shift runs ONCE
//    FORWARD AND ONCE BACKWARD; `shift = r % len` with an even `len` would have put every forward
//    round on an even shift and confounded direction with position.
//
// ═══ WHAT THIS AXIS CANNOT SAY. Read this before quoting anything from it. ═════════════════════
//
//  * NOTHING ABOUT ANY `@exodra` PACKAGE. It imports none, renders nothing, touches no DOM. A
//    figure here is a figure about three JavaScript spellings on one engine.
//  * NOTHING ABOUT WRITES SPREAD ACROSS SEPARATE UPDATES. The W writes of one port sit in ONE
//    straight-line body. A real app writing a port sixteen times over its life does so from sixteen
//    separate calls, where no engine can read the table once and keep it. (P6) is the only evidence
//    in this file about which of the two this body behaved like.
//  * NOTHING ABOUT A CHEAPER OR DEARER `direct`. Its construction is one builder call, one context,
//    four closures and an array. A per-port factory would cost four contexts and four frames MORE;
//    a per-schema code generator would cost less and is ruled out by `IDEAL.md` §4 (`new Function`
//    dies under a strict CSP without `unsafe-eval`). This arm is one point on that scale and is not
//    the scale.
//  * NOTHING ABOUT `protoPort`. A writer on a prototype reached through `this` has NO per-instance
//    construction at all, so it is neither of these two arms. It is a third shape and it is not
//    built here.
//  * NOTHING ABOUT A REAL WRITE. A cell is a plain object and a write is a store to `.v`. A DOM
//    write, an attribute write and a string cell all cost more, and every one of them would ENLARGE
//    the part of a write both arms share and SHRINK the share the dispatch has. The gaps here are
//    therefore the widest these three shapes can be.
//  * NOTHING ABOUT A DIFFERENT PORT COUNT. Four ports, and the intercept scales with it.
//  * NOTHING ABOUT MEMORY, TEARDOWN, MOUNTING OR ANY WALL-CLOCK QUANTITY.
//  * NOTHING ABOUT ANOTHER ENGINE. Every mechanism named above is V8's.
//
// ═══ HOW TO RUN IT ════════════════════════════════════════════════════════════════════════════
//
//     npm run axis --workspace=@exodra/benchmarks -- write-ladder 100 1 --record=first
//
// Eighteen phases, roughly half a second of timed region per round: under a minute at 100 rounds.
// THE ESCALATION IS `write-ladder 100 2`, never more rounds — a quantised median moves in grains
// and only the batch moves the grain. RUN IT ALONE.
//
// IF THE RUNNER'S STALE-`dist/` GATE REFUSES THE RECORDING, `--no-record` IS SAFE FOR THIS AXIS AND
// FOR ALMOST NO OTHER: that gate exists because this suite measures built packages, and this file
// reads none.
import { emitRecordedRows, type Scenario, type Stat } from '../../../harness';

// eslint-disable-next-line no-console
const line = (s: string): void => console.log(`✅ ${s}`);
// eslint-disable-next-line no-console
const refuse = (s: string): void => console.log(`❌ ${s}`);

const PORTS = 4;
const INSTANCES = 2048;
const MIN_TICKS = 3;
const SLOT_OF_PORT: readonly number[] = [1, 3, 0, 2];

type Arm = 'floor' | 'indexed' | 'direct';
type Rung = 'n1' | 'n4' | 'n16';

const ARMS: readonly Arm[] = ['floor', 'indexed', 'direct'];
const RUNGS: readonly Rung[] = ['n1', 'n4', 'n16'];
const WRITES_PER_PORT: Readonly<Record<Rung, number>> = { n1: 1, n4: 4, n16: 16 };
const PASSES: Readonly<Record<Rung, number>> = { n1: 1024, n4: 256, n16: 64 };

interface TCell {
    v: number;
}

type TWriter = (cell: TCell, x: number) => number;
type THandle = (x: number) => number;

function buildPool(): TCell[][] {
    const pool: TCell[][] = [];
    for (let j = 0; j < INSTANCES; j++) {
        const row: TCell[] = [];
        for (let k = 0; k < PORTS; k++) row.push({ v: 0 });
        pool.push(row);
    }
    return pool;
}

function buildContainerSink(pool: TCell[][]): object[] {
    const out: object[] = [];
    for (let j = 0; j < INSTANCES; j++) out.push(pool[j]);
    return out;
}

function buildSlotTable(): Int32Array {
    const t = new Int32Array(PORTS);
    for (let k = 0; k < PORTS; k++) t[k] = SLOT_OF_PORT[k];
    return t;
}

const POOL_FLOOR_N1_A = buildPool();
const CSINK_FLOOR_N1_A = buildContainerSink(POOL_FLOOR_N1_A);
const ASINK_FLOOR_N1_A = new Int32Array(INSTANCES);

function runFloorN1A(): number {
    const pool = POOL_FLOOR_N1_A;
    const csink = CSINK_FLOOR_N1_A;
    const asink = ASINK_FLOOR_N1_A;
    let total = 0;
    for (let j = 0; j < INSTANCES; j++) {
        const s = pool[j];
        const c0 = s[1];
        const c1 = s[3];
        const c2 = s[0];
        const c3 = s[2];
        csink[j] = s;
        let a = (j + 1) | 0;
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        asink[j] = a;
        total = (total + a) | 0;
    }
    return total;
}

const POOL_FLOOR_N1_B = buildPool();
const CSINK_FLOOR_N1_B = buildContainerSink(POOL_FLOOR_N1_B);
const ASINK_FLOOR_N1_B = new Int32Array(INSTANCES);

function runFloorN1B(): number {
    const pool = POOL_FLOOR_N1_B;
    const csink = CSINK_FLOOR_N1_B;
    const asink = ASINK_FLOOR_N1_B;
    let total = 0;
    for (let j = 0; j < INSTANCES; j++) {
        const s = pool[j];
        const c0 = s[1];
        const c1 = s[3];
        const c2 = s[0];
        const c3 = s[2];
        csink[j] = s;
        let a = (j + 1) | 0;
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        asink[j] = a;
        total = (total + a) | 0;
    }
    return total;
}

const POOL_FLOOR_N4_A = buildPool();
const CSINK_FLOOR_N4_A = buildContainerSink(POOL_FLOOR_N4_A);
const ASINK_FLOOR_N4_A = new Int32Array(INSTANCES);

function runFloorN4A(): number {
    const pool = POOL_FLOOR_N4_A;
    const csink = CSINK_FLOOR_N4_A;
    const asink = ASINK_FLOOR_N4_A;
    let total = 0;
    for (let j = 0; j < INSTANCES; j++) {
        const s = pool[j];
        const c0 = s[1];
        const c1 = s[3];
        const c2 = s[0];
        const c3 = s[2];
        csink[j] = s;
        let a = (j + 1) | 0;
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        asink[j] = a;
        total = (total + a) | 0;
    }
    return total;
}

const POOL_FLOOR_N4_B = buildPool();
const CSINK_FLOOR_N4_B = buildContainerSink(POOL_FLOOR_N4_B);
const ASINK_FLOOR_N4_B = new Int32Array(INSTANCES);

function runFloorN4B(): number {
    const pool = POOL_FLOOR_N4_B;
    const csink = CSINK_FLOOR_N4_B;
    const asink = ASINK_FLOOR_N4_B;
    let total = 0;
    for (let j = 0; j < INSTANCES; j++) {
        const s = pool[j];
        const c0 = s[1];
        const c1 = s[3];
        const c2 = s[0];
        const c3 = s[2];
        csink[j] = s;
        let a = (j + 1) | 0;
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        asink[j] = a;
        total = (total + a) | 0;
    }
    return total;
}

const POOL_FLOOR_N16_A = buildPool();
const CSINK_FLOOR_N16_A = buildContainerSink(POOL_FLOOR_N16_A);
const ASINK_FLOOR_N16_A = new Int32Array(INSTANCES);

function runFloorN16A(): number {
    const pool = POOL_FLOOR_N16_A;
    const csink = CSINK_FLOOR_N16_A;
    const asink = ASINK_FLOOR_N16_A;
    let total = 0;
    for (let j = 0; j < INSTANCES; j++) {
        const s = pool[j];
        const c0 = s[1];
        const c1 = s[3];
        const c2 = s[0];
        const c3 = s[2];
        csink[j] = s;
        let a = (j + 1) | 0;
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        asink[j] = a;
        total = (total + a) | 0;
    }
    return total;
}

const POOL_FLOOR_N16_B = buildPool();
const CSINK_FLOOR_N16_B = buildContainerSink(POOL_FLOOR_N16_B);
const ASINK_FLOOR_N16_B = new Int32Array(INSTANCES);

function runFloorN16B(): number {
    const pool = POOL_FLOOR_N16_B;
    const csink = CSINK_FLOOR_N16_B;
    const asink = ASINK_FLOOR_N16_B;
    let total = 0;
    for (let j = 0; j < INSTANCES; j++) {
        const s = pool[j];
        const c0 = s[1];
        const c1 = s[3];
        const c2 = s[0];
        const c3 = s[2];
        csink[j] = s;
        let a = (j + 1) | 0;
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        a = ((c0.v = a), (a * 5 + 1) | 0);
        a = ((c1.v = a), (a * 5 + 1) | 0);
        a = ((c2.v = a), (a * 5 + 1) | 0);
        a = ((c3.v = a), (a * 5 + 1) | 0);
        asink[j] = a;
        total = (total + a) | 0;
    }
    return total;
}

const POOL_INDEXED_N1_A = buildPool();
const CSINK_INDEXED_N1_A = buildContainerSink(POOL_INDEXED_N1_A);
const ASINK_INDEXED_N1_A = new Int32Array(INSTANCES);
const SLOTS_INDEXED_N1_A = buildSlotTable();
const WRITE_INDEXED_N1_A: TWriter = (cell, x) => {
    cell.v = x;
    return (x * 5 + 1) | 0;
};
const WRITERS_INDEXED_N1_A: readonly TWriter[] = [
    WRITE_INDEXED_N1_A,
    WRITE_INDEXED_N1_A,
    WRITE_INDEXED_N1_A,
    WRITE_INDEXED_N1_A,
];

function runIndexedN1A(): number {
    const pool = POOL_INDEXED_N1_A;
    const csink = CSINK_INDEXED_N1_A;
    const asink = ASINK_INDEXED_N1_A;
    const w = WRITERS_INDEXED_N1_A;
    const e = SLOTS_INDEXED_N1_A;
    let total = 0;
    for (let j = 0; j < INSTANCES; j++) {
        const s = pool[j];
        csink[j] = s;
        let a = (j + 1) | 0;
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        asink[j] = a;
        total = (total + a) | 0;
    }
    return total;
}

const POOL_INDEXED_N1_B = buildPool();
const CSINK_INDEXED_N1_B = buildContainerSink(POOL_INDEXED_N1_B);
const ASINK_INDEXED_N1_B = new Int32Array(INSTANCES);
const SLOTS_INDEXED_N1_B = buildSlotTable();
const WRITE_INDEXED_N1_B: TWriter = (cell, x) => {
    cell.v = x;
    return (x * 5 + 1) | 0;
};
const WRITERS_INDEXED_N1_B: readonly TWriter[] = [
    WRITE_INDEXED_N1_B,
    WRITE_INDEXED_N1_B,
    WRITE_INDEXED_N1_B,
    WRITE_INDEXED_N1_B,
];

function runIndexedN1B(): number {
    const pool = POOL_INDEXED_N1_B;
    const csink = CSINK_INDEXED_N1_B;
    const asink = ASINK_INDEXED_N1_B;
    const w = WRITERS_INDEXED_N1_B;
    const e = SLOTS_INDEXED_N1_B;
    let total = 0;
    for (let j = 0; j < INSTANCES; j++) {
        const s = pool[j];
        csink[j] = s;
        let a = (j + 1) | 0;
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        asink[j] = a;
        total = (total + a) | 0;
    }
    return total;
}

const POOL_INDEXED_N4_A = buildPool();
const CSINK_INDEXED_N4_A = buildContainerSink(POOL_INDEXED_N4_A);
const ASINK_INDEXED_N4_A = new Int32Array(INSTANCES);
const SLOTS_INDEXED_N4_A = buildSlotTable();
const WRITE_INDEXED_N4_A: TWriter = (cell, x) => {
    cell.v = x;
    return (x * 5 + 1) | 0;
};
const WRITERS_INDEXED_N4_A: readonly TWriter[] = [
    WRITE_INDEXED_N4_A,
    WRITE_INDEXED_N4_A,
    WRITE_INDEXED_N4_A,
    WRITE_INDEXED_N4_A,
];

function runIndexedN4A(): number {
    const pool = POOL_INDEXED_N4_A;
    const csink = CSINK_INDEXED_N4_A;
    const asink = ASINK_INDEXED_N4_A;
    const w = WRITERS_INDEXED_N4_A;
    const e = SLOTS_INDEXED_N4_A;
    let total = 0;
    for (let j = 0; j < INSTANCES; j++) {
        const s = pool[j];
        csink[j] = s;
        let a = (j + 1) | 0;
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        asink[j] = a;
        total = (total + a) | 0;
    }
    return total;
}

const POOL_INDEXED_N4_B = buildPool();
const CSINK_INDEXED_N4_B = buildContainerSink(POOL_INDEXED_N4_B);
const ASINK_INDEXED_N4_B = new Int32Array(INSTANCES);
const SLOTS_INDEXED_N4_B = buildSlotTable();
const WRITE_INDEXED_N4_B: TWriter = (cell, x) => {
    cell.v = x;
    return (x * 5 + 1) | 0;
};
const WRITERS_INDEXED_N4_B: readonly TWriter[] = [
    WRITE_INDEXED_N4_B,
    WRITE_INDEXED_N4_B,
    WRITE_INDEXED_N4_B,
    WRITE_INDEXED_N4_B,
];

function runIndexedN4B(): number {
    const pool = POOL_INDEXED_N4_B;
    const csink = CSINK_INDEXED_N4_B;
    const asink = ASINK_INDEXED_N4_B;
    const w = WRITERS_INDEXED_N4_B;
    const e = SLOTS_INDEXED_N4_B;
    let total = 0;
    for (let j = 0; j < INSTANCES; j++) {
        const s = pool[j];
        csink[j] = s;
        let a = (j + 1) | 0;
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        asink[j] = a;
        total = (total + a) | 0;
    }
    return total;
}

const POOL_INDEXED_N16_A = buildPool();
const CSINK_INDEXED_N16_A = buildContainerSink(POOL_INDEXED_N16_A);
const ASINK_INDEXED_N16_A = new Int32Array(INSTANCES);
const SLOTS_INDEXED_N16_A = buildSlotTable();
const WRITE_INDEXED_N16_A: TWriter = (cell, x) => {
    cell.v = x;
    return (x * 5 + 1) | 0;
};
const WRITERS_INDEXED_N16_A: readonly TWriter[] = [
    WRITE_INDEXED_N16_A,
    WRITE_INDEXED_N16_A,
    WRITE_INDEXED_N16_A,
    WRITE_INDEXED_N16_A,
];

function runIndexedN16A(): number {
    const pool = POOL_INDEXED_N16_A;
    const csink = CSINK_INDEXED_N16_A;
    const asink = ASINK_INDEXED_N16_A;
    const w = WRITERS_INDEXED_N16_A;
    const e = SLOTS_INDEXED_N16_A;
    let total = 0;
    for (let j = 0; j < INSTANCES; j++) {
        const s = pool[j];
        csink[j] = s;
        let a = (j + 1) | 0;
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        asink[j] = a;
        total = (total + a) | 0;
    }
    return total;
}

const POOL_INDEXED_N16_B = buildPool();
const CSINK_INDEXED_N16_B = buildContainerSink(POOL_INDEXED_N16_B);
const ASINK_INDEXED_N16_B = new Int32Array(INSTANCES);
const SLOTS_INDEXED_N16_B = buildSlotTable();
const WRITE_INDEXED_N16_B: TWriter = (cell, x) => {
    cell.v = x;
    return (x * 5 + 1) | 0;
};
const WRITERS_INDEXED_N16_B: readonly TWriter[] = [
    WRITE_INDEXED_N16_B,
    WRITE_INDEXED_N16_B,
    WRITE_INDEXED_N16_B,
    WRITE_INDEXED_N16_B,
];

function runIndexedN16B(): number {
    const pool = POOL_INDEXED_N16_B;
    const csink = CSINK_INDEXED_N16_B;
    const asink = ASINK_INDEXED_N16_B;
    const w = WRITERS_INDEXED_N16_B;
    const e = SLOTS_INDEXED_N16_B;
    let total = 0;
    for (let j = 0; j < INSTANCES; j++) {
        const s = pool[j];
        csink[j] = s;
        let a = (j + 1) | 0;
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        a = w[0](s[e[0]], a);
        a = w[1](s[e[1]], a);
        a = w[2](s[e[2]], a);
        a = w[3](s[e[3]], a);
        asink[j] = a;
        total = (total + a) | 0;
    }
    return total;
}

const POOL_DIRECT_N1_A = buildPool();
const CSINK_DIRECT_N1_A = buildContainerSink(POOL_DIRECT_N1_A);
const ASINK_DIRECT_N1_A = new Int32Array(INSTANCES);
const SLOTS_DIRECT_N1_A = buildSlotTable();
const BUILD_DIRECT_N1_A = (s: TCell[], e: Int32Array): THandle[] => {
    const c0 = s[e[0]];
    const c1 = s[e[1]];
    const c2 = s[e[2]];
    const c3 = s[e[3]];
    return [
        (x: number): number => {
            c0.v = x;
            return (x * 5 + 1) | 0;
        },
        (x: number): number => {
            c1.v = x;
            return (x * 5 + 1) | 0;
        },
        (x: number): number => {
            c2.v = x;
            return (x * 5 + 1) | 0;
        },
        (x: number): number => {
            c3.v = x;
            return (x * 5 + 1) | 0;
        },
    ];
};

function runDirectN1A(): number {
    const pool = POOL_DIRECT_N1_A;
    const csink = CSINK_DIRECT_N1_A;
    const asink = ASINK_DIRECT_N1_A;
    const mk = BUILD_DIRECT_N1_A;
    const e = SLOTS_DIRECT_N1_A;
    let total = 0;
    for (let j = 0; j < INSTANCES; j++) {
        const s = pool[j];
        const h = mk(s, e);
        csink[j] = h;
        let a = (j + 1) | 0;
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        asink[j] = a;
        total = (total + a) | 0;
    }
    return total;
}

const POOL_DIRECT_N1_B = buildPool();
const CSINK_DIRECT_N1_B = buildContainerSink(POOL_DIRECT_N1_B);
const ASINK_DIRECT_N1_B = new Int32Array(INSTANCES);
const SLOTS_DIRECT_N1_B = buildSlotTable();
const BUILD_DIRECT_N1_B = (s: TCell[], e: Int32Array): THandle[] => {
    const c0 = s[e[0]];
    const c1 = s[e[1]];
    const c2 = s[e[2]];
    const c3 = s[e[3]];
    return [
        (x: number): number => {
            c0.v = x;
            return (x * 5 + 1) | 0;
        },
        (x: number): number => {
            c1.v = x;
            return (x * 5 + 1) | 0;
        },
        (x: number): number => {
            c2.v = x;
            return (x * 5 + 1) | 0;
        },
        (x: number): number => {
            c3.v = x;
            return (x * 5 + 1) | 0;
        },
    ];
};

function runDirectN1B(): number {
    const pool = POOL_DIRECT_N1_B;
    const csink = CSINK_DIRECT_N1_B;
    const asink = ASINK_DIRECT_N1_B;
    const mk = BUILD_DIRECT_N1_B;
    const e = SLOTS_DIRECT_N1_B;
    let total = 0;
    for (let j = 0; j < INSTANCES; j++) {
        const s = pool[j];
        const h = mk(s, e);
        csink[j] = h;
        let a = (j + 1) | 0;
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        asink[j] = a;
        total = (total + a) | 0;
    }
    return total;
}

const POOL_DIRECT_N4_A = buildPool();
const CSINK_DIRECT_N4_A = buildContainerSink(POOL_DIRECT_N4_A);
const ASINK_DIRECT_N4_A = new Int32Array(INSTANCES);
const SLOTS_DIRECT_N4_A = buildSlotTable();
const BUILD_DIRECT_N4_A = (s: TCell[], e: Int32Array): THandle[] => {
    const c0 = s[e[0]];
    const c1 = s[e[1]];
    const c2 = s[e[2]];
    const c3 = s[e[3]];
    return [
        (x: number): number => {
            c0.v = x;
            return (x * 5 + 1) | 0;
        },
        (x: number): number => {
            c1.v = x;
            return (x * 5 + 1) | 0;
        },
        (x: number): number => {
            c2.v = x;
            return (x * 5 + 1) | 0;
        },
        (x: number): number => {
            c3.v = x;
            return (x * 5 + 1) | 0;
        },
    ];
};

function runDirectN4A(): number {
    const pool = POOL_DIRECT_N4_A;
    const csink = CSINK_DIRECT_N4_A;
    const asink = ASINK_DIRECT_N4_A;
    const mk = BUILD_DIRECT_N4_A;
    const e = SLOTS_DIRECT_N4_A;
    let total = 0;
    for (let j = 0; j < INSTANCES; j++) {
        const s = pool[j];
        const h = mk(s, e);
        csink[j] = h;
        let a = (j + 1) | 0;
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        asink[j] = a;
        total = (total + a) | 0;
    }
    return total;
}

const POOL_DIRECT_N4_B = buildPool();
const CSINK_DIRECT_N4_B = buildContainerSink(POOL_DIRECT_N4_B);
const ASINK_DIRECT_N4_B = new Int32Array(INSTANCES);
const SLOTS_DIRECT_N4_B = buildSlotTable();
const BUILD_DIRECT_N4_B = (s: TCell[], e: Int32Array): THandle[] => {
    const c0 = s[e[0]];
    const c1 = s[e[1]];
    const c2 = s[e[2]];
    const c3 = s[e[3]];
    return [
        (x: number): number => {
            c0.v = x;
            return (x * 5 + 1) | 0;
        },
        (x: number): number => {
            c1.v = x;
            return (x * 5 + 1) | 0;
        },
        (x: number): number => {
            c2.v = x;
            return (x * 5 + 1) | 0;
        },
        (x: number): number => {
            c3.v = x;
            return (x * 5 + 1) | 0;
        },
    ];
};

function runDirectN4B(): number {
    const pool = POOL_DIRECT_N4_B;
    const csink = CSINK_DIRECT_N4_B;
    const asink = ASINK_DIRECT_N4_B;
    const mk = BUILD_DIRECT_N4_B;
    const e = SLOTS_DIRECT_N4_B;
    let total = 0;
    for (let j = 0; j < INSTANCES; j++) {
        const s = pool[j];
        const h = mk(s, e);
        csink[j] = h;
        let a = (j + 1) | 0;
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        asink[j] = a;
        total = (total + a) | 0;
    }
    return total;
}

const POOL_DIRECT_N16_A = buildPool();
const CSINK_DIRECT_N16_A = buildContainerSink(POOL_DIRECT_N16_A);
const ASINK_DIRECT_N16_A = new Int32Array(INSTANCES);
const SLOTS_DIRECT_N16_A = buildSlotTable();
const BUILD_DIRECT_N16_A = (s: TCell[], e: Int32Array): THandle[] => {
    const c0 = s[e[0]];
    const c1 = s[e[1]];
    const c2 = s[e[2]];
    const c3 = s[e[3]];
    return [
        (x: number): number => {
            c0.v = x;
            return (x * 5 + 1) | 0;
        },
        (x: number): number => {
            c1.v = x;
            return (x * 5 + 1) | 0;
        },
        (x: number): number => {
            c2.v = x;
            return (x * 5 + 1) | 0;
        },
        (x: number): number => {
            c3.v = x;
            return (x * 5 + 1) | 0;
        },
    ];
};

function runDirectN16A(): number {
    const pool = POOL_DIRECT_N16_A;
    const csink = CSINK_DIRECT_N16_A;
    const asink = ASINK_DIRECT_N16_A;
    const mk = BUILD_DIRECT_N16_A;
    const e = SLOTS_DIRECT_N16_A;
    let total = 0;
    for (let j = 0; j < INSTANCES; j++) {
        const s = pool[j];
        const h = mk(s, e);
        csink[j] = h;
        let a = (j + 1) | 0;
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        asink[j] = a;
        total = (total + a) | 0;
    }
    return total;
}

const POOL_DIRECT_N16_B = buildPool();
const CSINK_DIRECT_N16_B = buildContainerSink(POOL_DIRECT_N16_B);
const ASINK_DIRECT_N16_B = new Int32Array(INSTANCES);
const SLOTS_DIRECT_N16_B = buildSlotTable();
const BUILD_DIRECT_N16_B = (s: TCell[], e: Int32Array): THandle[] => {
    const c0 = s[e[0]];
    const c1 = s[e[1]];
    const c2 = s[e[2]];
    const c3 = s[e[3]];
    return [
        (x: number): number => {
            c0.v = x;
            return (x * 5 + 1) | 0;
        },
        (x: number): number => {
            c1.v = x;
            return (x * 5 + 1) | 0;
        },
        (x: number): number => {
            c2.v = x;
            return (x * 5 + 1) | 0;
        },
        (x: number): number => {
            c3.v = x;
            return (x * 5 + 1) | 0;
        },
    ];
};

function runDirectN16B(): number {
    const pool = POOL_DIRECT_N16_B;
    const csink = CSINK_DIRECT_N16_B;
    const asink = ASINK_DIRECT_N16_B;
    const mk = BUILD_DIRECT_N16_B;
    const e = SLOTS_DIRECT_N16_B;
    let total = 0;
    for (let j = 0; j < INSTANCES; j++) {
        const s = pool[j];
        const h = mk(s, e);
        csink[j] = h;
        let a = (j + 1) | 0;
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        a = h[0](a);
        a = h[1](a);
        a = h[2](a);
        a = h[3](a);
        asink[j] = a;
        total = (total + a) | 0;
    }
    return total;
}

interface Program {
    readonly name: string;
    readonly arm: Arm;
    readonly rung: Rung;
    readonly twin: boolean;
    readonly allocPerInstance: number;
    readonly framesPerInstance: number;
    readonly framesPerWrite: number;
    readonly loadsPerWrite: number;
    readonly run: () => number;
    readonly pool: TCell[][];
    readonly csink: object[];
    readonly asink: Int32Array;
    readonly code: unknown;
    readonly slotTable: Int32Array | null;
}

function rowName(arm: Arm, rung: Rung, twin: boolean): string {
    return `${arm}·${rung}${twin ? '·twin' : ''}`;
}

const ARM_NOTE: Readonly<Record<Arm, string>> = {
    floor:
        'STRAIGHT-LINE WRITES, NO PORT ABSTRACTION — the four cells hoisted into locals with the ' +
        'permutation baked in as literals, then the store and the advance in source. It calls ' +
        'nothing, allocates nothing and resolves nothing. NEVER USED AS ANOTHER ARM’S CONTROL: ' +
        'its MARGINAL write is what (P6) holds the shipped shape’s marginal write against.',
    indexed:
        'THE SHIPPED SHAPE — `writers[i](slots[elem[i]], v)`, BOTH TABLES READ ON EVERY WRITE. ' +
        'Nothing is resolved at construction, so its intercept is zero by construction and ' +
        'everything it costs is slope. Its writer is ONE function object reached from four ' +
        'monomorphic sites, which is the FAVOURABLE spelling of the shipped shape.',
    direct:
        'A PER-PORT REFERENCE RESOLVED ONCE PER INSTANCE — one builder call reads `elem` four ' +
        'times, loads four cells and returns four closures over ONE shared context; a write is ' +
        'then one element load, one call and one context load. Every table read the shipped ' +
        'shape repeats is paid here exactly once, for six allocations and a frame.',
};

const PROGRAMS: readonly Program[] = [
    {
        name: rowName('floor', 'n1', false),
        arm: 'floor',
        rung: 'n1',
        twin: false,
        allocPerInstance: 0,
        framesPerInstance: 0,
        framesPerWrite: 0,
        loadsPerWrite: 0,
        run: runFloorN1A,
        pool: POOL_FLOOR_N1_A,
        csink: CSINK_FLOOR_N1_A,
        asink: ASINK_FLOOR_N1_A,
        code: null,
        slotTable: null,
    },
    {
        name: rowName('floor', 'n4', false),
        arm: 'floor',
        rung: 'n4',
        twin: false,
        allocPerInstance: 0,
        framesPerInstance: 0,
        framesPerWrite: 0,
        loadsPerWrite: 0,
        run: runFloorN4A,
        pool: POOL_FLOOR_N4_A,
        csink: CSINK_FLOOR_N4_A,
        asink: ASINK_FLOOR_N4_A,
        code: null,
        slotTable: null,
    },
    {
        name: rowName('floor', 'n16', false),
        arm: 'floor',
        rung: 'n16',
        twin: false,
        allocPerInstance: 0,
        framesPerInstance: 0,
        framesPerWrite: 0,
        loadsPerWrite: 0,
        run: runFloorN16A,
        pool: POOL_FLOOR_N16_A,
        csink: CSINK_FLOOR_N16_A,
        asink: ASINK_FLOOR_N16_A,
        code: null,
        slotTable: null,
    },
    {
        name: rowName('indexed', 'n1', false),
        arm: 'indexed',
        rung: 'n1',
        twin: false,
        allocPerInstance: 0,
        framesPerInstance: 0,
        framesPerWrite: 1,
        loadsPerWrite: 3,
        run: runIndexedN1A,
        pool: POOL_INDEXED_N1_A,
        csink: CSINK_INDEXED_N1_A,
        asink: ASINK_INDEXED_N1_A,
        code: WRITE_INDEXED_N1_A,
        slotTable: SLOTS_INDEXED_N1_A,
    },
    {
        name: rowName('indexed', 'n4', false),
        arm: 'indexed',
        rung: 'n4',
        twin: false,
        allocPerInstance: 0,
        framesPerInstance: 0,
        framesPerWrite: 1,
        loadsPerWrite: 3,
        run: runIndexedN4A,
        pool: POOL_INDEXED_N4_A,
        csink: CSINK_INDEXED_N4_A,
        asink: ASINK_INDEXED_N4_A,
        code: WRITE_INDEXED_N4_A,
        slotTable: SLOTS_INDEXED_N4_A,
    },
    {
        name: rowName('indexed', 'n16', false),
        arm: 'indexed',
        rung: 'n16',
        twin: false,
        allocPerInstance: 0,
        framesPerInstance: 0,
        framesPerWrite: 1,
        loadsPerWrite: 3,
        run: runIndexedN16A,
        pool: POOL_INDEXED_N16_A,
        csink: CSINK_INDEXED_N16_A,
        asink: ASINK_INDEXED_N16_A,
        code: WRITE_INDEXED_N16_A,
        slotTable: SLOTS_INDEXED_N16_A,
    },
    {
        name: rowName('direct', 'n1', false),
        arm: 'direct',
        rung: 'n1',
        twin: false,
        allocPerInstance: 6,
        framesPerInstance: 1,
        framesPerWrite: 1,
        loadsPerWrite: 2,
        run: runDirectN1A,
        pool: POOL_DIRECT_N1_A,
        csink: CSINK_DIRECT_N1_A,
        asink: ASINK_DIRECT_N1_A,
        code: BUILD_DIRECT_N1_A,
        slotTable: SLOTS_DIRECT_N1_A,
    },
    {
        name: rowName('direct', 'n4', false),
        arm: 'direct',
        rung: 'n4',
        twin: false,
        allocPerInstance: 6,
        framesPerInstance: 1,
        framesPerWrite: 1,
        loadsPerWrite: 2,
        run: runDirectN4A,
        pool: POOL_DIRECT_N4_A,
        csink: CSINK_DIRECT_N4_A,
        asink: ASINK_DIRECT_N4_A,
        code: BUILD_DIRECT_N4_A,
        slotTable: SLOTS_DIRECT_N4_A,
    },
    {
        name: rowName('direct', 'n16', false),
        arm: 'direct',
        rung: 'n16',
        twin: false,
        allocPerInstance: 6,
        framesPerInstance: 1,
        framesPerWrite: 1,
        loadsPerWrite: 2,
        run: runDirectN16A,
        pool: POOL_DIRECT_N16_A,
        csink: CSINK_DIRECT_N16_A,
        asink: ASINK_DIRECT_N16_A,
        code: BUILD_DIRECT_N16_A,
        slotTable: SLOTS_DIRECT_N16_A,
    },
    {
        name: rowName('floor', 'n1', true),
        arm: 'floor',
        rung: 'n1',
        twin: true,
        allocPerInstance: 0,
        framesPerInstance: 0,
        framesPerWrite: 0,
        loadsPerWrite: 0,
        run: runFloorN1B,
        pool: POOL_FLOOR_N1_B,
        csink: CSINK_FLOOR_N1_B,
        asink: ASINK_FLOOR_N1_B,
        code: null,
        slotTable: null,
    },
    {
        name: rowName('floor', 'n4', true),
        arm: 'floor',
        rung: 'n4',
        twin: true,
        allocPerInstance: 0,
        framesPerInstance: 0,
        framesPerWrite: 0,
        loadsPerWrite: 0,
        run: runFloorN4B,
        pool: POOL_FLOOR_N4_B,
        csink: CSINK_FLOOR_N4_B,
        asink: ASINK_FLOOR_N4_B,
        code: null,
        slotTable: null,
    },
    {
        name: rowName('floor', 'n16', true),
        arm: 'floor',
        rung: 'n16',
        twin: true,
        allocPerInstance: 0,
        framesPerInstance: 0,
        framesPerWrite: 0,
        loadsPerWrite: 0,
        run: runFloorN16B,
        pool: POOL_FLOOR_N16_B,
        csink: CSINK_FLOOR_N16_B,
        asink: ASINK_FLOOR_N16_B,
        code: null,
        slotTable: null,
    },
    {
        name: rowName('indexed', 'n1', true),
        arm: 'indexed',
        rung: 'n1',
        twin: true,
        allocPerInstance: 0,
        framesPerInstance: 0,
        framesPerWrite: 1,
        loadsPerWrite: 3,
        run: runIndexedN1B,
        pool: POOL_INDEXED_N1_B,
        csink: CSINK_INDEXED_N1_B,
        asink: ASINK_INDEXED_N1_B,
        code: WRITE_INDEXED_N1_B,
        slotTable: SLOTS_INDEXED_N1_B,
    },
    {
        name: rowName('indexed', 'n4', true),
        arm: 'indexed',
        rung: 'n4',
        twin: true,
        allocPerInstance: 0,
        framesPerInstance: 0,
        framesPerWrite: 1,
        loadsPerWrite: 3,
        run: runIndexedN4B,
        pool: POOL_INDEXED_N4_B,
        csink: CSINK_INDEXED_N4_B,
        asink: ASINK_INDEXED_N4_B,
        code: WRITE_INDEXED_N4_B,
        slotTable: SLOTS_INDEXED_N4_B,
    },
    {
        name: rowName('indexed', 'n16', true),
        arm: 'indexed',
        rung: 'n16',
        twin: true,
        allocPerInstance: 0,
        framesPerInstance: 0,
        framesPerWrite: 1,
        loadsPerWrite: 3,
        run: runIndexedN16B,
        pool: POOL_INDEXED_N16_B,
        csink: CSINK_INDEXED_N16_B,
        asink: ASINK_INDEXED_N16_B,
        code: WRITE_INDEXED_N16_B,
        slotTable: SLOTS_INDEXED_N16_B,
    },
    {
        name: rowName('direct', 'n1', true),
        arm: 'direct',
        rung: 'n1',
        twin: true,
        allocPerInstance: 6,
        framesPerInstance: 1,
        framesPerWrite: 1,
        loadsPerWrite: 2,
        run: runDirectN1B,
        pool: POOL_DIRECT_N1_B,
        csink: CSINK_DIRECT_N1_B,
        asink: ASINK_DIRECT_N1_B,
        code: BUILD_DIRECT_N1_B,
        slotTable: SLOTS_DIRECT_N1_B,
    },
    {
        name: rowName('direct', 'n4', true),
        arm: 'direct',
        rung: 'n4',
        twin: true,
        allocPerInstance: 6,
        framesPerInstance: 1,
        framesPerWrite: 1,
        loadsPerWrite: 2,
        run: runDirectN4B,
        pool: POOL_DIRECT_N4_B,
        csink: CSINK_DIRECT_N4_B,
        asink: ASINK_DIRECT_N4_B,
        code: BUILD_DIRECT_N4_B,
        slotTable: SLOTS_DIRECT_N4_B,
    },
    {
        name: rowName('direct', 'n16', true),
        arm: 'direct',
        rung: 'n16',
        twin: true,
        allocPerInstance: 6,
        framesPerInstance: 1,
        framesPerWrite: 1,
        loadsPerWrite: 2,
        run: runDirectN16B,
        pool: POOL_DIRECT_N16_B,
        csink: CSINK_DIRECT_N16_B,
        asink: ASINK_DIRECT_N16_B,
        code: BUILD_DIRECT_N16_B,
        slotTable: SLOTS_DIRECT_N16_B,
    },
];

function advance(x: number): number {
    return (x * 5 + 1) | 0;
}

function expectedAcc(instance: number, writes: number): number {
    let a = (instance + 1) | 0;
    for (let t = 0; t < writes; t++) a = advance(a);
    return a;
}

function expectedTotal(rung: Rung): number {
    const writes = PORTS * WRITES_PER_PORT[rung];
    let total = 0;
    for (let j = 0; j < INSTANCES; j++) total = (total + expectedAcc(j, writes)) | 0;
    return total;
}

function gateWork(): string[] {
    const out: string[] = [];
    for (const rung of RUNGS) {
        const want = expectedTotal(rung);
        let counted = 0;
        for (const p of PROGRAMS) {
            if (p.rung !== rung) continue;
            counted++;
            const got = p.run();
            if (got !== want) {
                throw new Error(
                    `write-ladder: "${p.name}" returned ${got} where every program at this rung ` +
                        `must return ${want}. The arms are not doing identical work and nothing ` +
                        'may be timed.'
                );
            }
        }
        out.push(
            `  ${rung.padEnd(4)}${PORTS * WRITES_PER_PORT[rung]} writes per instance · all ` +
                `${counted} programs return ${want}, computed here from the loop's own ` +
                'arithmetic and not from any arm'
        );
    }
    return out;
}

function gateEscape(): string[] {
    const out: string[] = [];
    for (const p of PROGRAMS) {
        const writes = PORTS * WRITES_PER_PORT[p.rung];
        p.run();
        for (let j = 0; j < INSTANCES; j++) {
            const want = expectedAcc(j, writes);
            if (p.asink[j] !== want) {
                throw new Error(
                    `write-ladder: "${p.name}" left accumulator ${p.asink[j]} at instance ${j} ` +
                        `where ${want} was expected. A write was dropped, reordered or never ` +
                        'happened, and the whole point of the chain is that this cannot pass.'
                );
            }
        }
        for (let j = 0; j < INSTANCES; j++) {
            const row = p.pool[j];
            for (let k = 0; k < PORTS; k++) {
                const at = (WRITES_PER_PORT[p.rung] - 1) * PORTS + k;
                const want = expectedAcc(j, at);
                if (row[SLOT_OF_PORT[k]].v !== want) {
                    throw new Error(
                        `write-ladder: "${p.name}" cell for port ${k} of instance ${j} holds ` +
                            `${row[SLOT_OF_PORT[k]].v} where ${want} was expected — the value ` +
                            `written by the last of its ${WRITES_PER_PORT[p.rung]} writes.`
                    );
                }
            }
        }
        if (p.csink.length !== INSTANCES) {
            throw new Error(
                `write-ladder: "${p.name}" left ${p.csink.length} entries in its container sink ` +
                    `where ${INSTANCES} were expected — the array grew or shrank.`
            );
        }
        const distinct = new Set<object>(p.csink).size;
        if (distinct !== INSTANCES) {
            throw new Error(
                `write-ladder: "${p.name}" left ${distinct} DISTINCT containers in its sink ` +
                    'where one per instance was expected.'
            );
        }
        if (p.arm === 'direct') {
            const handles = p.csink[0] as THandle[];
            if (handles.length !== PORTS || typeof handles[0] !== 'function') {
                throw new Error(
                    `write-ladder: "${p.name}" put something other than ${PORTS} handles into ` +
                        'its sink, so the closures this arm exists to price are not there.'
                );
            }
            if (new Set<THandle>(handles).size !== PORTS) {
                throw new Error(
                    `write-ladder: "${p.name}" built fewer than ${PORTS} distinct handles for ` +
                        'one instance.'
                );
            }
            const probe = 123456;
            const back = handles[0](probe);
            if (p.pool[0][SLOT_OF_PORT[0]].v !== probe || back !== advance(probe)) {
                throw new Error(
                    `write-ladder: "${p.name}" handle 0 taken out of the sink did not write ` +
                        'through to its own cell. The closures were scalarised or they close ' +
                        'over the wrong thing, and this arm is not measuring what it says.'
                );
            }
            p.run();
        } else {
            for (let j = 0; j < INSTANCES; j++) {
                if (p.csink[j] !== p.pool[j]) {
                    throw new Error(
                        `write-ladder: "${p.name}" container sink entry ${j} is not this ` +
                            "instance's own row of cells."
                    );
                }
            }
        }
        out.push(
            `  ${p.name.padEnd(18)}${INSTANCES} accumulators · ${INSTANCES * PORTS} cells · ` +
                `${distinct} distinct containers — all read back and all as computed` +
                (p.arm === 'direct'
                    ? ', and one handle out of the sink was CALLED and wrote through'
                    : ', every container the instance’s own row')
        );
    }
    return out;
}

function gateSeparate(): string[] {
    const pools = new Set<object>(PROGRAMS.map((p) => p.pool));
    if (pools.size !== PROGRAMS.length) {
        throw new Error(
            `write-ladder: the ${PROGRAMS.length} programs share pools — only ${pools.size} ` +
                'distinct. Two programs over one pool share every cell map and every inline ' +
                'cache, and the pair between them measures a floor no real pair sits on.'
        );
    }
    const csinks = new Set<object>(PROGRAMS.map((p) => p.csink));
    const asinks = new Set<object>(PROGRAMS.map((p) => p.asink));
    if (csinks.size !== PROGRAMS.length || asinks.size !== PROGRAMS.length) {
        throw new Error(
            `write-ladder: the ${PROGRAMS.length} programs do not own their escape routes — ` +
                `${csinks.size} container sinks and ${asinks.size} accumulator sinks.`
        );
    }
    const codes = PROGRAMS.map((p) => p.code).filter((c) => c !== null);
    if (new Set<unknown>(codes).size !== codes.length) {
        throw new Error(
            `write-ladder: the ${codes.length} dispatching programs declare only ` +
                `${new Set<unknown>(codes).size} distinct writer/builder function objects.`
        );
    }
    const tables = PROGRAMS.map((p) => p.slotTable).filter((t) => t !== null);
    if (new Set<unknown>(tables).size !== tables.length) {
        throw new Error(
            `write-ladder: the ${tables.length} table-reading programs share slot tables.`
        );
    }
    const sorted = [...SLOT_OF_PORT].sort((x, y) => x - y).join(',');
    if (sorted !== Array.from({ length: PORTS }, (_, i) => i).join(',')) {
        throw new Error(
            `write-ladder: SLOT_OF_PORT is not a permutation of 0..${PORTS - 1}, so two ports ` +
                'write the same cell and the per-cell expectation is not well defined.'
        );
    }
    for (const p of PROGRAMS) {
        if (p.pool.length !== INSTANCES) {
            throw new Error(`write-ladder: "${p.name}" pool is not ${INSTANCES} rows.`);
        }
        if (new Set<TCell>(p.pool[0]).size !== PORTS) {
            throw new Error(`write-ladder: "${p.name}" row 0 does not hold ${PORTS} cells.`);
        }
    }
    return [
        `  ${PROGRAMS.length} distinct pools · ${PROGRAMS.length} distinct container sinks · ` +
            `${PROGRAMS.length} distinct accumulator sinks · ${codes.length} distinct ` +
            `writer/builder function objects · ${tables.length} distinct slot tables — all ` +
            'checked BY POINTER',
        `  the port→slot map is [${SLOT_OF_PORT.join(', ')}], a permutation, so each of the ` +
            `${PORTS} cells of an instance is written exactly once per round of writes and the ` +
            'per-cell expectation is exact. `floor` bakes it in as literals, which is what "no ' +
            'port abstraction" means; the other two read it out of an `Int32Array`.',
    ];
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
    const q = (r: number): number => s[Math.min(s.length - 1, Math.floor(s.length * r))];
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
        const forward = (r & 1) === 0;
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
    for (let r = 0; r < n; r++) {
        const signed = a[r] - b[r];
        diffs[r] = Math.abs(signed);
        if (aPos[r] < bPos[r]) whenAFirst.push(signed);
        else whenBFirst.push(signed);
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
    };
}

interface ArmPair {
    readonly rung: Rung;
    readonly a: Arm;
    readonly b: Arm;
    readonly note: string;
}

interface RungPair {
    readonly arm: Arm;
    readonly hi: Rung;
    readonly lo: Rung;
    readonly note: string;
}

const ARM_PAIRS: readonly ArmPair[] = RUNGS.flatMap((rung) => [
    {
        rung,
        a: 'indexed',
        b: 'direct',
        note:
            'THE PAIR THE AXIS EXISTS FOR — both tables read on every write against both read ' +
            'once per instance. FUSED with six allocations and a builder frame on one side and ' +
            'with nothing at all on the other, which is what an intercept IS.',
    },
    {
        rung,
        a: 'indexed',
        b: 'floor',
        note:
            'the shipped shape against writes with nothing dispatching them. FUSED with the ' +
            'call frame, which TurboFan may inline away.',
    },
    {
        rung,
        a: 'direct',
        b: 'floor',
        note:
            'a per-instance handle against no handle at all — the price of being able to hand a ' +
            'port to somebody, paid in six allocations and one load per write.',
    },
]);

const RUNG_PAIRS: readonly RungPair[] = ARMS.flatMap((arm) => [
    {
        arm,
        hi: 'n4',
        lo: 'n1',
        note:
            'THE FIRST INCREMENT — 12 more writes per instance and not one more instance, so the ' +
            'whole difference is slope. It is the noisier of the two: the n1 body is four ' +
            'statements and the n4 body is sixteen, and code size is not held fixed across a ' +
            'ladder that is a ladder of code.',
    },
    {
        arm,
        hi: 'n16',
        lo: 'n4',
        note:
            'THE SLOPE THIS AXIS USES — 48 more writes per instance, the longest lever on the ' +
            'ladder, and the increment every intercept and every crossing point below is ' +
            'derived from.',
    },
]);

export function benchmarkWriteLadder(rounds = 100, batch = 1): void {
    const f = (x: number): string => x.toFixed(4);
    const f6 = (x: number): string => x.toFixed(6);
    const sign = (x: number): string => (x >= 0 ? `+${x.toFixed(3)}` : x.toFixed(3));
    const nsInstance = (x: number): number => (x * 1e6) / INSTANCES;
    const nsWrite = (x: number, rung: Rung): number =>
        nsInstance(x) / (PORTS * WRITES_PER_PORT[rung]);

    const quantum = observeTimerQuantum();
    const repsOf = (rung: Rung): number => PASSES[rung] * batch;
    const grainOf = (rung: Rung): number => quantum / repsOf(rung);
    const grainsAt = (x: number, rung: Rung): number => Math.round(Math.abs(x) / grainOf(rung));
    const coarser = (x: Rung, y: Rung): Rung => (grainOf(x) >= grainOf(y) ? x : y);

    line(
        `write-ladder: observed timer quantum (${quantum.toFixed(3)} ms) — every timed region ` +
            `below must clear ${(MIN_TICKS * quantum).toFixed(3)} ms (${MIN_TICKS}×) or its ` +
            'digits are quantisation. THE CLOCK CHECK RUNS BEFORE THE VERDICTS and strikes any ' +
            'such row out of them.'
    );

    line('');
    line(
        'THE SHAPE, AS BUILT — checked by pointer, not assumed. Nothing here imports any @exodra ' +
            'package: this axis is eighteen straight-line programs and a clock.'
    );
    for (const l of gateSeparate()) line(l);

    line('');
    line(
        'THE WORK GATE — at each rung every program must return the same accumulator total, so ' +
            'the arms differ in HOW A PORT IS REACHED and in nothing else.'
    );
    for (const l of gateWork()) line(l);

    line('');
    line(
        'THE ESCAPE GATE — every accumulator and every cell read back after a run. This is what ' +
            'stops a repeated write being inert, and it is the gate the string backend could not ' +
            'have: there, the second write to a port changes nothing observable.'
    );
    for (const l of gateEscape()) line(l);

    line('');
    line("CENSUS — read off this file's own text, nothing measured");
    line(`  ports per instance          ${PORTS}`);
    line(`  instances per pass          ${INSTANCES}`);
    for (const rung of RUNGS) {
        const w = WRITES_PER_PORT[rung];
        const reps = repsOf(rung);
        line(
            `  ${rung.padEnd(4)}${String(w).padStart(2)} writes per port · ` +
                `${String(PORTS * w).padStart(3)} writes per instance · ${reps} passes per timed ` +
                `region · ${INSTANCES * PORTS * w * reps} writes per region`
        );
    }
    line(
        '  WRITES PER REGION IS THE SAME AT EVERY RUNG — the passes are 1024, 256 and 64, exactly ' +
            'the reciprocal of the writes per port. What changes down the ladder is how many ' +
            'INSTANCES those writes are spread over, which is the whole experiment.'
    );
    for (const arm of ARMS) {
        const p = PROGRAMS.find((x) => x.arm === arm && !x.twin) as Program;
        line(
            `  ${arm.padEnd(12)}alloc/inst ${String(p.allocPerInstance).padStart(2)} · fr/inst ` +
                `${p.framesPerInstance} · fr/write ${p.framesPerWrite} · loads/write ` +
                `${p.loadsPerWrite}`
        );
    }
    line(
        '  THE ACCUMULATOR CHAIN       one dependent multiply-add per write, ON EVERY ARM ' +
            'EQUALLY — in the callee for `indexed` and `direct`, in source for `floor`. It is ' +
            'what makes a repeated write observable: drop one and the final accumulator and every ' +
            'later cell change. It is also a LATENCY chain, and the loads `indexed` pays are ' +
            'independent of it, so an out-of-order core may hide them behind it.'
    );
    line(
        '  PER INSTANCE, ON EVERY ARM  one container store into a module-level packed array, one ' +
            'Int32Array store of the accumulator, one add into the returned total, one row of ' +
            'cells read out of the pool.'
    );
    for (const rung of RUNGS) {
        const g = grainOf(rung);
        line(
            `  GRAIN ${rung.padEnd(4)}                ${f6(g)} ms per pass = ` +
                `${nsInstance(g).toFixed(4)} ns per instance = ${nsWrite(g, rung).toFixed(5)} ns ` +
                `per write · four grains = ${(4 * nsInstance(g)).toFixed(4)} ns per instance = ` +
                `${(4 * nsWrite(g, rung)).toFixed(5)} ns per write`
        );
    }
    line(
        '  THE GRAIN PER WRITE IS THE SAME AT EVERY RUNG by construction, and the grain PER ' +
            'INSTANCE is sixteen times coarser at n16 than at n1. So a per-instance quantity is ' +
            'hardest to see exactly where the intercept matters least, and every cross-rung ' +
            'figure below is judged against the COARSER of its two rungs.'
    );
    line(
        '  THE QUOTING RULE            a difference must clear BOTH its own two rows’ ' +
            'resolutions AND four grains of its own rung to be quoted as a size. Everything else ' +
            'is refused by name.'
    );

    const phases: Phase[] = PROGRAMS.map((p) => ({
        name: p.name,
        reps: repsOf(p.rung),
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
    for (const p of phases) stats.set(p.name, stat(seriesOf(p.name)));
    const median = (name: string): number => (stats.get(name) as Stat).median;

    emitRecordedRows(
        'WRITE LADDER',
        'ms',
        'pass',
        PROGRAMS.map((p) => [p.name, stats.get(p.name) as Stat] as const)
    );

    line('');
    line(
        `WRITE LADDER — ${INSTANCES} instances per pass, ${PORTS} ports each [ms per pass] · ` +
            `interleaved, direction alternating · ${rounds} rounds · batch ${batch} · nine ` +
            'subjects then nine twins, so a subject and its twin are never adjacent'
    );
    line(
        '                    w/inst  al fr/i fr/w ld/w   min      median   max      med/grain' +
            '   ticks    ns/write  ns/inst'
    );
    for (const p of PROGRAMS) {
        const s = stats.get(p.name) as Stat;
        const region = s.median * repsOf(p.rung);
        line(
            `${p.name.padEnd(18)}${String(PORTS * WRITES_PER_PORT[p.rung]).padStart(6)}` +
                `${String(p.allocPerInstance).padStart(4)}` +
                `${String(p.framesPerInstance).padStart(5)}` +
                `${String(p.framesPerWrite).padStart(5)}` +
                `${String(p.loadsPerWrite).padStart(5)}   ` +
                `${f(s.min)}   ${f(s.median)}   ${f(s.max)}   ` +
                `${(s.median / grainOf(p.rung)).toFixed(1).padStart(9)}  ` +
                `${(region / quantum).toFixed(1).padStart(7)}   ` +
                `${nsWrite(s.median, p.rung).toFixed(4).padStart(8)}  ` +
                `${nsInstance(s.median).toFixed(2).padStart(7)}`
        );
    }
    line(
        '  w/inst = WRITES PER INSTANCE.  al = ALLOCATIONS PER INSTANCE.  fr/i = SOURCE CALL ' +
            'FRAMES PER INSTANCE.  fr/w = SOURCE CALL FRAMES PER WRITE.  ld/w = PROPERTY LOADS ' +
            'PER WRITE.  med/grain = the median divided by ONE GRAIN OF ITS OWN RUNG — IF THIS IS ' +
            'A SMALL INTEGER THE ROW IS THE CLOCK AND NOT THE PROGRAM.  ticks = the whole timed ' +
            'region divided by the observed quantum.'
    );
    line('');
    for (const arm of ARMS) line(`  ${arm.padEnd(9)}${ARM_NOTE[arm]}`);

    line('');
    line(
        'THE CLOCK CHECK — run BEFORE the nulls, the gaps and the predictions. A region under ' +
            `${MIN_TICKS} ticks is EXCLUDED from all three, not footnoted after them.`
    );
    const excluded = new Set<string>();
    for (const p of PROGRAMS) {
        const region = median(p.name) * repsOf(p.rung);
        const ticks = region / quantum;
        if (ticks >= MIN_TICKS) continue;
        excluded.add(`${p.arm}·${p.rung}`);
        const wantBatch = ticks > 0 ? Math.ceil((batch * MIN_TICKS) / ticks) : batch * 10;
        refuse(
            `write-ladder: the "${p.name}" timed region is ${region.toFixed(3)} ms at ` +
                `${repsOf(p.rung)} passes — ${ticks.toFixed(1)}× the observed quantum, under the ` +
                `${MIN_TICKS}× floor. Its digits are quantisation, so THE WHOLE "${p.arm}·` +
                `${p.rung}" CELL — this row AND its twin, hence its resolution — IS EXCLUDED from ` +
                `every null, gap and prediction below. Re-run with batch ${wantBatch}: \`npm run ` +
                `axis --workspace=@exodra/benchmarks -- write-ladder ${rounds} ${wantBatch}\``
        );
    }
    const allTicks = PROGRAMS.map((p) => (median(p.name) * repsOf(p.rung)) / quantum);
    if (excluded.size === 0) {
        line(
            `  ALL ${PROGRAMS.length} REGIONS CLEAR THE FLOOR — the smallest is ` +
                `${Math.min(...allTicks).toFixed(1)} ticks and the largest ` +
                `${Math.max(...allTicks).toFixed(1)}. Nothing is excluded.`
        );
    }
    const usable = (...cells: string[]): boolean => cells.every((c) => !excluded.has(c));

    const nullOf = new Map<string, Gap>();
    for (const arm of ARMS) {
        for (const rung of RUNGS) {
            const a = rowName(arm, rung, false);
            const b = rowName(arm, rung, true);
            nullOf.set(`${arm}·${rung}`, pairedGap(seriesOf(a), seriesOf(b), posOf(a), posOf(b)));
        }
    }
    const resOf = (arm: Arm, rung: Rung): number =>
        (nullOf.get(`${arm}·${rung}`) as Gap).resolution;

    line('');
    line(
        `NULLS — ${ARMS.length * RUNGS.length} pairs, one per arm per rung, each a separately ` +
            'declared copy of its program (its own pool, its own tables, its own writer or ' +
            'builder, its own sinks, its own unrolled body). True Δ = 0. Every gap below is ' +
            'judged against the resolutions of ITS OWN two rows and never against a table-wide ' +
            'figure.'
    );
    line(
        '  null            bias      noise     p75       worst     order     intrinsic  what it is'
    );
    let worstRes = 0;
    for (const arm of ARMS) {
        for (const rung of RUNGS) {
            const cell = `${arm}·${rung}`;
            const v = nullOf.get(cell) as Gap;
            if (v.resolution > worstRes) worstRes = v.resolution;
            line(
                `  ${cell.padEnd(14)}${f6(v.bias)}  ${f6(v.noise)}  ${f6(v.noiseP75)}  ` +
                    `${f6(v.worst)}  ${f6(v.order).padStart(9)} ${f6(v.intrinsic).padStart(9)}  ` +
                    `|${cell} − its twin| ms/pass, true Δ = 0 (this pair's resolution ` +
                    `${f6(v.resolution)} = ${nsInstance(v.resolution).toFixed(3)} ns/inst = ` +
                    `${nsWrite(v.resolution, rung).toFixed(4)} ns/write; Δ when the subject ran ` +
                    `first ${f6(v.aFirst)} over ${v.aFirstRounds} rounds, when the twin ran ` +
                    `first ${f6(v.bFirst)} over ${v.bFirstRounds}` +
                    `${excluded.has(cell) ? '; THIS CELL IS EXCLUDED BY THE CLOCK CHECK' : ''})`
            );
        }
    }
    line(
        `  RESOLUTION FLOOR      ${f6(worstRes)} ms — THE COARSEST OF THE ` +
            `${ARMS.length * RUNGS.length}, printed for the recorder. NO VERDICT BELOW USES IT.`
    );

    line('');
    line(
        'THE ORDER SPLIT — is a null measuring two programs, or measuring which of them ran first?'
    );
    const notNull: string[] = [];
    for (const arm of ARMS) {
        for (const rung of RUNGS) {
            const cell = `${arm}·${rung}`;
            const v = nullOf.get(cell) as Gap;
            const intr = Math.abs(v.intrinsic);
            const ord = Math.abs(v.order);
            let verdictWord: string;
            if (intr > v.noise) {
                notNull.push(cell);
                verdictWord =
                    'INTRINSIC — the two declarations differ in a way that does NOT flip with ' +
                    `the order, so this pair is not a null and every figure printed for "${cell}" ` +
                    'is suspect';
            } else if (ord > v.noise) {
                verdictWord =
                    'ORDERING — what the pair separates flips sign with which of the two ran ' +
                    'first, so it is the position in the round and not the program; the ' +
                    'alternating direction is what averages it out of the medians';
            } else {
                verdictWord =
                    "NEITHER stands out of this pair's own noise — the pair is a null and the " +
                    'instrument has nothing to confess';
            }
            line(
                `  ${cell.padEnd(14)}order ${f6(ord)} · intrinsic ${f6(intr)} · noise ` +
                    `${f6(v.noise)} ms/pass — ${verdictWord}`
            );
        }
    }
    if (notNull.length > 0) {
        refuse(
            `write-ladder: ${notNull.length} of the ${
                ARMS.length * RUNGS.length
            } null pairs came ` +
                `back INTRINSIC — ${notNull.join(', ')}. Two declarations of one program that ` +
                'differ in a way which does not flip with the running order are two different ' +
                'programs, so those rows are not quotable and every quantity computed from them ' +
                'inherits it. The first thing to check is that the twin is a true transcription: ' +
                'its own pool, its own tables, its own body, nothing shared with the subject.'
        );
    }

    const armGap = new Map<string, Gap>();
    for (const cmp of ARM_PAIRS) {
        const a = rowName(cmp.a, cmp.rung, false);
        const b = rowName(cmp.b, cmp.rung, false);
        armGap.set(
            `${cmp.a}↔${cmp.b}@${cmp.rung}`,
            pairedGap(seriesOf(a), seriesOf(b), posOf(a), posOf(b))
        );
    }
    const rungGap = new Map<string, Gap>();
    for (const cmp of RUNG_PAIRS) {
        const a = rowName(cmp.arm, cmp.hi, false);
        const b = rowName(cmp.arm, cmp.lo, false);
        rungGap.set(
            `${cmp.arm}:${cmp.hi}↔${cmp.lo}`,
            pairedGap(seriesOf(a), seriesOf(b), posOf(a), posOf(b))
        );
    }

    line('');
    line(
        `THE ${ARM_PAIRS.length} ARM-TO-ARM COMPARISONS, RUNG BY RUNG — every one through the ` +
            'SAME estimator as the nulls. `intrinsic` is the difference of the two series with ' +
            'the running order balanced out, and INTRINSIC IS THE QUOTED FIGURE. A NEGATIVE ' +
            'intrinsic means the FIRST arm was cheaper.'
    );
    const resolvedPairs: string[] = [];
    const unresolvedPairs: string[] = [];
    for (const cmp of ARM_PAIRS) {
        const key = `${cmp.a}↔${cmp.b}@${cmp.rung}`;
        if (!usable(`${cmp.a}·${cmp.rung}`, `${cmp.b}·${cmp.rung}`)) {
            line(`  ${key.padEnd(26)}EXCLUDED — an arm of this pair is under the clock floor.`);
            continue;
        }
        const v = armGap.get(key) as Gap;
        const res = Math.max(resOf(cmp.a, cmp.rung), resOf(cmp.b, cmp.rung));
        const g = grainsAt(v.intrinsic, cmp.rung);
        const ok = Math.abs(v.intrinsic) > res && g >= 4;
        if (ok) resolvedPairs.push(key);
        else unresolvedPairs.push(key);
        line(
            `  ${key.padEnd(26)}${sign(nsInstance(v.intrinsic)).padStart(9)} ns/inst  ` +
                `${sign(nsWrite(v.intrinsic, cmp.rung)).padStart(8)} ns/write  ` +
                `${String(g).padStart(5)} grains  (bias ${f6(v.bias)}, order ${f6(v.order)}, own ` +
                `resolution ${f6(res)})  ${
                    ok
                        ? 'RESOLVED — quotable as a size'
                        : Math.abs(v.intrinsic) <= res
                        ? 'NOT RESOLVED — inside its own two rows’ resolution'
                        : 'NOT RESOLVED — under four grains, an ordering at best'
                }`
        );
        line(`  ${''.padEnd(26)}${cmp.note}`);
    }

    line('');
    line(
        'THE INCREMENTS — the figure this axis was built to print. Each is the SAME arm at two ' +
            'rungs, so the intercept cancels exactly and what is left is slope: what ONE MORE ' +
            'WRITE costs on that arm. Judged against the coarser of the two rungs.'
    );
    const slope = new Map<Arm, number>();
    const slopeResolved = new Map<Arm, boolean>();
    for (const cmp of RUNG_PAIRS) {
        const key = `${cmp.arm}:${cmp.hi}↔${cmp.lo}`;
        if (!usable(`${cmp.arm}·${cmp.hi}`, `${cmp.arm}·${cmp.lo}`)) {
            line(`  ${key.padEnd(22)}EXCLUDED — a rung of this pair is under the clock floor.`);
            if (cmp.lo === 'n4') slopeResolved.set(cmp.arm, false);
            continue;
        }
        const v = rungGap.get(key) as Gap;
        const extraWrites = PORTS * (WRITES_PER_PORT[cmp.hi] - WRITES_PER_PORT[cmp.lo]);
        const perWrite = nsInstance(v.intrinsic) / extraWrites;
        const judgeRung = coarser(cmp.hi, cmp.lo);
        const res = Math.max(resOf(cmp.arm, cmp.hi), resOf(cmp.arm, cmp.lo));
        const g = grainsAt(v.intrinsic, judgeRung);
        const ok = Math.abs(v.intrinsic) > res && g >= 4;
        if (cmp.lo === 'n4') {
            slope.set(cmp.arm, perWrite);
            slopeResolved.set(cmp.arm, ok && v.intrinsic > 0);
        }
        line(
            `  ${key.padEnd(22)}${sign(nsInstance(v.intrinsic)).padStart(9)} ns/inst over ` +
                `${String(extraWrites).padStart(3)} more writes = ${sign(perWrite).padStart(8)} ` +
                `ns PER EXTRA WRITE  ${String(g).padStart(5)} grains of ${judgeRung} (own ` +
                `resolution ${f6(res)})  ${
                    ok ? 'RESOLVED' : 'NOT RESOLVED — no slope may be read off this pair'
                }`
        );
        line(`  ${''.padEnd(22)}${cmp.note}`);
    }

    line('');
    line(
        'SLOPE AND INTERCEPT — the slope is the n4→n16 increment per write; the intercept is the ' +
            'n16 median minus that slope times its 64 writes, so it is DERIVED FROM MEDIANS and ' +
            'is not an order-balanced figure. It is printed because an intercept is what a ' +
            'per-instance construction IS, and it is refused as a size wherever its slope did ' +
            'not resolve.'
    );
    const intercept = new Map<Arm, number>();
    for (const arm of ARMS) {
        const s = slope.get(arm);
        if (s === undefined) {
            line(`  ${arm.padEnd(9)}NO SLOPE — its n4↔n16 pair was excluded by the clock check`);
            continue;
        }
        const at16 = nsInstance(median(rowName(arm, 'n16', false)));
        const at1 = nsInstance(median(rowName(arm, 'n1', false)));
        const b = at16 - s * PORTS * WRITES_PER_PORT.n16;
        intercept.set(arm, b);
        line(
            `  ${arm.padEnd(9)}slope ${s.toFixed(4)} ns per write ${
                slopeResolved.get(arm) === true ? '(RESOLVED)' : '(NOT RESOLVED)'
            } · intercept ${b.toFixed(2)} ns per instance · that is ` +
                `${((100 * b) / Math.max(at1, 1e-9)).toFixed(1)}% of an instance at n1 and ` +
                `${((100 * b) / Math.max(at16, 1e-9)).toFixed(1)}% at n16`
        );
    }

    line('');
    line(
        'THE CROSSING POINT — where two arms cost the same, in WRITES PER INSTANCE. It exists ' +
            'only where the two slopes separate; where they do not, the honest statement is ' +
            'printed instead of a number.'
    );
    for (const cmp of ARM_PAIRS) {
        if (cmp.rung !== 'n16') continue;
        const a = cmp.a;
        const b = cmp.b;
        const sa = slope.get(a);
        const sb = slope.get(b);
        const ba = intercept.get(a);
        const bb = intercept.get(b);
        const key = `${a} ↔ ${b}`;
        if (sa === undefined || sb === undefined || ba === undefined || bb === undefined) {
            line(`  ${key.padEnd(22)}NOT COMPUTED — a rung of one of these arms was excluded`);
            continue;
        }
        const interval = PORTS * (WRITES_PER_PORT.n16 - WRITES_PER_PORT.n4);
        const slopeGapNs = Math.abs(sa - sb) * interval;
        const res = Math.max(
            nsInstance(resOf(a, 'n16')),
            nsInstance(resOf(a, 'n4')),
            nsInstance(resOf(b, 'n16')),
            nsInstance(resOf(b, 'n4'))
        );
        const bar = 4 * nsInstance(grainOf('n16'));
        const separate =
            slopeResolved.get(a) === true &&
            slopeResolved.get(b) === true &&
            slopeGapNs > res &&
            slopeGapNs > bar;
        if (!separate) {
            line(
                `  ${key.padEnd(
                    22
                )}SAME SLOPE, DIFFERENT INTERCEPT, NO CROSSING — the two slopes ` +
                    `differ by ${slopeGapNs.toFixed(
                        3
                    )} ns per instance over the ${interval}-write ` +
                    `interval, against these four rows' resolution of ${res.toFixed(3)} ns and a ` +
                    `four-grain bar of ${bar.toFixed(3)} ns. The intercepts differ by ` +
                    `${Math.abs(ba - bb).toFixed(2)} ns per instance, so on this ladder the ` +
                    'ranking is set at construction and does not turn over inside it. NO ' +
                    'CROSSING POINT IS COMPUTED.'
            );
            continue;
        }
        const x = (bb - ba) / (sa - sb);
        const inRange = x >= PORTS * WRITES_PER_PORT.n1 && x <= PORTS * WRITES_PER_PORT.n16;
        line(
            `  ${key.padEnd(22)}CROSSES AT ${x.toFixed(1)} WRITES PER INSTANCE (` +
                `${(x / PORTS).toFixed(2)} writes per port) — slopes ${sa.toFixed(4)} and ` +
                `${sb.toFixed(4)} ns per write, intercepts ${ba.toFixed(2)} and ${bb.toFixed(2)} ` +
                `ns per instance. ${
                    inRange
                        ? `INSIDE the measured range ${PORTS}..${PORTS * 16} writes per instance.`
                        : `OUTSIDE the measured range ${PORTS}..${PORTS * 16} writes per ` +
                          'instance — it is an EXTRAPOLATION off two rungs and this axis ' +
                          'measured nothing there.'
                }`
        );
    }

    for (const key of unresolvedPairs) {
        const cmp = ARM_PAIRS.find((c) => `${c.a}↔${c.b}@${c.rung}` === key) as ArmPair;
        const v = armGap.get(key) as Gap;
        const res = Math.max(resOf(cmp.a, cmp.rung), resOf(cmp.b, cmp.rung));
        refuse(
            `write-ladder: "${key}" did not separate — the order-balanced difference is ` +
                `${f6(v.intrinsic)} ms per pass (${nsInstance(v.intrinsic).toFixed(3)} ns per ` +
                `instance, ${grainsAt(
                    v.intrinsic,
                    cmp.rung
                )} grains) against a four-grain bar of ` +
                `${(4 * nsInstance(grainOf(cmp.rung))).toFixed(3)} ns per instance and its own ` +
                `rows' resolution of ${f6(res)} ms. It may NOT be quoted as a size, in either ` +
                'direction. To resolve it, halve the grain: `npm run axis ' +
                `--workspace=@exodra/benchmarks -- write-ladder ${rounds} ${batch * 2}\`. More ` +
                'ROUNDS will not help — a quantised median moves in grains, and the batch is what ' +
                'moves the grain.'
        );
    }

    line('');
    line(
        'THE PREDICTIONS, JUDGED BY THE RUN — committed in the header before the programs existed'
    );
    const verdict = (id: string, ok: boolean, said: string, got: string): void =>
        line(`  ${ok ? '✔' : '✘'} ${id} ${ok ? 'HELD' : 'FAILED'} — said ${said}; got ${got}`);
    const skipped = (id: string, why: string): void => line(`  ⊘ ${id} NOT JUDGED — ${why}`);

    let instrumentOk = false;
    {
        const parts: string[] = [];
        let rising = true;
        for (const cmp of RUNG_PAIRS) {
            const key = `${cmp.arm}:${cmp.hi}↔${cmp.lo}`;
            if (!usable(`${cmp.arm}·${cmp.hi}`, `${cmp.arm}·${cmp.lo}`)) {
                rising = false;
                parts.push(`${key} EXCLUDED`);
                continue;
            }
            const v = rungGap.get(key) as Gap;
            const res = Math.max(resOf(cmp.arm, cmp.hi), resOf(cmp.arm, cmp.lo));
            const g = grainsAt(v.intrinsic, coarser(cmp.hi, cmp.lo));
            const ok = v.intrinsic > 0 && Math.abs(v.intrinsic) > res && g >= 4;
            if (!ok) rising = false;
            parts.push(`${key} ${ok ? 'rises' : 'DOES NOT RISE'} (${g} grains)`);
        }
        const floorCheap = RUNGS.every((rung) => {
            if (!usable(`floor·${rung}`)) return false;
            const fm = median(rowName('floor', rung, false));
            return ARMS.every((arm) => arm === 'floor' || median(rowName(arm, rung, false)) >= fm);
        });
        instrumentOk = rising && floorCheap;
        verdict(
            '(P3)',
            instrumentOk,
            'THE KILLER — every arm rises resolvably from n1 to n4 and from n4 to n16, AND ' +
                '`floor` is the cheapest arm at every rung',
            `${parts.join('; ')}; floor ${floorCheap ? 'is' : 'is NOT'} cheapest at all ` +
                `${RUNGS.length} rungs`
        );
        if (!instrumentOk) {
            refuse(
                'write-ladder: THE INSTRUMENT FAILED ITS OWN KILLER. Either adding writes to an ' +
                    'instance did not cost anything this clock can see, or a dispatching arm ' +
                    'came in at or below the arm that dispatches nothing. Both mean the same ' +
                    'thing: NO SLOPE, NO INTERCEPT AND NO CROSSING POINT IN THIS RUN MAY BE ' +
                    'QUOTED, and (P1), (P2) and (P6) are not judged. The first suspects, in ' +
                    'order: the accumulator chain dominates every write and hides the dispatch ' +
                    'behind it; the batch is too small for the grain (halve it with batch ' +
                    `${batch * 2}); the region is dominated by the pool row read and the two ` +
                    'sink stores rather than by the writes.'
            );
        }
    }

    if (!usable('indexed·n16', 'direct·n16')) {
        skipped('(P1)', 'indexed·n16 or direct·n16 is under the clock floor');
    } else if (!instrumentOk) {
        skipped(
            '(P1)',
            '(P3) FAILED — this instrument did not demonstrate that it can see the writes it is ' +
                'laddering, so a figure it prints for this pair is not evidence about a port ' +
                'shape. The number is in THE COMPARISONS above and is not a verdict'
        );
    } else {
        const v = armGap.get('indexed↔direct@n16') as Gap;
        const res = Math.max(resOf('indexed', 'n16'), resOf('direct', 'n16'));
        const g = grainsAt(v.intrinsic, 'n16');
        const resolved = Math.abs(v.intrinsic) > res && g >= 4;
        const ns = -nsInstance(v.intrinsic);
        verdict(
            '(P1)',
            resolved && ns >= 10 && ns <= 60,
            'at n16 `direct` is DEARER than `indexed` by +10 to +60 ns per instance — the ' +
                "design's expectation does NOT arrive by sixteen writes per port",
            `${ns.toFixed(3)} ns per instance (${(ns / (PORTS * 16)).toFixed(4)} ns per write) ` +
                `over ${g} grains against its own two rows' resolution of ${f6(res)} ms — ${
                    !resolved
                        ? 'THE PAIR DID NOT SEPARATE: at sixteen writes per port the two shapes ' +
                          'sit on each other inside their own resolution, so resolving once per ' +
                          'instance neither pays for itself nor costs anything the clock can see'
                        : ns < 0
                        ? 'THE SIGN IS WRONG — `direct` came in CHEAPER, which is the ' +
                          "design's expectation arriving inside this ladder, and this " +
                          'prediction is dead'
                        : ns < 10
                        ? 'DEARER BUT UNDER THE BAND — the direction held and the size did ' + 'not'
                        : ns > 60
                        ? 'DEARER THAN THE BAND — the per-instance construction costs more ' +
                          'than six allocations should, and the intercept line above is ' +
                          'the figure to re-read next'
                        : 'inside the band'
                }`
        );
    }

    if (!usable('indexed·n1', 'direct·n1', 'indexed·n16', 'direct·n16')) {
        skipped('(P2)', 'a rung of indexed or direct is under the clock floor');
    } else if (!instrumentOk) {
        skipped('(P2)', '(P3) FAILED — see above');
    } else {
        const lo = armGap.get('indexed↔direct@n1') as Gap;
        const hi = armGap.get('indexed↔direct@n16') as Gap;
        const loRes = Math.max(resOf('indexed', 'n1'), resOf('direct', 'n1'));
        const hiRes = Math.max(resOf('indexed', 'n16'), resOf('direct', 'n16'));
        const loOk = Math.abs(lo.intrinsic) > loRes && grainsAt(lo.intrinsic, 'n1') >= 4;
        const hiOk = Math.abs(hi.intrinsic) > hiRes && grainsAt(hi.intrinsic, 'n16') >= 4;
        const sameSign = lo.intrinsic < 0 === hi.intrinsic < 0;
        verdict(
            '(P2)',
            loOk && hiOk && sameSign && lo.intrinsic < 0,
            `NO CROSSING inside ${PORTS}..${PORTS * 16} writes per instance — \`indexed\` is ` +
                'cheaper at both ends',
            `n1 ${sign(nsInstance(lo.intrinsic))} ns/inst (${loOk ? 'resolved' : 'NOT RESOLVED'}` +
                `), n16 ${sign(nsInstance(hi.intrinsic))} ns/inst (${
                    hiOk ? 'resolved' : 'NOT RESOLVED'
                }) — ${
                    !loOk || !hiOk
                        ? 'one end did not separate, so no statement about a crossing is made'
                        : sameSign
                        ? `the sign is the same at both ends and ${
                              lo.intrinsic < 0 ? '`indexed`' : '`direct`'
                          } is cheaper at both`
                        : 'THE SIGN CHANGES ACROSS THE LADDER — the ranking turns over and the ' +
                          'crossing point above is the number the design asked for'
                }`
        );
    }

    if (!usable('indexed·n16', 'indexed·n4', 'floor·n16', 'floor·n4')) {
        skipped('(P6)', 'a rung of indexed or floor is under the clock floor');
    } else if (!instrumentOk) {
        skipped('(P6)', '(P3) FAILED — see above');
    } else {
        const si = slope.get('indexed') as number;
        const sf = slope.get('floor') as number;
        const interval = PORTS * (WRITES_PER_PORT.n16 - WRITES_PER_PORT.n4);
        const gapNs = (si - sf) * interval;
        const res = Math.max(
            nsInstance(resOf('indexed', 'n16')),
            nsInstance(resOf('indexed', 'n4')),
            nsInstance(resOf('floor', 'n16')),
            nsInstance(resOf('floor', 'n4'))
        );
        const bar = 4 * nsInstance(grainOf('n16'));
        const ok = gapNs > res && gapNs > bar;
        verdict(
            '(P6)',
            ok,
            "the shipped shape's MARGINAL write is dearer than the floor's marginal write — the " +
                'two table reads are actually executed per write on a straight-line body',
            `indexed ${si.toFixed(4)} against floor ${sf.toFixed(4)} ns per write, a difference ` +
                `of ${gapNs.toFixed(3)} ns per instance over ${interval} writes against a ` +
                `resolution of ${res.toFixed(3)} ns and a four-grain bar of ${bar.toFixed(3)} ns ` +
                `— ${
                    ok
                        ? 'the loads are being paid per write'
                        : 'THE TWO MARGINAL WRITES ARE THE SAME. On a straight-line body the ' +
                          'engine is free to read each table once and keep it, and this run ' +
                          'cannot tell that apart from "the loads are free". EVERY SLOPE ON ' +
                          'THIS AXIS IS THEN THE SLOPE OF A BODY THE ENGINE REWROTE, and the ' +
                          'crossing point is not quotable'
                }`
        );
    }

    verdict(
        '(P4)',
        notNull.length === 0,
        `all ${ARMS.length * RUNGS.length} null pairs are ordering or nothing`,
        notNull.length === 0
            ? `${ARMS.length * RUNGS.length} of ${ARMS.length * RUNGS.length} inside their own ` +
                  'noise'
            : `${notNull.length} INTRINSIC — ${notNull.join(', ')}`
    );

    verdict(
        '(P5)',
        Math.min(...allTicks) >= 30,
        `every one of the ${PROGRAMS.length} timed regions clears thirty ticks of the observed ` +
            'clock',
        `the smallest region is ${Math.min(...allTicks).toFixed(1)} ticks (${
            PROGRAMS[allTicks.indexOf(Math.min(...allTicks))].name
        }); the largest ${Math.max(...allTicks).toFixed(1)}`
    );

    line('');
    line(
        `SUMMARY — ${resolvedPairs.length} of ${ARM_PAIRS.length} arm-to-arm pairs resolved: ` +
            `${resolvedPairs.join(', ') || 'none'}. Unresolved: ` +
            `${unresolvedPairs.join(', ') || 'none'}. Every resolved figure is quoted with its ` +
            'own two rows’ resolution and its grain count on the line it appears on, and no ' +
            'figure from this axis is a figure about any package in this repository.'
    );
}
