import type { TExoEventPortData } from '../types/TExoEventPortData';
import type { TExoEventSlots } from '../types/TExoEventSlots';

// THE ONE SITE a datum is built at, including for a pack written outside this package: the object
// is read on every fill of every event port in the process, so all four fields are assigned here,
// in this order, and a pack without a listener of its own passes `null`.
export function createExoEventPortData(
    slots: TExoEventSlots,
    listener: EventListener | null
): TExoEventPortData {
    return {
        event: slots.event,
        handlerKey: slots.handlerKey,
        subjectKey: slots.subjectKey,
        listener,
    };
}
