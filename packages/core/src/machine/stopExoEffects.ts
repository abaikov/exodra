import type { TExoEffectOwner } from '../wiring/types/TExoEffectOwner';

export function stopExoEffects(owner: TExoEffectOwner): void {
    const held = owner.effectStops;
    if (held === null) return;
    owner.effectStops = null;
    for (let i = held.length - 1; i >= 0; i--) {
        const off = held[i];
        if (off !== null) {
            held[i] = null;
            off();
        }
    }
}
