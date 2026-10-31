import type { TExoMachineField } from '../../fields/types/TExoMachineField';
import type { TExoMachineTarget } from './TExoMachineTarget';

/**
 * THE ORDER OF THE ARRAY IS THE EXECUTION ORDER AND MUST BE TOPOLOGICAL: the commit runs pending
 * bits LOW TO HIGH, and `compileExoMachine` refuses a spec where it is not. A derivation declaring
 * no reads is refused — nothing could ever wake it. Write declarations through `exoComputed`: this
 * ERASED form type-checks the mask but not the ARGUMENT ORDER.
 */
export interface TExoMachineDerivation<TState> {
    readonly label: string;
    readonly reads: readonly TExoMachineField<TState, unknown>[];
    readonly into: TExoMachineTarget<TState>;
    readonly compute: (...values: never[]) => unknown;
}
