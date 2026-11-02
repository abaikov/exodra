import type { TExoContextFrame } from '@exodra/context';
import { armExoNode } from '@exodra/core';
import type { TExoMachine, TExoMachineNode } from '@exodra/core';
import { EXO_WALK_FIRST_CHILD } from '../constants/EXO_WALK_FIRST_CHILD';
import { EXO_ARMED_INSTANCE } from '../constants/EXO_ARMED_INSTANCE';
import { EXO_EMPTY_NODES } from '../constants/EXO_EMPTY_NODES';
import type { TExoDomInstanceRecord } from '../types/TExoDomInstanceRecord';
import type { TExoDomChild } from '../types/TExoDomChild';
import type { TExoDomSchema } from '../types/TExoDomSchema';

export function createExoMachineNode<TWiring extends TExoMachineNode>(
    schema: TExoDomSchema,
    root: Element,
    machine: TExoMachine<TWiring>,
    ownerChild: TExoDomChild | null,
    holder: TExoDomInstanceRecord,
    context: TExoContextFrame | null = null,
    params?: unknown
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
    holder.child = ownerChild;
    holder.context = context;
    armExoNode(holder as unknown as TWiring, machine, params);
    // THE INSTANCE ITSELF, where a wire publishes what it returned: a machine has no return value,
    // and handing back the exonode is what lets the caller fire transitions at the thing it built.
    EXO_ARMED_INSTANCE.value = holder;
}
