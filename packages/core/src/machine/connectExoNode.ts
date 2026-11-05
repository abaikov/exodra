import type { TExoNode } from '../schema/types/TExoNode';
import { EXO_DISCONNECTED_EFFECT_STOPS } from './constants/EXO_DISCONNECTED_EFFECT_STOPS';
import type { TExoMachine } from './types/TExoMachine';
import type { TExoMachineNode } from './types/TExoMachineNode';

export function connectExoNode(node: TExoNode | TExoMachineNode): void {
    const owner = node as unknown as TExoMachineNode;
    const effects = (owner.machine as TExoMachine<TExoMachineNode>).effects;
    if (owner.effectStops === EXO_DISCONNECTED_EFFECT_STOPS) {
        owner.effectStops = new Array<(() => void) | null>(effects.length).fill(null);
    }
    for (let at = 0; at < effects.length; at++) owner.restartEffect(effects[at]);
}
