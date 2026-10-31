import type { TExoCommitNode } from '../computed/types/TExoCommitNode';
import type { TExoMachineProgram } from './types/TExoMachineProgram';

/**
 * IT RUNS AFTER THE DERIVATION WALK HAS FINISHED, always. THE BITS ARE RE-READ FROM THE INSTANCE ON
 * EVERY STEP, because a body may fire a transition whose settler calls this again; each bit is
 * cleared BEFORE its body runs. `done` is a local and does NOT bound the recursion — a
 * self-dirtying body ends in a stack overflow, which is the honest guarantee: it fails loudly.
 */
export function runExoMachineSlots<TState extends TExoCommitNode>(
    program: TExoMachineProgram<TState>,
    enode: TState
): void {
    const mask = program.bodyMask;
    const values = enode.managedState;
    const at = program.pendingRow;
    const base = program.bodyBase;
    const starts = program.bodies;
    let done = 0;
    let pending = (values[at] as number) & mask;
    while (pending !== 0) {
        const bit = pending & -pending;
        values[at] = (values[at] as number) ^ bit;
        done |= bit;
        starts[31 - Math.clz32(bit) - base](enode);
        pending = (values[at] as number) & mask & ~done;
    }
}
