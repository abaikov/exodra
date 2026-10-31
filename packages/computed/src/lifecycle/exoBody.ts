import type { TExoMachineBody } from '../machine/types/TExoMachineBody';
import type { TExoMachineField } from '../fields/types/TExoMachineField';

export function exoBody<TState>(declaration: {
    readonly label: string;
    readonly reads: readonly TExoMachineField<TState, unknown>[];
    readonly start: (instance: TState) => void;
}): TExoMachineBody<TState> {
    return declaration as unknown as TExoMachineBody<TState>;
}
