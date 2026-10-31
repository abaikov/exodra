import { attachExoDirectEvent } from '../attachExoDirectEvent';
import { createExoEventPortData } from '../factories/createExoEventPortData';
import { exoDirectListenerFor } from '../exoDirectListenerFor';
import { exoEventSlotsFor } from '../exoEventSlotsFor';
import { EXO_DIRECT_PACK_ID } from './EXO_DIRECT_PACK_ID';
import type { TExoEventsApi } from '../types/TExoEventsApi';

// The DEFAULT because it is the only strategy that can serve a CLOSURE: a closure already knows its
// row, so the element it is attached to is the only thing that says which handler to run.
// `install` is ABSENT rather than a no-op — the render entry point tests the field once and skips
// the whole notion of a root.
// A plain constant and not a factory, so the schema cache's identity test hits for every one in a
// process that never chose a strategy.
export const EXO_DIRECT_EVENTS: TExoEventsApi = {
    name: 'direct',
    // Its OWN slots: an element served by its own listener that also sits inside a delegated root
    // would otherwise be found twice and run its handler twice.
    port: (event) =>
        createExoEventPortData(
            exoEventSlotsFor(EXO_DIRECT_PACK_ID, event),
            exoDirectListenerFor(event)
        ),
    attach: attachExoDirectEvent,
};
