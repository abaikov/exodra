import type { TExoEffectOwner } from '../wiring/types/TExoEffectOwner';

export function stopExoEffects(owner: TExoEffectOwner): void {
    const held = owner.effectStops;
    if (held === null) return;
    owner.effectStops = null;
    stopExoEffectsFrom(held, held.length - 1);
}

function stopExoEffectsFrom(held: ((() => void) | null)[], from: number): void {
    let at = from;
    try {
        for (; at >= 0; at--) {
            const off = held[at];
            if (off !== null) {
                held[at] = null;
                off();
            }
        }
    } finally {
        if (at >= 0) stopExoEffectsFrom(held, at - 1);
    }
}
