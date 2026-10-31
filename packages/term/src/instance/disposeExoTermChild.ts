import { stopExoEffects } from '@exodra/core';
import type { TExoTermChild } from './types/TExoTermChild';

// NOTHING IN `@exodra/core` DESCRIBES THIS — lifetimes are this package's own invention, unchecked
// by anything above. FORWARD, in registration order, because a wiring block owns `stopEffects`
// before its first body slot and `setMounted(false)` last: only forward empties `effectStops`
// before the unmount transition, which is what `restartEffect` reads as its refusal — backwards it
// restarts each effect it is stopping. The array is emptied so a double dispose is a no-op, not a
// double unsubscribe. `null` is the COMMON case: `c.onTeardown` makes the array at the FIRST subscription,
// so every row of a non-reactive `c.list` arrives here with nothing to run.
export function disposeExoTermChild(child: TExoTermChild): void {
    if (child.effectStops !== null) stopExoEffects(child);
    const disposers = child.disposers;
    if (disposers !== null) {
        for (let i = 0; i < disposers.length; i++) disposers[i]();
        disposers.length = 0;
    }

    // INDEXED BY PORT, so most slots are `null`: one array per instance rather than two, paid for
    // with `portCount` iterations here instead of `regionCount`.
    const regions = child.regions;
    for (let i = 0; i < regions.length; i++) {
        const region = regions[i];
        if (region === null) continue;
        const children = region.children;
        for (let j = 0; j < children.length; j++) disposeExoTermChild(children[j]);
        region.children = [];
    }
}
