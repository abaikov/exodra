import { refuseExoSecondWire } from './asserts/refuseExoSecondWire';
import type { TExoMachine } from './types/TExoMachine';
import type { TExoParamsWire } from './types/TExoParamsWire';

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
    const aroundWire = (machine.wire as Partial<TExoParamsWire> | undefined)?.aroundWire;
    if (aroundWire !== undefined) {
        return {
            ...machine,
            forms: [],
            wire: aroundWire(wire as unknown as Parameters<TExoParamsWire['aroundWire']>[0]),
        } as TMachine;
    }
    if (machine.wire !== undefined) {
        refuseExoSecondWire();
    }
    return { ...machine, forms: [], wire } as TMachine;
}
