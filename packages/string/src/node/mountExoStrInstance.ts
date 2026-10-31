import { disposeExoStrInstance } from './disposeExoStrInstance';
import type { TExoStrNode } from './EXO_STR_NODE_VOCABULARY';

export function mountExoStrInstance(node: TExoStrNode): string {
    try {
        return node.schema.fillMarkup(node.values);
    } finally {
        disposeExoStrInstance(node);
    }
}
