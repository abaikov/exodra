import type { TExoStrNode } from './EXO_STR_NODE_VOCABULARY';

export function placeExoStrChild(
    order: (TExoStrNode | string)[],
    child: TExoStrNode | string,
    at?: number
): void {
    if (typeof child !== 'string') {
        const from = child.placedIn;
        if (from !== null) from.splice(from.indexOf(child), 1);
        child.placedIn = order;
    }
    order.splice(at === undefined || at > order.length ? order.length : at, 0, child);
}
