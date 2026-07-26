import type { TExoSchema } from '@exodra/core';
import type { TExoBindable } from '@exodra/reactivity-types';
import { exoSource, exoChildren } from '@oimdb/exodra';

type Subscribable = { subscribeOnAnyUpdate(cb: () => void): () => void };

// The shared "structural list" the reference/list pages all need: an
// identity-stable, keyed list whose ORDER comes from `order()` and whose
// membership tracks SEVERAL collections at once (a row's structural key often
// depends on related data, so gating on one collection would miss changes).
//
// The wrapping source forwards every update from any listed collection;
// `exoChildren` dedups on the composite key, so a field edit that leaves the key
// unchanged is a reconcile no-op and the focused input keeps focus. This is the
// pattern that was copy-pasted across Projects/Tasks/People — one helper now.
export function structuralList<T>(
    order: () => readonly T[],
    sources: readonly Subscribable[],
    key: (item: T) => string,
    render: (item: T) => TExoSchema
): TExoBindable<readonly TExoSchema[]> {
    return exoChildren(
        exoSource(order, cb => {
            const unsubs = sources.map(s => s.subscribeOnAnyUpdate(cb));
            return () => unsubs.forEach(u => u());
        }),
        { key, render }
    );
}
