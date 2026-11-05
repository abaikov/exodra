import type { TExoNode } from '../schema/types/TExoNode';
import type { TExoEffectOwner } from '../wiring/types/TExoEffectOwner';
import { EXO_DISCONNECTED_EFFECT_STOPS } from './constants/EXO_DISCONNECTED_EFFECT_STOPS';
import { stopExoEffects } from './stopExoEffects';

export function disconnectExoNode(exoNode: TExoNode | TExoEffectOwner): void {
    const node = exoNode as unknown as TExoEffectOwner;
    if (node.effectStops === null || node.effectStops === EXO_DISCONNECTED_EFFECT_STOPS) return;
    stopExoEffects(node);
    if (node.effectStops === null) node.effectStops = EXO_DISCONNECTED_EFFECT_STOPS;
}
