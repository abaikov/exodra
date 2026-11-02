import type { TExoCursorDeclaration } from '../../schema/types/TExoCursorDeclaration';
import type { TExoMachineEffect } from './TExoMachineEffect';
import type { TExoMachineHandler } from './TExoMachineHandler';
import type { TExoMachineInitialState } from './TExoMachineInitialState';

declare const EXO_MACHINE_STATE: unique symbol;

export type TExoMachine<
    TWiring = unknown,
    TPorts = unknown,
    TParams = unknown,
    TState = unknown
> = {
    readonly declaration: TExoCursorDeclaration<TPorts>;
    readonly forms: unknown[];
    readonly createInitialState: TExoMachineInitialState<TWiring> | null;
    wire?(enode: TWiring, params: TParams): void;
    readonly effects: readonly TExoMachineEffect<TWiring>[];
    readonly handlers: readonly TExoMachineHandler[];
    readonly [EXO_MACHINE_STATE]?: TState;
};
