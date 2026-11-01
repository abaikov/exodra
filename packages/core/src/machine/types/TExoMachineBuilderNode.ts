import type { TExoMachineBuilder } from './TExoMachineBuilder';
import type { TExoMachineNode } from './TExoMachineNode';

export type TExoMachineBuilderNode<TBuilder> = TBuilder extends TExoMachineBuilder<
    infer TWiring extends TExoMachineNode,
    infer _TParams,
    infer TState
>
    ? TWiring & { state: TState }
    : never;
