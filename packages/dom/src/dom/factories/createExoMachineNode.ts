import type { TExoContextFrame } from '@exodra/context';
import { armExoNode } from '@exodra/core';
import type { TExoMachine, TExoMachineNode } from '@exodra/core';
import { walkExoNodeTable } from '../walkExoNodeTable';
import { EXO_ARMED_INSTANCE } from '../constants/EXO_ARMED_INSTANCE';
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
    walkExoNodeTable(schema, root, holder);
    holder.child = ownerChild;
    holder.context = context;
    armExoNode(holder as unknown as TWiring, machine, params);
    // THE INSTANCE ITSELF, where a wire publishes what it returned: a machine has no return value,
    // and handing back the exonode is what lets the caller fire transitions at the thing it built.
    EXO_ARMED_INSTANCE.value = holder;
}
