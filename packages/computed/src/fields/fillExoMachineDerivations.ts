import type { TExoCommitNode } from '../computed/types/TExoCommitNode';
import type { TExoMachineProgram } from '../machine/types/TExoMachineProgram';

/**
 * IT DOES NOT CONSULT THE PENDING WORD: at a mount everything is pending. A CHAINED DERIVATION IS
 * FILLED CORRECTLY BY THE ORDER ALONE, because the array is topological. It writes through `set`,
 * which leaves the FILL RECORD a backend's sweep of unfilled ports reads.
 */
export function fillExoMachineDerivations<TState extends TExoCommitNode>(
    program: TExoMachineProgram<TState>,
    enode: TState
): void {
    const computes = program.computes;
    const stores = program.stores;
    for (let i = 0; i < computes.length; i++) {
        const value = computes[i](enode);
        const store = stores[i] as (enode: TState, value: unknown) => void;
        store(enode, value);
    }
    enode.managedState[program.pendingRow] = 0;
}
