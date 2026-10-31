import type { TExoMachineField } from '../../fields/types/TExoMachineField';

/**
 * ITS DECLARED LIST IS THE WAKE SET AND NOTHING ELSE: the body reads through the field handles, so
 * it may read a field it did not declare and that slot then does not wake when the field moves.
 */
export interface TExoMachineBody<TState> {
    readonly label: string;
    readonly reads: readonly TExoMachineField<TState, unknown>[];
    readonly start: (instance: never) => void;
}
