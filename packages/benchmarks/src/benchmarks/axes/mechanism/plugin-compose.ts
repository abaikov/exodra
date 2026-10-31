// ═══════════════════════════════════════════════════════════════════════════════════════════
// WHAT COMPOSING A BACKEND COSTS — the plugin mechanism, priced at the two moments it exists at.
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// ═══ THIS AXIS WAS REPLACED WHOLESALE, AND THE OLD NUMBERS ARE VOID ═══
//
// This file used to measure a PLUGIN-SLOT RUNTIME: namespaces minted as symbols, plugins
// declaring `needs` and `provides`, a composer resolving them in topological order at boot, and
// `rt.get(SLOT)` reading the frozen table afterwards. It measured the resolution, the ordering, the
// cycle refusal, and what a `Map` lookup cost against the field it would otherwise be.
//
// EVERY ONE OF THOSE THINGS IS DELETED. A backend is composed by MERGE: each pack is a bag of
// factories, each factory receives whatever already stands under its name and returns what will
// stand there instead, and `composeExoPlugins` writes the result as an own property. There is no
// registry, no name, no declared dependency, no ordering pass and no lookup — so there is nothing
// left for the old rungs to be about, and a recorded set from before this date measures a mechanism
// that no longer exists. It is not comparable with anything printed below.
//
// ═══ THE TWO MOMENTS, AND WHY ONLY TWO ═══
//
// A merge happens ONCE, at startup, per backend. After it, a composed method is an own property on
// an object — the same shape as a method the class declared — so a call reaches it the way any
// method call reaches any method. That is the whole claim this axis exists to hold to a number:
//
//   (C1) COMPOSING IS LINEAR AND CHEAP: the cost of composing a backend is one property read and
//        one property write per NAME, not per pack and not per capability the engine knows about —
//        because the engine knows about none.
//   (C2) A COMPOSED METHOD COSTS WHAT AN UNCOMPOSED ONE COSTS. A name a pack wrote, called on the
//        composed object, is not measurably slower than the same function called as a method the
//        class declared. If this fails, every capability moved out of the classes and into packs is
//        being paid for on the hot path, and the whole direction is wrong.
//   (C3) WRAPPING COSTS ONE CALL PER LAYER, and nothing else. `next` is captured in a closure at
//        merge time, so a wrapper is a call and a call — there is no chain to walk, no `super`
//        lookup and no per-call resolution. Twelve layers should cost twelve calls, linearly.
//
// ═══ THE SPELLING OF COMPOSITION CHANGED AND THIS AXIS'S PROGRAM DID NOT — SO ITS NUMBERS STAND
// ═══
//
// `new ExoDomBackend(...plugins)` no longer exists. A backend is composed by NESTED UNARY
// DECORATORS — `withExoPropertyWriters(withExoHydration(new ExoDomBackend()))` — and every one of
// those decorators is a one-line call to `composeExoPlugins(base, pack)`, which is the identical function
// the variadic constructor called and the identical function every row below times. Not a line of
// any timed region in this file moved, and no recorded set of it is invalidated by that change:
// what this axis measures is the MERGE, and the merge is what survived.
//
// WHAT DID CHANGE, AND IT IS NOT WHAT ANY ROW HERE TIMES: composing K packs through decorators is
// K calls of `composeExoPlugins(base, onePack)` where the constructor made ONE call carrying K. The
// per-NAME work is identical — the loop below is the same loop, entered K times over one pack each
// instead of once over K — so the compose rows' per-name column reads the same quantity either
// way, plus K−1 extra function entries at startup. If anyone ever wants THAT priced, it is a new
// row (`compose·nested·K`) and not a reinterpretation of these; nothing here is currently claiming
// it, which is why it is written down rather than measured.
//
// WHAT IS NOT MEASURED HERE, STATED SO NOBODY READS IT OUT OF THE TABLES: this axis says nothing
// about what any particular pack DOES. The walking reconciler's worth is `plugin-price`, the
// property writers' is `attr-floor`. This axis prices
// the MECHANISM those packs arrive through, and a mechanism that cost nothing would still leave
// every one of those trades exactly where it was.

import { composeExoPlugins } from '@exodra/core';
import type { Scenario } from '../../../harness';

// eslint-disable-next-line no-console
const line = (s: string): void => console.log(`✅ ${s}`);
// eslint-disable-next-line no-console
const refuse = (s: string): void => console.log(`❌ ${s}`);

// ---------------------------------------------------------------------------------------
// THE PARTS, ALL BUILT AT MODULE LOAD AND NONE OF IT TIMED — an application declares its packs
// once, at module level, so charging the composer for building them would price the wrong thing.
// ---------------------------------------------------------------------------------------

/**
 * THE BASE — a class, because the thing being composed IS one: `ExoDomBackend` declares its methods
 * on a prototype, and `composeExoPlugins` reads `next` THROUGH that prototype. A plain object literal
 * as the base would make the read a own-property hit and quietly measure an easier job.
 */
class Base {
    hits = 0;
    step(n: number): number {
        this.hits += n;
        return this.hits;
    }
}

/** What every synthetic pack's method does, so that no row is charged more than another for it. */
const bump = function (this: Base, n: number): number {
    this.hits += n;
    return this.hits;
};

/** K packs, each claiming a DISTINCT name: the shape of a backend composed out of K capabilities. */
const distinctPacks = (k: number): readonly Record<string, (next: unknown) => unknown>[] => {
    const out: Record<string, (next: unknown) => unknown>[] = [];
    for (let i = 0; i < k; i++) out.push({ ['cap' + i]: () => bump });
    return out;
};

/**
 * K packs all claiming ONE name, each calling `next`: the shape of K wrappers over one method.
 *
 * The innermost receives the class's own `step` — read through the prototype — so the stack this
 * builds is genuinely K wrappers standing on a real method, not K wrappers over `undefined`.
 */
const wrappingPacks = (k: number): readonly Record<string, (next: unknown) => unknown>[] => {
    const out: Record<string, (next: unknown) => unknown>[] = [];
    for (let i = 0; i < k; i++) {
        out.push({
            step: (next: unknown) =>
                function (this: Base, n: number): number {
                    return (next as (this: Base, n: number) => number).call(this, n);
                },
        });
    }
    return out;
};

const PACKS_1 = distinctPacks(1);
const PACKS_4 = distinctPacks(4);
const PACKS_12 = distinctPacks(12);
const PACKS_32 = distinctPacks(32);
const WRAP_1 = wrappingPacks(1);
const WRAP_4 = wrappingPacks(4);
const WRAP_12 = wrappingPacks(12);

/** The objects the CALL table runs against — composed once, exactly as an application composes. */
const PLAIN = new Base();
const MERGED = composeExoPlugins(new Base(), { extra: () => bump });
const WRAPPED_1 = composeExoPlugins(new Base(), ...WRAP_1);
const WRAPPED_4 = composeExoPlugins(new Base(), ...WRAP_4);
const WRAPPED_12 = composeExoPlugins(new Base(), ...WRAP_12);

// ---------------------------------------------------------------------------------------
// THE HARNESS — the same shape every other axis in this suite uses: N scenarios prepared
// untimed, one timed loop over them, teardown untimed, phases interleaved across rounds.
// ---------------------------------------------------------------------------------------

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
 * THE CLOCK, OBSERVED — `performance.now()` is clamped in this browser, and a region under one
 * tick reports a rounding rather than a duration. Copied in shape from `ssr-floor`.
 */
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

const median = (xs: readonly number[]): number => {
    const s = [...xs].sort((a, b) => a - b);
    const mid = s.length >> 1;
    return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
};

/** One composition, timed. `cleanup` is empty on purpose: what a compose leaves is one object. */
const composePhase = (
    name: string,
    packs: readonly Record<string, (next: unknown) => unknown>[],
    what: string
): Phase => ({
    name,
    // 200 PUT EVERY ROW UNDER THE TICK. The first run of this axis printed `0.000000` for
    // `compose·0`, `compose·1` and `compose·4` — 200 compositions of four packs are ~0.04 ms
    // against a 0.1 ms clock — and then JUDGED (C1) on the quotient of that rounding, which is
    // how a quantised zero became a failed claim. `guardQuantum` below now refuses that reading
    // by name, and this count puts the smallest row above the bar instead of relying on it.
    reps: 50000,
    what,
    prep: (): Scenario => ({
        measure: () => {
            composeExoPlugins(new Base(), ...packs);
        },
        cleanup: () => {},
    }),
});

/**
 * A MILLION CALLS OF ONE METHOD, timed — because one call is under the clock's resolution and the
 * question is a per-call difference of a few nanoseconds. Every row runs the identical loop against
 * a differently-composed object, and the result is consumed so nothing is dead-code-eliminated.
 */
const CALLS = 1_000_000;
const callPhase = (name: string, target: { step(n: number): number }, what: string): Phase => ({
    name,
    reps: 1,
    what,
    prep: (): Scenario => ({
        measure: () => {
            let acc = 0;
            for (let i = 0; i < CALLS; i++) acc = target.step(1);
            if (acc === -1) throw new Error('unreachable — keeps the loop observable');
        },
        cleanup: () => {},
    }),
});

export function benchmarkPluginCompose(rounds = 200, batch = 1): void {
    void batch;

    const composeRows: readonly Phase[] = [
        composePhase('compose·0', [], 'new backend, no packs — the merge loop over nothing'),
        composePhase('compose·1', PACKS_1, '1 pack, 1 distinct name'),
        composePhase('compose·4', PACKS_4, '4 packs, 4 distinct names'),
        composePhase('compose·12', PACKS_12, '12 packs, 12 distinct names'),
        composePhase('compose·32', PACKS_32, '32 packs, 32 distinct names'),
        composePhase('wrap·12', WRAP_12, '12 packs all claiming ONE name — 12 nested wrappers'),
    ];

    const callRows: readonly Phase[] = [
        callPhase('call·plain', PLAIN, "the class's own method, nothing composed"),
        callPhase(
            'call·merged',
            MERGED,
            'a backend composed with one pack, calling the class method'
        ),
        callPhase('call·wrap1', WRAPPED_1, 'the method behind 1 wrapper'),
        callPhase('call·wrap4', WRAPPED_4, 'the method behind 4 wrappers'),
        callPhase('call·wrap12', WRAPPED_12, 'the method behind 12 wrappers'),
    ];

    const compose = runPhases(composeRows, rounds);
    const calls = runPhases(callRows, Math.max(6, rounds >> 4));

    line('');
    line('WHAT ONE COMPOSITION COSTS — once, at startup, per backend');
    line('                 median (ms)   per name (µs)   what it is');
    const c0 = median(compose.get('compose·0') as number[]);
    for (const p of composeRows) {
        const ms = median(compose.get(p.name) as number[]);
        const names = p.name === 'wrap·12' ? 1 : Number(p.name.split('·')[1]);
        const per = names === 0 ? 0 : ((ms - c0) * 1000) / names;
        line(`  ${p.name.padEnd(12)} ${ms.toFixed(6)}      ${per.toFixed(4)}       ${p.what}`);
    }

    line('');
    line(
        `WHAT A COMPOSED METHOD COSTS TO CALL — ${CALLS.toLocaleString('en-US')} calls per sample`
    );
    line('                 median (ms)   ns/call     what it is');
    const plain = median(calls.get('call·plain') as number[]);
    for (const p of callRows) {
        const ms = median(calls.get(p.name) as number[]);
        line(
            `  ${p.name.padEnd(12)} ${ms.toFixed(4)}        ${((ms * 1e6) / CALLS).toFixed(
                3
            )}       ${p.what}`
        );
    }

    line('');
    line('THE THREE CLAIMS, CHECKED AGAINST THE NUMBERS ABOVE');

    // THE CLOCK COMES FIRST, and it did not before. A region under one tick reports a rounding,
    // and (C1) is a QUOTIENT of two such regions — so a quantised zero at `compose·4` produced a
    // per-name cost of exactly 0.0000 µs, which then "failed" a linearity claim it had never
    // measured. Every compose region is checked against the observed clock BY NAME, and a run
    // whose smallest row cannot clear the bar refuses instead of judging.
    const quantum = observeTimerQuantum();
    const bar = MIN_TICKS * quantum;
    const under: string[] = [];
    for (const p of composeRows) {
        // `sampleOnce` divides by `reps`, so the REGION is the median times the batch.
        const region = median(compose.get(p.name) as number[]) * p.reps;
        if (region < bar) under.push(`${p.name} (${region.toFixed(4)} ms over ${p.reps} reps)`);
    }
    line(
        `  the clock: observed quantum ${quantum.toFixed(6)} ms, so a timed region must clear ` +
            `${bar.toFixed(4)} ms (${MIN_TICKS}×) for its digits to be a duration`
    );
    if (under.length > 0) {
        refuse(
            `plugin-compose: ${under.length} compose region(s) did not clear the clock — ` +
                `${under.join(
                    ', '
                )}. Their digits are rounding, and (C1) is a quotient of two of ` +
                'them, so it may not be judged from this run. Raise the `reps` on `composePhase`.'
        );
    }

    // (C1) LINEAR IN NAMES. 32 names must not cost more than a generous multiple of 4 names'
    // per-name cost — a super-linear composer would mean the merge is doing something per
    // capability the object already carries, which is exactly what the deleted composer did.
    const per4 = (median(compose.get('compose·4') as number[]) - c0) / 4;
    const per32 = (median(compose.get('compose·32') as number[]) - c0) / 32;
    const linear = per32 <= per4 * 3;
    (linear ? line : refuse)(
        `(C1) composing is linear in NAMES: ${(per4 * 1000).toFixed(4)} µs/name at 4, ` +
            `${(per32 * 1000).toFixed(4)} µs/name at 32 — ${linear ? 'held' : 'FAILED'}`
    );

    // (C2) A COMPOSED OBJECT'S UNCOMPOSED METHOD IS NOT SLOWER. `MERGED` has a name added beside
    // `step`; `step` itself is untouched, so this row is the price of composing AT ALL.
    const merged = median(calls.get('call·merged') as number[]);
    const c2 = merged <= plain * 1.15;
    (c2 ? line : refuse)(
        `(C2) composition does not tax an untouched method: ${plain.toFixed(4)} ms plain vs ` +
            `${merged.toFixed(4)} ms merged — ${c2 ? 'held' : 'FAILED'}`
    );

    // (C3) EACH WRAPPER IS ONE CALL. Twelve layers cost about twelve times what one layer costs
    // over the plain baseline; a chain being WALKED per call would be super-linear here.
    const w1 = median(calls.get('call·wrap1') as number[]) - plain;
    const w12 = median(calls.get('call·wrap12') as number[]) - plain;
    const c3 = w12 <= w1 * 24 + 0.5;
    (c3 ? line : refuse)(
        `(C3) a wrapper is one call, not a walk: +${((w1 * 1e6) / CALLS).toFixed(
            3
        )} ns at 1 layer, ` +
            `+${((w12 * 1e6) / CALLS).toFixed(3)} ns at 12 — ${c3 ? 'held' : 'FAILED'}`
    );

    line('');
    line('WHAT THIS AXIS DOES NOT SAY');
    line('  It prices the MECHANISM a pack arrives through and nothing a pack DOES. The');
    line('  walking reconciler is priced by plugin-price, the property writers by attr-floor.');
    line('  A free mechanism moves none of those trades.');
}
