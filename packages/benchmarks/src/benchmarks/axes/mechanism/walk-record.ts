// WHAT IS THE CHEAPEST WAY TO WALK A FRESHLY CLONED DOM SUBTREE AND RECORD ITS NODES?
//
// FOUR ARMS, ONE SUBTREE SHAPE, ONE NODE SET. It imports nothing from `@exodra/*` — not a dist,
// not a source file — and the two packages it names below are named as the SOURCE OF A
// TRANSCRIPTION, read once and copied, never linked.
//
//   tape       THE SHIPPED SHAPE, transcribed from `packages/dom/src/dom/factories/createExoMachineNode.ts:88-98`
//              (`schema.walk` is `readonly walk: Int32Array` at
//              `packages/dom/src/dom/types/TExoDomSchema.ts:131`):
//                  const nodes = [root];
//                  for (let i = 0; i < walk.length; i += 3) {
//                      const from = nodes[walk[i + 1]];
//                      nodes[walk[i]] = walk[i + 2] === FIRST_CHILD
//                          ? from.firstChild : from.nextSibling;
//                  }
//              Three integers per step out of a flat `Int32Array`, one indexed load, one indexed
//              store, into an array allocated PER INSTANCE and appended to in walk order.
//
//   prefill    THE SAME TAPE OFF A TABLE FILLED FIRST — what the hydrating path did before this
//              axis priced it: `nodes = []` then one `push(root)` per slot, and only then the
//              walk, which overwrites every slot but the root. One line differs from `tape`, so
//              what separates them is the allocation and the nine pushes.
//
//   closures   A TABLE OF EIGHT SMALL CLOSURES BUILT ONCE PER SHAPE, each with the field name
//              written as a literal, storing into a named field of the instance:
//                  FILL = [ (self) => { self.n1 = self.root.firstChild; },
//                           (self) => { self.n2 = self.n1.firstChild; }, … ];
//                  for (let i = 0; i < FILL.length; i++) FILL[i](self);
//              Nothing is read from a schema. There is no `nodes` array.
//
//   inline     THE CEILING — the same eight stores written out straight-line for this one shape:
//              no tape, no table, no loop, no call. IT IS THE CLOSURE BODIES INLINED BY HAND and
//              not a hand-optimised walk: it stores into the same fields in the same order, so
//              what separates it from the other two is dispatch machinery and nothing else. IT IS
//              NEVER USED AS ANOTHER ARM'S CONTROL; it is here to say how much of any gap is loop
//              and call.
//
// ═══ WHAT IS PRE-REGISTERED, BEFORE THE ARMS WERE WRITTEN ════════════════════════════════════
//
// This is my model. It is judgement plus code I read; I measured none of it. Every falsifier is
// printed mechanically at the end, so nobody — including me — picks them afterwards.
//
//   (P0) DIRECTION AND SIZE FOR `tape ↔ prefill`: PREFILL IS DEARER, BY 5 TO 25 ns PER INSTANCE.
//        Written down before the arm was run, and it is the pair the hydrating path was changed
//        on, so the number judges that change rather than decorating it.
//        MECHANISM: nine `push` calls that each bounds-check, store and bump a length, against one
//        array literal of one element; the grown array also reallocates its backing store two or
//        three times on the way to nine, where the literal-plus-appends grows the same way but
//        writes each slot ONCE instead of twice. The walk, the loads and the stores after that
//        line are identical in both arms.
//        KILLER OF THE HYPOTHESIS: prefill at or under tape, or dearer by more than 25 ns per
//        instance — the first says the pre-fill was free and the change bought nothing, the second
//        says this axis is measuring something besides the allocation.
//
//   (P1) DIRECTION AND SIZE FOR `tape ↔ closures`: CLOSURES IS DEARER, BY 1 TO 5 ns PER STEP
//        (8 to 40 ns per instance over eight steps). This is the prediction the axis exists to
//        judge, and it says the claim under test — "a call per step is a wash or better against a
//        loop iteration plus three tape reads" — is FALSE.
//        MECHANISM: the closures arm trades three `Int32Array` loads (L1, fractions of a
//        nanosecond), one perfectly-predicted compare and one element store-with-bounds-check for
//        ONE CALL through `FILL[i]`, and that call site sees EIGHT DISTINCT FUNCTION OBJECTS. Past
//        V8's four-entry polymorphic limit a call site is megamorphic: no inlining, a full call
//        sequence per step. Against that the closures arm splits the tape's TWO property-access
//        sites into EIGHT MONOMORPHIC ONES (see the IC census below), which is worth a map check or
//        two per step and does not cover a call.
//        KILLER OF THE HYPOTHESIS: closures cheaper than tape at all, or dearer by more than
//        5 ns/step. Either way the tape and its array stay or go on the number, not on this note.
//
//   (P2) THE KILLER THAT CONDEMNS THE INSTRUMENT RATHER THAN THE HYPOTHESIS: `inline` MUST BE THE
//        CHEAPEST OF THE THREE, clear of its own resolution and of four grains against BOTH others.
//        `inline` does strictly less work than either loop arm — identical allocations, identical
//        stores, identical DOM accessors, identical escape, minus the loop and minus the dispatch.
//        If it is not cheapest, this run is not measuring the walk: the likely causes, in the order
//        I would open them, are that the recorded stores were removed despite the sink, that the
//        region is dominated by the container allocation or the sink store rather than by the eight
//        steps, and that the clock cannot express the quantity. IF (P2) FAILS, NO PAIR ON THIS AXIS
//        MAY BE QUOTED, (P1) INCLUDED, and the run says so in those words.
//
//   (P3) ALL SEVEN NULL PAIRS ARE ORDERING OR NOTHING — three on Table 1, four on Table 2 —
//        `|intrinsic| ≤ noise` for every arm's twin.
//        MECHANISM: each twin is a separately declared transcription of its own arm.
//        KILLER: any pair whose intrinsic stands out of its own noise. That ARM is unquotable, not
//        merely its null: two declarations of one program that differ in a way which does not flip
//        with the running order are two different programs.
//
//   (P4) THE CLONE IS 60-90% OF `clone+tape` ON TABLE 2. MECHANISM: a nine-node subtree clone is
//        several hundred nanoseconds on this suite's node-bank figures (531.2 ns for a pop and a
//        reset against 656.3 ns for a clone, per card) — QUOTED SECOND-HAND from this repository's
//        own notes and NOT opened in the turn that wrote this file, which makes it the softest
//        input to any prediction here — and eight `firstChild`/`nextSibling` hops are tens.
//        KILLER: under 50% — this file's model of a clone is wrong and Table 2's background is
//        smaller than it says. Over 95% — Table 2 cannot rank anything and prints that instead of a
//        ranking.
//
//   (P5) EVERY TIMED REGION CLEARS THIRTY TICKS of the observed clock at batch 1.
//        KILLER: any region under the three-tick floor, in which case that ARM — the row AND its
//        twin, hence its resolution — is struck out of every null, gap and prediction BEFORE they
//        are computed, not footnoted after them.
//
//   (P6) THE TWO TABLES DO NOT DISAGREE IN SIGN on `tape ↔ closures`. Either Table 2's pair fails to
//        resolve (the expected outcome — see THE CLONE PROBLEM) or it resolves with Table 1's sign.
//        KILLER: both resolve with OPPOSITE signs. Then walking a pooled subtree and walking a
//        freshly cloned one are different jobs, and NEITHER TABLE MAY BE QUOTED ALONE.
//
// ═══ THE CLONE PROBLEM, WHICH IS THE MOST LIKELY WAY THIS AXIS BECOMES MEANINGLESS ════════════
//
// `cloneNode(true)` is expensive enough to swamp everything the three arms differ in. So the axis
// runs TWO TABLES and neither is asked to do the other's job:
//
//   TABLE 1 — WALK — HAS NO CLONE IN THE TIMED REGION AT ALL. A pool of freshly cloned rows is
//   built UNTIMED at module load, and the region walks them. This is the clone-free measurement and
//   it carries the answer. WHAT IT COSTS: the pool is walked many times per region, so its nodes
//   are far warmer than a clone that was made one instruction ago. That inflates the machinery's
//   share of a step relative to the accessor's, in every arm alike.
//
//   TABLE 2 — CLONE+WALK — CLONES INSIDE THE REGION, one fresh subtree per instance, and carries a
//   `clone` arm that clones and records nothing. `clone ↔ clone+tape` is the whole walk, and
//   `clone ÷ clone+tape` is THE CLONE'S SHARE, printed as a percentage on its own line. Every gap
//   on that table is read against that background and the run prints how large it is rather than
//   leaving it to a reader.
//
// (P6) is what stops the two tables from being quoted as one.
//
// ═══ THE ONE BIAS I COULD NOT REMOVE, STATED SO A TAPE WIN IS READ WITH IT ════════════════════
//
// In the shipped renderer the array hangs off an instance record that exists anyway
// (`holder.nodes = nodes`, `wire-exo-instance.ts:91`), so the real tape is RECORD PLUS ARRAY — two
// allocations — where the closures strategy is the RECORD ALONE. THIS AXIS GIVES EVERY ARM EXACTLY
// ONE CONTAINER, which forgives the tape one allocation and forgives the closures none. THE BIAS
// RUNS TOWARD THE TAPE. A tape that wins here wins with an allocation forgiven; a closures arm that
// wins here wins against a tape that was handed the better of the two spellings. The arm that would
// settle it allocates the record in both and puts the array inside it, and it is not built.
//
// ═══ THE SCENE, AND WHY IT IS A FUNCTION OF BOTH NUMBERS ══════════════════════════════════════
//
// ONE LIST ROW, EIGHT SLOTS, EIGHT STEPS — and the answer is a function of both, so both are in the
// census and in every printed unit:
//
//   <li class="row" data-id="7"><a class="t" href="/i/7">Task 7</a><span class="by">Ada</span>
//   <span class="n">1007</span><span class="s" title="n7">ok 7</span></li>
//
//   slot 1  <a>          firstChild of the root      slot 5  <span class="n">   nextSibling
//   slot 2  its Text     firstChild                  slot 6  its Text           firstChild
//   slot 3  <span "by">  nextSibling                 slot 7  <span class="s">   nextSibling
//   slot 4  its Text     firstChild                  slot 8  its Text           firstChild
//
// FIVE `firstChild` STEPS AND THREE `nextSibling` STEPS. The root is slot 0 and is not walked to.
// The two attributes on the root and the two on the children are markup a real row carries and are
// never written here — THIS AXIS MEASURES THE WALK AND NOT THE WIRE.
//
// ═══ THE ARMS DO DIFFERENT WORK, AND HERE IS THE COLUMN RATHER THAN THE PARAGRAPH ═════════════
//
//   per instance          alloc  init stores  sink stores
//   tape                  2      1            1     `[root]` (capacity 1) plus ONE backing-store
//                                                   growth when slot 1 is appended
//   closures              1      9            1     one nine-field literal, built whole
//   inline                1      9            1     the identical literal at its own site
//
//   per step              tape                      closures                inline
//   tape loads            3 (Int32Array)            0                       0
//   indexed loads         1 (nodes[from])           1 (FILL[i])             0
//   in-object loads       0                         1 (self.nK)             1, store-forwarded
//   stores                1 (element, bounds check) 1 (in-object)           1 (in-object)
//   DOM accessor          1                         1                       1
//   CALL FRAMES           0                         1                       0
//   loop bookkeeping      i += 3, compare           i++, compare            none
//
// THE INLINE ARM'S IN-OBJECT LOAD IS FORWARDED from the store one instruction earlier, and no loop
// arm can be given that: the store happens in another function body for `closures` and behind a
// dynamic index for `tape`. That forwarding is part of what a ceiling IS and it is why the ceiling
// is not a control.
//
// ═══ THE INLINE CACHES, WHICH ARE THE TERM (P1) FUSES AND CANNOT SUBTRACT ═════════════════════
//
//   tape       TWO property-access sites in the process, one per branch of the ternary. The
//              `firstChild` site sees LI, A and SPAN receivers; the `nextSibling` site sees A and
//              SPAN. POLYMORPHIC, two and three maps, under V8's four-entry limit.
//   closures   EIGHT sites, one per closure body, each seeing ONE receiver map. MONOMORPHIC.
//   inline     EIGHT sites, likewise MONOMORPHIC.
//
//   tape       ONE call site for the accessor and NO call site for a step.
//   closures   ONE call site, `FILL[i](self)`, seeing EIGHT distinct function objects. MEGAMORPHIC.
//
// So `tape ↔ closures` FUSES (three tape reads and a loop iteration against a megamorphic call)
// WITH (two polymorphic accessor sites against eight monomorphic ones). This axis cannot separate
// them, and (P1)'s mechanism names both. The arm that would separate them is a tape arm whose two
// accessor sites are split per step by hand; it is not built.
//
// ═══ HOW THE RECORDED NODES ESCAPE, AND HOW THAT IS CHECKED AFTER THE FACT ════════════════════
//
// Every arm stores its container into a module-level sink array BEFORE it fills it — which is the
// shipped order (`holder.nodes = nodes` precedes the loop) and which makes the container escape at
// a point no arm's stores can be removed past. THE SINK IS THE SAME SHAPE AND THE SAME LENGTH FOR
// EVERY ARM, one element store with one write barrier each, and it is overwritten every pass so the
// live set is bounded at one pass rather than growing with the region.
//
// AND IT IS CHECKED, UNTIMED, AFTER EVERY SAMPLE: one rotating instance per arm per sample has all
// eight of its recorded slots compared — by IDENTITY against the pool's independently-read
// addresses on Table 1, and structurally (node name, text, parentage) on Table 2, where the clone
// is fresh and there is no address to compare with. The tally is printed at the end, and any fault
// refuses the whole run by name.
//
// ═══ WHAT THIS AXIS CANNOT SAY. Read this before quoting anything from it. ════════════════════
//
//  * NOTHING ABOUT A HAND-OPTIMISED WALK. `inline` mirrors the closure bodies store for store. A
//    straight-line program that kept the eight nodes in LOCALS and stored them once at the end is a
//    lower ceiling than this one, and it is not measured.
//  * NOTHING ABOUT THE ALLOCATION SEPARATELY FROM THE STRATEGY. See THE ONE BIAS.
//  * NOTHING ABOUT THE TAPE READS SEPARATELY FROM THE INLINE CACHES. See THE INLINE CACHES.
//  * NOTHING ABOUT A DEEPER OR SHALLOWER SUBTREE. Eight slots and eight steps; a shape with two
//    slots amortises a table lookup differently and a shape with forty amortises it again.
//  * NOTHING ABOUT A WALK THAT VISITS NODES IT DOES NOT RECORD. Every step here records, so the
//    tape's third integer is never spent on a hop that stores nothing.
//  * NOTHING ABOUT THE WIRE. No attribute is written, no text is set, no listener is installed and
//    nothing is inserted into a document. The subtrees are walked DETACHED, which is where the
//    shipped walk runs, and no layout is ever forced.
//  * NOTHING ABOUT A COLD CLONE ON TABLE 1. The pool is warm by construction; Table 2 is the table
//    where the clone is one instruction old, and (P6) is what checks the two against each other.
//  * NOTHING ABOUT MEMORY. No heap column is printed; the sinks bound the live set and that is all
//    they are for.
//
// ═══ HOW TO RUN IT ═══════════════════════════════════════════════════════════════════════════
//
//     npm run axis --workspace=@exodra/benchmarks -- walk-record 100 1 --record=first
//
// THE THIRD POSITIONAL IS THE BATCH and it multiplies the passes per timed region, which is the
// only lever that moves the grain: a quantised median moves in grains and more ROUNDS never shrink
// one. At batch 1 Table 1's region is 65 536 walks, so one grain is the observed quantum over that
// — a fraction of a nanosecond per step — and four grains is under (P1)'s predicted band. Every
// pair under four grains is REFUSED BY NAME and told the batch that would clear it.
import { emitRecordedRows, type Scenario, type Stat } from '../../../harness';

// eslint-disable-next-line no-console
const line = (s: string): void => console.log(`✅ ${s}`);
// eslint-disable-next-line no-console
const refuse = (s: string): void => console.log(`❌ ${s}`);

const SLOTS = 8;
const STEPS = 8;
const POOL = 2048;
const PASSES = 32;
const FRESH = 512;
const CLONE_PASSES = 64;
const MIN_TICKS = 3;

const MARKUP_A =
    '<li class="row" data-id="7">' +
    '<a class="t" href="/i/7">Task 7</a>' +
    '<span class="by">Ada</span>' +
    '<span class="n">1007</span>' +
    '<span class="s" title="n7">ok 7</span>' +
    '</li>';

const MARKUP_B =
    '<li class="row" data-id="7">' +
    '<a class="t" href="/i/7">Task 7</a>' +
    '<span class="by">Ada</span>' +
    '<span class="n">1007</span>' +
    '<span class="s" title="n7">ok 7</span>' +
    '</li>';

const SLOT_NAMES: readonly string[] = [
    'A',
    '#text',
    'SPAN',
    '#text',
    'SPAN',
    '#text',
    'SPAN',
    '#text',
];
const SLOT_TEXTS: readonly string[] = ['Task 7', 'Ada', '1007', 'ok 7'];

function protoFrom(markup: string): Node {
    const template = document.createElement('template');
    template.innerHTML = markup;
    return template.content.firstChild as Node;
}

const PROTO_A = protoFrom(MARKUP_A);
const PROTO_B = protoFrom(MARKUP_B);

function readSlotsA(root: Node): Node[] {
    const anchor = root.firstChild as Node;
    const by = anchor.nextSibling as Node;
    const count = by.nextSibling as Node;
    const state = count.nextSibling as Node;
    return [
        anchor,
        anchor.firstChild as Node,
        by,
        by.firstChild as Node,
        count,
        count.firstChild as Node,
        state,
        state.firstChild as Node,
    ];
}

function readSlotsB(root: Node): Node[] {
    const anchor = root.firstChild as Node;
    const by = anchor.nextSibling as Node;
    const count = by.nextSibling as Node;
    const state = count.nextSibling as Node;
    return [
        anchor,
        anchor.firstChild as Node,
        by,
        by.firstChild as Node,
        count,
        count.firstChild as Node,
        state,
        state.firstChild as Node,
    ];
}

const POOL_A: readonly Node[] = ((): readonly Node[] => {
    const rows: Node[] = new Array<Node>(POOL);
    for (let k = 0; k < POOL; k++) rows[k] = PROTO_A.cloneNode(true) as Node;
    return rows;
})();

const POOL_B: readonly Node[] = ((): readonly Node[] => {
    const rows: Node[] = new Array<Node>(POOL);
    for (let k = 0; k < POOL; k++) rows[k] = PROTO_B.cloneNode(true) as Node;
    return rows;
})();

const EXPECT_A: readonly (readonly Node[])[] = POOL_A.map(readSlotsA);
const EXPECT_B: readonly (readonly Node[])[] = POOL_B.map(readSlotsB);

const WALK_FIRST_CHILD = 0;
const WALK_NEXT_SIBLING = 1;

const TAPE_A = new Int32Array([
    1,
    0,
    WALK_FIRST_CHILD,
    2,
    1,
    WALK_FIRST_CHILD,
    3,
    1,
    WALK_NEXT_SIBLING,
    4,
    3,
    WALK_FIRST_CHILD,
    5,
    3,
    WALK_NEXT_SIBLING,
    6,
    5,
    WALK_FIRST_CHILD,
    7,
    5,
    WALK_NEXT_SIBLING,
    8,
    7,
    WALK_FIRST_CHILD,
]);

const TAPE_B = new Int32Array([
    1,
    0,
    WALK_FIRST_CHILD,
    2,
    1,
    WALK_FIRST_CHILD,
    3,
    1,
    WALK_NEXT_SIBLING,
    4,
    3,
    WALK_FIRST_CHILD,
    5,
    3,
    WALK_NEXT_SIBLING,
    6,
    5,
    WALK_FIRST_CHILD,
    7,
    5,
    WALK_NEXT_SIBLING,
    8,
    7,
    WALK_FIRST_CHILD,
]);

interface TWalkRowA {
    root: Node;
    n1: Node;
    n2: Node;
    n3: Node;
    n4: Node;
    n5: Node;
    n6: Node;
    n7: Node;
    n8: Node;
}

interface TWalkRowB {
    root: Node;
    n1: Node;
    n2: Node;
    n3: Node;
    n4: Node;
    n5: Node;
    n6: Node;
    n7: Node;
    n8: Node;
}

type TFillStepA = (self: TWalkRowA) => void;
type TFillStepB = (self: TWalkRowB) => void;

const FILL_A: readonly TFillStepA[] = [
    (self: TWalkRowA): void => {
        self.n1 = self.root.firstChild as Node;
    },
    (self: TWalkRowA): void => {
        self.n2 = self.n1.firstChild as Node;
    },
    (self: TWalkRowA): void => {
        self.n3 = self.n1.nextSibling as Node;
    },
    (self: TWalkRowA): void => {
        self.n4 = self.n3.firstChild as Node;
    },
    (self: TWalkRowA): void => {
        self.n5 = self.n3.nextSibling as Node;
    },
    (self: TWalkRowA): void => {
        self.n6 = self.n5.firstChild as Node;
    },
    (self: TWalkRowA): void => {
        self.n7 = self.n5.nextSibling as Node;
    },
    (self: TWalkRowA): void => {
        self.n8 = self.n7.firstChild as Node;
    },
];

const FILL_B: readonly TFillStepB[] = [
    (self: TWalkRowB): void => {
        self.n1 = self.root.firstChild as Node;
    },
    (self: TWalkRowB): void => {
        self.n2 = self.n1.firstChild as Node;
    },
    (self: TWalkRowB): void => {
        self.n3 = self.n1.nextSibling as Node;
    },
    (self: TWalkRowB): void => {
        self.n4 = self.n3.firstChild as Node;
    },
    (self: TWalkRowB): void => {
        self.n5 = self.n3.nextSibling as Node;
    },
    (self: TWalkRowB): void => {
        self.n6 = self.n5.firstChild as Node;
    },
    (self: TWalkRowB): void => {
        self.n7 = self.n5.nextSibling as Node;
    },
    (self: TWalkRowB): void => {
        self.n8 = self.n7.firstChild as Node;
    },
];

function tapeA(root: Node, sink: Node[][], at: number): void {
    const nodes: Node[] = [root];
    sink[at] = nodes;
    const walk = TAPE_A;
    for (let i = 0; i < walk.length; i += 3) {
        const from = nodes[walk[i + 1]];
        nodes[walk[i]] =
            walk[i + 2] === WALK_FIRST_CHILD
                ? (from.firstChild as Node)
                : (from.nextSibling as Node);
    }
}

function tapeB(root: Node, sink: Node[][], at: number): void {
    const nodes: Node[] = [root];
    sink[at] = nodes;
    const walk = TAPE_B;
    for (let i = 0; i < walk.length; i += 3) {
        const from = nodes[walk[i + 1]];
        nodes[walk[i]] =
            walk[i + 2] === WALK_FIRST_CHILD
                ? (from.firstChild as Node)
                : (from.nextSibling as Node);
    }
}

// THE HYDRATING SHAPE, transcribed from `packages/dom/src/hydrate/hydrateExoInstance.ts` as it
// stood before the table start was changed: the table was filled with one `push` of the root per
// slot BEFORE the walk ran, and the walk then overwrote all but slot 0. The nine slots are this
// axis's own: eight walk steps plus the root. Everything after the first line is `tape`, so the
// pair isolates the allocation and nothing else.
const PREFILL_SLOTS = 9;

function prefillA(root: Node, sink: Node[][], at: number): void {
    const nodes: Node[] = [];
    for (let s = 0; s < PREFILL_SLOTS; s++) nodes.push(root);
    sink[at] = nodes;
    const walk = TAPE_A;
    for (let i = 0; i < walk.length; i += 3) {
        const from = nodes[walk[i + 1]];
        nodes[walk[i]] =
            walk[i + 2] === WALK_FIRST_CHILD
                ? (from.firstChild as Node)
                : (from.nextSibling as Node);
    }
}

function prefillB(root: Node, sink: Node[][], at: number): void {
    const nodes: Node[] = [];
    for (let s = 0; s < PREFILL_SLOTS; s++) nodes.push(root);
    sink[at] = nodes;
    const walk = TAPE_B;
    for (let i = 0; i < walk.length; i += 3) {
        const from = nodes[walk[i + 1]];
        nodes[walk[i]] =
            walk[i + 2] === WALK_FIRST_CHILD
                ? (from.firstChild as Node)
                : (from.nextSibling as Node);
    }
}

function closuresA(root: Node, sink: TWalkRowA[], at: number): void {
    const self: TWalkRowA = {
        root,
        n1: root,
        n2: root,
        n3: root,
        n4: root,
        n5: root,
        n6: root,
        n7: root,
        n8: root,
    };
    sink[at] = self;
    const fill = FILL_A;
    for (let i = 0; i < fill.length; i++) fill[i](self);
}

function closuresB(root: Node, sink: TWalkRowB[], at: number): void {
    const self: TWalkRowB = {
        root,
        n1: root,
        n2: root,
        n3: root,
        n4: root,
        n5: root,
        n6: root,
        n7: root,
        n8: root,
    };
    sink[at] = self;
    const fill = FILL_B;
    for (let i = 0; i < fill.length; i++) fill[i](self);
}

function inlineA(root: Node, sink: TWalkRowA[], at: number): void {
    const self: TWalkRowA = {
        root,
        n1: root,
        n2: root,
        n3: root,
        n4: root,
        n5: root,
        n6: root,
        n7: root,
        n8: root,
    };
    sink[at] = self;
    self.n1 = self.root.firstChild as Node;
    self.n2 = self.n1.firstChild as Node;
    self.n3 = self.n1.nextSibling as Node;
    self.n4 = self.n3.firstChild as Node;
    self.n5 = self.n3.nextSibling as Node;
    self.n6 = self.n5.firstChild as Node;
    self.n7 = self.n5.nextSibling as Node;
    self.n8 = self.n7.firstChild as Node;
}

function inlineB(root: Node, sink: TWalkRowB[], at: number): void {
    const self: TWalkRowB = {
        root,
        n1: root,
        n2: root,
        n3: root,
        n4: root,
        n5: root,
        n6: root,
        n7: root,
        n8: root,
    };
    sink[at] = self;
    self.n1 = self.root.firstChild as Node;
    self.n2 = self.n1.firstChild as Node;
    self.n3 = self.n1.nextSibling as Node;
    self.n4 = self.n3.firstChild as Node;
    self.n5 = self.n3.nextSibling as Node;
    self.n6 = self.n5.firstChild as Node;
    self.n7 = self.n5.nextSibling as Node;
    self.n8 = self.n7.firstChild as Node;
}

const SEED_ROW_A: TWalkRowA = {
    root: PROTO_A,
    n1: PROTO_A,
    n2: PROTO_A,
    n3: PROTO_A,
    n4: PROTO_A,
    n5: PROTO_A,
    n6: PROTO_A,
    n7: PROTO_A,
    n8: PROTO_A,
};
const SEED_ROW_B: TWalkRowB = {
    root: PROTO_B,
    n1: PROTO_B,
    n2: PROTO_B,
    n3: PROTO_B,
    n4: PROTO_B,
    n5: PROTO_B,
    n6: PROTO_B,
    n7: PROTO_B,
    n8: PROTO_B,
};

const nodeSink = (n: number): Node[][] => new Array<Node[]>(n).fill([PROTO_A]);
const rowSinkA = (n: number): TWalkRowA[] => new Array<TWalkRowA>(n).fill(SEED_ROW_A);
const rowSinkB = (n: number): TWalkRowB[] => new Array<TWalkRowB>(n).fill(SEED_ROW_B);

const SINK_TAPE_A = nodeSink(POOL);
const SINK_TAPE_B = nodeSink(POOL);
const SINK_PREFILL_A = nodeSink(POOL);
const SINK_PREFILL_B = nodeSink(POOL);
const SINK_CLOSURES_A = rowSinkA(POOL);
const SINK_CLOSURES_B = rowSinkB(POOL);
const SINK_INLINE_A = rowSinkA(POOL);
const SINK_INLINE_B = rowSinkB(POOL);

const SINK_CLONE_A: Node[] = new Array<Node>(FRESH).fill(PROTO_A);
const SINK_CLONE_B: Node[] = new Array<Node>(FRESH).fill(PROTO_B);
const SINK_FRESH_TAPE_A = nodeSink(FRESH);
const SINK_FRESH_TAPE_B = nodeSink(FRESH);
const SINK_FRESH_CLOSURES_A = rowSinkA(FRESH);
const SINK_FRESH_CLOSURES_B = rowSinkB(FRESH);
const SINK_FRESH_INLINE_A = rowSinkA(FRESH);
const SINK_FRESH_INLINE_B = rowSinkB(FRESH);

function passTapeA(): void {
    const pool = POOL_A;
    const sink = SINK_TAPE_A;
    for (let k = 0; k < pool.length; k++) tapeA(pool[k], sink, k);
}
function passTapeB(): void {
    const pool = POOL_B;
    const sink = SINK_TAPE_B;
    for (let k = 0; k < pool.length; k++) tapeB(pool[k], sink, k);
}
function passPrefillA(): void {
    const pool = POOL_A;
    const sink = SINK_PREFILL_A;
    for (let k = 0; k < pool.length; k++) prefillA(pool[k], sink, k);
}
function passPrefillB(): void {
    const pool = POOL_B;
    const sink = SINK_PREFILL_B;
    for (let k = 0; k < pool.length; k++) prefillB(pool[k], sink, k);
}
function passClosuresA(): void {
    const pool = POOL_A;
    const sink = SINK_CLOSURES_A;
    for (let k = 0; k < pool.length; k++) closuresA(pool[k], sink, k);
}
function passClosuresB(): void {
    const pool = POOL_B;
    const sink = SINK_CLOSURES_B;
    for (let k = 0; k < pool.length; k++) closuresB(pool[k], sink, k);
}
function passInlineA(): void {
    const pool = POOL_A;
    const sink = SINK_INLINE_A;
    for (let k = 0; k < pool.length; k++) inlineA(pool[k], sink, k);
}
function passInlineB(): void {
    const pool = POOL_B;
    const sink = SINK_INLINE_B;
    for (let k = 0; k < pool.length; k++) inlineB(pool[k], sink, k);
}

function passCloneA(): void {
    const proto = PROTO_A;
    const sink = SINK_CLONE_A;
    for (let k = 0; k < FRESH; k++) sink[k] = proto.cloneNode(true) as Node;
}
function passCloneB(): void {
    const proto = PROTO_B;
    const sink = SINK_CLONE_B;
    for (let k = 0; k < FRESH; k++) sink[k] = proto.cloneNode(true) as Node;
}
function passCloneTapeA(): void {
    const proto = PROTO_A;
    const sink = SINK_FRESH_TAPE_A;
    for (let k = 0; k < FRESH; k++) tapeA(proto.cloneNode(true) as Node, sink, k);
}
function passCloneTapeB(): void {
    const proto = PROTO_B;
    const sink = SINK_FRESH_TAPE_B;
    for (let k = 0; k < FRESH; k++) tapeB(proto.cloneNode(true) as Node, sink, k);
}
function passCloneClosuresA(): void {
    const proto = PROTO_A;
    const sink = SINK_FRESH_CLOSURES_A;
    for (let k = 0; k < FRESH; k++) closuresA(proto.cloneNode(true) as Node, sink, k);
}
function passCloneClosuresB(): void {
    const proto = PROTO_B;
    const sink = SINK_FRESH_CLOSURES_B;
    for (let k = 0; k < FRESH; k++) closuresB(proto.cloneNode(true) as Node, sink, k);
}
function passCloneInlineA(): void {
    const proto = PROTO_A;
    const sink = SINK_FRESH_INLINE_A;
    for (let k = 0; k < FRESH; k++) inlineA(proto.cloneNode(true) as Node, sink, k);
}
function passCloneInlineB(): void {
    const proto = PROTO_B;
    const sink = SINK_FRESH_INLINE_B;
    for (let k = 0; k < FRESH; k++) inlineB(proto.cloneNode(true) as Node, sink, k);
}

function slotsOfNodes(nodes: readonly Node[]): readonly Node[] {
    return [nodes[1], nodes[2], nodes[3], nodes[4], nodes[5], nodes[6], nodes[7], nodes[8]];
}
function slotsOfRowA(row: TWalkRowA): readonly Node[] {
    return [row.n1, row.n2, row.n3, row.n4, row.n5, row.n6, row.n7, row.n8];
}
function slotsOfRowB(row: TWalkRowB): readonly Node[] {
    return [row.n1, row.n2, row.n3, row.n4, row.n5, row.n6, row.n7, row.n8];
}

function faultAgainstAddresses(got: readonly Node[], want: readonly Node[]): string | null {
    for (let k = 0; k < SLOTS; k++) {
        if (got[k] === undefined) return `slot ${k + 1} was never recorded`;
        if (got[k] !== want[k]) {
            return `slot ${k + 1} holds ${got[k].nodeName} and the pool's own reading says ${
                want[k].nodeName
            } — the arm recorded a different node`;
        }
    }
    return null;
}

function faultAgainstShape(got: readonly Node[], root: Node): string | null {
    for (let k = 0; k < SLOTS; k++) {
        const node = got[k];
        if (node === undefined) return `slot ${k + 1} was never recorded`;
        if (node.nodeName !== SLOT_NAMES[k]) {
            return `slot ${k + 1} is ${node.nodeName}, not ${SLOT_NAMES[k]}`;
        }
        if (node.nodeType === 3 && (node as Text).data !== SLOT_TEXTS[(k - 1) / 2]) {
            return `slot ${k + 1} reads "${(node as Text).data}", not "${SLOT_TEXTS[(k - 1) / 2]}"`;
        }
    }
    if (got[0].parentNode !== root) return 'slot 1 does not belong to the subtree that was walked';
    return null;
}

interface Program {
    readonly name: string;
    readonly arm: string;
    readonly twin: boolean;
    readonly pass: () => void;
    readonly check: (at: number) => string | null;
    readonly alloc: string;
    readonly perStep: string;
    readonly frames: number;
}

const WALK_PROGRAMS: readonly Program[] = [
    {
        name: 'tape',
        arm: 'tape',
        twin: false,
        pass: passTapeA,
        check: (at: number): string | null =>
            faultAgainstAddresses(slotsOfNodes(SINK_TAPE_A[at]), EXPECT_A[at]),
        alloc: '2 (array of 1, then one backing-store growth) + 1 sink store',
        perStep: '3 tape + 1 indexed load · 1 element store · 0 frames',
        frames: 0,
    },
    {
        name: 'tape·twin',
        arm: 'tape',
        twin: true,
        pass: passTapeB,
        check: (at: number): string | null =>
            faultAgainstAddresses(slotsOfNodes(SINK_TAPE_B[at]), EXPECT_B[at]),
        alloc: '2 (array of 1, then one backing-store growth) + 1 sink store',
        perStep: '3 tape + 1 indexed load · 1 element store · 0 frames',
        frames: 0,
    },
    {
        name: 'prefill',
        arm: 'prefill',
        twin: false,
        pass: passPrefillA,
        check: (at: number): string | null =>
            faultAgainstAddresses(slotsOfNodes(SINK_PREFILL_A[at]), EXPECT_A[at]),
        alloc: '1 (empty array grown by nine pushes) + 1 sink store',
        perStep: '3 tape + 1 indexed load · 1 element store · 0 frames, after 9 pushes',
        frames: 0,
    },
    {
        name: 'prefill·twin',
        arm: 'prefill',
        twin: true,
        pass: passPrefillB,
        check: (at: number): string | null =>
            faultAgainstAddresses(slotsOfNodes(SINK_PREFILL_B[at]), EXPECT_B[at]),
        alloc: '1 (empty array grown by nine pushes) + 1 sink store',
        perStep: '3 tape + 1 indexed load · 1 element store · 0 frames, after 9 pushes',
        frames: 0,
    },
    {
        name: 'closures',
        arm: 'closures',
        twin: false,
        pass: passClosuresA,
        check: (at: number): string | null =>
            faultAgainstAddresses(slotsOfRowA(SINK_CLOSURES_A[at]), EXPECT_A[at]),
        alloc: '1 (nine-field literal, 9 init stores) + 1 sink store',
        perStep: '1 table + 1 in-object load · 1 in-object store · 1 MEGAMORPHIC frame',
        frames: 1,
    },
    {
        name: 'closures·twin',
        arm: 'closures',
        twin: true,
        pass: passClosuresB,
        check: (at: number): string | null =>
            faultAgainstAddresses(slotsOfRowB(SINK_CLOSURES_B[at]), EXPECT_B[at]),
        alloc: '1 (nine-field literal, 9 init stores) + 1 sink store',
        perStep: '1 table + 1 in-object load · 1 in-object store · 1 MEGAMORPHIC frame',
        frames: 1,
    },
    {
        name: 'inline',
        arm: 'inline',
        twin: false,
        pass: passInlineA,
        check: (at: number): string | null =>
            faultAgainstAddresses(slotsOfRowA(SINK_INLINE_A[at]), EXPECT_A[at]),
        alloc: '1 (nine-field literal, 9 init stores) + 1 sink store',
        perStep: '1 forwarded in-object load · 1 in-object store · 0 frames · no loop',
        frames: 0,
    },
    {
        name: 'inline·twin',
        arm: 'inline',
        twin: true,
        pass: passInlineB,
        check: (at: number): string | null =>
            faultAgainstAddresses(slotsOfRowB(SINK_INLINE_B[at]), EXPECT_B[at]),
        alloc: '1 (nine-field literal, 9 init stores) + 1 sink store',
        perStep: '1 forwarded in-object load · 1 in-object store · 0 frames · no loop',
        frames: 0,
    },
];

const CLONE_PROGRAMS: readonly Program[] = [
    {
        name: 'clone',
        arm: 'clone',
        twin: false,
        pass: passCloneA,
        check: (at: number): string | null =>
            SINK_CLONE_A[at] !== PROTO_A && SINK_CLONE_A[at].childNodes.length === 4
                ? null
                : 'the sink still holds the prototype, or the clone has the wrong child count',
        alloc: '1 subtree of 9 nodes + 1 sink store · NOTHING RECORDED',
        perStep: 'no step — this arm is the background the other three are read against',
        frames: 0,
    },
    {
        name: 'clone·twin',
        arm: 'clone',
        twin: true,
        pass: passCloneB,
        check: (at: number): string | null =>
            SINK_CLONE_B[at] !== PROTO_B && SINK_CLONE_B[at].childNodes.length === 4
                ? null
                : 'the sink still holds the prototype, or the clone has the wrong child count',
        alloc: '1 subtree of 9 nodes + 1 sink store · NOTHING RECORDED',
        perStep: 'no step — this arm is the background the other three are read against',
        frames: 0,
    },
    {
        name: 'clone+tape',
        arm: 'clone+tape',
        twin: false,
        pass: passCloneTapeA,
        check: (at: number): string | null => {
            const nodes = SINK_FRESH_TAPE_A[at];
            return faultAgainstShape(slotsOfNodes(nodes), nodes[0]);
        },
        alloc: '1 subtree + 2 (array, growth) + 1 sink store',
        perStep: '3 tape + 1 indexed load · 1 element store · 0 frames',
        frames: 0,
    },
    {
        name: 'clone+tape·twin',
        arm: 'clone+tape',
        twin: true,
        pass: passCloneTapeB,
        check: (at: number): string | null => {
            const nodes = SINK_FRESH_TAPE_B[at];
            return faultAgainstShape(slotsOfNodes(nodes), nodes[0]);
        },
        alloc: '1 subtree + 2 (array, growth) + 1 sink store',
        perStep: '3 tape + 1 indexed load · 1 element store · 0 frames',
        frames: 0,
    },
    {
        name: 'clone+closures',
        arm: 'clone+closures',
        twin: false,
        pass: passCloneClosuresA,
        check: (at: number): string | null => {
            const row = SINK_FRESH_CLOSURES_A[at];
            return faultAgainstShape(slotsOfRowA(row), row.root);
        },
        alloc: '1 subtree + 1 (nine-field literal) + 1 sink store',
        perStep: '1 table + 1 in-object load · 1 in-object store · 1 MEGAMORPHIC frame',
        frames: 1,
    },
    {
        name: 'clone+closures·twin',
        arm: 'clone+closures',
        twin: true,
        pass: passCloneClosuresB,
        check: (at: number): string | null => {
            const row = SINK_FRESH_CLOSURES_B[at];
            return faultAgainstShape(slotsOfRowB(row), row.root);
        },
        alloc: '1 subtree + 1 (nine-field literal) + 1 sink store',
        perStep: '1 table + 1 in-object load · 1 in-object store · 1 MEGAMORPHIC frame',
        frames: 1,
    },
    {
        name: 'clone+inline',
        arm: 'clone+inline',
        twin: false,
        pass: passCloneInlineA,
        check: (at: number): string | null => {
            const row = SINK_FRESH_INLINE_A[at];
            return faultAgainstShape(slotsOfRowA(row), row.root);
        },
        alloc: '1 subtree + 1 (nine-field literal) + 1 sink store',
        perStep: '1 forwarded in-object load · 1 in-object store · 0 frames · no loop',
        frames: 0,
    },
    {
        name: 'clone+inline·twin',
        arm: 'clone+inline',
        twin: true,
        pass: passCloneInlineB,
        check: (at: number): string | null => {
            const row = SINK_FRESH_INLINE_B[at];
            return faultAgainstShape(slotsOfRowB(row), row.root);
        },
        alloc: '1 subtree + 1 (nine-field literal) + 1 sink store',
        perStep: '1 forwarded in-object load · 1 in-object store · 0 frames · no loop',
        frames: 0,
    },
];

let verifiedInstances = 0;
let faultedInstances = 0;
const escapeFaults: string[] = [];

function gateTemplateShape(): string[] {
    const out: string[] = [];
    const families: readonly (readonly [string, Node])[] = [
        ['A', PROTO_A],
        ['B', PROTO_B],
    ];
    for (const [family, proto] of families) {
        const kids = proto.childNodes;
        if (proto.nodeName !== 'LI' || kids.length !== 4) {
            refuse(
                `walk-record: family ${family}'s prototype is <${proto.nodeName}> with ` +
                    `${kids.length} children, not <LI> with 4. The markup grew a whitespace text ` +
                    'node or a tag, and every slot number in this file is now wrong.'
            );
            continue;
        }
        let texts = 0;
        for (let k = 0; k < 4; k++) {
            const kid = kids[k];
            if (kid.childNodes.length !== 1 || kid.firstChild?.nodeType !== 3) {
                refuse(
                    `walk-record: family ${family}'s child ${k} is not one element around one ` +
                        'text node. The walk records eight slots and this shape does not have them.'
                );
            } else texts++;
        }
        out.push(
            `  family ${family}            <LI> · 4 element children · ${texts} text children · ` +
                `${SLOTS} slots · ${STEPS} steps (5 firstChild, 3 nextSibling) · ` +
                `${POOL} pooled clones`
        );
    }
    return out;
}

function gateNodeSet(): string[] {
    const out: string[] = [];
    const rootA = PROTO_A.cloneNode(true) as Node;
    const tapeSink = nodeSink(1);
    const prefillSink = nodeSink(1);
    const closuresSink = rowSinkA(1);
    const inlineSink = rowSinkA(1);
    tapeA(rootA, tapeSink, 0);
    prefillA(rootA, prefillSink, 0);
    closuresA(rootA, closuresSink, 0);
    inlineA(rootA, inlineSink, 0);
    const want = readSlotsA(rootA);
    const arms: readonly (readonly [string, readonly Node[]])[] = [
        ['tape', slotsOfNodes(tapeSink[0])],
        ['prefill', slotsOfNodes(prefillSink[0])],
        ['closures', slotsOfRowA(closuresSink[0])],
        ['inline', slotsOfRowA(inlineSink[0])],
    ];
    let agreed = 0;
    for (const [name, got] of arms) {
        const fault = faultAgainstAddresses(got, want);
        if (fault === null) agreed++;
        else refuse(`walk-record: the ${name} arm walked ONE clone and ${fault}.`);
    }

    const rootB = PROTO_B.cloneNode(true) as Node;
    const tapeSinkB = nodeSink(1);
    const prefillSinkB = nodeSink(1);
    const closuresSinkB = rowSinkB(1);
    const inlineSinkB = rowSinkB(1);
    tapeB(rootB, tapeSinkB, 0);
    prefillB(rootB, prefillSinkB, 0);
    closuresB(rootB, closuresSinkB, 0);
    inlineB(rootB, inlineSinkB, 0);
    const wantB = readSlotsB(rootB);
    const twins: readonly (readonly [string, readonly Node[]])[] = [
        ['tape·twin', slotsOfNodes(tapeSinkB[0])],
        ['prefill·twin', slotsOfNodes(prefillSinkB[0])],
        ['closures·twin', slotsOfRowB(closuresSinkB[0])],
        ['inline·twin', slotsOfRowB(inlineSinkB[0])],
    ];
    for (const [name, got] of twins) {
        const fault = faultAgainstAddresses(got, wantB);
        if (fault === null) agreed++;
        else refuse(`walk-record: the ${name} arm walked ONE clone and ${fault}.`);
    }

    const crossFault = faultAgainstShape(wantB, rootB);
    if (crossFault !== null) {
        refuse(`walk-record: family B's own reading ${crossFault} — the two families differ.`);
    }
    out.push(
        `  ${agreed} of 8 recording programs (four arms × two families) recorded THE SAME EIGHT ` +
            'NODE OBJECTS, by identity, off ONE clone per family — checked before anything is ' +
            'timed, so no arm is timed doing a different job from another. The clone+walk table ' +
            'calls these same eight functions, so the gate covers both tables.'
    );
    out.push(
        '  the two families were compared by node name, text and parentage, so the twin is a ' +
            'transcription of the subject and not a second shape.'
    );
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
        const shift = r % len;
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

const f = (x: number): string => x.toFixed(4);
const f6 = (x: number): string => x.toFixed(6);
const sign = (x: number): string => (x >= 0 ? `+${x.toFixed(6)}` : x.toFixed(6));

interface Table {
    readonly title: string;
    readonly section: string;
    readonly programs: readonly Program[];
    readonly arms: readonly string[];
    readonly instances: number;
    readonly passes: number;
    readonly pairs: readonly (readonly [string, string, string])[];
}

interface Result {
    readonly grain: number;
    readonly reps: number;
    readonly median: (arm: string) => number;
    readonly gapOf: Map<string, Gap>;
    readonly nullOf: Map<string, Gap>;
    readonly excluded: Set<string>;
    readonly notNull: readonly string[];
    readonly ticks: readonly number[];
    readonly resolved: readonly string[];
    readonly unresolved: readonly string[];
    readonly nsPerWalk: (x: number) => number;
}

function runTable(table: Table, rounds: number, batch: number, quantum: number): Result {
    const reps = table.passes * batch;
    const instances = table.instances;
    const grain = quantum / reps;
    const grainWalk = (grain * 1e6) / instances;
    const nsPerWalk = (x: number): number => (x * 1e6) / instances;
    const nsPerStep = (x: number): number => nsPerWalk(x) / STEPS;
    const grains = (x: number): number => Math.round(Math.abs(x) / grain);
    const rowName = (arm: string, twin: boolean): string => (twin ? `${arm}·twin` : arm);

    let checkAt = 0;
    const phases: Phase[] = table.programs.map((p) => ({
        name: p.name,
        reps,
        prep: (): Scenario => ({
            measure: p.pass,
            cleanup: (): void => {
                const at = checkAt++ % instances;
                const fault = p.check(at);
                if (fault === null) {
                    verifiedInstances++;
                    return;
                }
                faultedInstances++;
                if (escapeFaults.length < 8) escapeFaults.push(`${p.name}: ${fault}`);
            },
        }),
    }));

    const series = runPhases(phases, rounds);
    const seriesOf = (name: string): number[] => series.times.get(name) as number[];
    const posOf = (name: string): number[] => series.position.get(name) as number[];
    const stats = new Map<string, Stat>();
    for (const p of table.programs) stats.set(p.name, stat(seriesOf(p.name)));
    const median = (name: string): number => (stats.get(name) as Stat).median;

    emitRecordedRows(
        table.section,
        'ms',
        'pass',
        table.programs.map((p) => [p.name, stats.get(p.name) as Stat] as const)
    );

    line('');
    line(
        `${table.title} [ms per pass of ${instances} instances] · interleaved, direction ` +
            `alternating · ${rounds} rounds · batch ${batch} · ${reps} passes per timed region ` +
            `(${reps * instances} instances) · GC before every timed region`
    );
    line(
        '                       fr   min      p25      median   p75      max      med/grain  ' +
            'ticks    ns/inst  ns/step'
    );
    for (const p of table.programs) {
        const s = stats.get(p.name) as Stat;
        const region = s.median * reps;
        line(
            `${p.name.padEnd(21)}${String(p.frames).padStart(3)}   ${f(s.min)}   ${f(s.p25)}   ` +
                `${f(s.median)}   ${f(s.p75)}   ${f(s.max)}   ` +
                `${(s.median / grain).toFixed(1).padStart(9)}  ${(region / quantum)
                    .toFixed(1)
                    .padStart(7)}  ${nsPerWalk(s.median).toFixed(1).padStart(7)}  ` +
                `${nsPerStep(s.median).toFixed(2)}`
        );
    }
    line(
        `  fr = CALL FRAMES PER WALK STEP. med/grain = the median over one grain (${f6(grain)} ` +
            'ms); a small integer there means the row is the clock and not the program. ticks = ' +
            'the whole timed region over the observed quantum.'
    );
    for (const p of table.programs) {
        if (p.twin) continue;
        line(`  ${p.name.padEnd(21)}alloc/inst ${p.alloc}`);
        line(`  ${''.padEnd(21)}per step   ${p.perStep}`);
    }

    line('');
    line(
        `THE CLOCK CHECK for ${table.section} — run BEFORE the nulls, the gaps and the ` +
            `predictions. A region under ${MIN_TICKS} ticks EXCLUDES its whole arm, row and twin ` +
            'together, from all three.'
    );
    const excluded = new Set<string>();
    const ticks: number[] = [];
    for (const p of table.programs) {
        const region = (stats.get(p.name) as Stat).median * reps;
        const t = region / quantum;
        ticks.push(t);
        if (t >= MIN_TICKS) continue;
        excluded.add(p.arm);
        const wantBatch = t > 0 ? Math.ceil((batch * MIN_TICKS) / t) : batch * 10;
        refuse(
            `walk-record: the "${p.name}" timed region is ${region.toFixed(3)} ms at ${reps} ` +
                `passes — ${t.toFixed(1)}× the observed quantum (${quantum.toFixed(3)} ms), ` +
                `under the ${MIN_TICKS}× floor. Its digits are quantisation, so THE WHOLE ` +
                `"${p.arm}" ARM — this row AND its twin, hence its resolution — IS EXCLUDED from ` +
                `every null, gap and prediction. Re-run at batch ${wantBatch}.`
        );
    }
    if (excluded.size === 0) {
        line(
            `  all ${table.programs.length} regions clear the floor — the smallest is ` +
                `${Math.min(...ticks).toFixed(1)} ticks, the largest ${Math.max(...ticks).toFixed(
                    1
                )}. Nothing is excluded.`
        );
    }

    const nullOf = new Map<string, Gap>();
    for (const arm of table.arms) {
        const a = rowName(arm, false);
        const b = rowName(arm, true);
        nullOf.set(arm, pairedGap(seriesOf(a), seriesOf(b), posOf(a), posOf(b)));
    }
    const resOf = (arm: string): number => (nullOf.get(arm) as Gap).resolution;

    line('');
    line(
        `NULLS for ${table.section} — ${table.arms.length} pairs, one per arm, each a separately ` +
            'declared copy of its own program: its own markup constant, its own prototype, its ' +
            'own pool, its own tape or closure table, its own bodies, its own sink. True Δ = 0.'
    );
    line(
        '  null            bias      noise     p75       worst     order     intrinsic  what it is'
    );
    let worstRes = 0;
    for (const arm of table.arms) {
        const v = nullOf.get(arm) as Gap;
        if (v.resolution > worstRes) worstRes = v.resolution;
        line(
            `  ${arm.padEnd(14)}${f6(v.bias)}  ${f6(v.noise)}  ${f6(v.noiseP75)}  ` +
                `${f6(v.worst)}  ${f6(v.order).padStart(9)} ${f6(v.intrinsic).padStart(9)}  ` +
                `|${arm} − its twin| ms/pass, true Δ = 0 (this pair's resolution ` +
                `${f6(v.resolution)} = ${nsPerStep(v.resolution).toFixed(3)} ns/step; Δ when it ` +
                `ran first ${f6(v.aFirst)} over ${v.aFirstRounds} rounds, when the twin ran ` +
                `first ${f6(v.bFirst)} over ${v.bFirstRounds})`
        );
    }
    line(
        `  RESOLUTION FLOOR      ${f6(worstRes)} ms — the coarsest of the ${table.arms.length}, ` +
            'printed for the recorder. NO VERDICT BELOW USES IT: every quantity is judged against ' +
            "its OWN arm's resolution, on the lines above."
    );

    line('');
    line(
        `THE ORDER SPLIT for ${table.section} — is a null measuring two programs, or measuring ` +
            'which of them ran first?'
    );
    const notNull: string[] = [];
    for (const arm of table.arms) {
        const v = nullOf.get(arm) as Gap;
        const intr = Math.abs(v.intrinsic);
        const ord = Math.abs(v.order);
        let verdictWord: string;
        if (intr > v.noise) {
            notNull.push(arm);
            verdictWord =
                'INTRINSIC — the two declarations differ in a way that does NOT flip with the ' +
                `order, so this is not a null and every figure printed for "${arm}" is suspect`;
        } else if (ord > v.noise) {
            verdictWord =
                'ORDERING — what the pair separates flips sign with which ran first, so it is ' +
                'the position in the round and not the program; the alternating direction is ' +
                'what averages it out of the medians';
        } else {
            verdictWord =
                "NEITHER stands out of this pair's own noise — the pair is a null and the " +
                'instrument has nothing to confess';
        }
        line(
            `  ${arm.padEnd(16)}order ${f6(ord)} · intrinsic ${f6(intr)} · noise ${f6(v.noise)} ` +
                `ms/pass — ${verdictWord}`
        );
    }
    if (notNull.length > 0) {
        refuse(
            `walk-record: ${notNull.length} of ${table.arms.length} null pairs on ` +
                `${table.section} came back INTRINSIC — ${notNull.join(', ')}. Two declarations ` +
                'of one program that differ in a way which does not flip with the running order ' +
                'are two different programs, so those rows are not quotable and every quantity ' +
                'computed from them inherits it.'
        );
    }

    const gapOf = new Map<string, Gap>();
    line('');
    line(
        `THE COMPARISONS for ${table.section} — every one through the SAME estimator as the ` +
            'nulls. `intrinsic` is the difference of the two medians with the running order ' +
            'balanced out, AND IT IS THE QUOTED FIGURE. A pair is quotable only if it clears both ' +
            `its own two arms' resolutions AND four grains ` +
            `(${((4 * grainWalk) / STEPS).toFixed(3)} ns/step).`
    );
    const resolved: string[] = [];
    const unresolved: string[] = [];
    for (const [a, b, note] of table.pairs) {
        const key = `${a}↔${b}`;
        const v = pairedGap(seriesOf(a), seriesOf(b), posOf(a), posOf(b));
        gapOf.set(key, v);
        if (excluded.has(a) || excluded.has(b)) {
            line(`  ${key.padEnd(30)}EXCLUDED — an arm of this pair is under the clock floor.`);
            continue;
        }
        const res = Math.max(resOf(a), resOf(b));
        const g = grains(v.intrinsic);
        const ok = Math.abs(v.intrinsic) > res && g >= 4;
        if (ok) resolved.push(key);
        else unresolved.push(key);
        line(
            `  ${key.padEnd(30)}intrinsic ${sign(v.intrinsic)} ms  ` +
                `${nsPerWalk(v.intrinsic).toFixed(2).padStart(8)} ns/inst  ` +
                `${nsPerStep(v.intrinsic).toFixed(3).padStart(7)} ns/step  ` +
                `${String(g).padStart(4)} grains  (bias ${f6(v.bias)}, order ${f6(v.order)}, own ` +
                `resolution ${f6(res)})  ${
                    ok
                        ? 'RESOLVED — quotable as a size'
                        : Math.abs(v.intrinsic) <= res
                        ? "NOT RESOLVED — inside its own two arms' resolution"
                        : 'NOT RESOLVED — under four grains, an ordering at best'
                }`
        );
        line(`  ${''.padEnd(30)}${note}`);
        line(`  ${''.padEnd(30)}a negative intrinsic means ${a} was the cheaper of the two.`);
    }
    // A REFUSAL HAS TO NAME THE BAR THAT ACTUALLY BOUND. This printed the four-grain bar and the
    // batch-doubling advice for EVERY unresolved pair, including ones that cleared four grains
    // many times over — `tape↔prefill` was recorded at 25 grains against a bar of 4 and refused,
    // with the message blaming the bar it had passed. The recording is what anyone reads a month
    // later, and it carried the wrong diagnosis and a remedy aimed at the wrong quantity.
    for (const key of unresolved) {
        const v = gapOf.get(key) as Gap;
        const [a, b] = key.split('↔');
        const res = Math.max(resOf(a), resOf(b));
        const g = grains(v.intrinsic);
        const grainBound = g < 4;
        refuse(
            `walk-record: "${key}" did not separate on ${table.section} — the order-balanced ` +
                `difference is ${f6(v.intrinsic)} ms per pass ` +
                `(${nsPerStep(v.intrinsic).toFixed(3)} ns/step, ${g} grains). ` +
                `THE BAR THAT REFUSED IT IS THE ${grainBound ? 'GRAIN' : 'RESOLUTION'}: ` +
                `four grains is ${((4 * grainWalk) / STEPS).toFixed(3)} ns/step and this pair is ` +
                `${g} grains${grainBound ? ' — UNDER it' : ' — CLEAR of it'}; its own two arms' ` +
                `resolution is ${f6(res)} ms and the difference is ${f6(Math.abs(v.intrinsic))} ` +
                `ms${grainBound ? '' : ' — INSIDE it'}. It may NOT be quoted as a size, in ` +
                'either direction. ' +
                (grainBound
                    ? `To resolve it, halve the grain: re-run at batch ${batch * 2}. More ROUNDS ` +
                      'will not help — a quantised median moves in grains and only the batch ' +
                      'moves the grain.'
                    : 'A BIGGER BATCH WILL NOT HELP: the resolution is |arm − its own twin|, ' +
                      'measured in the same ms/pass the difference is, so scaling the pass ' +
                      'scales both. Read this pair in the NULLS block above and see which half ' +
                      'of its resolution is bias and which is noise — only the noise half is ' +
                      'something more rounds can reduce, and a bias half means the pair is ' +
                      'measuring its position in the round rather than its two programs.')
        );
    }

    return {
        grain,
        reps,
        median,
        gapOf,
        nullOf,
        excluded,
        notNull,
        ticks,
        resolved,
        unresolved,
        nsPerWalk,
    };
}

const WALK_TABLE: Table = {
    title: 'WALK — a pre-cloned subtree walked and recorded, NO CLONE IN THE REGION',
    section: 'WALK',
    programs: WALK_PROGRAMS,
    arms: ['tape', 'prefill', 'closures', 'inline'],
    instances: POOL,
    passes: PASSES,
    pairs: [
        [
            'tape',
            'prefill',
            'THE HYDRATING PAIR (P0). The two differ in ONE line — the table a walk starts ' +
                'from — and everything after it is the same tape over the same subtree, so ' +
                'this is the allocation and its nine pushes with nothing fused to them.',
        ],
        [
            'tape',
            'closures',
            'THE PAIR THE AXIS EXISTS FOR (P1). FUSED — three tape reads and a loop ' +
                'iteration against a megamorphic call, AND two polymorphic accessor sites ' +
                'against eight monomorphic ones. Neither term can be subtracted here.',
        ],
        [
            'inline',
            'tape',
            "THE CEILING AGAINST THE SHIPPED SHAPE. Not the tape's price: the ceiling also " +
                'has eight monomorphic accessor sites and a store-forwarded load the tape ' +
                'cannot have.',
        ],
        [
            'inline',
            'closures',
            'THE CEILING AGAINST THE TABLE, and the narrowest pair on the axis — identical ' +
                'stores, identical allocation, identical accessor sites, identical order. What ' +
                'is left is the loop and the megamorphic call, plus the load the ceiling gets ' +
                'forwarded.',
        ],
    ],
};

const CLONE_TABLE: Table = {
    title: 'CLONE+WALK — one FRESH clone per instance, walked one instruction after it was made',
    section: 'CLONE·WALK',
    programs: CLONE_PROGRAMS,
    arms: ['clone', 'clone+tape', 'clone+closures', 'clone+inline'],
    instances: FRESH,
    passes: CLONE_PASSES,
    pairs: [
        [
            'clone',
            'clone+tape',
            'THE WHOLE WALK, against a background this table prints the size of. FUSED with ' +
                'the container allocation and the sink store, which the clone arm does not pay.',
        ],
        [
            'clone+tape',
            'clone+closures',
            "(P1)'s pair again, in situ. Expected to be REFUSED here: the clone is most of " +
                'the region and the four-grain bar on this table is far above the predicted ' +
                'band. It is here for (P6) — the SIGN, not the size.',
        ],
        [
            'clone+inline',
            'clone+tape',
            'the ceiling against the shipped shape, with the clone in the region.',
        ],
        [
            'clone+inline',
            'clone+closures',
            'the ceiling against the table, with the clone in the region.',
        ],
    ],
};

export function benchmarkWalkRecord(rounds = 100, batch = 1): void {
    const quantum = observeTimerQuantum();
    line(
        `walk-record: observed timer quantum ${quantum.toFixed(3)} ms — every timed region below ` +
            `must clear ${(MIN_TICKS * quantum).toFixed(3)} ms (${MIN_TICKS}×) or its digits are ` +
            'quantisation. THE CLOCK CHECK RUNS BEFORE THE VERDICTS and strikes such a row out of ' +
            'them rather than footnoting it after.'
    );

    line('');
    line('THE SHAPE, AS PARSED — checked, not assumed');
    for (const l of gateTemplateShape()) line(l);

    line('');
    line(
        'THE NODE-SET GATE — all six arms record the identical node set, before anything is timed'
    );
    for (const l of gateNodeSet()) line(l);

    line('');
    line("CENSUS — read off this file's constants and the transcribed source, nothing measured");
    line(`  slots recorded per instance   ${SLOTS}`);
    line(
        `  walk steps per instance       ${STEPS}  (5 firstChild, 3 nextSibling) — the answer is ` +
            'a function of BOTH numbers and every unit below is printed per instance AND per step'
    );
    line(`  pooled clones (table 1)       ${POOL}, built untimed at module load`);
    line(`  fresh clones per pass (t. 2)  ${FRESH}, made inside the timed region`);
    line(
        '  ALLOCATIONS PER INSTANCE      tape 2 (a one-element array plus one backing-store ' +
            'growth when slot 1 is appended) · closures 1 (a nine-field literal, built whole) · ' +
            'inline 1 (the same literal at its own site). Every arm also makes ONE sink store.'
    );
    line(
        '  INITIALISING STORES           tape 1 · closures 9 · inline 9. The two record arms pay ' +
            'eight stores at construction that the array arm does not, and the array arm pays a ' +
            'growth they do not. Both are inside every gap on table 1 and neither is subtracted.'
    );
    line(
        '  LOADS PER STEP                tape 3 tape + 1 indexed · closures 1 table + 1 ' +
            'in-object · inline 1 in-object, STORE-FORWARDED from the instruction before it'
    );
    line(
        '  STORES PER STEP               1 in every arm — an element store for tape, an ' +
            'in-object store for both others'
    );
    line(
        '  CALL FRAMES PER STEP          tape 0 · closures 1 · inline 0. The closures arm is the ' +
            'only one that calls, and its ONE call site sees EIGHT distinct function objects, ' +
            "which is past V8's four-entry limit: MEGAMORPHIC, no inlining."
    );
    line(
        '  PROPERTY-ACCESS SITES         tape 2 (firstChild sees LI/A/SPAN, nextSibling sees ' +
            'A/SPAN — POLYMORPHIC) · closures 8 (MONOMORPHIC) · inline 8 (MONOMORPHIC). THIS IS ' +
            'THE TERM (P1) FUSES AND CANNOT SUBTRACT, and it runs the other way from the call.'
    );
    line(
        '  THE ESCAPE                    every arm stores its container into a module-level sink ' +
            'BEFORE filling it — the shipped order (`holder.nodes = nodes` precedes the loop) — ' +
            'so no arm can have its recorded stores removed. One element store and one write ' +
            'barrier each, and the sink is overwritten every pass so the live set is bounded at ' +
            'one pass instead of growing with the region.'
    );
    line(
        '  THE BIAS THAT REMAINS         the shipped tape writes into an array hanging off an ' +
            'instance record that exists anyway, so the real tape is record PLUS array where the ' +
            'closures strategy is the record ALONE. THIS AXIS GIVES EVERY ARM ONE CONTAINER, ' +
            'which forgives the tape one allocation and the closures none. THE BIAS RUNS TOWARD ' +
            'THE TAPE and a tape win must be read with it.'
    );

    const walk = runTable(WALK_TABLE, rounds, batch, quantum);
    const situ = runTable(CLONE_TABLE, rounds, batch, quantum);

    line('');
    line('THE CLONE’S SHARE — what background the table-2 gaps are being read against');
    const cloneMedian = situ.median('clone');
    const situTape = situ.median('clone+tape');
    const share = cloneMedian / Math.max(situTape, Number.MIN_VALUE);
    line(
        `  clone ${f(cloneMedian)} ms/pass · clone+tape ${f(situTape)} ms/pass — THE CLONE IS ` +
            `${(share * 100).toFixed(1)}% OF clone+tape, and the whole walk is the remaining ` +
            `${((1 - share) * 100).toFixed(1)}% (${situ
                .nsPerWalk(situTape - cloneMedian)
                .toFixed(1)} ns per instance, ${(
                situ.nsPerWalk(situTape - cloneMedian) / STEPS
            ).toFixed(2)} ns per step).`
    );
    line(
        '  EVERY GAP ON TABLE 2 IS READ AGAINST THAT BACKGROUND. Table 1 has no clone in its ' +
            'region at all and is where the arms are ranked; table 2 exists to price this ' +
            'background and to check the SIGN (P6), never to size the pair.'
    );

    line('');
    line(
        `THE ESCAPE CHECK — ${verifiedInstances} instances had all ${SLOTS} recorded slots read ` +
            'back after their timed region, untimed: by IDENTITY against the pool’s own ' +
            'independent reading on table 1, and by node name, text and parentage on table 2 ' +
            'where the clone is fresh and there is no address to compare with.'
    );
    if (faultedInstances > 0) {
        refuse(
            `walk-record: ${faultedInstances} recorded instance(s) failed the read-back, the ` +
                `first ${escapeFaults.length} of them — ${escapeFaults.join(' · ')}. An arm that ` +
                'did not record what it claims to ' +
                'record was timed doing less work than the others, and NO ROW OF THIS RUN MAY BE ' +
                'QUOTED.'
        );
    }

    line('');
    line('THE PREDICTIONS, JUDGED BY THE RUN — committed in the header before the arms existed');
    const verdict = (id: string, ok: boolean, said: string, got: string): void =>
        line(`  ${ok ? '✔' : '✘'} ${id} ${ok ? 'HELD' : 'FAILED'} — said ${said}; got ${got}`);
    const skipped = (id: string, why: string): void => line(`  ⊘ ${id} NOT JUDGED — ${why}`);

    const usable = (...arms: string[]): boolean => arms.every((a) => !walk.excluded.has(a));
    const nsStep = (x: number): number => walk.nsPerWalk(x) / STEPS;

    const ceilingOk = ((): boolean => {
        if (!usable('tape', 'closures', 'inline')) return false;
        const vTape = walk.gapOf.get('inline↔tape') as Gap;
        const vClos = walk.gapOf.get('inline↔closures') as Gap;
        const resTape = Math.max(
            (walk.nullOf.get('inline') as Gap).resolution,
            (walk.nullOf.get('tape') as Gap).resolution
        );
        const resClos = Math.max(
            (walk.nullOf.get('inline') as Gap).resolution,
            (walk.nullOf.get('closures') as Gap).resolution
        );
        const cheapest =
            walk.median('inline') < walk.median('tape') &&
            walk.median('inline') < walk.median('closures');
        const clears =
            Math.abs(vTape.intrinsic) > resTape &&
            Math.round(Math.abs(vTape.intrinsic) / walk.grain) >= 4 &&
            Math.abs(vClos.intrinsic) > resClos &&
            Math.round(Math.abs(vClos.intrinsic) / walk.grain) >= 4;
        return cheapest && clears;
    })();

    if (usable('tape', 'prefill')) {
        const v = walk.gapOf.get('tape↔prefill') as Gap;
        const res = Math.max(
            (walk.nullOf.get('tape') as Gap).resolution,
            (walk.nullOf.get('prefill') as Gap).resolution
        );
        const g = Math.round(Math.abs(v.intrinsic) / walk.grain);
        const perInstance = walk.nsPerWalk(v.intrinsic);
        if (Math.abs(v.intrinsic) > res && g >= 4) {
            verdict(
                '(P0)',
                perInstance < 0 && -perInstance >= 5 && -perInstance <= 25,
                'prefill is DEARER than tape by 5 to 25 ns per instance — the pre-fill the ' +
                    'hydrating path used to do is not free',
                `tape↔prefill ${f6(v.intrinsic)} ms/pass = ${perInstance.toFixed(2)} ns/instance ` +
                    `over ${g} grains against its own two arms' resolution of ${f6(res)} ms — ${
                        perInstance < 0
                            ? 'PREFILL IS DEARER, and that is what starting the table from the ' +
                              'root removed'
                            : 'PREFILL IS CHEAPER, so starting the table from the root COST ' +
                              'something and the change has to go back'
                    }`
            );
        } else {
            skipped(
                '(P0)',
                `tape↔prefill came back ${perInstance.toFixed(2)} ns/instance over ${g} grains ` +
                    `against a four-grain bar and its own arms' resolution of ${f6(res)} ms. The ` +
                    `pre-fill is a WASH at the sizes this scene can measure — re-run at batch ${
                        batch * 2
                    } before claiming the hydrating change bought anything.`
            );
        }
    } else {
        skipped('(P0)', 'tape or prefill is under the clock floor and was excluded');
    }

    if (usable('tape', 'closures')) {
        const v = walk.gapOf.get('tape↔closures') as Gap;
        const res = Math.max(
            (walk.nullOf.get('tape') as Gap).resolution,
            (walk.nullOf.get('closures') as Gap).resolution
        );
        const g = Math.round(Math.abs(v.intrinsic) / walk.grain);
        const step = nsStep(v.intrinsic);
        if (Math.abs(v.intrinsic) > res && g >= 4) {
            verdict(
                '(P1)',
                step < 0 && -step >= 1 && -step <= 5,
                'closures is DEARER than tape by 1 to 5 ns per step — the claim that a call per ' +
                    'step is a wash or better against a loop iteration plus three tape reads is ' +
                    'FALSE',
                `tape↔closures ${f6(v.intrinsic)} ms/pass = ${step.toFixed(3)} ns/step ` +
                    `(${walk.nsPerWalk(v.intrinsic).toFixed(2)} ns/instance) over ${g} grains ` +
                    `against its own two arms' resolution of ${f6(res)} ms — ${
                        step < 0
                            ? 'CLOSURES IS DEARER'
                            : 'CLOSURES IS CHEAPER, so the tape and its per-instance array are ' +
                              'what this run says to drop, and the header said the opposite'
                    }`
            );
        } else {
            skipped(
                '(P1)',
                `tape↔closures came back ${nsStep(v.intrinsic).toFixed(3)} ns/step over ${g} ` +
                    `grains against a four-grain bar and its own arms' resolution of ${f6(res)} ` +
                    `ms. THE PAIR THIS AXIS EXISTS FOR DID NOT SEPARATE — re-run at batch ${
                        batch * 2
                    } before either shape is preferred on cost. A pair that does not separate is ` +
                    'a wash for the sizes this scene can measure, which is itself an answer to ' +
                    'the claim under test and is NOT a tape win.'
            );
        }
    } else {
        skipped('(P1)', 'tape or closures is under the clock floor and was excluded');
    }

    if (usable('tape', 'closures', 'inline')) {
        verdict(
            '(P2)',
            ceilingOk,
            'inline — which does strictly less work than either loop arm — is the CHEAPEST of ' +
                'the three, clear of its own resolution and of four grains against both. THIS IS ' +
                'THE INSTRUMENT’S OWN FALSIFIER',
            `inline ${f(walk.median('inline'))} · tape ${f(walk.median('tape'))} · closures ` +
                `${f(walk.median('closures'))} ms per pass — ${
                    ceilingOk
                        ? 'the ceiling is below both and both gaps clear, so the region is ' +
                          'measuring the walk'
                        : 'THE CEILING IS NOT CLEAR OF BOTH. NO PAIR ON THIS AXIS MAY BE QUOTED, ' +
                          '(P1) INCLUDED: the recorded stores may have been removed despite the ' +
                          'sink, or the region is dominated by the container allocation, the sink ' +
                          'store or GC rather than by the eight steps, or the clock cannot ' +
                          'express the quantity'
                }`
        );
    } else {
        skipped('(P2)', 'an arm is under the clock floor and was excluded');
    }

    verdict(
        '(P3)',
        walk.notNull.length === 0 && situ.notNull.length === 0,
        `all ${WALK_TABLE.arms.length + CLONE_TABLE.arms.length} null pairs across both tables ` +
            'are ordering or nothing',
        walk.notNull.length === 0 && situ.notNull.length === 0
            ? 'every pair is inside its own noise'
            : `INTRINSIC: ${[...walk.notNull, ...situ.notNull].join(', ')}`
    );

    verdict(
        '(P4)',
        share >= 0.6 && share <= 0.9,
        'the clone is 60-90% of clone+tape',
        `${(share * 100).toFixed(1)}% — ${
            share < 0.5
                ? "under 50%, so this file's model of a clone is wrong and table 2's background " +
                  'is smaller than it says'
                : share > 0.95
                ? 'over 95%, so table 2 cannot rank anything and does not try'
                : 'the background is the size the header expected'
        }`
    );

    {
        const all = [...walk.ticks, ...situ.ticks];
        verdict(
            '(P5)',
            Math.min(...all) >= 30,
            `every one of the ${all.length} timed regions clears thirty ticks of the observed clock`,
            `the smallest region is ${Math.min(...all).toFixed(1)} ticks, the largest ` +
                `${Math.max(...all).toFixed(1)}`
        );
    }

    {
        const a = walk.gapOf.get('tape↔closures') as Gap;
        const b = situ.gapOf.get('clone+tape↔clone+closures') as Gap;
        const aResolved = walk.resolved.includes('tape↔closures');
        const bResolved = situ.resolved.includes('clone+tape↔clone+closures');
        const disagree =
            aResolved && bResolved && Math.sign(a.intrinsic) !== Math.sign(b.intrinsic);
        verdict(
            '(P6)',
            !disagree,
            'the two tables do not disagree in SIGN on tape ↔ closures — either the in-situ pair ' +
                'fails to resolve (the expected outcome) or it resolves with table 1’s sign',
            `table 1 ${f6(a.intrinsic)} ms/pass (${aResolved ? 'resolved' : 'not resolved'}) · ` +
                `table 2 ${f6(b.intrinsic)} ms/pass (${bResolved ? 'resolved' : 'not resolved'})` +
                `${
                    disagree
                        ? ' — THE SIGNS DISAGREE. Walking a pooled subtree and walking a freshly ' +
                          'cloned one are different jobs and NEITHER TABLE MAY BE QUOTED ALONE.'
                        : ''
                }`
        );
    }

    line('');
    line('WHAT THIS RUN CANNOT SAY — printed here so it travels with the tables');
    line(
        '  * NOTHING ABOUT A HAND-OPTIMISED WALK. `inline` mirrors the closure bodies store for ' +
            'store, so what separates it from them is dispatch and nothing else. A straight-line ' +
            'program that kept the eight nodes in LOCALS and stored them once at the end is a ' +
            'LOWER ceiling than this one, and it is not measured.'
    );
    line(
        '  * NOTHING ABOUT THE TAPE READS SEPARATELY FROM THE INLINE CACHES. `tape ↔ closures` ' +
            'fuses three tape reads and a loop iteration against a megamorphic call WITH two ' +
            'polymorphic accessor sites against eight monomorphic ones, and the two terms run in ' +
            'OPPOSITE directions. The arm that would separate them splits the tape arm’s two ' +
            'accessor sites per step by hand; it is not built.'
    );
    line(
        '  * NOTHING ABOUT THE ALLOCATION SEPARATELY FROM THE STRATEGY, and the bias is toward ' +
            'the tape — see THE BIAS THAT REMAINS in the census.'
    );
    line(
        `  * NOTHING ABOUT A DIFFERENT SUBTREE. ${SLOTS} slots and ${STEPS} steps. A shape with ` +
            'two slots amortises a table lookup differently and a shape with forty amortises it ' +
            'again; the answer is a function of both numbers and this run holds both fixed.'
    );
    line(
        '  * NOTHING ABOUT A WALK THAT VISITS NODES IT DOES NOT RECORD. Every step here records, ' +
            "so the tape's third integer is never spent on a hop that stores nothing."
    );
    line(
        '  * NOTHING ABOUT THE WIRE. No attribute is written, no text is set, no listener is ' +
            'installed, nothing is inserted into a document and no layout is forced. The subtrees ' +
            'are walked DETACHED, which is where the shipped walk runs.'
    );
    line(
        '  * NOTHING ABOUT A COLD CLONE ON TABLE 1. Its pool is walked many times per region and ' +
            'is warm by construction, which inflates the machinery’s share of a step against ' +
            'the accessor’s, in every arm alike. Table 2 is where the clone is one ' +
            'instruction old, and (P6) is the only thing that checks the two against each other.'
    );
    line(
        `  * NOTHING BELOW ${((4 * (quantum / (PASSES * batch)) * 1e6) / POOL / STEPS).toFixed(
            3
        )} ns PER STEP on table 1 at this batch. Four grains is the bar; only the batch moves it.`
    );
}
