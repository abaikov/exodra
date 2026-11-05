import { disposeExoStrInstance } from './disposeExoStrInstance';
import type { TExoStrNode } from './EXO_STR_NODE_VOCABULARY';

export function disposeExoStrTree(node: TExoStrNode): void {
    const lists = node.portChildren;
    if (lists !== null) {
        node.portChildren = null;
        for (let i = 0; i < lists.length; i++) {
            const order = lists[i];
            if (order === undefined) continue;
            for (let k = 0; k < order.length; k++) {
                const child = order[k];
                if (typeof child !== 'string') disposeExoStrTree(child);
            }
        }
    }
    disposeExoStrInstance(node);
}
