import { stopExoEffects } from '@exodra/core';
import type { TExoStrNode } from './EXO_STR_NODE_VOCABULARY';

export function disposeExoStrInstance(node: TExoStrNode): void {
    // THE INSTANCE ENDS HERE, so every `onTeardown` collected runs now, in registration order
    // and after the markup is taken — the page states what was mounted, not what was torn down.
    // The slot is emptied FIRST, so a re-entrant `onTeardown` cannot leave an entry nothing will reach.
    if (node.effectStops !== null) stopExoEffects(node);
    const disposers = node.disposers;
    if (disposers !== null) {
        node.disposers = null;
        for (let i = 0; i < disposers.length; i++) disposers[i]();
    }
}
