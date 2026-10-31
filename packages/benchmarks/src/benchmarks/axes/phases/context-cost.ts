// DIAGNOSTIC — WHAT DOES `provide` / `inject` COST, IN A FEATURE NOTHING IN THIS SUITE HAS EVER RUN?
//
// Twenty-one axes are registered in `scripts/run-one-axis.js` and not one of them calls `provide`,
// `inject`, `provideExoContext` or `readExoContext` through a component. The context system is the
// one shipped feature of `@exodra/dom` with no measurement of any kind behind it, and this file is
// that measurement.
//
// It is not a framework comparison. It measures ONE renderer, in two groups, and it is not part
// of `npm run bench`; it is registered as an axis only so it can reuse the runner that already
// starts Vite, drives headless Chromium and forwards the browser's console.
//
// ════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS AXIS NO LONGER MEASURES, AND WHY — READ THIS BEFORE COMPARING IT TO AN OLD RECORDING
// ════════════════════════════════════════════════════════════════════════════════════════════
//
// THIS FILE USED TO HAVE FOUR GROUPS. Two of them are gone, and they are the two the file was
// mostly about. `@exodra/dom` used to carry a SECOND channel for a context: `provideExoContext`
// wrote the provider's frame into that element's `TExoDomChild` (building one where there was
// none), and `exoContextAt` climbed `parentNode` from a mount's parent reading a mark every built
// element then carried, so a widget mounted by a separate `render` call inherited what the page had
// provided. Both the climb and the storage were REMOVED. A context now travels one way only: as a
// value on the connector, threaded through `wireExoInstance`'s context parameter.
//
// GONE — GROUP A, THE CLIMB (`climb·dN`, `local·dN`, `parent·dN`, `parent·dN·twin`, at depths
// 4/16/64, with the empty-page gate and the three-depth monotonicity refusal). It asked whether
// the upward walk was distinguishable from the bare `parentNode` walk it contained. There is no
// upward walk. Nothing replaces the row: a mount now reads NOTHING off the document around it, so
// there is no operation left to put a floor under.
//
// GONE — GROUP D, THE SEAM (`mount·inherit`, `mount·bare`, `mount·bare·twin`, with the
// inheritance gate that proved cross-mount inheritance worked at all). It priced a second,
// independent `render` into a slot inside the first mount's provided subtree, against the same
// call with no provider above it. That capability was removed, so the pair no longer differs in
// anything and the gate would now fail by design. A host that wants a separately-mounted widget to
// see a value passes it as data; passing an argument is not an operation this axis can time.
//
// SHRUNK — GROUP B, THE PROVIDER PATH. It had three rungs: `push` (one cons cell),
// `provide·marked` (the shipped call on an element that already had a record) and `provide·nomark`
// (the same call on an element with none, where the child maker built a whole record and a
// disposers array to hold one pointer). The difference between the last two WAS the record, and it
// is the figure that group existed to produce. `provideExoContext` no longer touches an element —
// it is `exoContextFrame` and a call frame — so the two rungs would now be the same program under
// two names, and both are gone. `push` remains, and it is now the WHOLE provider path rather than
// its floor. The strict-ladder refusal that guarded the three rungs went with them.
//
// WHAT THAT COSTS THE MAP, stated rather than left to be noticed: this axis no longer carries a
// FLOOR of any kind. Groups A and D were the two that had one (a bare `parentNode` walk, a bare
// mount), and both floors bounded operations that no longer happen. Group C has a twin and no
// floor — there is no zero-abstraction program that answers "what is at this token" without
// walking something — and group B is one number with neither. An axis with no floor can rank and
// cannot say what a participant is worth, and this one now says only what two operations cost.
//
// ── WHAT IS LEFT, READ OFF THE SOURCE ───────────────────────────────────────────────────────
//
// `provideExoContext` (`packages/dom/src/dom/provideExoContext.ts`) pushes one chain link and
// returns it. That is the entire function. `TExoDomNode.provide` is that call plus one field
// store on the connector.
//
// `readExoContext` (`packages/context/src/readExoContext.ts`) walks the frame chain by
// pointer compare. `TExoDomNode.inject` is that call plus one field load.
//
// Per CHILD, the whole feature now costs NOTHING: `TExoDomChild` carries no context field, and the
// chain a child inherits is a pointer the list that built it was already holding.
//
// ── THE TWO GROUPS ──────────────────────────────────────────────────────────────────────────
//
// GROUP B — THE PROVIDER PATH, entire.
//   push            `exoContextFrame` alone, into a sink. One cons cell — what a provide costs on
//                   any backend, server included, and now on this one too.
//
// GROUP C — INJECT DEPTH, so the chain walk has a SHAPE rather than a number.
//   inject·1 / inject·2 / inject·8   the shipped `readExoContext` over a chain of 8 links, reading
//                   a key that sits 1, 2 and 8 links in.
//   inject·miss8    a key nobody provided, over the same chain of 8 — the walk runs to the end and
//                   returns `undefined`. This is what a component with a fallback pays.
//   inject·1·twin   a second chain of the same length with its key at the same position, read
//                   through an independently declared wrapper. True Δ = 0.
//   The SLOPE (inject·8 − inject·1)/7 is the per-link cost and the INTERCEPT is the call itself.
//
// ── WHAT `child-mark` ALREADY COVERS, AND IS THEREFORE NOT REBUILT HERE ──────────────────────
//
// `axes/phases/child-mark.ts` measures the STORAGE of a per-element association — one symbol
// expando against one `WeakMap` entry, on the write and on the read. It used to price the specific
// mark this feature climbed; that mark has since been removed from the package altogether
// and the axis kept only the general storage question. Either way the two axes do not
// overlap: this one writes and reads nothing on an element.
//
// ── HOW THIS RUN COULD LIE. Every hazard this repository has been bitten by, answered. ───────
//
// (1) A RUN THAT RESOLVES LESS THAN ITS OWN SUBJECT. The subject here is nanoseconds and the
//     browser's clock is clamped. This file OBSERVES its own quantum (200 measured advances of
//     `performance.now()`) instead of assuming 0.1 ms, prints it, prints every phase's REGION
//     median in ticks, and REFUSES BY NAME any row whose timed region landed under three ticks —
//     a row under three ticks can move by a third of itself for no reason. Two axes in this suite
//     print refusals of exactly that shape and this one is built to print the same.
//
// (2) PRETTIER REFORMATTING MARKUP INSIDE TAG TEMPLATES killed a mount axis for 17 hours. THIS
//     AXIS HAS NO MARKUP OF ANY KIND — no tag templates, no HTML strings, no `createElement`. It
//     builds frame chains out of tokens and reads them, and that is all it touches.
//
// (3) TWO SHAPES IN ONE PROCESS. Building two versions of a record in one run gives the hot loops
//     two hidden classes and measures polymorphism instead of the subject. Nothing here builds a
//     record: the only objects allocated in a timed region are the chain links `exoContextFrame`
//     makes, which come from one literal in `@exodra/core`.
//
// (4) MULTI-AXIS RUNS CRASH UNDER MEMORY PRESSURE. RUN THIS AXIS ALONE, one axis at a time, as
//     every other diagnostic in this map requires.
//
// (5) A DEAD LOOP. Every timed region's result is accumulated into a module-level `SINK` read
//     after the run, so nothing here is a computation whose value is never observed.
//
// (6) AN UNMATCHED GC REGIME. Each scenario is handed its OWN sinks, allocated in the untimed
//     `prep`, and everything a region allocates stays reachable until the sample ends — so no
//     phase allocates into a recycling nursery while another grows a live set.
//
// (7) THE CHAIN LENGTHS ARE COUNTED, NOT ASSERTED. The census walks the chains this file built and
//     reports their link counts, and the gate reads every key back at its own position.
//
// ── HOW TO RUN IT ───────────────────────────────────────────────────────────────────────────
//
//     npm run axis --workspace=@exodra/benchmarks -- context-cost
//     npm run axis --workspace=@exodra/benchmarks -- context-cost 100 2   # if a row was refused
//
// IT HONOURS THE BATCH, as `teardown-phases` does: the third positional multiplies every phase's
// own repetition factor, which is what the refusal line asks for by name. Batch 1 is the one to
// run first. `@exodra/dom` and `@exodra/core` are resolved to their BUILT dists exactly as the
// axes are, so `npm run build` at the repo root has to have run or this attributes a stale
// renderer.
//
// ── WHAT IT DOES NOT ANSWER ─────────────────────────────────────────────────────────────────
//
// Nothing about the server backend, whose chain head is a module variable rather than a connector
// field. Nothing about memory. Nothing about what a `provide` costs INSIDE a real wire, where the
// connector's field store and the surrounding mount are the context it is paid in — this axis
// times the two functions and not the render call that reaches them.
import {
    exoContextToken,
    exoContextFrame,
    readExoContext,
    type TExoContextFrame,
    type TExoContextToken,
} from '@exodra/context';
import { provideExoContext } from '@exodra/dom';
import type { Scenario } from '../../../harness';

// eslint-disable-next-line no-console
const line = (s: string): void => console.log(`✅ ${s}`);
// eslint-disable-next-line no-console
const refuse = (s: string): void => console.log(`❌ ${s}`);

const f4 = (x: number): string => x.toFixed(4);
const f6 = (x: number): string => x.toFixed(6);

/**
 * READ AFTER THE RUN AND NEVER INSIDE IT. Every timed loop folds its result in here so that no
 * region is a computation whose value is never observed — see hazard (5).
 */
let SINK = 0;

// ---------------------------------------------------------------------------------------
// THE TOKENS. `exoContextToken` returns an opaque identity compared by `===` and by nothing else, so
// eight of them is eight distinct links in one chain and `MISS` is a ninth nobody provides.
// ---------------------------------------------------------------------------------------

const KEYS: readonly TExoContextToken<string>[] = [
    exoContextToken<string>('k1'),
    exoContextToken<string>('k2'),
    exoContextToken<string>('k3'),
    exoContextToken<string>('k4'),
    exoContextToken<string>('k5'),
    exoContextToken<string>('k6'),
    exoContextToken<string>('k7'),
    exoContextToken<string>('k8'),
];
const MISS = exoContextToken<string>('miss');
/** The token group B pushes, and the value it pushes under it. */
const THEME = exoContextToken<string>('theme');
const HOST_THEME = 'dark';

// ---------------------------------------------------------------------------------------
// THE STRUCTURES. Built once, before anything is timed, and every length below is COUNTED off
// them afterwards rather than written down — hazard (7).
// ---------------------------------------------------------------------------------------

/** Links in a frame chain. Counted for the census so "8 links" is a measurement of the built chain. */
function chainLength(frame: TExoContextFrame | null): number {
    let at = frame;
    let n = 0;
    while (at !== null) {
        n++;
        at = at.outer;
    }
    return n;
}

// ── GROUP C's WORLD: one chain of eight links, and a second of the same shape for the null ───

/** Innermost first: `KEYS[7]` is 1 link in, `KEYS[0]` is 8 links in. */
function buildChain(keys: readonly TExoContextToken<string>[]): TExoContextFrame {
    let at: TExoContextFrame | null = null;
    for (let i = 0; i < keys.length; i++) at = exoContextFrame(at, keys[i], `v${i}`);
    return at as TExoContextFrame;
}

const CHAIN = buildChain(KEYS);
/** The null's chain: same length, same key positions, a SEPARATE object graph. */
const CHAIN_TWIN = buildChain(KEYS);

// ---------------------------------------------------------------------------------------
// THE CENSUS — printed before anything is timed, read off the structures above.
// ---------------------------------------------------------------------------------------

function printCensus(providesPerRegion: number): void {
    line('CONTEXT COST CENSUS · read off the built structures, nothing measured');
    line(`  group B provides per region         ${providesPerRegion}`);
    line(
        `  group C frame chain built           ${chainLength(CHAIN)} links ` +
            `(twin ${chainLength(CHAIN_TWIN)})`
    );
    line(
        '  where a chain is read, per inject   readExoContext ×1 — never per instance, never ' +
            'per row'
    );
    line(
        '  where the DOM is read, per mount    NOWHERE. The upward walk this axis used to time ' +
            'was removed; see the header.'
    );
}

// ---------------------------------------------------------------------------------------
// GROUP B — THE PROVIDER PATH, which is now one operation.
// ---------------------------------------------------------------------------------------

/**
 * Provides in one scenario, and scenarios in one region. Their product is the region's provide
 * count and it is sized so that `push` — one cons cell, the cheapest thing this axis measures —
 * clears three ticks of the clock by a margin. Most of the count sits in `PROVIDE_N` rather than
 * in the scenario count because a scenario costs an object and an array in the untimed prep.
 */
const PROVIDE_N = 2000;
const PROVIDE_SCENARIOS = 16;

/** What a provide costs, entire: one cons cell. */
function stagePush(sink: Array<TExoContextFrame | null>): void {
    for (let i = 0; i < sink.length; i++) sink[i] = exoContextFrame(null, THEME, HOST_THEME);
}

// ---------------------------------------------------------------------------------------
// GROUP C — THE CHAIN WALK.
// ---------------------------------------------------------------------------------------

function stageInject(key: TExoContextToken<string>, reps: number): void {
    let hits = 0;
    for (let i = 0; i < reps; i++) {
        if (readExoContext(CHAIN, key) !== undefined) hits++;
    }
    SINK += hits;
}

/** The null: same length, same position, a separate chain, an independently declared wrapper. */
function stageInjectTwin(key: TExoContextToken<string>, reps: number): void {
    let hits = 0;
    for (let i = 0; i < reps; i++) {
        if (readExoContext(CHAIN_TWIN, key) !== undefined) hits++;
    }
    SINK += hits;
}

// ---------------------------------------------------------------------------------------
// THE GATES. Nothing is timed until the chain is shown to hold what it was built to hold, and
// until the shipped `provideExoContext` is shown to produce a frame that reads back.
// ---------------------------------------------------------------------------------------

function gateChain(): void {
    for (let i = 0; i < KEYS.length; i++) {
        if (readExoContext(CHAIN, KEYS[i]) !== `v${i}`) {
            throw new Error(`context-cost: the built chain does not hold KEYS[${i}]`);
        }
    }
    if (readExoContext(CHAIN, MISS) !== undefined) {
        throw new Error('context-cost: the MISS token resolved — group C has no miss row');
    }
    if (chainLength(CHAIN) !== KEYS.length || chainLength(CHAIN_TWIN) !== KEYS.length) {
        throw new Error('context-cost: the chain and its twin are not the same length');
    }
    line(
        `gate context-cost chain: ${KEYS.length} links, every key resolves at its own position, ` +
            'the miss token resolves to undefined, twin is the same length'
    );
}

/**
 * A provide that did not LAND would be priced at zero.
 *
 * IT CHECKS THE SHIPPED FUNCTION AND TIMES `exoContextFrame`, which is a gap worth naming rather
 * than hiding: `provideExoContext` IS `exoContextFrame` and a call frame — read off
 * `provideExoContext.ts`, not measured — so what group B times is the body without the frame.
 * The gate is what keeps that reading honest: if the shipped function ever stops being a
 * pass-through, this gate is the line that has to be revisited before the row is quoted.
 */
function gateProvide(): void {
    const shipped = provideExoContext(null, THEME, HOST_THEME);
    if (readExoContext(shipped, THEME) !== HOST_THEME) {
        throw new Error(
            'context-cost: the shipped provideExoContext did not return a frame the value reads ' +
                'back out of — group B would price an operation that does not do its job'
        );
    }
    const below = exoContextFrame(null, MISS, 'outer');
    const above = provideExoContext(below, THEME, HOST_THEME);
    if (chainLength(above) !== 2 || readExoContext(above, MISS) !== 'outer') {
        throw new Error(
            'context-cost: the shipped provideExoContext did not link its frame BELOW the one it ' +
                'was handed — a provide that drops what it inherited is not the operation timed'
        );
    }
    line(
        'gate context-cost provide: the shipped call returns a frame that reads back, and links ' +
            'onto what it was handed rather than replacing it'
    );
}

// ---------------------------------------------------------------------------------------
// THE RUNNER — `abBench`'s sampling with a repetition factor per phase, the raw per-round samples
// kept so a NULL can be paired round by round, and the REGION duration kept so a row can be
// refused against the clock this run actually observed.
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
    /** Scenarios prepared per sample; each `measure()` is called once, in order. */
    readonly scenarios: number;
    /** Subject operations ONE scenario's `measure()` performs. `scenarios × ops` divides the region. */
    readonly ops: number;
    readonly prep: () => Scenario;
    /** What the row contains and what it does not — printed beside it. */
    readonly what: string;
}

interface PhaseResult {
    readonly per: Stat;
    readonly regionMedian: number;
    /** One per round, in round order, so two phases can be paired for a null. */
    readonly samples: readonly number[];
}

function sampleOnce(phase: Phase): { region: number; per: number } {
    const scenarios: Scenario[] = [];
    for (let b = 0; b < phase.scenarios; b++) scenarios.push(phase.prep());
    const t0 = performance.now();
    for (let b = 0; b < phase.scenarios; b++) scenarios[b].measure();
    const dt = performance.now() - t0;
    for (let b = 0; b < phase.scenarios; b++) scenarios[b].cleanup();
    return { region: dt, per: dt / (phase.scenarios * phase.ops) };
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
        const samples = per.get(p.name) as number[];
        out.set(p.name, {
            per: stat(samples),
            regionMedian: stat(region.get(p.name) as number[]).median,
            samples,
        });
    }
    return out;
}

/**
 * A PAIR WHOSE TRUE DIFFERENCE IS ZERO, and what came back. `bias` is the disagreement between the
 * two medians; `noise`, `p75` and `worst` are the round-by-round absolute difference, which is the
 * quantity a single derived figure is actually competing against.
 */
interface NullPair {
    readonly name: string;
    readonly bias: number;
    readonly noise: number;
    readonly noiseP75: number;
    readonly worst: number;
    readonly what: string;
}

function nullOf(name: string, a: PhaseResult, b: PhaseResult, what: string): NullPair {
    const n = Math.min(a.samples.length, b.samples.length);
    const d: number[] = [];
    for (let i = 0; i < n; i++) d.push(Math.abs(a.samples[i] - b.samples[i]));
    const s = stat(d);
    return {
        name,
        bias: Math.abs(a.per.median - b.per.median),
        noise: s.median,
        noiseP75: s.p75,
        worst: s.max,
        what,
    };
}

// ---------------------------------------------------------------------------------------
// REPETITION FACTORS. Every one is chosen so its region clears three ticks of a 0.1 ms clock by a
// margin, and every one is CHECKED against the clock the run actually observed — see the refusal
// after the tables.
// ---------------------------------------------------------------------------------------

/**
 * Chain reads in one timed region. Sized by `inject·1` — one pointer compare and a return, the
 * cheapest operation this axis measures — so that the SHALLOWEST row clears the clock and the
 * deeper ones clear it by more. Sizing on `inject·8` would refuse the row the slope subtracts from.
 */
const INJECT_REPS = 150_000;

export function benchmarkContextCost(rounds = 100, batch = 1): void {
    const b = Math.max(1, Math.floor(batch));

    printCensus(PROVIDE_N * PROVIDE_SCENARIOS * b);
    gateChain();
    gateProvide();

    const quantum = observedQuantum();
    const noop = (): void => undefined;

    const phases: Phase[] = [];

    // ── GROUP B ──────────────────────────────────────────────────────────────────────────────
    phases.push({
        name: 'push',
        scenarios: PROVIDE_SCENARIOS * b,
        ops: PROVIDE_N,
        what: 'exoContextFrame alone — one cons cell, which is the whole provider path',
        prep: () => {
            const sink: Array<TExoContextFrame | null> = new Array(PROVIDE_N).fill(null);
            return { measure: () => stagePush(sink), cleanup: noop };
        },
    });

    // ── GROUP C ──────────────────────────────────────────────────────────────────────────────
    const injectReps = INJECT_REPS * b;
    const injectPhase = (name: string, key: TExoContextToken<string>, what: string): Phase => ({
        name,
        scenarios: 1,
        ops: injectReps,
        what,
        prep: () => ({ measure: () => stageInject(key, injectReps), cleanup: noop }),
    });
    phases.push(injectPhase('inject·1', KEYS[7], 'readExoContext, key 1 link in'));
    phases.push(injectPhase('inject·2', KEYS[6], 'readExoContext, key 2 links in'));
    phases.push(injectPhase('inject·8', KEYS[0], 'readExoContext, key 8 links in'));
    phases.push(
        injectPhase('inject·miss8', MISS, 'a key nobody provided — 8 links, then undefined')
    );
    phases.push({
        name: 'inject·1·twin',
        scenarios: 1,
        ops: injectReps,
        what: 'a separate chain, same length, same position — true Δ = 0',
        prep: () => ({ measure: () => stageInjectTwin(KEYS[7], injectReps), cleanup: noop }),
    });

    // ── THE RUN ──────────────────────────────────────────────────────────────────────────────
    const stats = runPhases(phases, rounds);
    const res = (name: string): PhaseResult => stats.get(name) as PhaseResult;
    const med = (name: string): number => res(name).per.median;

    // THE UNIT IS NANOSECONDS AND IT IS IN THE TITLE, because a recording of this axis carries the
    // numbers and not the prose. `run-one-axis.js`'s own null-block comment says a resolution read
    // at the wrong unit is 1000× wrong in the direction that flatters; the same is true of a row.
    // Everything internal is milliseconds — the clock's unit — and is converted only at print.
    line('');
    line(
        `CONTEXT COST — provide / inject, schema core [NANOSECONDS per operation] · ` +
            `interleaved · ${rounds} rounds · batch ${b} · GC/sample · observed clock ` +
            `${f4(quantum)} ms`
    );
    line('                        reps    min      p25      median   p75      max');
    for (const p of phases) {
        const s = res(p.name);
        const nsCol = (x: number): string => (x * 1e6).toFixed(4);
        line(
            `${p.name.padEnd(23)}${String(p.scenarios * p.ops).padStart(6)}   ` +
                `${nsCol(s.per.min)}   ${nsCol(s.per.p25)}   ${nsCol(s.per.median)}   ` +
                `${nsCol(s.per.p75)}   ${nsCol(s.per.max)}`
        );
    }
    line('');
    line('  an operation is ONE provide or ONE chain read, and `reps` is how many of them the');
    line('  timed region contained. The null block below is MICROSECONDS, which is a thousandth');
    line('  of the column above — the two units are stated at every use.');

    // THE TICK COLUMN AND THE ROW LEGEND ARE OUTSIDE THE TABLE, ON PURPOSE. `run-one-axis.js`'s
    // recorder tries its row shapes most-specific-first and would file an eighth column under a
    // key that means something else; its own comment says every misparse of that family got
    // published before anybody opened it. The blank line above closes the table for the scraper.
    line('');
    line(`REGION SIZE — the timed region's median against the clock this run observed`);
    for (const p of phases) {
        const s = res(p.name);
        line(
            `  ${p.name.padEnd(23)} ${f4(s.regionMedian)} ms   ` +
                `${(s.regionMedian / quantum).toFixed(1)} ticks   ${p.what}`
        );
    }

    // ── THE NULL ─────────────────────────────────────────────────────────────────────────────
    //
    // ONE BLOCK, BECAUSE ONE FAMILY IS LEFT. There used to be three — a climb family and a mount
    // family stood beside this one, and they were kept apart because a render call is thousands of
    // times dearer than a chain read and a single pooled floor would have been the mount family's
    // number wearing every family's name. Both of those families measured operations that no
    // longer happen (see the header). GROUP B HAS NO NULL AT ALL: `push` has no twin, so its row
    // is judged only by the region refusal below, and its median may not be subtracted from
    // anything.
    const us = (x: number): string => f6(x * 1e3);
    const floorOf = (n: NullPair): number => Math.max(n.bias, n.noise);

    function printNullBlock(title: string, pairs: readonly NullPair[], note: string): number {
        const worstFloor = Math.max(...pairs.map(floorOf));
        line('');
        line(title);
        line('null            bias      noise     p75       worst     what it is');
        for (const n of pairs) {
            line(
                `${n.name.padEnd(14)}${us(n.bias)}  ${us(n.noise)}  ${us(n.noiseP75)}  ` +
                    `${us(n.worst)}  ${n.what}`
            );
        }
        line(`RESOLUTION FLOOR      ${us(worstFloor)} µs = max(bias, noise) — ${note}`);
        return worstFloor;
    }

    const injectNull = nullOf(
        'inject·1',
        res('inject·1'),
        res('inject·1·twin'),
        '|inject·1 − its twin|, true Δ = 0'
    );

    const injectFloor = printNullBlock(
        'THE CHAIN FAMILY · two separate chains of equal length, key at the same position [µs per read]',
        [injectNull],
        'what a per-link difference has to clear to be a measurement'
    );

    // ── GROUP B's ANSWER ─────────────────────────────────────────────────────────────────────
    const nsPerOp = (x: number): string => (x * 1e6).toFixed(3);
    const push = med('push');

    line('');
    line('THE PROVIDE — one operation, because that is all a provide is now');
    line(
        `  push                ${nsPerOp(push)} ns   one cons cell. The shipped ` +
            'provideExoContext is this plus a call frame, which is read off the source and not ' +
            'measured — see gateProvide.'
    );
    line(
        '  THIS ROW USED TO SIT ON A LADDER. `provide·marked` and `provide·nomark` stood above it ' +
            'and their difference was the record the child maker built to hold a frame; the store ' +
            'they measured was removed and neither row has a subject. See the header.'
    );

    // ── GROUP C's ANSWER ─────────────────────────────────────────────────────────────────────
    const i1 = med('inject·1');
    const i2 = med('inject·2');
    const i8 = med('inject·8');
    const iMiss = med('inject·miss8');
    const slope = (i8 - i1) / 7;
    const intercept = i1 - slope;

    line('');
    line('THE CHAIN — inject as a shape rather than a number');
    line(`  inject·1            ${nsPerOp(i1)} ns`);
    line(`  inject·2            ${nsPerOp(i2)} ns`);
    line(`  inject·8            ${nsPerOp(i8)} ns`);
    line(`  inject·miss8        ${nsPerOp(iMiss)} ns   the whole chain walked, undefined returned`);
    line(
        `  per link            ${nsPerOp(slope)} ns   slope of (inject·8 − inject·1)/7; ` +
            `the call itself is ${nsPerOp(intercept)} ns`
    );
    line(
        '  a real chain is one or two links (TExoContextFrame\'s own header: "provide is called ' +
            'once or twice in a whole application"), so inject·1 is the figure that describes ' +
            'a page and inject·8 is the shape of the worst case.'
    );

    // ── REFUSALS. Printed, not thrown, so one bad row does not cost the whole run. ───────────
    let refused = false;
    for (const p of phases) {
        const s = res(p.name);
        if (s.regionMedian < quantum * 3) {
            refused = true;
            refuse(
                `context-cost: "${p.name}" timed a region of ${f4(s.regionMedian)} ms against an ` +
                    `observed clock of ${f4(quantum)} ms — under three ticks, so its median can ` +
                    'move by a third of itself for no reason. Rerun with a larger batch: ' +
                    `npm run axis --workspace=@exodra/benchmarks -- context-cost ${rounds} ${b * 4}`
            );
        }
    }

    // The slope is a difference of two medians and is meaningless when they are closer than the
    // instrument can see.
    if (Math.abs(i8 - i1) <= injectFloor) {
        refused = true;
        refuse(
            `context-cost: inject·8 and inject·1 differ by ${nsPerOp(
                i8 - i1
            )} ns, at or under the ` +
                `${us(injectFloor)} µs this run resolved — the per-link slope and the intercept ` +
                'are artefacts of subtracting two medians that overlap, and neither may be quoted'
        );
    }

    if (!refused) {
        line('');
        line(
            `ANSWER — a provide costs ${nsPerOp(push)} ns, which is one cons cell and nothing ` +
                `else: it stores no frame on any element and reads no element to find one. An ` +
                `inject is ${nsPerOp(i1)} ns at one link and ${nsPerOp(slope)} ns per link after ` +
                `it. THIS AXIS HAS NO FLOOR PARTICIPANT: the two groups that had one measured the ` +
                `DOM context walk and were removed with it, so these two numbers say what the ` +
                `operations cost and nothing about what they are worth. Read the header before ` +
                `quoting either, and note that SINK=${SINK} only proves the loops ran.`
        );
    }
}
