import type { TExoMachineFieldHandle } from './TExoMachineFieldHandle';

/**
 * `-readonly` because a rest parameter list is not readonly, and a tuple inferred from an array
 * literal argument under a `readonly` constraint is.
 */
export type TExoMachineReads<TOf, TFrom extends readonly TExoMachineFieldHandle<TOf, unknown>[]> = {
    -readonly [TAt in keyof TFrom]: TFrom[TAt] extends TExoMachineFieldHandle<TOf, infer TValue>
        ? TValue
        : never;
};
