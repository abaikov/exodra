import type { TExoMachine } from './TExoMachine';

export type TExoMachineNodeOf<TMachine> = TMachine extends TExoMachine<
    infer TWiring,
    unknown,
    never,
    infer TState
>
    ? TWiring & { state: TState }
    : never;
