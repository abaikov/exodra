import type { TExoContextFrame } from '@exodra/context';
import { armExoNode } from '@exodra/core';
import { disposeExoTermChild } from '../instance/disposeExoTermChild';
import type { TExoTermNode } from '../instance/EXO_TERM_NODE_VOCABULARY';
import type { TExoTermChild } from '../instance/types/TExoTermChild';
import type { TExoTermSchema } from '../schema/types/TExoTermSchema';
import type { TExoTermMachine } from '../instance/types/TExoTermMachine';

// THERE IS NO CONNECTOR AND NO POOL: what the wire is handed IS the child it returns. `context`
// travels as a VALUE, not in a module slot, because a slot is sound only while a render is
// synchronous end to end — a row added an hour later is built with no render on the stack.
export function renderExoTermInstance(
    schema: TExoTermSchema,
    machine: TExoTermMachine,
    index: number,
    context: TExoContextFrame | null = null,
    params?: unknown
): TExoTermChild {
    const node = schema.createInstance(schema, context);
    try {
        armExoNode<TExoTermNode>(node, machine, index, params);
    } catch (error) {
        disposeExoTermChild(node);
        throw error;
    }
    return node;
}
