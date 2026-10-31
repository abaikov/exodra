import type { TExoMachineDerivation } from '../../machine/types/TExoMachineDerivation';
import type { TExoMachineBody } from '../../machine/types/TExoMachineBody';
import type { TExoMachineFieldHandle } from '../../fields/types/TExoMachineFieldHandle';
import type { TExoMachineProgram } from '../../machine/types/TExoMachineProgram';

export interface TExoWiringSite<TWiring> {
    program: TExoMachineProgram<TWiring> | null;
    readonly handles: TExoMachineFieldHandle<TWiring, unknown>[];
    readonly marks: number[];
    readonly derivations: TExoMachineDerivation<TWiring>[];
    readonly effects: TExoMachineBody<TWiring>[];
    /**
     * `true` where the declaration was an `effect` and owns a disposer, `false` for a `fill` — what
     * tells the two apart now that the program's body table does not.
     */
    readonly owns: boolean[];
    mountedRow: number;
}
