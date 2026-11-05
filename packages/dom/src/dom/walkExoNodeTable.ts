import { EXO_WALK_FIRST_CHILD } from './constants/EXO_WALK_FIRST_CHILD';
import { EXO_EMPTY_NODES } from './constants/EXO_EMPTY_NODES';
import type { TExoDomInstanceRecord } from './types/TExoDomInstanceRecord';
import type { TExoDomSchema } from './types/TExoDomSchema';

export function walkExoNodeTable(
    schema: TExoDomSchema,
    root: Element,
    holder: TExoDomInstanceRecord
): void {
    const walk = schema.walk;
    // ASKED OF THE SCHEMA: "does any body index this table" is fixed at compile, and
    // re-deriving it per instance read two lengths and compared both.
    const nodes: Node[] = schema.sharesEmptyNodes ? EXO_EMPTY_NODES : [root];
    holder.nodes = nodes;
    for (let i = 0; i < walk.length; i += 3) {
        const from = nodes[walk[i + 1]];
        nodes[walk[i]] =
            walk[i + 2] === EXO_WALK_FIRST_CHILD
                ? (from.firstChild as Node)
                : (from.nextSibling as Node);
    }
    holder.childLists = schema.hasAdjacentChildLists ? [] : null;
}
