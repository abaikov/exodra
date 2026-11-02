import type { TExoContextFrame } from '@exodra/context';
import { holdExoInstance } from './holdExoInstance';
import { createExoNode } from './factories/createExoNode';
import type { TExoDomMachine } from './types/TExoDomMachine';
import type { TExoDomChild } from './types/TExoDomChild';
import type { TExoDomSchema } from './types/TExoDomSchema';

// The element is acquired BEFORE the record, so the record is built whole in one literal.
export function buildLiveExoChild(
    schema: TExoDomSchema,
    machine: TExoDomMachine,
    context: TExoContextFrame | null = null,
    params?: unknown
): TExoDomChild {
    const node = schema.acquireNode(schema);
    const child = schema.createChild(schema, node, schema.childUnmount);
    createExoNode(schema, node, machine, child, child, context, params);
    holdExoInstance(child);
    return child;
}
