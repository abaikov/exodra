import type { TExoContextFrame } from '@exodra/context';
import { EXO_WALK_FIRST_CHILD } from '../dom/constants/EXO_WALK_FIRST_CHILD';
import { EXO_WALK_FROM_END } from '../dom/constants/EXO_WALK_FROM_END';
import { EXO_WALK_NEXT_SIBLING } from '../dom/constants/EXO_WALK_NEXT_SIBLING';
// TYPE-ONLY, and that is a graph fact: a value import of `TExoHydrateNode` closes a runtime cycle
// `EXO_HYDRATE_NODE_VOCABULARY -> adopt-* -> hydrate-instance -> EXO_HYDRATE_NODE_VOCABULARY`.
import { EXO_ARMED_INSTANCE } from '../dom/constants/EXO_ARMED_INSTANCE';
import { EXO_EMPTY_NODES } from '../dom/constants/EXO_EMPTY_NODES';
import type { TExoDomInstanceRecord } from '../dom/types/TExoDomInstanceRecord';
import type { TExoDomChild } from '../dom/types/TExoDomChild';
import { armExoNode, stopExoEffects } from '@exodra/core';
import { exoOnTeardown } from '../dom/exoTeardownScope';
import { dropExoAdoptSurplus, EXO_ADOPT_CURSOR } from '../dom/EXO_ADOPT_CURSOR';
import type { TExoDomMachine } from '../dom/types/TExoDomMachine';
import type { TExoHydrateSchema } from './types/TExoHydrateSchema';

// Node.TEXT_NODE, spelled out — see `dom/set-text` for why the constant is not read off a node.
const TEXT_NODE = 3;

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
    params?: unknown
): void {
    // One element and the walk APPENDS, as on the building path: `the-hydrate-walk-fills-the-table-
    // in-order` pins that this walk writes 1..slots-1 ascending even where it counts back from a
    // parent's last child, so nothing lands past `length` and the table never goes holey.
    const nodes: Node[] = schema.sharesEmptyNodes ? EXO_EMPTY_NODES : [root];
    holder.nodes = nodes;
    // The HYDRATION walk: a landing behind a child list counts BACK from its parent's last child,
    // because a forward hop would land on one of that child list's rows. The count rides in the op.
    const walk = schema.walk;
    for (let i = 0; i < walk.length; i += 3) {
        const from = nodes[walk[i + 1]];
        const op = walk[i + 2];
        if (op === EXO_WALK_FIRST_CHILD) {
            nodes[walk[i]] = from.firstChild as Node;
        } else if (op === EXO_WALK_NEXT_SIBLING) {
            nodes[walk[i]] = from.nextSibling as Node;
        } else {
            let landed = from.lastChild as Node;
            for (let back = op - EXO_WALK_FROM_END; back > 0; back--) {
                landed = landed.previousSibling as Node;
            }
            nodes[walk[i]] = landed;
        }
    }

    // The server prints nothing for an empty text port, so `<p></p>` arrives with no child. An empty
    // Text node serialises to nothing, so inserting one keeps the two trees byte-identical.
    const textLandings = schema.textLandings;
    if (textLandings !== null) {
        for (let i = 0; i < textLandings.length; i += 2) {
            const el = nodes[textLandings[i + 1]] as Element;
            const at = el.firstChild;
            if (at !== null && at.nodeType === TEXT_NODE) {
                nodes[textLandings[i]] = at;
            } else {
                const made = el.ownerDocument.createTextNode('');
                el.insertBefore(made, at);
                nodes[textLandings[i]] = made;
            }
        }
    }

    // Left SPARSE: a hole reads as `undefined`, which is what "has not adopted yet" means and what
    // the refusal in `exoChildListStartAfter` fires on.
    holder.publishedChildListEnds = schema.hasSeparatedChildLists ? [] : null;
    // An adopted ROW arrives as the child `buildAdoptedExoChild` made against the OWNER's schema;
    // this seats it on the row's own. Every record reaching here came from some hydrate schema, so
    // the store only ever moves one between two ADOPTING schemas.
    holder.schema = schema;
    holder.child = ownerChild;
    holder.context = context;
    // SAVED AND RESTORED, because this instance may itself BE a row the caller is adopting: the cell
    // the caller is walking has to survive this wire opening child lists of its own.
    const heldCursor = EXO_ADOPT_CURSOR.value;
    EXO_ADOPT_CURSOR.value = null;
    try {
        armExoNode(
            holder as unknown as Parameters<typeof armExoNode>[0],
            machine as Parameters<typeof armExoNode>[1],
            params
        );
    } finally {
        // In the `finally`: a wiring function that throws leaves the record reachable exactly as one
        // that returns does, and left set, every later `build` hands back a child nothing resolves.
        // THE PHASE IS THIS POINTER AND NOT A FLAG: the adopting writers are this schema's
        // `setters` and the live ones are the DOM schema's, so both passes read `schema.setters[i]`
        // with no branch and the render pack's `attr`/`text`/`html` serve either side of the swap.
        holder.schema = schema.domSchema as unknown as TExoHydrateSchema;
        dropExoAdoptSurplus();
        EXO_ADOPT_CURSOR.value = heldCursor;
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
