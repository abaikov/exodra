import type { TExoMachine } from '@exodra/core';
import type { TExoMachineProgram } from '../../machine/types/TExoMachineProgram';

export type TExoComputedMachine<TWiring> = TExoMachine<TWiring> & {
    readonly program: TExoMachineProgram<TWiring>;
};
