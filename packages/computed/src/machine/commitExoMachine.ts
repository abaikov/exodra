import type { TExoCommitNode } from '../computed/types/TExoCommitNode';
import type { TExoMachineProgram } from './types/TExoMachineProgram';

/**
 * LOW TO HIGH IS AN ORDER: derivations are numbered topologically (the compiler refuses a spec
 * where they are not), so one that FEEDS another sits at a lower bit and the same pass reaches it.
 *
 * Derivations are walked out of a LOCAL, body bits are LEFT ON THE INSTANCE for
 * `runExoMachineSlots` — which is what makes "bodies run after the derivation walk" true by
 * construction, and why a derivation may not fire a transition.
 */
export function commitExoMachine<TState extends TExoCommitNode>(
    program: TExoMachineProgram<TState>,
    enode: TState
): void {
    const values = enode.managedState;
    const at = program.pendingRow;
    const touched = values[at] as number;
    if (touched === 0) return;

    const effectMask = program.bodyMask;
    values[at] = touched & effectMask;
    let pending = touched & ~effectMask;

    if (pending !== 0) {
        const computes = program.computes;
        const portOf = program.ports;
        const stores = program.stores;
        const after = program.after;

        do {
            const bit = pending & -pending;
            const i = 31 - Math.clz32(bit);
            pending ^= bit;

            const value = computes[i](enode);
            const store = stores[i] as (enode: TState, value: unknown) => void;
            store(enode, value);
            // A FIELD WRITE WAKES OTHERS AND A PORT WRITE DOES NOT — the one thing the two
            // addresses still differ in after the fill itself stopped caring.
            if (portOf[i] === null) {
                const woken = after[i];
                pending |= woken & ~effectMask;
                values[at] = (values[at] as number) | (woken & effectMask);
            }
        } while (pending !== 0);
    }
}
