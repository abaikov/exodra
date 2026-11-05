import type { TExoStrNode } from './EXO_STR_NODE_VOCABULARY';

export function fillExoStrChildren(node: TExoStrNode): void {
    const lists = node.portChildren;
    if (lists === null) return;
    const values = node.values;
    for (let i = 0; i < lists.length; i++) {
        const order = lists[i];
        if (order === undefined) continue;
        let html = '';
        for (let k = 0; k < order.length; k++) {
            const child = order[k];
            if (typeof child === 'string') {
                html += child;
                continue;
            }
            fillExoStrChildren(child);
            html += child.schema.fillMarkup(child.values);
        }
        values[i] = html;
    }
}
