import type { TExoMachineProgram } from './TExoMachineProgram';

export type TExoMachineDeclared<TState> =
    | TExoMachineProgram<TState>
    | { readonly program: TExoMachineProgram<TState> };
