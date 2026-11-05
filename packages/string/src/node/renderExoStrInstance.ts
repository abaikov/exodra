import type { TExoContextFrame } from '@exodra/context';
import { armExoNode } from '@exodra/core';
import { disposeExoStrTree } from './disposeExoStrTree';
import { fillExoStrChildren } from './fillExoStrChildren';
import type { TExoStrNode } from './EXO_STR_NODE_VOCABULARY';
import type { TExoStrSchema } from '../schema/types/TExoStrSchema';
import type { TExoStrMachine } from './types/TExoStrMachine';

// One instance of a compiled schema, as markup. NOTHING IS POOLED: the exonode the wire is handed
// IS the instance, so there is nothing to empty before it. `context` is the chain in force above this instance.
export function renderExoStrInstance(
    schema: TExoStrSchema,
    machine: TExoStrMachine,
    context: TExoContextFrame | null = null,
    params?: unknown
): string {
    const node = schema.createInstance(schema, context);
    try {
        armExoNode<TExoStrNode>(node, machine, params);
        fillExoStrChildren(node);
        return schema.fillMarkup(node.values);
    } finally {
        disposeExoStrTree(node);
    }
}
