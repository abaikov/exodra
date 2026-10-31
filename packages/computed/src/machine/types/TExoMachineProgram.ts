import type { TExoPort } from '@exodra/core';

/**
 * A SLOT is a position in ONE sequence — derivations `0 .. bodyBase - 1`, then bodies — and a bit
 * of the pending word. `bodies` is indexed by `slot - bodyBase`; everything else by slot.
 */
export interface TExoMachineProgram<TState> {
    readonly fieldMarks: Int32Array;
    readonly reads: Int32Array;
    readonly computes: readonly ((enode: TState) => unknown)[];
    readonly ports: readonly (TExoPort | null)[];
    readonly portIndexes: Int32Array;
    readonly stores: readonly (((enode: TState, value: unknown) => void) | null)[];
    readonly after: Int32Array;
    readonly labels: readonly string[];
    readonly bodies: readonly ((enode: TState) => void)[];
    readonly bodyBase: number;
    readonly bodyMask: number;
    /**
     * A ROW OF THE INSTANCE'S TABLE AND NOT A FIELD ON THE INSTANCE, which is the whole of the cut:
     * an undecorated instance has no such row, no `null` standing in for one, and no branch.
     */
    readonly pendingRow: number;
    /** `-1` for a program compiled without wake chains; the row holds `null` until past the wire. */
    readonly wakesRow: number;
}
