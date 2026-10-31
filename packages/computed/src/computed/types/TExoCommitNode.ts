import type { TExoFillDoors } from '@exodra/core';

// Exactly what `fillExoMachineDerivations`, `chainExoMachineWakes` and `commitExoMachine` touch:
// the numbered state rows, and the doors a compiled store writes through. Not `onTeardown` and not the
// lifecycle half — those are asked for where effects are actually run.
export interface TExoCommitNode extends TExoFillDoors {
    managedState: unknown[];
}
