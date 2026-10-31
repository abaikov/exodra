import type { TExoContextFrame } from '@exodra/context';
import { armExoNode } from '@exodra/core';
import { disposeExoStrInstance } from './disposeExoStrInstance';
import type { TExoStrNode } from './EXO_STR_NODE_VOCABULARY';
import type { TExoStrSchema } from '../schema/types/TExoStrSchema';
import type { TExoStrMachine } from './types/TExoStrMachine';

export function buildExoStrInstance(
    schema: TExoStrSchema,
    machine: TExoStrMachine,
    index: number,
    context: TExoContextFrame | null,
    params?: unknown
): TExoStrNode {
    const node = schema.createInstance(schema, context);
    try {
        armExoNode<TExoStrNode>(node, machine, index, params);
    } catch (error) {
        disposeExoStrInstance(node);
        throw error;
    }
    return node;
}
