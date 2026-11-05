import type { TExoMachineNode } from './TExoMachineNode';

export type TExoParamsWire = ((enode: TExoMachineNode, params: unknown) => void) & {
    readonly aroundWire: (
        wire: (enode: TExoMachineNode, params: unknown) => void
    ) => TExoParamsWire;
};
