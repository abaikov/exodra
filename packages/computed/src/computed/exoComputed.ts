import type { TExoMachineDerivation } from '../machine/types/TExoMachineDerivation';
import type { TExoMachineField } from '../fields/types/TExoMachineField';
import type { TExoMachineTarget } from '../machine/types/TExoMachineTarget';

interface TExoComputedHead<TState> {
    readonly label: string;
    readonly into: TExoMachineTarget<TState>;
}

/**
 * FOUR DECLARED FIELDS IS WHERE THE DOOR STOPS. There is no catch-all overload because one would
 * SWALLOW the mistake this exists to catch: a two-field call with its arguments the wrong way round
 * would stop matching the two-field overload and silently match the loose one.
 */
export function exoComputed<TState, TA>(
    declaration: TExoComputedHead<TState> & {
        readonly reads: readonly [TExoMachineField<TState, TA>];
        readonly compute: (a: TA) => unknown;
    }
): TExoMachineDerivation<TState>;
export function exoComputed<TState, TA, TB>(
    declaration: TExoComputedHead<TState> & {
        readonly reads: readonly [TExoMachineField<TState, TA>, TExoMachineField<TState, TB>];
        readonly compute: (a: TA, b: TB) => unknown;
    }
): TExoMachineDerivation<TState>;
export function exoComputed<TState, TA, TB, TC>(
    declaration: TExoComputedHead<TState> & {
        readonly reads: readonly [
            TExoMachineField<TState, TA>,
            TExoMachineField<TState, TB>,
            TExoMachineField<TState, TC>
        ];
        readonly compute: (a: TA, b: TB, c: TC) => unknown;
    }
): TExoMachineDerivation<TState>;
export function exoComputed<TState, TA, TB, TC, TD>(
    declaration: TExoComputedHead<TState> & {
        readonly reads: readonly [
            TExoMachineField<TState, TA>,
            TExoMachineField<TState, TB>,
            TExoMachineField<TState, TC>,
            TExoMachineField<TState, TD>
        ];
        readonly compute: (a: TA, b: TB, c: TC, d: TD) => unknown;
    }
): TExoMachineDerivation<TState>;
export function exoComputed<TState>(
    declaration: TExoMachineDerivation<TState>
): TExoMachineDerivation<TState> {
    return declaration;
}
