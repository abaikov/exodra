import type { TExoMachineEffect, TExoMachineNode } from '@exodra/core';
import type { TExoMachineFieldHandle } from '../../fields/types/TExoMachineFieldHandle';
import type { TExoMachineReads } from '../../fields/types/TExoMachineReads';
import type { TExoMachineTarget } from '../../machine/types/TExoMachineTarget';

/**
 * FOR A DERIVATION the declared list is BOTH the wake set AND the argument list. FOR A FILL AND AN
 * `effectOn` it is the wake set ALONE — each is handed the INSTANCE, so an author can read a field
 * he did not declare, that slot then does not wake when it moves, and nothing says so.
 */
export interface TExoComputedBuilder<TWiring extends TExoMachineNode> {
    field<TValue>(seed: (enode: TWiring) => TValue): TExoMachineFieldHandle<TWiring, TValue>;
    field<TValue>(seed: TValue): TExoMachineFieldHandle<TWiring, TValue>;
    mounted(): TExoMachineFieldHandle<TWiring, boolean>;
    /**
     * PURE MEANS IT RUNS INSIDE THE COMMIT'S WALK and may not disturb it. Declaration order is
     * execution order and MUST BE TOPOLOGICAL.
     */
    // `const` ON THE TYPE PARAMETER IS LOAD-BEARING: without it `[title, open]` infers as an array
    // of the UNION and every parameter of `by` arrives as `string | boolean`.
    derive<const TFrom extends readonly TExoMachineFieldHandle<TWiring, unknown>[]>(
        port: TExoMachineTarget<TWiring>,
        from: TFrom,
        by: (...values: TExoMachineReads<TWiring, TFrom>) => unknown
    ): void;
    fill(
        from: readonly TExoMachineFieldHandle<TWiring, unknown>[],
        run: (c: TWiring) => void
    ): void;
    effectOn(
        from: readonly TExoMachineFieldHandle<TWiring, unknown>[],
        start: (c: TWiring) => (() => void) | null
    ): void;
    effect(start: (c: TWiring) => (() => void) | null): TExoMachineEffect<TWiring>;
    transition<TFirst = undefined, TSecond = undefined>(
        apply: (enode: TWiring, first: TFirst, second: TSecond) => void
    ): (enode: TWiring, first: TFirst, second: TSecond) => void;
}
