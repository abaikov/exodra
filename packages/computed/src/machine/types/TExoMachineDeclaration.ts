import type { TExoMachineDerivation } from './TExoMachineDerivation';
import type { TExoMachineBody } from './TExoMachineBody';

export interface TExoMachineDeclaration<TState> {
    readonly fields: number;
    readonly pendingRow: number;
    readonly wakesRow?: number;
    readonly derivations: readonly TExoMachineDerivation<TState>[];
    readonly bodies?: readonly TExoMachineBody<TState>[];
}
