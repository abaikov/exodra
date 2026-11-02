import type { TExoMachine } from './types/TExoMachine';
import type { TExoMachineEffect } from './types/TExoMachineEffect';

export function withExoEffects<
    TWiring,
    TPorts,
    TParams,
    TState,
    TMachine extends TExoMachine<TWiring, TPorts, TParams, TState>
>(
    machine: TMachine & TExoMachine<TWiring, TPorts, TParams, TState>,
    declare: (
        effect: (
            start: (enode: TWiring & { state: TState }) => (() => void) | null
        ) => TExoMachineEffect<TWiring>
    ) => void
): TMachine {
    const effects: TExoMachineEffect<TWiring>[] = machine.effects.slice();
    declare((start) => {
        const handle: TExoMachineEffect<TWiring> = {
            at: effects.length,
            start: start as (enode: TWiring) => (() => void) | null,
        };
        effects.push(handle);
        return handle;
    });
    return { ...machine, forms: [], effects } as TMachine;
}
