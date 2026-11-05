import type { TExoContextFrame } from '@exodra/context';
// TYPE-ONLY, and that is a graph fact: a value import of `TExoHydrateNode` closes a runtime cycle
// `EXO_HYDRATE_NODE_VOCABULARY -> adopt-* -> hydrate-instance -> EXO_HYDRATE_NODE_VOCABULARY`.
import { EXO_ARMED_INSTANCE } from '../dom/constants/EXO_ARMED_INSTANCE';
import type { TExoDomInstanceRecord } from '../dom/types/TExoDomInstanceRecord';
import type { TExoDomChild } from '../dom/types/TExoDomChild';
import { armExoNode, stopExoEffects } from '@exodra/core';
import { exoOnTeardown } from '../dom/exoTeardownScope';
import { walkExoHydrateTable } from './walkExoHydrateTable';
import type { TExoDomMachine } from '../dom/types/TExoDomMachine';
import type { TExoHydrateSchema } from './types/TExoHydrateSchema';

// Replays the DOM backend's walk over nodes that already exist: nothing is cloned, parsed, searched
// or compared, and only listeners and subscriptions are left. The one thing the two trees do not
// share is a landing BEHIND a child list, which the compiler emits `hydrateWalk` for.
export function hydrateExoInstance(
    schema: TExoHydrateSchema,
    root: Element,
    machine: TExoDomMachine,
    ownerChild: TExoDomChild | null,
    holder: TExoDomInstanceRecord,
    context: TExoContextFrame | null = null,
    params?: unknown,
    calls: readonly unknown[] | null = null
): void {
    walkExoHydrateTable(schema, root, holder);
    // An adopted ROW arrives as the child `buildAdoptedExoChild` made against the OWNER's schema;
    // this seats it on the row's own. Every record reaching here came from some hydrate schema, so
    // the store only ever moves one between two ADOPTING schemas.
    holder.schema = schema;
    holder.child = ownerChild;
    holder.context = context;
    try {
        armExoNode(
            holder as unknown as Parameters<typeof armExoNode>[0],
            machine as Parameters<typeof armExoNode>[1],
            params
        );
        if (calls !== null) {
            for (let i = 0; i < calls.length; i += 3) {
                (calls[i] as (enode: TExoDomInstanceRecord, a: unknown, b: unknown) => void)(
                    holder,
                    calls[i + 1],
                    calls[i + 2]
                );
            }
        }
    } finally {
        // In the `finally`: a wiring function that throws leaves the record reachable exactly as one
        // that returns does, and left set, every later `build` hands back a child nothing resolves.
        // THE PHASE IS THIS POINTER AND NOT A FLAG: the adopting writers are this schema's
        // `setters` and the live ones are the DOM schema's, so both passes read `schema.setters[i]`
        // with no branch and the render pack's `attr`/`text`/`html` serve either side of the swap.
        holder.schema = schema.domSchema as unknown as TExoHydrateSchema;
        const lists = holder.portChildren;
        if (lists !== null) {
            for (let i = 0; i < lists.length; i++) lists[i]?.dropUnclaimedServed();
        }
    }
    // The holder is NOT the child on any adopting path, so the dispose walk's field read cannot
    // reach its effects — same arrangement as `mountExoInstance`.
    if (holder.effectStops !== null) {
        const enode = holder;
        exoOnTeardown(ownerChild, (): void => {
            stopExoEffects(enode);
        });
    }
    // `mounted` goes TRUE for an adopted root while `TExoDomChild.mount` is NOT called: a hook is
    // about a transition and the node did not move; a field is about a state.
    try {
        const live = holder.live;
        if (live !== null) live.setMounted?.(live, true);
    } finally {
        // PUBLISHED LAST: the `mounted` commit above may have run a fill that adopted or built
        // children, and each of those wrote the slot on its way out. THE INSTANCE ITSELF, as on the
        // building path — what the caller fires transitions at.
        EXO_ARMED_INSTANCE.value = holder;
    }
}
