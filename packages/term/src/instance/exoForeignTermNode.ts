import { EXO_NO_MANAGED_STATE, EXO_NO_STATE } from '@exodra/core';
import type { TExoNode } from '@exodra/core';
import type { TExoTermChild } from './types/TExoTermChild';
import type { TExoTermMark } from '../rendering/types/TExoTermMark';
import type { TExoTermElement } from './types/TExoTermElement';

// A bare `TExoTermElement` is NOT a child: `bindChildren` casts its array to `TExoTermChild`s and
// disposes what the new array drops, reading `disposers` and `regions` off every entry. The node is
// taken as it stands and never copied, so a caller keeping it has a live foreign subtree. IT DOES
// NOT CHECK that the same node reaches only one port: a region is an ARRAY replaced wholesale, so a
// twice-placed node merely prints twice, where the browser throws a `DOMException`.
export function exoForeignTermNode(node: TExoTermElement): TExoNode<TExoTermMark> {
    // The field order is the wired instance's first nine exactly (`createExoTermInstanceFactory`), so the
    // dispose walk reads one OFFSET for both shapes — not one hidden class, the prototypes differ.
    const child: TExoTermChild = {
        context: null,
        disposers: null,
        state: EXO_NO_STATE,
        managedState: EXO_NO_MANAGED_STATE,
        effectStops: null,
        transitionOverrides: null,
        serviceState: undefined,
        node,
        regions: [],
    };
    return child as unknown as TExoNode<TExoTermMark>;
}
