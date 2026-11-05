import type { TExoNode } from '../schema/types/TExoNode';
import { EXO_UNARMED_STATE } from './constants/EXO_UNARMED_STATE';
import { EXO_WIRE_RERUN } from './constants/EXO_WIRE_RERUN';
import type { TExoArmableNode } from './types/TExoArmableNode';
import type { TExoMachine } from './types/TExoMachine';
import type { TExoMachineNode } from './types/TExoMachineNode';

export function wireExoNode<TNode extends TExoNode | TExoMachineNode, TParams>(
    node: TNode,
    params?: TParams
): TNode {
    const enode = node as unknown as TExoMachineNode;
    if (enode.state === EXO_UNARMED_STATE) {
        (enode as unknown as TExoArmableNode).armExoSelf(params);
        return node;
    }
    const machine = enode.machine as TExoMachine<TExoMachineNode> | null;
    const wire = machine === null ? undefined : machine.wire;
    if (wire === undefined || wire === null) return node;
    const outer = EXO_WIRE_RERUN.value;
    EXO_WIRE_RERUN.value = true;
    try {
        wire.call(machine, enode, params);
    } finally {
        EXO_WIRE_RERUN.value = outer;
    }
    return node;
}
