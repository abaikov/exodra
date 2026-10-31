import type { TExoPort } from '@exodra/core';
import type { TExoMachineField } from '../../fields/types/TExoMachineField';

/**
 * Told apart by `'kind' in target` and NOT by comparing the address against where the schema's
 * numbering stopped: a destination is named by IDENTITY everywhere else in this package.
 */
export type TExoMachineTarget<TState> = TExoPort | TExoMachineField<TState, unknown>;
