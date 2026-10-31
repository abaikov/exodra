// DIAGNOSTIC — FOUR SPELLINGS OF ONE PER-INSTANCE RECEIVER, PRICED HEAD ON.
//
// IT DEPENDS ON NOTHING IN THIS REPOSITORY EXCEPT THE RECORDER. There is no `@exodra/*` import
// here, no dist, no declaration, no schema, no connector, no port, no DOM. Five straight-line
// JavaScript programs and a clock. It is registered as an axis only so it can reuse the runner
// that starts Vite, drives headless Chromium and forwards the browser's console.
//
// ═══ THE QUESTION ═════════════════════════════════════════════════════════════════════════════
//
// HOW EXPENSIVE IS EACH WAY OF MAKING A PER-INSTANCE OBJECT WHOSE METHODS LIVE ON A SHARED
// PROTOTYPE? Identical fields (`a`, `b`, `c`, three fields, that order), identical shared method,
// identical call site, identical work per call.
//
//   protoLiteral  `{ __proto__: PROTO, a, b, c }` — the spelling in dispute.
//   ctor          `class { constructor(a,b,c){…} }` with the method on `.prototype`, made by `new`.
//   create        `Object.create(PROTO)` and then three assignments.
//   plain         `{ a, b, c, m }` — the method as an OWN property, no chosen prototype. THE
//                 CONTROL: the same literal allocation with the `__proto__:` key removed.
//   hoisted       THE INSTRUMENT ROW, and not one of the four. One receiver built ONCE at module
//                 load over its own prototype; the loop re-stores its three fields, calls its
//                 method and stores it into the sink. IT ALLOCATES NOTHING PER OBJECT, so it is
//                 every other row's tail — the loop, the three stores, the call, the escape —
//                 with the allocation and nothing else removed.
//
// ═══ WHY IT WAS BUILT — THE NUMBER THAT DOES NOT FIT ══════════════════════════════════════════
//
// A server axis measured eight `{ __proto__: … }` objects per instance at +99.8 ns PER PORT WRITE
// over a path that allocates nothing (638.5 grains, own resolution 0.0138 ms). QUOTED SECOND-HAND
// from `JUDGE-RULES.md` rule 1 and `door-shape.ts`'s header; I did not open
// `measurements/door-shape.*.json` in the turn that wrote this file, and the figure is therefore
// this file's SOFTEST INPUT. At eight objects per instance that is ~100 ns PER OBJECT — one to two
// orders above an ordinary young-generation allocation, which is a bump pointer and three field
// initialisations. Something other than an allocation happened, and this axis is the program in
// which the candidates can differ.
//
// THE HYPOTHESIS UNDER TEST: `__proto__:` with a NON-CONSTANT value in an object literal is not a
// choice of map, it is a mutation — the object is created with the literal's boilerplate map and
// the prototype is installed onto it afterwards, per object, which `new` never does. If that is
// what the 100 ns bought, ONE KEYWORD DECIDES A DESIGN. If it is false, the earlier number means
// something else entirely and `JUDGE-RULES.md` rule 1 — which says in as many words that it is
// under test and may not be cited as settled — stays under test.
//
// ═══ THE PRE-REGISTERED PREDICTION, WRITTEN BEFORE ANY ARM EXISTED ════════════════════════════
//
// (P1) `protoLiteral` IS DEARER THAN `ctor`, BY +3 TO +40 ns PER OBJECT. A direction and a size,
//      committed. MECHANISM: the two arms build the same three fields in the same order over the
//      same kind of shared method and differ in the allocation alone. A constructor allocates with
//      the initial map V8 keeps on the function object; a literal whose `__proto__:` value is a
//      variable cannot have that map baked into its boilerplate, so the object is born with the
//      boilerplate's prototype and the real one is installed after creation. V8 caches the
//      resulting map on the prototype's transition list, so from the second object on the install
//      should be a cache probe and a map store — TENS of nanoseconds at the top of my band, not
//      hundreds. THE 99.8 ns QUOTED ABOVE IS DELIBERATELY OUTSIDE THIS BAND: if this axis returns
//      ~100 ns per object, my SIZE is wrong and the mechanism is bigger than a cached transition.
//      THIS MECHANISM IS READ FROM MEMORY OF V8'S BYTECODE GENERATOR AND I DID NOT OPEN V8. It is
//      the softest input to any prediction here.
//      FUSED TERM, stated rather than hidden: the ctor arm pays ONE CONSTRUCTOR FRAME per object
//      that the literal does not, and no spelling of "allocate through a constructor" omits it. So
//      a `ctor` that lands ABOVE `protoLiteral` has not shown that constructors are dearer than
//      literals — only that this arm's frame outweighed whatever the literal's install costs.
//
// (P2) THE KILLER FOR (P1), AND IT IS AIMED AT MY OWN INSTRUMENT RATHER THAN AT THE HYPOTHESIS.
//      `ctor ↔ hoisted` — ONE ALLOCATION PLUS ONE CONSTRUCTOR FRAME against NEITHER, with the
//      loop, the three field stores, the method call and the escape held identical — MUST RESOLVE:
//      clear both arms' own resolutions and four grains. IF IT DOES NOT, this instrument cannot
//      see one allocation, every arm's objects may have been removed or the loop may dominate them
//      entirely, and NO FIGURE THIS AXIS PRINTS ABOUT `protoLiteral ↔ ctor` MAY BE READ AS BEING
//      ABOUT AN ALLOCATION. (P1) is then printed NOT JUDGED, mechanically, rather than being
//      reported as a verdict. The second half of the same killer: `hoisted` must have the smallest
//      median of the five. An allocating arm at or below the row that allocates nothing is an
//      instrument measuring something other than these programs.
//
// ═══ THE FAILURE MODE THIS FILE IS DESIGNED AGAINST: EVERYTHING GOT OPTIMISED AWAY ════════════
//
// NONE OF THESE OBJECTS IS READ AFTER THE LOOP UNLESS SOMETHING MAKES IT SO. TurboFan is entitled
// to scalarise every receiver in a loop whose objects do not escape and to allocate nothing at
// all, and four arms that all allocate nothing are four measurements of an empty loop.
//
// THE ESCAPE ROUTE, IDENTICAL IN ALL TEN PROGRAMS: each program owns a module-level array of
// exactly `OBJECTS` entries, built at module load by `push` (so it is PACKED and never grows, never
// changes element kind and is never reallocated) and prefilled with an object of that program's own
// kind. The loop OVERWRITES SLOT `i` IN PLACE — `sink[i] = o` — and a gate READS THE WHOLE ARRAY
// BACK after the run and asserts that it holds `OBJECTS` DISTINCT objects, that entry `i` carries
// the values entry `i` was built with, and that its method still answers. An object stored into a
// module-level array cannot be scalarised, and the gate is what says so rather than this paragraph.
//
// WHAT THE ESCAPE COSTS, AND IT IS A ROW AND NOT A SENTENCE: one element store per object into an
// old-space array of young objects, hence one generational write barrier per object, plus one
// bounds check. IT IS IDENTICAL IN ALL FIVE ARMS, so it cancels in every pair — and its absolute
// size is not left to inference either, because `hoisted` is the loop, the three stores, the call
// and the escape WITH NOTHING ELSE IN IT. `hoisted`'s median IS the tail, printed, in ns per
// object, beside every arm it is subtracted from.
//
// ═══ WHAT EACH ARM ACTUALLY DOES, COUNTED — the term the timing may not resolve ═══════════════
//
// Read off this file's own text. NOTHING HERE IS MEASURED; it is printed in the CENSUS and in the
// table's columns so that a reader who sees five medians land on top of each other can still see
// what was supposed to separate them.
//
//              alloc  stores  fr/o  fr/c  loads/c   where the three fields live
//   protoLiteral  1      3      0     1      4      in-object (literal boilerplate slots)
//   ctor          1      3      1     1      4      in-object (the constructor's initial map)
//   create        1+     3      1     1      4      NOT in-object — see below
//   plain         1      4      0     1      4      in-object; `m` is the fourth field
//   hoisted       0      3      0     1      4      in-object, written again every iteration
//
//   alloc    OBJECTS ALLOCATED PER OBJECT BUILT. `create` is `1+` because `Object.create` returns
//            an object with NO in-object slots, so the first property store allocates a separate
//            properties backing store as well.
//   stores   FIELD STORES PER OBJECT. `plain` has four because the method IS one of its fields —
//            that is what "the method as an own property" means and it cannot be spelled with
//            three. `create`'s three are not stores into prepared slots but three MAP TRANSITIONS
//            on a growing object, cached after the first few.
//   fr/o     ENCLOSING CALL FRAMES PER OBJECT BUILT, IN THE SOURCE. `ctor`'s is its constructor
//            body; `create`'s is `Object.create`, a builtin.
//   fr/c     ENCLOSING CALL FRAMES PER METHOD CALL, IN THE SOURCE. One everywhere: `o.m()`.
//   loads/c  PROPERTY LOADS PER METHOD CALL: the method itself, then `this.a`, `this.b`, `this.c`.
//            Four everywhere. WHERE the method load lands differs and the column cannot say it:
//            `plain` finds it ON THE RECEIVER, the other four find it on the prototype through the
//            receiver's map. Both are one inline-cache hit after warm-up.
//
// AND THE ONE THING THE COLUMNS CANNOT CARRY: TURBOFAN MAY INLINE EVERY ONE OF THOSE FRAMES. The
// method is tiny and every call site here is monomorphic, so `fr/c` is a count of SOURCE frames and
// probably not of machine ones; the constructor is equally inlinable. That makes `ctor`'s fused
// frame smaller than the column suggests rather than larger, which is the direction that makes
// (P1) HARDER to hold, not easier.
//
// ═══ THE ARMS ARE NOT ALLOWED TO SHARE ANYTHING ═══════════════════════════════════════════════
//
// Every one of the ten programs has its OWN prototype object, its OWN method function object, its
// OWN class where it has one, its OWN loop body and its OWN sink array, and a gate checks all of
// that BY POINTER before anything is timed. Two programs sharing a method would share an inline
// cache and a compilation, and the pair between them would measure a floor no real pair of programs
// sits on.
//
// THE ONE THING TWO `plain` PROGRAMS CANNOT HAVE SEPARATELY IS `Object.prototype`, because that is
// what "no chosen prototype" means. The pointer gate therefore checks prototype distinctness across
// the EIGHT non-plain rows and says out loud that the two plain rows share the object every literal
// in the process shares. Their METHOD function objects are still separately declared and are still
// checked distinct.
//
// ═══ THE TWINS ════════════════════════════════════════════════════════════════════════════════
//
// EACH OF THE FIVE ARMS HAS ITS OWN SEPARATELY DECLARED TWIN — family `A` is the subject, family
// `B` is a second, independent declaration of the identical program with its own prototype, its own
// method body, its own class, its own sink and its own loop. A twin is DUPLICATED SOURCE and never
// a second call to one function: calling one function twice shares everything V8 learned about it.
// Their true difference is ZERO by construction, and what a pair returns is what this instrument
// returns when there is nothing to see.
//
// EVERY GAP IS JUDGED AGAINST ITS OWN TWO ARMS' RESOLUTIONS, never against the table maximum. The
// printed RESOLUTION FLOOR is the coarsest of the five, for the recorder, and no verdict uses it.
//
// THE ORDER IS BALANCED, NOT MERELY ROTATED. Even rounds run the phase list forwards and odd rounds
// backwards, so no pair keeps a fixed relative order for the run; `pairedGap` then splits what is
// left into the half that flips with the order (ORDER) and the half that does not (INTRINSIC), and
// INTRINSIC is the only figure quoted. A null whose intrinsic stands out of its own noise is not a
// null, and the arm it belongs to is struck from every verdict.
//
// ═══ THE SCENE AND THE GRAIN, SET BEFORE ANYTHING WAS BUILT ═══════════════════════════════════
//
// 2000 OBJECTS PER PASS, 200 PASSES PER TIMED REGION (× batch) = 400 000 objects per region. A
// timed region is read off ONE clock, so every median is a multiple of `quantum ÷ passes`, and the
// per-object grain is that divided again by 2000. At the 0.1 ms quantum this machine reports:
//
//   batch 1   0.100 / 200 = 0.000500 ms per pass ÷ 2000 = 0.250 ns PER OBJECT  (4 grains = 1.00 ns)
//   batch 2   0.000250 ms per pass ÷ 2000            = 0.125 ns PER OBJECT  (4 grains = 0.50 ns)
//
// THE SMALLEST QUANTITY IN DISPUTE IS (P1)'s LOWER BOUND, 3 ns per object, which is twelve grains at
// batch 1. BATCH 1 IS THE ONE TO RUN and the escalation is batch 2, never more rounds: a quantised
// median moves in grains and only the batch moves the grain. The arithmetic is printed by the run
// from the OBSERVED quantum rather than from this comment.
//
// THE LIVE SET IS 2000 OBJECTS, not 400 000: the sink has `OBJECTS` slots and every pass overwrites
// all of them, so each pass's objects die during the next. A region therefore allocates ~400 000
// short-lived objects and keeps 2000 — which is exactly the shape a per-instance receiver has, and
// is why the sink is a fixed array rather than a growing one.
//
// ═══ WHAT THIS AXIS CANNOT SAY. Read this before quoting anything from it. ════════════════════
//
//  * NOTHING ABOUT ANY `@exodra` PACKAGE. It imports none, renders nothing and touches no DOM. A
//    figure from this file is a figure about four JavaScript spellings on one engine, and the
//    server axis's 99.8 ns is not re-measured here — its scene had eight receivers per instance, a
//    connector, a schema and a writer per port, none of which exist in this file.
//  * NOTHING ABOUT ALLOCATION SEPARATELY FROM THE COLLECTION IT CAUSES. A region allocates
//    ~400 000 objects and the GC runs inside it; `plain`'s objects carry a fourth field and
//    `create`'s carry a separate backing store, so the arms do not make equal amounts of garbage.
//    The forced GC before each region is outside it. No per-arm heap column is printed.
//  * NOTHING ABOUT A CONSTRUCTOR SEPARATELY FROM ITS FRAME. `ctor ↔ protoLiteral` bounds the
//    literal's install FROM ONE SIDE ONLY: a `ctor` that is cheaper proves the install costs more
//    than a frame, and a `ctor` that is not proves nothing about the install at all.
//  * NOTHING ABOUT `create` SEPARATELY FROM WHERE IT PUTS THE FIELDS. `Object.create` and
//    "grown by assignment" cannot be spelled apart — that IS the spelling — so its row prices both
//    together, which is what a user who writes it would pay.
//  * NOTHING ABOUT A RECEIVER READ MANY TIMES. Every object here is built, called ONCE and dropped,
//    which is the worst possible amortisation for construction and the best for the method. A
//    receiver read k>1 times is a different axis and it is not built.
//  * NOTHING ABOUT MEMORY, TEARDOWN, UPDATES OR ANY WALL-CLOCK QUANTITY.
//  * NOTHING ABOUT ANOTHER ENGINE. Every mechanism named above is V8's.
//
// ═══ HOW TO RUN IT ════════════════════════════════════════════════════════════════════════════
//
//     npm run axis --workspace=@exodra/benchmarks -- receiver-spelling 100 1 --record=first
//
// Ten phases × ~6 ms of timed region per round plus a GC pair before each: well under a minute at
// 100 rounds. THE ESCALATION IS `receiver-spelling 100 2`, never more rounds.
//
// IF THE RUNNER'S STALE-`dist/` GATE REFUSES THE RECORDING, `--no-record` IS SAFE FOR THIS AXIS AND
// FOR ALMOST NO OTHER: that gate exists because this suite measures built packages, and this file
// reads none. A reading taken here is the same reading whatever state `packages/*/dist` is in.
import { emitRecordedRows, type Scenario, type Stat } from '../../../harness';

// eslint-disable-next-line no-console
const line = (s: string): void => console.log(`✅ ${s}`);
// eslint-disable-next-line no-console
const refuse = (s: string): void => console.log(`❌ ${s}`);

const OBJECTS = 2000;
const REPS = 200;
const MIN_TICKS = 3;

type Arm = 'protoLiteral' | 'ctor' | 'create' | 'plain' | 'hoisted';
const ARMS: readonly Arm[] = ['protoLiteral', 'ctor', 'create', 'plain', 'hoisted'];

interface TReceiver {
    a: number;
    b: number;
    c: number;
    m(): number;
}

function fillSink(one: TReceiver): TReceiver[] {
    const out: TReceiver[] = [];
    for (let i = 0; i < OBJECTS; i++) out.push(one);
    return out;
}

// ---------------------------------------------------------------------------------------
// ARM 1 — THE OBJECT LITERAL WITH A `__proto__:` KEY.
// ---------------------------------------------------------------------------------------

const PROTO_LITERAL_A = {
    m(this: TReceiver): number {
        return this.a + this.b * this.c;
    },
};
const PROTO_LITERAL_B = {
    m(this: TReceiver): number {
        return this.a + this.b * this.c;
    },
};

const sampleProtoLiteralA = (): TReceiver =>
    ({ __proto__: PROTO_LITERAL_A, a: 0, b: 1, c: 1 } as unknown as TReceiver);
const sampleProtoLiteralB = (): TReceiver =>
    ({ __proto__: PROTO_LITERAL_B, a: 0, b: 1, c: 1 } as unknown as TReceiver);

const SINK_PROTO_LITERAL_A = fillSink(sampleProtoLiteralA());
const SINK_PROTO_LITERAL_B = fillSink(sampleProtoLiteralB());

function runProtoLiteralA(): number {
    const sink = SINK_PROTO_LITERAL_A;
    const P = PROTO_LITERAL_A;
    let acc = 0;
    for (let i = 0; i < OBJECTS; i++) {
        const o = { __proto__: P, a: i, b: (i & 7) + 1, c: (i & 3) + 1 } as unknown as TReceiver;
        sink[i] = o;
        acc += o.m();
    }
    return acc;
}

function runProtoLiteralB(): number {
    const sink = SINK_PROTO_LITERAL_B;
    const P = PROTO_LITERAL_B;
    let acc = 0;
    for (let i = 0; i < OBJECTS; i++) {
        const o = { __proto__: P, a: i, b: (i & 7) + 1, c: (i & 3) + 1 } as unknown as TReceiver;
        sink[i] = o;
        acc += o.m();
    }
    return acc;
}

// ---------------------------------------------------------------------------------------
// ARM 2 — THE CONSTRUCTOR. Same three fields, same order, method on `.prototype`, made by `new`.
// ---------------------------------------------------------------------------------------

class ExoReceiverCtorA {
    readonly a: number;
    readonly b: number;
    readonly c: number;

    constructor(a: number, b: number, c: number) {
        this.a = a;
        this.b = b;
        this.c = c;
    }

    m(): number {
        return this.a + this.b * this.c;
    }
}

class ExoReceiverCtorB {
    readonly a: number;
    readonly b: number;
    readonly c: number;

    constructor(a: number, b: number, c: number) {
        this.a = a;
        this.b = b;
        this.c = c;
    }

    m(): number {
        return this.a + this.b * this.c;
    }
}

const sampleCtorA = (): TReceiver => new ExoReceiverCtorA(0, 1, 1);
const sampleCtorB = (): TReceiver => new ExoReceiverCtorB(0, 1, 1);

const SINK_CTOR_A = fillSink(sampleCtorA());
const SINK_CTOR_B = fillSink(sampleCtorB());

function runCtorA(): number {
    const sink = SINK_CTOR_A;
    const C = ExoReceiverCtorA;
    let acc = 0;
    for (let i = 0; i < OBJECTS; i++) {
        const o = new C(i, (i & 7) + 1, (i & 3) + 1);
        sink[i] = o;
        acc += o.m();
    }
    return acc;
}

function runCtorB(): number {
    const sink = SINK_CTOR_B;
    const C = ExoReceiverCtorB;
    let acc = 0;
    for (let i = 0; i < OBJECTS; i++) {
        const o = new C(i, (i & 7) + 1, (i & 3) + 1);
        sink[i] = o;
        acc += o.m();
    }
    return acc;
}

// ---------------------------------------------------------------------------------------
// ARM 3 — `Object.create` AND THREE ASSIGNMENTS. The fields are GROWN onto the object rather than
// present when it is built, which is the one thing this spelling cannot avoid.
// ---------------------------------------------------------------------------------------

const PROTO_CREATE_A = {
    m(this: TReceiver): number {
        return this.a + this.b * this.c;
    },
};
const PROTO_CREATE_B = {
    m(this: TReceiver): number {
        return this.a + this.b * this.c;
    },
};

function sampleCreateA(): TReceiver {
    const o = Object.create(PROTO_CREATE_A) as TReceiver;
    o.a = 0;
    o.b = 1;
    o.c = 1;
    return o;
}

function sampleCreateB(): TReceiver {
    const o = Object.create(PROTO_CREATE_B) as TReceiver;
    o.a = 0;
    o.b = 1;
    o.c = 1;
    return o;
}

const SINK_CREATE_A = fillSink(sampleCreateA());
const SINK_CREATE_B = fillSink(sampleCreateB());

function runCreateA(): number {
    const sink = SINK_CREATE_A;
    const P = PROTO_CREATE_A;
    let acc = 0;
    for (let i = 0; i < OBJECTS; i++) {
        const o = Object.create(P) as TReceiver;
        o.a = i;
        o.b = (i & 7) + 1;
        o.c = (i & 3) + 1;
        sink[i] = o;
        acc += o.m();
    }
    return acc;
}

function runCreateB(): number {
    const sink = SINK_CREATE_B;
    const P = PROTO_CREATE_B;
    let acc = 0;
    for (let i = 0; i < OBJECTS; i++) {
        const o = Object.create(P) as TReceiver;
        o.a = i;
        o.b = (i & 7) + 1;
        o.c = (i & 3) + 1;
        sink[i] = o;
        acc += o.m();
    }
    return acc;
}

// ---------------------------------------------------------------------------------------
// ARM 4 — THE CONTROL. The same literal allocation with the `__proto__:` key removed and the shared
// method carried as an own field instead. ONE function object for the process, as everywhere else:
// this arm allocates no closure and the pointer gate proves it.
// ---------------------------------------------------------------------------------------

const PLAIN_METHOD_A = function (this: TReceiver): number {
    return this.a + this.b * this.c;
};
const PLAIN_METHOD_B = function (this: TReceiver): number {
    return this.a + this.b * this.c;
};

const samplePlainA = (): TReceiver =>
    ({ a: 0, b: 1, c: 1, m: PLAIN_METHOD_A } as unknown as TReceiver);
const samplePlainB = (): TReceiver =>
    ({ a: 0, b: 1, c: 1, m: PLAIN_METHOD_B } as unknown as TReceiver);

const SINK_PLAIN_A = fillSink(samplePlainA());
const SINK_PLAIN_B = fillSink(samplePlainB());

function runPlainA(): number {
    const sink = SINK_PLAIN_A;
    const M = PLAIN_METHOD_A;
    let acc = 0;
    for (let i = 0; i < OBJECTS; i++) {
        const o = { a: i, b: (i & 7) + 1, c: (i & 3) + 1, m: M } as unknown as TReceiver;
        sink[i] = o;
        acc += o.m();
    }
    return acc;
}

function runPlainB(): number {
    const sink = SINK_PLAIN_B;
    const M = PLAIN_METHOD_B;
    let acc = 0;
    for (let i = 0; i < OBJECTS; i++) {
        const o = { a: i, b: (i & 7) + 1, c: (i & 3) + 1, m: M } as unknown as TReceiver;
        sink[i] = o;
        acc += o.m();
    }
    return acc;
}

// ---------------------------------------------------------------------------------------
// ARM 5 — THE INSTRUMENT ROW. Everything the other four do EXCEPT allocate.
// ---------------------------------------------------------------------------------------

const PROTO_HOISTED_A = {
    m(this: TReceiver): number {
        return this.a + this.b * this.c;
    },
};
const PROTO_HOISTED_B = {
    m(this: TReceiver): number {
        return this.a + this.b * this.c;
    },
};

const HOISTED_A = { __proto__: PROTO_HOISTED_A, a: 0, b: 1, c: 1 } as unknown as TReceiver;
const HOISTED_B = { __proto__: PROTO_HOISTED_B, a: 0, b: 1, c: 1 } as unknown as TReceiver;

const SINK_HOISTED_A = fillSink(HOISTED_A);
const SINK_HOISTED_B = fillSink(HOISTED_B);

function runHoistedA(): number {
    const sink = SINK_HOISTED_A;
    const o = HOISTED_A;
    let acc = 0;
    for (let i = 0; i < OBJECTS; i++) {
        o.a = i;
        o.b = (i & 7) + 1;
        o.c = (i & 3) + 1;
        sink[i] = o;
        acc += o.m();
    }
    return acc;
}

function runHoistedB(): number {
    const sink = SINK_HOISTED_B;
    const o = HOISTED_B;
    let acc = 0;
    for (let i = 0; i < OBJECTS; i++) {
        o.a = i;
        o.b = (i & 7) + 1;
        o.c = (i & 3) + 1;
        sink[i] = o;
        acc += o.m();
    }
    return acc;
}

// ---------------------------------------------------------------------------------------

interface Program {
    readonly name: string;
    readonly arm: Arm;
    readonly twin: boolean;
    readonly allocations: string;
    readonly stores: number;
    readonly framesPerObject: number;
    readonly framesPerCall: number;
    readonly loadsPerCall: number;
    readonly fieldsLiveIn: string;
    readonly what: string;
    readonly run: () => number;
    readonly sample: () => TReceiver;
    readonly sink: TReceiver[];
    readonly method: unknown;
    readonly proto: object;
}

function rowName(arm: Arm, twin: boolean): string {
    return `${arm}${twin ? '·twin' : ''}`;
}

const PROGRAMS: readonly Program[] = [
    {
        name: rowName('protoLiteral', false),
        arm: 'protoLiteral',
        twin: false,
        allocations: '1',
        stores: 3,
        framesPerObject: 0,
        framesPerCall: 1,
        loadsPerCall: 4,
        fieldsLiveIn: 'in-object (literal boilerplate slots)',
        what:
            'THE SPELLING IN DISPUTE — `{ __proto__: P, a, b, c }` with P a variable, so the ' +
            'prototype cannot be baked into the literal boilerplate and is installed onto the ' +
            'object after creation',
        run: runProtoLiteralA,
        sample: sampleProtoLiteralA,
        sink: SINK_PROTO_LITERAL_A,
        method: PROTO_LITERAL_A.m,
        proto: PROTO_LITERAL_A,
    },
    {
        name: rowName('protoLiteral', true),
        arm: 'protoLiteral',
        twin: true,
        allocations: '1',
        stores: 3,
        framesPerObject: 0,
        framesPerCall: 1,
        loadsPerCall: 4,
        fieldsLiveIn: 'in-object (literal boilerplate slots)',
        what: 'the same program declared again — its own prototype, its own method body, its own sink',
        run: runProtoLiteralB,
        sample: sampleProtoLiteralB,
        sink: SINK_PROTO_LITERAL_B,
        method: PROTO_LITERAL_B.m,
        proto: PROTO_LITERAL_B,
    },
    {
        name: rowName('ctor', false),
        arm: 'ctor',
        twin: false,
        allocations: '1',
        stores: 3,
        framesPerObject: 1,
        framesPerCall: 1,
        loadsPerCall: 4,
        fieldsLiveIn: "in-object (the constructor's initial map)",
        what:
            'THE SAME SHAPE ALLOCATED THROUGH `new` — identical fields in identical order over a ' +
            'method on `.prototype`. PAYS ONE CONSTRUCTOR FRAME PER OBJECT that no other arm ' +
            'pays and that no spelling of a constructor omits',
        run: runCtorA,
        sample: sampleCtorA,
        sink: SINK_CTOR_A,
        method: ExoReceiverCtorA.prototype.m,
        proto: ExoReceiverCtorA.prototype,
    },
    {
        name: rowName('ctor', true),
        arm: 'ctor',
        twin: true,
        allocations: '1',
        stores: 3,
        framesPerObject: 1,
        framesPerCall: 1,
        loadsPerCall: 4,
        fieldsLiveIn: "in-object (the constructor's initial map)",
        what: 'the same program declared again — its own class, its own prototype, its own sink',
        run: runCtorB,
        sample: sampleCtorB,
        sink: SINK_CTOR_B,
        method: ExoReceiverCtorB.prototype.m,
        proto: ExoReceiverCtorB.prototype,
    },
    {
        name: rowName('create', false),
        arm: 'create',
        twin: false,
        allocations: '1 + a properties backing store',
        stores: 3,
        framesPerObject: 1,
        framesPerCall: 1,
        loadsPerCall: 4,
        fieldsLiveIn: 'NOT in-object — grown by assignment, three map transitions',
        what:
            '`Object.create(P)` and then three assignments. The prototype is chosen at creation ' +
            'and costs nothing to install, and the fields are GROWN onto an object with no ' +
            'in-object slots — the two cannot be spelled apart, so this row prices both',
        run: runCreateA,
        sample: sampleCreateA,
        sink: SINK_CREATE_A,
        method: PROTO_CREATE_A.m,
        proto: PROTO_CREATE_A,
    },
    {
        name: rowName('create', true),
        arm: 'create',
        twin: true,
        allocations: '1 + a properties backing store',
        stores: 3,
        framesPerObject: 1,
        framesPerCall: 1,
        loadsPerCall: 4,
        fieldsLiveIn: 'NOT in-object — grown by assignment, three map transitions',
        what: 'the same program declared again — its own prototype, its own method body, its own sink',
        run: runCreateB,
        sample: sampleCreateB,
        sink: SINK_CREATE_B,
        method: PROTO_CREATE_B.m,
        proto: PROTO_CREATE_B,
    },
    {
        name: rowName('plain', false),
        arm: 'plain',
        twin: false,
        allocations: '1',
        stores: 4,
        framesPerObject: 0,
        framesPerCall: 1,
        loadsPerCall: 4,
        fieldsLiveIn: 'in-object; `m` is the fourth field',
        what:
            'THE CONTROL — the same literal allocation with the `__proto__:` key removed and the ' +
            'ONE shared function object carried as an own field. Four field stores, no prototype ' +
            'work of any kind, and the method found on the receiver rather than through its map',
        run: runPlainA,
        sample: samplePlainA,
        sink: SINK_PLAIN_A,
        method: PLAIN_METHOD_A,
        proto: Object.prototype,
    },
    {
        name: rowName('plain', true),
        arm: 'plain',
        twin: true,
        allocations: '1',
        stores: 4,
        framesPerObject: 0,
        framesPerCall: 1,
        loadsPerCall: 4,
        fieldsLiveIn: 'in-object; `m` is the fourth field',
        what:
            'the same program declared again — its own method function object and its own sink. ' +
            'It CANNOT have its own prototype: `Object.prototype` is what "no chosen prototype" ' +
            'means, and the pointer gate says so rather than hiding it',
        run: runPlainB,
        sample: samplePlainB,
        sink: SINK_PLAIN_B,
        method: PLAIN_METHOD_B,
        proto: Object.prototype,
    },
    {
        name: rowName('hoisted', false),
        arm: 'hoisted',
        twin: false,
        allocations: '0',
        stores: 3,
        framesPerObject: 0,
        framesPerCall: 1,
        loadsPerCall: 4,
        fieldsLiveIn: 'in-object, written again every iteration',
        what:
            'THE INSTRUMENT ROW, NOT ONE OF THE FOUR — one receiver built at module load, its ' +
            'three fields re-stored, its method called and itself stored into the sink. It is ' +
            "every other row's tail with the allocation and nothing else removed, so its median " +
            'IS what the loop, the stores, the call and the escape cost',
        run: runHoistedA,
        sample: (): TReceiver => HOISTED_A,
        sink: SINK_HOISTED_A,
        method: PROTO_HOISTED_A.m,
        proto: PROTO_HOISTED_A,
    },
    {
        name: rowName('hoisted', true),
        arm: 'hoisted',
        twin: true,
        allocations: '0',
        stores: 3,
        framesPerObject: 0,
        framesPerCall: 1,
        loadsPerCall: 4,
        fieldsLiveIn: 'in-object, written again every iteration',
        what: 'the same program declared again — its own receiver, its own prototype, its own sink',
        run: runHoistedB,
        sample: (): TReceiver => HOISTED_B,
        sink: SINK_HOISTED_B,
        method: PROTO_HOISTED_B.m,
        proto: PROTO_HOISTED_B,
    },
];

// ---------------------------------------------------------------------------------------
// THE GATES.
// ---------------------------------------------------------------------------------------

function expectedTotal(): number {
    let acc = 0;
    for (let i = 0; i < OBJECTS; i++) acc += i + ((i & 7) + 1) * ((i & 3) + 1);
    return acc;
}

function gateWork(): string[] {
    const want = expectedTotal();
    const out = [
        `  the accumulator every program must return: ${want} — computed here from the loop's ` +
            'own arithmetic and not from any arm',
    ];
    for (const p of PROGRAMS) {
        const got = p.run();
        if (got !== want) {
            throw new Error(
                `receiver-spelling: "${p.name}" returned ${got} where every program must return ` +
                    `${want}. The arms are not doing identical work and nothing may be timed.`
            );
        }
    }
    out.push(
        `  all ${PROGRAMS.length} programs return it — identical work per call, identical values, ` +
            'identical count'
    );
    return out;
}

function gateEscape(): string[] {
    const out: string[] = [];
    for (const p of PROGRAMS) {
        p.run();
        const sink = p.sink;
        if (sink.length !== OBJECTS) {
            throw new Error(
                `receiver-spelling: "${p.name}" left ${sink.length} entries in its sink where ` +
                    `${OBJECTS} were expected — the array grew or shrank and its element kind is ` +
                    'no longer what every other arm has.'
            );
        }
        const distinct = new Set<TReceiver>(sink).size;
        const wantDistinct = p.arm === 'hoisted' ? 1 : OBJECTS;
        if (distinct !== wantDistinct) {
            throw new Error(
                `receiver-spelling: "${p.name}" left ${distinct} DISTINCT objects in its sink ` +
                    `where ${wantDistinct} were expected. ${
                        p.arm === 'hoisted'
                            ? 'The hoisted arm must store one receiver into every slot.'
                            : 'An allocating arm whose sink does not hold one object per slot ' +
                              'either did not allocate them or did not let them escape, and its ' +
                              'row would be a measurement of an empty loop.'
                    }`
            );
        }
        const last = sink[OBJECTS - 1];
        const wantLast = OBJECTS - 1 + (((OBJECTS - 1) & 7) + 1) * (((OBJECTS - 1) & 3) + 1);
        if (last.a !== OBJECTS - 1 || last.m() !== wantLast) {
            throw new Error(
                `receiver-spelling: "${p.name}" left a sink entry that does not read back — a=` +
                    `${last.a}, m()=${last.m()}, expected a=${OBJECTS - 1}, m()=${wantLast}.`
            );
        }
        if (p.arm !== 'hoisted') {
            const mid = sink[OBJECTS >> 1];
            if (mid.a !== OBJECTS >> 1) {
                throw new Error(
                    `receiver-spelling: "${p.name}" sink entry ${OBJECTS >> 1} carries a=${
                        mid.a
                    }, ` + 'so slot i does not hold the object built at i.'
                );
            }
        }
        out.push(
            `  ${p.name.padEnd(18)}${sink.length} entries · ${distinct} distinct · entry i reads ` +
                `back at i · m() answers — ${
                    p.arm === 'hoisted'
                        ? 'ONE receiver in every slot, which is what this row is'
                        : 'the objects were materialised and could not have been scalarised'
                }`
        );
    }
    return out;
}

function gateShape(): string[] {
    const out: string[] = [];
    for (const p of PROGRAMS) {
        const one = p.sample();
        const two = p.sample();
        const keys = Object.keys(one);
        const wantKeys = p.arm === 'plain' ? 'a,b,c,m' : 'a,b,c';
        if (keys.join(',') !== wantKeys) {
            throw new Error(
                `receiver-spelling: "${p.name}" builds own keys [${keys.join(',')}] where ` +
                    `[${wantKeys}] was declared. The arms do not have identical fields in ` +
                    'identical order.'
            );
        }
        const ownMethod = Object.prototype.hasOwnProperty.call(one, 'm');
        if (ownMethod !== (p.arm === 'plain')) {
            throw new Error(
                `receiver-spelling: "${p.name}" ${
                    ownMethod ? 'has' : 'does not have'
                } \`m\` as an ` + 'own property, which is the opposite of what this arm is.'
            );
        }
        if (Object.getPrototypeOf(one) !== p.proto) {
            throw new Error(
                `receiver-spelling: "${p.name}" does not carry the prototype it declares. The ` +
                    '`__proto__:` key may have been treated as an ordinary property.'
            );
        }
        if (one.m !== two.m) {
            throw new Error(
                `receiver-spelling: "${p.name}" hands two of its objects DIFFERENT function ` +
                    'objects for `m`. A method that is not shared is a closure per object, which ' +
                    'is not what any arm here claims to be.'
            );
        }
        if (p.arm !== 'hoisted' && one === two) {
            throw new Error(
                `receiver-spelling: "${p.name}" returned the same object twice — an allocating ` +
                    'arm that does not allocate.'
            );
        }
        out.push(
            `  ${p.name.padEnd(18)}own keys [${keys.join(',')}] · \`m\` ${
                ownMethod ? 'OWN' : 'on the prototype'
            } · prototype as declared · the SAME function object on two separate receivers`
        );
    }
    return out;
}

function gateSeparate(): string[] {
    const methods = new Set<unknown>(PROGRAMS.map((p) => p.method));
    if (methods.size !== PROGRAMS.length) {
        throw new Error(
            `receiver-spelling: the ${PROGRAMS.length} programs declare only ${methods.size} ` +
                'distinct method function objects. Two programs sharing a method share an inline ' +
                'cache and a compilation, and the pair between them would measure nothing.'
        );
    }
    const sinks = new Set<TReceiver[]>(PROGRAMS.map((p) => p.sink));
    if (sinks.size !== PROGRAMS.length) {
        throw new Error(
            `receiver-spelling: the ${PROGRAMS.length} programs share ${
                PROGRAMS.length - sinks.size
            } sink array(s). Every program must own its escape route.`
        );
    }
    const shaped = PROGRAMS.filter((p) => p.arm !== 'plain');
    const protos = new Set<object>(shaped.map((p) => p.proto));
    if (protos.size !== shaped.length) {
        throw new Error(
            `receiver-spelling: the ${shaped.length} prototype-carrying programs declare only ` +
                `${protos.size} distinct prototype objects.`
        );
    }
    return [
        `  ${PROGRAMS.length} distinct method function objects · ${PROGRAMS.length} distinct sink ` +
            `arrays · ${protos.size} distinct prototypes across the ${shaped.length} ` +
            'prototype-carrying programs — checked BY POINTER',
        '  the two `plain` rows share `Object.prototype`, which is what "no chosen prototype" ' +
            'means and is the one thing they cannot own separately. Their method function objects ' +
            'are separately declared and are in the count above.',
    ];
}

// ---------------------------------------------------------------------------------------
// THE CLOCK AND THE RUNNER.
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

// ---------------------------------------------------------------------------------------

interface Comparison {
    readonly a: Arm;
    readonly b: Arm;
    readonly note: string;
}

const COMPARISONS: readonly Comparison[] = [
    {
        a: 'protoLiteral',
        b: 'ctor',
        note:
            'THE PRE-REGISTERED PAIR (P1) — same three fields in the same order, same shared ' +
            'method, same call site, same escape; the literal has its prototype installed onto it ' +
            'after creation, the constructor allocates with a fixed initial map. FUSED with ONE ' +
            'CONSTRUCTOR FRAME per object, which is the one thing a constructor cannot be spelled ' +
            'without and which TurboFan may inline away',
    },
    {
        a: 'protoLiteral',
        b: 'plain',
        note:
            'THE SAME LITERAL ALLOCATION WITH AND WITHOUT THE `__proto__:` KEY — the narrowest ' +
            'statement of the question on this axis. FUSED with one extra field store (`plain` ' +
            'carries the method as its fourth field and cannot be spelled with three) and with ' +
            'where the method load lands, on the receiver instead of through its map',
    },
    {
        a: 'ctor',
        b: 'hoisted',
        note:
            'THE INSTRUMENT CHECK (P2) — one allocation PLUS one constructor frame against ' +
            'neither, everything else identical. IF THIS DOES NOT RESOLVE, this axis cannot see ' +
            'an allocation and (P1) is NOT JUDGED',
    },
    {
        a: 'protoLiteral',
        b: 'hoisted',
        note:
            'ONE `__proto__:` LITERAL ALLOCATION AGAINST NONE — same three stores, same ' +
            'prototype-borne method, same call, same escape. The tightest pair on the axis, and ' +
            'it fuses the allocation with the install because that spelling contains both',
    },
    {
        a: 'plain',
        b: 'hoisted',
        note: 'one plain-literal allocation and one extra field store against neither',
    },
    {
        a: 'create',
        b: 'hoisted',
        note:
            'one `Object.create` frame, one allocation, a properties backing store and three map ' +
            'transitions against none of it',
    },
    {
        a: 'create',
        b: 'ctor',
        note:
            'TWO SPELLINGS THAT BOTH CHOOSE THE PROTOTYPE AT CREATION AND NEITHER INSTALLS ONE — ' +
            'so what separates them is where the fields end up, in-object against a grown backing ' +
            'store, plus a builtin frame against a constructor frame',
    },
    {
        a: 'create',
        b: 'protoLiteral',
        note:
            'the prototype chosen at creation against the prototype installed afterwards, FUSED ' +
            'with the backing store and the builtin frame — this pair cannot isolate the install',
    },
    {
        a: 'ctor',
        b: 'plain',
        note:
            'the same allocation from an initial map against one from a literal boilerplate, ' +
            'MINUS one constructor frame and PLUS one field store',
    },
];

export function benchmarkReceiverSpelling(rounds = 100, batch = 1): void {
    const f = (x: number): string => x.toFixed(4);
    const f6 = (x: number): string => x.toFixed(6);
    const sign = (x: number): string => (x >= 0 ? `+${x.toFixed(4)}` : x.toFixed(4));
    const nsRaw = (x: number): number => (x * 1e6) / OBJECTS;
    const nsO = (x: number): string => `${nsRaw(x).toFixed(3)} ns/obj`;

    const quantum = observeTimerQuantum();
    line(
        `receiver-spelling: observed timer quantum (${quantum.toFixed(3)} ms) — every timed ` +
            `region below must clear ${(MIN_TICKS * quantum).toFixed(3)} ms (${MIN_TICKS}×) or ` +
            'its digits are quantisation. THE CLOCK CHECK RUNS BEFORE THE VERDICTS and strikes ' +
            'any such row out of them.'
    );

    line('');
    line(
        'THE SHAPE, AS BUILT — checked by pointer and by key order, not assumed. Nothing here ' +
            'imports any @exodra package: this axis is five straight-line programs and a clock.'
    );
    for (const l of gateShape()) line(l);
    for (const l of gateSeparate()) line(l);

    line('');
    line(
        'THE WORK GATE — every program must return the same accumulator, so the arms differ in ' +
            'HOW THE RECEIVER IS MADE and in nothing else.'
    );
    for (const l of gateWork()) line(l);

    line('');
    line(
        'THE ESCAPE GATE — the whole sink read back after a run. This is what stops the four ' +
            'arms being four measurements of an empty loop.'
    );
    for (const l of gateEscape()) line(l);

    const reps = REPS * batch;
    const grain = quantum / reps;
    const grainObj = (grain * 1e6) / OBJECTS;
    const grains = (x: number): number => Math.round(Math.abs(x) / grain);

    line('');
    line("CENSUS — read off this file's own text, nothing measured");
    line(`  objects per pass            ${OBJECTS}`);
    line(`  passes per timed region     ${reps}  (REPS ${REPS} × batch ${batch})`);
    line(`  objects per timed region    ${OBJECTS * reps}`);
    line(
        `  live objects at any time    ${OBJECTS} — the sink has ${OBJECTS} slots and every pass ` +
            "overwrites all of them, so each pass's objects die during the next"
    );
    for (const p of PROGRAMS) {
        if (p.twin) continue;
        line(
            `  ${p.arm.padEnd(14)}alloc ${p.allocations.padEnd(30)} stores ${p.stores} · fr/o ` +
                `${p.framesPerObject} · fr/c ${p.framesPerCall} · loads/c ${p.loadsPerCall} · ` +
                `fields ${p.fieldsLiveIn}`
        );
    }
    line(
        '  THE ESCAPE                  one element store per object into a packed module-level ' +
            `array of ${OBJECTS}, plus its generational write barrier and its bounds check. ` +
            'IDENTICAL IN ALL FIVE ARMS, so it cancels in every pair — and `hoisted` is the row ' +
            'that prices it and the rest of the tail together, in ns per object, below.'
    );
    line(
        '  FRAMES ARE SOURCE FRAMES    TurboFan may inline the method at every one of these ' +
            'monomorphic sites and may inline the constructor too. That makes the `ctor` arm’s ' +
            'fused frame SMALLER than the column suggests, which is the direction that makes (P1) ' +
            'harder to hold rather than easier.'
    );
    line(
        `  THE GRAIN                   ${f6(grain)} ms per pass = ${grainObj.toFixed(4)} ns PER ` +
            `OBJECT (quantum ${quantum.toFixed(3)} over ${reps} passes per region). EVERY MEDIAN ` +
            'BELOW IS A MULTIPLE OF IT, and the table prints median ÷ grain beside each one.'
    );
    line(
        `  FOUR GRAINS                 ${(4 * grainObj).toFixed(4)} ns per object. (P1)’s lower ` +
            `bound is 3 ns/obj = ${Math.round(3 / grainObj)} grains, so this batch can express ` +
            'the smallest quantity the prediction commits to.'
    );
    line(
        '  THE QUOTING RULE            a difference must clear BOTH its own two arms’ resolution ' +
            'AND FOUR GRAINS to be quoted as a size.'
    );
    line(
        '  THE ESTIMATOR               every pair below — nulls AND subjects — goes through ONE ' +
            'function (`pairedGap`), and the quoted difference is its ORDER-BALANCED `intrinsic`.'
    );

    const phases: Phase[] = PROGRAMS.map((p) => ({
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
    for (const p of phases) stats.set(p.name, stat(seriesOf(p.name)));
    const median = (name: string): number => (stats.get(name) as Stat).median;

    // BEFORE the human table: the recorder's scraper latches off on this line, and this table's
    // eleven columns match no shape in its ladder, so a table printed first is refused.
    emitRecordedRows(
        'RECEIVER SPELLING',
        'ms',
        'pass',
        PROGRAMS.map((p) => [p.name, stats.get(p.name) as Stat] as const)
    );

    line('');
    line(
        `RECEIVER SPELLING — ${OBJECTS} objects per pass [ms per pass] · interleaved, direction ` +
            `alternating · ${rounds} rounds · batch ${batch} · ${reps} passes per timed region · ` +
            'GC before every timed region'
    );
    line(
        '                   st fr/o fr/c   reps    min      p25      median   p75      max      ' +
            'med/grain  ticks   ns/obj'
    );
    for (const p of PROGRAMS) {
        const s = stats.get(p.name) as Stat;
        const region = s.median * reps;
        line(
            `${p.name.padEnd(17)}${String(p.stores).padStart(3)}` +
                `${String(p.framesPerObject).padStart(5)}${String(p.framesPerCall).padStart(5)}` +
                `${String(reps).padStart(7)}   ` +
                `${f(s.min)}   ${f(s.p25)}   ${f(s.median)}   ${f(s.p75)}   ${f(s.max)}   ` +
                `${(s.median / grain).toFixed(1).padStart(9)}  ${(region / quantum)
                    .toFixed(1)
                    .padStart(6)}   ${nsRaw(s.median).toFixed(3)}`
        );
    }
    line(
        '  st = FIELD STORES PER OBJECT.  fr/o = SOURCE CALL FRAMES PER OBJECT BUILT.  fr/c = ' +
            'SOURCE CALL FRAMES PER METHOD CALL.  med/grain = the median divided by one grain ' +
            `(${f6(grain)} ms) — IF THIS IS A SMALL INTEGER THE ROW IS THE CLOCK AND NOT THE ` +
            'PROGRAM.  ticks = the whole timed region divided by the observed quantum.'
    );
    line('');
    for (const p of PROGRAMS) line(`  ${p.name.padEnd(17)} ${p.what}`);

    line('');
    line(
        `THE CLOCK CHECK — run BEFORE the nulls, the gaps and the predictions. A region under ` +
            `${MIN_TICKS} ticks is EXCLUDED from all three, not footnoted after them.`
    );
    const excluded = new Set<string>();
    const excludedArms = new Set<Arm>();
    for (const p of PROGRAMS) {
        const region = (stats.get(p.name) as Stat).median * reps;
        const ticks = region / quantum;
        if (ticks >= MIN_TICKS) {
            line(
                `  ${p.name.padEnd(17)}region ${region.toFixed(3)} ms = ${ticks.toFixed(
                    1
                )} ticks — clears the ${MIN_TICKS}× floor`
            );
            continue;
        }
        excluded.add(p.name);
        excludedArms.add(p.arm);
        const wantBatch = ticks > 0 ? Math.ceil((batch * MIN_TICKS) / ticks) : batch * 10;
        refuse(
            `receiver-spelling: the "${p.name}" timed region is ${region.toFixed(
                3
            )} ms at ${reps} passes — ${ticks.toFixed(1)}× the observed quantum (${quantum.toFixed(
                3
            )} ms), under the ${MIN_TICKS}× floor. Its digits are quantisation, not measurement, ` +
                `so THE WHOLE "${p.arm}" ARM — this row AND its twin, hence its resolution — IS ` +
                'EXCLUDED from every null, every gap and every prediction below. Re-run with ' +
                `batch ${wantBatch}: \`npm run axis --workspace=@exodra/benchmarks -- ` +
                `receiver-spelling ${rounds} ${wantBatch}\``
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
    for (const arm of ARMS) {
        const a = rowName(arm, false);
        const b = rowName(arm, true);
        nullOf.set(arm, pairedGap(seriesOf(a), seriesOf(b), posOf(a), posOf(b)));
    }
    const resOf = (name: string): number => {
        const arm = (PROGRAMS.find((p) => p.name === name) as Program).arm;
        return (nullOf.get(arm) as Gap).resolution;
    };

    line('');
    line(
        `NULLS — ${ARMS.length} pairs, one per arm, each a separately declared copy of its ` +
            'program (its own prototype, its own method function object, its own class where it ' +
            'has one, its own sink). True Δ = 0.'
    );
    // THE HEADER AND THE FOUR SIX-DECIMAL COLUMNS ARE WHAT `run-one-axis.js` SCRAPES (`NULL_HEAD`,
    // `NULL_ROW`, `NULL_RESOLUTION`). Change the spelling and the recording silently loses its
    // resolution block.
    line(
        '  null            bias      noise     p75       worst     order     intrinsic  what it is'
    );
    let worstRes = 0;
    for (const arm of ARMS) {
        const name = rowName(arm, false);
        const v = nullOf.get(arm) as Gap;
        if (v.resolution > worstRes) worstRes = v.resolution;
        line(
            `  ${name.padEnd(14)}${f6(v.bias)}  ${f6(v.noise)}  ${f6(v.noiseP75)}  ` +
                `${f6(v.worst)}  ${f6(v.order).padStart(9)} ${f6(v.intrinsic).padStart(9)}  ` +
                `|${name} − its twin| ms/pass, true Δ = 0 (this pair's resolution ` +
                `${f6(v.resolution)} = ${nsRaw(v.resolution).toFixed(3)} ns/obj; Δ when it ran ` +
                `first ${f6(v.aFirst)} over ${v.aFirstRounds} rounds, when the twin ran first ` +
                `${f6(v.bFirst)} over ${v.bFirstRounds}${
                    excluded.has(name) || excluded.has(rowName(arm, true))
                        ? '; ONE HALF OF THIS PAIR IS EXCLUDED BY THE CLOCK CHECK'
                        : ''
                })`
        );
    }
    line(
        `  RESOLUTION FLOOR      ${f6(worstRes)} ms — THE COARSEST OF THE ${
            ARMS.length
        }, printed ` +
            'for the recorder. NO VERDICT BELOW USES IT: every quantity is judged against the ' +
            'resolution of ITS OWN arm, which is on the lines above.'
    );

    line('');
    line(
        'THE ORDER SPLIT — is a null measuring two programs, or measuring which of them ran first?'
    );
    const notNull: string[] = [];
    for (const arm of ARMS) {
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
                'so it is the position in the round and not the program; the alternating ' +
                'direction is what averages it out of the medians';
        } else {
            verdictWord =
                "NEITHER stands out of this pair's own noise — the pair is a null and the " +
                'instrument has nothing to confess';
        }
        line(
            `  ${name.padEnd(14)}order ${f6(ord)} · intrinsic ${f6(intr)} · noise ${f6(v.noise)} ` +
                `ms/pass — ${verdictWord}`
        );
    }
    if (notNull.length > 0) {
        refuse(
            `receiver-spelling: ${notNull.length} of the ${ARMS.length} null pairs came back ` +
                `INTRINSIC — ${notNull.join(', ')}. Two declarations of one program that differ ` +
                'in a way which does not flip with the running order are two different programs, ' +
                'so those rows are not quotable and every quantity computed from them inherits ' +
                'it. The first thing to check is that the twin is a true transcription: its own ' +
                'prototype, its own method body, its own sink, nothing shared with the subject.'
        );
    }

    const gapOf = new Map<string, Gap>();
    for (const cmp of COMPARISONS) {
        const a = rowName(cmp.a, false);
        const b = rowName(cmp.b, false);
        gapOf.set(`${cmp.a}↔${cmp.b}`, pairedGap(seriesOf(a), seriesOf(b), posOf(a), posOf(b)));
    }

    line('');
    line(
        `THE ${COMPARISONS.length} COMPARISONS — every one through the SAME estimator as the ` +
            'nulls. `bias` is the difference of medians, `intrinsic` is that difference with the ' +
            'running order balanced out, and INTRINSIC IS THE QUOTED FIGURE. A pair is quotable ' +
            'only if it clears both its own two arms’ resolutions and four grains. A NEGATIVE ' +
            'intrinsic means the FIRST arm was faster.'
    );
    const resolvedPairs: string[] = [];
    const unresolvedPairs: string[] = [];
    for (const cmp of COMPARISONS) {
        const key = `${cmp.a}↔${cmp.b}`;
        if (!usable(cmp.a, cmp.b)) {
            line(
                `  ${key.padEnd(28)}EXCLUDED — an arm of this pair has a row under the clock ` +
                    'floor (see THE CLOCK CHECK). No figure is computed for this pair.'
            );
            continue;
        }
        const v = gapOf.get(key) as Gap;
        const res = Math.max(resOf(rowName(cmp.a, false)), resOf(rowName(cmp.b, false)));
        const g = grains(v.intrinsic);
        const ok = Math.abs(v.intrinsic) > res && g >= 4;
        if (ok) resolvedPairs.push(key);
        else unresolvedPairs.push(key);
        line(
            `  ${key.padEnd(28)}intrinsic ${sign(v.intrinsic)} ms  ${nsO(v.intrinsic).padEnd(
                15
            )}${String(g).padStart(5)} grains  (bias ${f6(v.bias)}, order ${f6(
                v.order
            )}, own resolution ${f6(res)})  ${
                ok
                    ? 'RESOLVED — quotable as a size'
                    : Math.abs(v.intrinsic) <= res
                    ? 'NOT RESOLVED — inside its own two arms’ resolution'
                    : 'NOT RESOLVED — under four grains, an ordering at best'
            }`
        );
        line(`  ${''.padEnd(28)}${cmp.note}`);
    }
    line(
        '  NOT ONE OF THESE PAIRS IS CLEAN, and the absence of a CLEAN row above is that verdict ' +
            'rather than a dropped concept: `ctor` fuses a constructor frame, `plain` fuses a ' +
            'fourth field store and an own-property method load, `create` fuses a builtin frame ' +
            'with a backing store, and `hoisted` fuses the absence of an allocation with a ' +
            'receiver that is old-space rather than young. Read `st`, `fr/o` and `fr/c` beside ' +
            'every median before reading any gap.'
    );
    for (const key of unresolvedPairs) {
        const cmp = COMPARISONS.find((c) => `${c.a}↔${c.b}` === key) as Comparison;
        const v = gapOf.get(key) as Gap;
        const res = Math.max(resOf(rowName(cmp.a, false)), resOf(rowName(cmp.b, false)));
        refuse(
            `receiver-spelling: "${key}" did not separate — the order-balanced difference is ` +
                `${f6(v.intrinsic)} ms per pass (${nsO(v.intrinsic)}, ${grains(
                    v.intrinsic
                )} grains) against a four-grain bar of ${(4 * grainObj).toFixed(4)} ns/obj and ` +
                `its own arms' resolution of ${f6(res)} ms. It may NOT be quoted as a size, in ` +
                'either direction. To resolve it, halve the grain: `npm run axis ' +
                `--workspace=@exodra/benchmarks -- receiver-spelling ${rounds} ${batch * 2}\`, ` +
                `which doubles the passes per region to ${reps * 2}. More ROUNDS will not help — ` +
                'a quantised median moves in grains, and the batch is what moves the grain.'
        );
    }

    line('');
    line('WHAT THE ALLOCATION COSTS — every arm against the row that allocates nothing');
    for (const arm of ARMS) {
        if (arm === 'hoisted') continue;
        if (!usable('hoisted', arm)) {
            line(`  ${arm.padEnd(14)}EXCLUDED by the clock check`);
            continue;
        }
        const key = COMPARISONS.some((c) => c.a === arm && c.b === 'hoisted')
            ? `${arm}↔hoisted`
            : null;
        if (key === null) {
            line(
                `  ${arm.padEnd(14)}NO DECLARED PAIR against \`hoisted\` — none is invented here.`
            );
            continue;
        }
        const v = gapOf.get(key) as Gap;
        line(
            `  ${arm.padEnd(14)}${sign(v.intrinsic)} ms per pass = ${nsRaw(v.intrinsic).toFixed(
                3
            )} ns per object over \`hoisted\` = ${(
                median(rowName(arm, false)) / Math.max(median(rowName('hoisted', false)), 1e-12)
            ).toFixed(3)}× the tail`
        );
    }
    line(
        '  `hoisted` IS NOT A NATIVE FLOOR AND IS NOT CALLED ONE. A program that makes no object ' +
            'does not do this job — the job IS making one — so there is no zero-abstraction ' +
            'program to bound these four. What `hoisted` bounds is the TAIL: the loop, the three ' +
            'field stores, the method call and the escape. The gap to it is therefore an ' +
            'allocation and whatever that spelling fuses with one, and every line above says ' +
            'which.'
    );

    line('');
    line(
        'THE PREDICTIONS, JUDGED BY THE RUN — committed in the header before the programs existed'
    );
    const verdict = (id: string, ok: boolean, said: string, got: string): void =>
        line(`  ${ok ? '✔' : '✘'} ${id} ${ok ? 'HELD' : 'FAILED'} — said ${said}; got ${got}`);
    const skipped = (id: string, why: string): void => line(`  ⊘ ${id} NOT JUDGED — ${why}`);

    let instrumentOk = false;
    if (usable('ctor', 'hoisted')) {
        const v = gapOf.get('ctor↔hoisted') as Gap;
        const res = Math.max(resOf(rowName('ctor', false)), resOf(rowName('hoisted', false)));
        const resolved = Math.abs(v.intrinsic) > res && grains(v.intrinsic) >= 4;
        const cheapest = ARMS.every(
            (a) => a === 'hoisted' || median(rowName(a, false)) >= median(rowName('hoisted', false))
        );
        instrumentOk = resolved && cheapest;
        verdict(
            '(P2)',
            instrumentOk,
            'the KILLER — `ctor ↔ hoisted` (one allocation plus one constructor frame against ' +
                'neither) resolves, AND `hoisted` has the smallest median of the five',
            `ctor↔hoisted ${nsO(v.intrinsic)} over ${grains(v.intrinsic)} grains against its own ` +
                `arms' resolution of ${f6(res)} ms — ${
                    resolved ? 'RESOLVED' : 'NOT RESOLVED'
                }; hoisted ${cheapest ? 'is' : 'is NOT'} the cheapest row (${ARMS.map(
                    (a) => `${a} ${nsRaw(median(rowName(a, false))).toFixed(3)}`
                ).join(', ')} ns/obj)`
        );
        if (!instrumentOk) {
            refuse(
                'receiver-spelling: THE INSTRUMENT FAILED ITS OWN KILLER. Either one allocation ' +
                    'plus one constructor frame is invisible to this clock, or a row that ' +
                    'allocates per object came in at or below the row that allocates nothing. ' +
                    'Both mean the same thing: NO FIGURE IN THIS RUN MAY BE READ AS BEING ABOUT ' +
                    'AN ALLOCATION OR ABOUT A SPELLING, and (P1) is not judged. The first ' +
                    'suspects, in order: the escape gate passed but the objects are being ' +
                    'promoted so the loop is GC-bound rather than allocation-bound; the batch is ' +
                    'too small for the grain (halve it with batch ' +
                    `${batch * 2}); the machine drifted more than the pair.`
            );
        }
    } else {
        skipped('(P2)', 'ctor or hoisted is under the clock floor and was excluded');
    }

    if (!usable('protoLiteral', 'ctor')) {
        skipped('(P1)', 'protoLiteral or ctor is under the clock floor and was excluded');
    } else if (!instrumentOk) {
        skipped(
            '(P1)',
            '(P2) FAILED — this instrument did not demonstrate that it can see one allocation, ' +
                'so a figure it prints for this pair is not evidence about a spelling. The ' +
                'number is in THE COMPARISONS above and is not a verdict'
        );
    } else {
        const v = gapOf.get('protoLiteral↔ctor') as Gap;
        const res = Math.max(resOf(rowName('protoLiteral', false)), resOf(rowName('ctor', false)));
        const resolved = Math.abs(v.intrinsic) > res && grains(v.intrinsic) >= 4;
        const ns = nsRaw(v.intrinsic);
        verdict(
            '(P1)',
            resolved && ns >= 3 && ns <= 40,
            'protoLiteral is DEARER than ctor by +3 to +40 ns per object',
            `${nsO(v.intrinsic)} over ${grains(v.intrinsic)} grains against its own two arms' ` +
                `resolution of ${f6(res)} ms — ${
                    !resolved
                        ? 'THE PAIR DID NOT SEPARATE: the two spellings sit on each other inside ' +
                          'their own resolution, so `__proto__:` costs no more than `new` here ' +
                          'and the hypothesis that one keyword decides a design is REFUTED on ' +
                          'this scene'
                        : ns < 0
                        ? 'THE SIGN IS WRONG: the literal came in CHEAPER than the ' +
                          'constructor, which the constructor frame alone could explain and ' +
                          'this axis cannot separate'
                        : ns > 40
                        ? 'DEARER THAN THE BAND: the install is bigger than a cached map ' +
                          'transition, and the ~100 ns/object the server axis reported is ' +
                          'the figure to re-read next'
                        : ns < 3
                        ? 'DEARER BUT UNDER THE BAND: the direction held and the size did ' + 'not'
                        : 'inside the band'
                }. THE CONSTRUCTOR FRAME IS IN THIS FIGURE and cannot be subtracted here.`
        );
    }

    if (usable('protoLiteral', 'plain')) {
        const v = gapOf.get('protoLiteral↔plain') as Gap;
        const res = Math.max(resOf(rowName('protoLiteral', false)), resOf(rowName('plain', false)));
        const resolved = Math.abs(v.intrinsic) > res && grains(v.intrinsic) >= 4;
        verdict(
            '(P3)',
            resolved && v.intrinsic > 0,
            'protoLiteral is DEARER than plain — the same literal allocation with the ' +
                '`__proto__:` key and without it. No size predicted: the key’s install and ' +
                'plain’s fourth field store push in opposite directions and I cannot rank them ' +
                'by reading',
            `${nsO(v.intrinsic)} over ${grains(v.intrinsic)} grains against ${f6(res)} ms — ${
                resolved ? 'resolved' : 'NOT RESOLVED, so no direction is established'
            }`
        );
    } else {
        skipped('(P3)', 'protoLiteral or plain is under the clock floor and was excluded');
    }

    if (usable('create', 'protoLiteral', 'ctor', 'plain')) {
        const arms: readonly Arm[] = ['protoLiteral', 'ctor', 'create', 'plain'];
        const dearest = arms.reduce((x, y) =>
            median(rowName(x, false)) >= median(rowName(y, false)) ? x : y
        );
        verdict(
            '(P4)',
            dearest === 'create',
            'create is the DEAREST of the four arms — a builtin frame, an object with no ' +
                'in-object slots, a properties backing store and three map transitions',
            `the dearest is ${dearest} (${arms
                .map((a) => `${a} ${nsRaw(median(rowName(a, false))).toFixed(3)}`)
                .join(', ')} ns/obj)`
        );
    } else {
        skipped('(P4)', 'an arm of the four is under the clock floor and was excluded');
    }

    if (usable('ctor', 'plain')) {
        const v = gapOf.get('ctor↔plain') as Gap;
        const res = Math.max(resOf(rowName('ctor', false)), resOf(rowName('plain', false)));
        const resolved = Math.abs(v.intrinsic) > res && grains(v.intrinsic) >= 4;
        verdict(
            '(P5)',
            resolved && v.intrinsic > 0,
            'plain is CHEAPER than ctor — the same allocation with one more field store and one ' +
                'fewer call frame, and a frame costs more than a store. Direction only',
            `${nsO(v.intrinsic)} over ${grains(v.intrinsic)} grains against ${f6(res)} ms — ${
                resolved ? 'resolved' : 'NOT RESOLVED, so no direction is established'
            }`
        );
    } else {
        skipped('(P5)', 'ctor or plain is under the clock floor and was excluded');
    }

    verdict(
        '(P6)',
        notNull.length === 0,
        `all ${ARMS.length} null pairs are ordering or nothing`,
        notNull.length === 0
            ? `${ARMS.length} of ${ARMS.length} inside their own noise`
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
            'own two arms’ resolution and its grain count on the line it appears on, and no ' +
            'figure from this axis is a figure about any package in this repository.'
    );
}
