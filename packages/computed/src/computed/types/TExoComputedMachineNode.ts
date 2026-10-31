import type { TExoBaseNodeFields, TExoInstanceRecord, TExoMachineNode } from '@exodra/core';

/**
 * `undefined` IS "THIS BACKEND KEEPS NO LIFECYCLE" and is a property ABSENCE rather than a value:
 * @exodra/string never inserts anything, so `mounted` staying false is the truth about it.
 */
export interface TExoComputedMachineNode
    extends TExoMachineNode,
        Pick<TExoBaseNodeFields, 'managedState'> {
    live?: TExoInstanceRecord['live'];
}
