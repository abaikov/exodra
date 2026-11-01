import type { TExoEventOf } from './TExoEventOf';
import type { TExoEventPort } from '../../schema/ports/types/TExoEventPort';
import type { TExoCursorDeclaration } from '../../schema/types/TExoCursorDeclaration';
import type { TExoMachine } from './TExoMachine';
import type { TExoMachineEffect } from './TExoMachineEffect';
import type { TExoMachineStateHandle } from './TExoMachineStateHandle';
import type { TExoTransitionOverrides } from './TExoTransitionOverrides';
import type { TExoMachineNode } from './TExoMachineNode';

export interface TExoMachineBuilder<
    TWiring extends TExoMachineNode,
    TParams = unknown,
    TState = unknown
> {
    readonly schema: TExoCursorDeclaration<unknown>;
    createInitialState<TValue extends TState>(
        make: (enode: TWiring, index: number, params: TParams) => TValue
    ): TExoMachineStateHandle<TValue>;
    wire(apply: (enode: TWiring & { state: TState }, params: TParams) => void): void;
    overrides<TPairs extends readonly ((enode: TWiring, ...args: never[]) => void)[]>(pairs: {
        readonly [K in keyof TPairs]: readonly [TPairs[K], NoInfer<TPairs[K]>];
    }): TExoTransitionOverrides;
    effect(
        start: (enode: TWiring & { state: TState }) => (() => void) | null
    ): TExoMachineEffect<TWiring>;
    on<TEvent>(
        port: TExoEventPort<TEvent>,
        handler: (
            enode: TWiring & { state: TState },
            event: unknown extends TEvent ? TExoEventOf<TWiring> : TEvent
        ) => void
    ): void;
    transition(apply: (enode: TWiring & { state: TState }) => void): (enode: TWiring) => void;
    transition<TFirst>(
        apply: (enode: TWiring & { state: TState }, first: TFirst) => void
    ): (enode: TWiring, first: TFirst) => void;
    transition<TFirst, TSecond>(
        apply: (enode: TWiring & { state: TState }, first: TFirst, second: TSecond) => void
    ): (enode: TWiring, first: TFirst, second: TSecond) => void;
    done(): TExoMachine<TWiring, unknown, TParams>;
}
