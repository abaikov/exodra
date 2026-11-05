import { EXO_UNARMED_STATE } from '@exodra/core';
import type { TExoContextFrame } from '@exodra/context';
import { walkExoNodeTable } from './walkExoNodeTable';
import type { TExoDomChild } from './types/TExoDomChild';
import type { TExoDomMachine } from './types/TExoDomMachine';
import type { TExoDomSchema } from './types/TExoDomSchema';

export function createExoUnarmedChild(
    schema: TExoDomSchema,
    machine: TExoDomMachine,
    context: TExoContextFrame | null
): TExoDomChild {
    const element = schema.acquireNode(schema);
    const child = schema.createChild(schema, element, schema.childUnmount);
    walkExoNodeTable(schema, element, child);
    child.child = child;
    child.context = context;
    child.machine = machine;
    child.state = EXO_UNARMED_STATE;
    return child;
}
