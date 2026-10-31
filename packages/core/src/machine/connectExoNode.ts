import type { TExoNode } from '../schema/types/TExoNode';
import type { TExoMachine } from './types/TExoMachine';
import type { TExoMachineNode } from './types/TExoMachineNode';

export function connectExoNode(
    node: TExoNode | TExoMachineNode,
    machine: TExoMachine<never>
): void {
    const effects = (machine as TExoMachine<TExoMachineNode>).effects;
    const owner = node as unknown as TExoMachineNode;
    for (let at = 0; at < effects.length; at++) owner.restartEffect(effects[at]);
}
