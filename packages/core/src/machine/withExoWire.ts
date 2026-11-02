import type { TExoMachine } from './types/TExoMachine';

export function withExoWire<
    TWiring,
    TPorts,
    TParams,
    TState,
    TMachine extends TExoMachine<TWiring, TPorts, TParams, TState>
>(
    machine: TMachine & TExoMachine<TWiring, TPorts, TParams, TState>,
    wire: (enode: TWiring & { state: TState }, params: TParams) => void
): TMachine {
    if (machine.wire !== undefined) {
        throw new Error(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? 'withExoWire: this machine already has a wire; a machine has one wire.'
                : 'EXO0101'
        );
    }
    return { ...machine, forms: [], wire } as TMachine;
}
