import type { TExoNode } from '../schema/types/TExoNode';
import type { TExoEffectOwner } from '../wiring/types/TExoEffectOwner';
import { stopExoEffects } from './stopExoEffects';

export function disconnectExoNode(exoNode: TExoNode | TExoEffectOwner): void {
    const node = exoNode as unknown as TExoEffectOwner;
    const held = node.effectStops;
    stopExoEffects(node);
    if (held !== null && node.effectStops === null) node.effectStops = held;
}
