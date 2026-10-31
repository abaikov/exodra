import type { TExoReactRange } from './types/TExoReactRange';
import type { TExoReactSlot } from './types/TExoReactSlot';

function firstHostNode(range: TExoReactRange): Node | null {
    for (const slot of range.slots) {
        if (slot.kind === 'host' || slot.kind === 'text') {
            return (slot.node as unknown as { node: Node }).node;
        }
        if (slot.kind === 'component') {
            const found = firstHostNode(slot.range as TExoReactRange);
            if (found !== null) return found;
        }
    }
    return null;
}

export function findDOMNode(instance: unknown): Node | null {
    if (instance === null || instance === undefined) return null;
    if (instance instanceof Node) return instance;
    const slot = (instance as { exoReact?: { slot: TExoReactSlot | null } }).exoReact?.slot;
    if (slot === null || slot === undefined || slot.range === null) return null;
    return firstHostNode(slot.range);
}
