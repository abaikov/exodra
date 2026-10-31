import type { TExoEventHandler } from '@exodra/core';
import type { TExoEventSlots } from '../types/TExoEventSlots';

const ELEMENT_NODE = 1;

// What this walk does and why each hop is spelled the way it is: ../../README.md § The delegated
// listener's walk. One property load per ancestor per dispatched EVENT — a user gesture, not a row.
export function createExoDelegatedListener(root: Element, slots: TExoEventSlots): EventListener {
    const handlerKey = slots.handlerKey;
    const subjectKey = slots.subjectKey;
    return (e: Event): void => {
        let node: Node | null = e.target as Node | null;
        while (node !== null) {
            if (node.nodeType === ELEMENT_NODE) {
                const carrier = node as unknown as Record<symbol, unknown>;
                const handler = carrier[handlerKey];
                if (handler !== undefined) {
                    (handler as TExoEventHandler<Event, Element>).call(
                        node as Element,
                        e,
                        carrier[subjectKey]
                    );
                    // Asked only after a handler ran: nothing else in this loop can set it.
                    if (e.cancelBubble) return;
                }
            }
            // Checked AFTER the root has been offered a handler — a schema whose own root
            // carries the handler is the single-element case.
            if (node === root) return;
            node = node.parentNode;
        }
    };
}
