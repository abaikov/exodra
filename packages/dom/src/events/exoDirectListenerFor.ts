import type { TExoEventHandler } from '@exodra/core';
import { EXO_DIRECT_PACK_ID } from './constants/EXO_DIRECT_PACK_ID';
import { exoEventSlotsFor } from './exoEventSlotsFor';

// ONE listener object per event name for the whole process. What that saves, what it does not, and
// how a shared handler and a closure go into one slot: ../../README.md § The direct strategy's
// shared listener.
const CACHE = new Map<string, EventListener>();

export function exoDirectListenerFor(event: string): EventListener {
    const cached = CACHE.get(event);
    if (cached !== undefined) return cached;
    const slots = exoEventSlotsFor(EXO_DIRECT_PACK_ID, event);
    const handlerKey = slots.handlerKey;
    const subjectKey = slots.subjectKey;
    const listener: EventListener = (e: Event): void => {
        const node = e.currentTarget as Element | null;
        // `currentTarget` is null when an event is re-dispatched after propagation finished.
        if (node === null) return;
        const carrier = node as unknown as Record<symbol, unknown>;
        const handler = carrier[handlerKey];
        // An emptied port, or an element served for a different event name and never for this one.
        if (handler === undefined) return;
        // `.call(node, …)` because `addEventListener` sets `this` to the element it fired on.
        // The SUBJECT is the second argument, which lets a module-level function serve every
        // row instead of one closure per row.
        (handler as TExoEventHandler<Event, Element>).call(node, e, carrier[subjectKey]);
    };
    CACHE.set(event, listener);
    return listener;
}
