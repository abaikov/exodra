import { assertExoSubject } from './asserts/assertExoSubject';
import type { TExoEventAttacher } from './types/TExoEventAttacher';

// The fill is a STORE, not an `addEventListener` per fill: registering a closure directly kept no
// reference, so re-filling stacked handlers and an element outliving its occupant carried the old
// one forever — which is what made the node bank decline every template with an event port.
// Nothing is registered for teardown: a listener is owned by its node and dies with it, and the
// shared listener STAYS on a recycled element, correctly, reading whatever the slots now hold.
export const attachExoDirectEvent: TExoEventAttacher = (node, data, handler, subject) => {
    // A FUNCTION is exempt from the subject check: it may be a closure that knows its row.
    if (subject === undefined && typeof handler !== 'function') assertExoSubject(data.event);
    const carrier = node as unknown as Record<symbol, unknown>;
    // Re-filling costs two stores and no registration; `addEventListener` would have ignored
    // the repeat anyway, the function being shared.
    const served = carrier[data.handlerKey] !== undefined;
    carrier[data.handlerKey] = handler;
    carrier[data.subjectKey] = subject;
    // Non-null by the pack that minted the datum: `EXO_DIRECT_EVENTS.port` is the only caller of
    // `createExoEventPortData` that passes a listener, and this body is that pack's half of it.
    if (!served) node.addEventListener(data.event, data.listener as EventListener);
};
