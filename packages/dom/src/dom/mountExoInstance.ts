import type { TExoContextFrame } from '@exodra/context';
import { stopExoEffects } from '@exodra/core';
import { EXO_ARMED_INSTANCE } from './constants/EXO_ARMED_INSTANCE';
import { exoOnTeardown } from './exoTeardownScope';
import { createExoNode } from './factories/createExoNode';
import type { TExoDomChild } from './types/TExoDomChild';
import type { TExoDomSchema } from './types/TExoDomSchema';
import type { TExoDomMachine } from './types/TExoDomMachine';

// Wired BEFORE it is inserted, so every write lands on a node that is not in the document: no style
// invalidation, no layout, nothing observed. `before === null` means "at the end".
export function mountExoInstance(
    schema: TExoDomSchema,
    machine: TExoDomMachine,
    parent: Element,
    before: Node | null,
    ownerChild: TExoDomChild | null,
    // Resolved BEFORE the clone is inserted: at wiring time this node is attached to nothing, so a
    // context cannot be walked out of the DOM and has to arrive as a value.
    context: TExoContextFrame | null = null,
    params?: unknown
): Element {
    const root = schema.acquireNode(schema);
    // Through the COMPOSITION'S factory: a record is built by one constructor per shape, and a slot
    // added afterwards would grow the object past its in-object store.
    const record = schema.createInstance(schema);
    createExoNode(schema, root, machine, ownerChild, record, context, params);
    // EVERY INSTANCE THIS FUNCTION MAKES HAS A RECORD THAT IS NOT ITS OWN CHILD, so the dispose
    // walk — which reads `effectStops` off the child it is handed — can never reach these. The
    // field read covers the path where the two are one object (`materialiseExoChild`), which is
    // every reconciled ROW; a root, a `c.one` and a fixed `c.list` row pay this closure instead.
    if (record.effectStops !== null) {
        const enode = record;
        exoOnTeardown(ownerChild, (): void => {
            stopExoEffects(enode);
        });
    }
    // Taken the instant the wire returns and put back the instant before this does: both lines
    // between can run somebody else's code. Why the `finally`: ../../README.md § The `finally` on
    // the wire path.
    const out = EXO_ARMED_INSTANCE.value;
    try {
        // Same DOM algorithm, but `insertBefore` is a two-argument IDL method and pays an interface
        // type-check per call. Measured against Mikado on one 80-card app: our insertion line 33 ms
        // against its `appendChild` line 18 ms, with 281 of 321 mount insertions on a null anchor.
        if (before === null) parent.appendChild(root);
        else parent.insertBefore(root, before);
        // "Placed" and NOT "connected to the document": a `c.one` inside a root render fires this
        // while its subtree is still detached.
        const live = record.live;
        if (live !== null) live.setMounted?.(live, true);
    } finally {
        // In the `finally`, unlike `createExoNode`'s publish: this PUTS BACK a value already
        // published — this instance's own — that the block may have overwritten.
        EXO_ARMED_INSTANCE.value = out;
    }
    return root;
}
