import type { TExoComputedMachineNode } from '../computed/types/TExoComputedMachineNode';

export function seatExoManagedRows<TOf extends TExoComputedMachineNode>(
    enode: TOf,
    seeds: readonly unknown[]
): void {
    const rows = seeds.length;
    const values: unknown[] = [];
    for (let at = 0; at < rows; at++) {
        const seed = seeds[at];
        values.push(typeof seed === 'function' ? (seed as (of: TOf) => unknown)(enode) : seed);
    }
    enode.managedState = values;
}
