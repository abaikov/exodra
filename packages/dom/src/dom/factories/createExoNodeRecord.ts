import type { TExoContextFrame } from '@exodra/context';
import { createExoMachineNode } from './createExoMachineNode';
import type { TExoDomMachine } from '../types/TExoDomMachine';
import type { TExoDomInstanceRecord } from '../types/TExoDomInstanceRecord';
import type { TExoDomNode } from '../EXO_DOM_NODE_VOCABULARY';
import type { TExoDomChild } from '../types/TExoDomChild';
import type { TExoDomSchema } from '../types/TExoDomSchema';

export function createExoNodeRecord(
    schema: TExoDomSchema,
    root: Element,
    machine: TExoDomMachine,
    ownerChild: TExoDomChild | null,
    holder: TExoDomInstanceRecord,
    context: TExoContextFrame | null = null,
    params?: unknown
): void {
    createExoMachineNode<TExoDomNode>(schema, root, machine, ownerChild, holder, context, params);
}
