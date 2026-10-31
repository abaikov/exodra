// FORM B'S WHOLE MACHINERY — numbered state fields, integer masks, shared derivations, named
// transitions, and a transaction that batches. Nothing else. It lives here, in `packages/benchmarks`,
// because the library does not ship it: `machine-vs-cells.ts` is the axis that asks whether it
// should, and this file is the proposal a reader judges.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── WHAT IT IS, IN THE ORDER THE PIECES ARE USED ────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
//  1. A COMPONENT NUMBERS ITS STATE FIELDS, once, at module load. Field `i` owns bit `1 << i`.
//         const F_NAME = exoFieldMask(0);
//         const F_OPEN = exoFieldMask(1);
//  2. A COMPONENT DECLARES ITS DERIVATIONS, once, at module load, SHARED by every instance. A
//     derivation is a pure function of the state, the port its result goes into, and the OR of the
//     field bits it reads.
//         { name: 'label', mask: F_NAME | F_OPEN, port: P.label, compute: (s) => … }
//  3. AN INSTANCE IS A STATE OBJECT, A PORT HANDLE AND AN INTEGER. `createExoMachineBuilder` builds it and runs
//     every derivation once, which is the initial fill.
//  4. A TRANSITION WRITES FIELDS AND ORs THEIR BITS. It is a plain function the component author
//     writes; nothing here is a base class and nothing here is subscribed to.
//         const setName = (m, name) => { m.state.name = name; m.touched |= F_NAME; };
//  5. `exoCommit` ENDS THE TRANSACTION: it runs each derivation whose mask intersects `touched`,
//     exactly once, in declaration order, and clears `touched`. Several transitions before one
//     commit IS the batch — there is no batch object, no depth counter and no queue.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── WHAT IS DELIBERATELY ABSENT, BECAUSE THE ABSENCES ARE THE PROPOSAL ──────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// No cell. No subscriber. No disposer. No equality test. No revision clock. No dependency
// tracking, no dirty propagation, no topological order, no scheduler, no microtask. A derivation
// does not know it exists; the machine does not know what a derivation reads except the integer
// the author wrote down.
//
// THIS IS NOT A REACTIVE SYSTEM AND MUST NOT BECOME ONE. The moment it grows a subscriber list it
// has become a reactive system with extra steps, and the axis it exists for stops meaning anything.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── WHAT IT CANNOT DO, WRITTEN HERE SO THE AXIS CANNOT BE READ AS COVERING IT ───────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
//  (a) CHILDREN THAT COME AND GO. A derivation writes a value into a port. A children port is
//      filled by one of six connector calls, none of which takes a value, so nothing here can fill
//      one. A component with a reactive children port needs a reconciler for that port whatever it does
//      with its scalars.
//  (b) ANYTHING NEEDING A DIFF. There is no reconciler here and no place to put one: the machine
//      knows which FIELDS were written, never which ELEMENTS of an array moved.
//  (c) A CHAIN OF DERIVATIONS. `exoCommit` runs the array in DECLARATION ORDER and a derivation's
//      output goes into a PORT, not into the state, so a second derivation cannot read the first
//      one's result. An author who wants a chain writes the intermediate into the state inside a
//      transition and widens the second derivation's mask BY HAND — and nothing in this file
//      checks that they did. This is the sharpest thing form B gives up.
//  (d) MORE THAN 31 STATE FIELDS, because the mask is a JavaScript bitwise integer. `exoFieldMask`
//      refuses the 32nd rather than silently producing a negative bit that no longer ANDs the way
//      the author expects.
//  (e) A TRANSITION THAT FORGETS TO COMMIT. Nothing here can detect one: the state is written, the
//      bit is set, and the screen simply does not move.
//  (f) DISPOSAL. There is nothing to dispose — no subscription was taken — but there is also no
//      hook: whatever holds the machines (a store, a driver, an array) holds them until it drops
//      them, and an unmounted instance's machine goes on accepting transitions and writing into a
//      port table whose nodes are detached.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════
// ── WHAT IT COSTS, PER PROCESS / PER COMPONENT / PER INSTANCE / PER TRANSITION ──────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
//   per process      nothing — this module holds no state of any kind.
//   per component    one derivation array and one object per derivation, at module load.
//   per instance     one machine object (four fields, built whole) and one state object. The
//                    port handle is the connector's own `fillDoors()` value, which `@exodra/core`
//                    documents as one allocation per instance that asks and nothing per port.
//   per transition   one field store and one `|=` per field written, then, at commit: one integer
//                    load, one store, and ONE MASK TEST PER DECLARED DERIVATION. The loop is
//                    O(DECLARED derivations) and not O(the ones that matched) — a component with
//                    twenty derivations pays twenty tests to run one, and `machine-vs-cells`
//                    measures a component with TWO, which is the best case for this loop.
//   per port write    what the fill door costs and nothing on top: two array loads, one indirect
//                    call into the schema's writer, and the writer's own store. No closure is
//                    called through and no value is compared.

import type { TExoFillDoors, TExoTextPort } from '@exodra/core';

/** Bits available in a JavaScript bitwise integer that stay positive under `1 << i`. */
export const EXO_MAX_FIELDS = 31;

/**
 * THE BIT OF STATE FIELD NUMBER `index` — called at module load, once per field, never on a path
 * that runs.
 *
 * It refuses rather than wrapping. `1 << 31` is negative and `1 << 32` is `1`, so a component that
 * quietly went past the cap would get a bit that ANDs against the wrong field — a wrong VALUE on
 * the screen with nothing thrown, which is the failure this whole design is least able to notice.
 */
export function exoFieldMask(index: number): number {
    if (!Number.isInteger(index) || index < 0 || index >= EXO_MAX_FIELDS) {
        throw new Error(
            `exoFieldMask: field index ${index} is out of range. A state machine's fields are ` +
                `numbered 0..${EXO_MAX_FIELDS - 1} because the touched set is one bitwise ` +
                'integer. A component with more fields than that needs a different touched ' +
                'representation, and this file does not have one.'
        );
    }
    return 1 << index;
}

/**
 * ONE DERIVATION — declared ONCE per component, at module load, and shared by every instance.
 *
 * `compute` must be PURE in the state. It is called with nothing else and its result is written
 * straight into `port`; it is never handed the previous value, never told which field moved, and
 * never given the machine.
 */
export interface TExoDerivation<TState> {
    /** For the census only. Never read on a path that runs. */
    readonly name: string;
    /** The OR of the bits of every state field `compute` reads. Written by the author. */
    readonly mask: number;
    /** Where the result goes. */
    readonly port: TExoTextPort;
    readonly compute: (state: TState) => unknown;
}

/**
 * ONE INSTANCE. A state object, the instance's port handle, the component's shared derivation
 * array, and the integer transitions OR into.
 *
 * `touched` is the only mutable field and it is deliberately public: a transition is a plain
 * function the author writes, and making it go through a method would put a call on the one path
 * this design exists to keep to a store and an OR.
 */
export interface TExoBenchMachine<TState> {
    readonly state: TState;
    readonly ports: TExoFillDoors;
    readonly derivations: readonly TExoDerivation<TState>[];
    touched: number;
}

/**
 * BUILD AN INSTANCE AND RUN ITS INITIAL FILL — every derivation, once, in declaration order.
 *
 * The fill is not a special case: it is the same `compute` and the same `ports.text` a commit makes,
 * with `touched` treated as "all of them". It happens here rather than through a `touched = -1`
 * commit so that a wire's first fill cannot be confused with a transition in a profile.
 *
 * THE OBJECT IS BUILT WHOLE, in one literal, in declaration order — this repository has measured an
 * 11% mount regression from growing per-instance objects field by field instead of letting V8 size
 * them in place.
 */
export function createExoMachineBuilder<TState>(
    state: TState,
    ports: TExoFillDoors,
    derivations: readonly TExoDerivation<TState>[]
): TExoBenchMachine<TState> {
    const made: TExoBenchMachine<TState> = { state, ports, derivations, touched: 0 };
    for (let i = 0; i < derivations.length; i++) {
        const d = derivations[i];
        ports.text(d.port, d.compute(state));
    }
    return made;
}

/**
 * END THE TRANSACTION — run each derivation whose mask intersects `touched`, EXACTLY ONCE, in
 * declaration order, and clear `touched`.
 *
 * SEVERAL TRANSITIONS BEFORE ONE COMMIT IS THE BATCH. Two fields feeding one derivation OR into the
 * same integer and the derivation runs once; that is the whole of the coalescing, and it needs no
 * queue, no `Set`, no depth counter and no deferred function.
 *
 * THE EARLY RETURN IS FOR A COMMIT WITH NOTHING MARKED, which is what a caller that commits on a
 * timer or at the end of a frame will hand it. A transition that marked a field NOBODY DERIVES FROM
 * does not take it: `touched` is non-zero, so the loop runs and matches nothing. That cost —
 * one mask test per declared derivation for a write no port cares about — is real and is
 * `machine-vs-cells`'s fourth table.
 */
export function exoCommit<TState>(m: TExoBenchMachine<TState>): void {
    const touched = m.touched;
    if (touched === 0) return;
    m.touched = 0;
    const ds = m.derivations;
    const state = m.state;
    const ports = m.ports;
    for (let i = 0; i < ds.length; i++) {
        const d = ds[i];
        if ((d.mask & touched) !== 0) ports.text(d.port, d.compute(state));
    }
}
