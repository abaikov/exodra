import type { TExoChildLists } from './types/TExoChildLists';

/**
 * Where a child list ends when another child list follows it, resolved at INSERT time — only that
 * moment can say whether the neighbour has a first node. It closes over the INSTANCE, never the
 * exonode, which has moved to another row by the time a user's click inserts anything.
 */
export function exoNextNodeAfterList(
    childLists: TExoChildLists,
    childListNextPort: readonly number[],
    port: number,
    /** The static element this run of child lists ends at, or `null` for the end of the parent. */
    staticEnd: Node | null
): () => Node | null {
    return () => {
        for (let next = childListNextPort[port]; next >= 0; next = childListNextPort[next]) {
            const order = childLists[next];
            // An empty neighbour is transparent: its end is whatever ITS neighbour's is.
            if (order !== undefined && order.length > 0) return order[0].node;
        }
        return staticEnd;
    };
}
