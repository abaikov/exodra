import type { TExoMachineInitialState } from './TExoMachineInitialState';

export type TExoMachineOptions<TWiring, TParams, TState> = {
    readonly createInitialState?: TExoMachineInitialState<TWiring, TState, TParams>;
};
