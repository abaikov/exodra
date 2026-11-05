import { EXO_WALK_FIRST_CHILD } from '../dom/constants/EXO_WALK_FIRST_CHILD';
import { EXO_WALK_FROM_END } from '../dom/constants/EXO_WALK_FROM_END';
import { EXO_WALK_NEXT_SIBLING } from '../dom/constants/EXO_WALK_NEXT_SIBLING';
import { EXO_EMPTY_NODES } from '../dom/constants/EXO_EMPTY_NODES';
import type { TExoDomInstanceRecord } from '../dom/types/TExoDomInstanceRecord';
import type { TExoHydrateSchema } from './types/TExoHydrateSchema';

// Node.TEXT_NODE, spelled out — see `dom/set-text` for why the constant is not read off a node.
const TEXT_NODE = 3;

export function walkExoHydrateTable(
    schema: TExoHydrateSchema,
    root: Element,
    holder: TExoDomInstanceRecord
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
}
