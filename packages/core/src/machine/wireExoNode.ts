import type { TExoNode } from '../schema/types/TExoNode';
import { EXO_WIRE_RERUN } from './constants/EXO_WIRE_RERUN';
import type { TExoMachine } from './types/TExoMachine';
import type { TExoMachineNode } from './types/TExoMachineNode';

export function wireExoNode<TParams>(
    node: TExoNode | TExoMachineNode,
    machine: TExoMachine<never, unknown, TParams>,
    params?: TParams
): void {
    const wire = (machine as TExoMachine<TExoMachineNode, unknown, TParams>).wire;
    if (wire === undefined || wire === null) return;
    const outer = EXO_WIRE_RERUN.value;
    EXO_WIRE_RERUN.value = true;
    try {
        wire.call(machine, node as unknown as TExoMachineNode, params as TParams);
    } finally {
        EXO_WIRE_RERUN.value = outer;
    }
}
