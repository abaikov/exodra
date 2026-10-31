import type { TExoEventSlots } from './types/TExoEventSlots';

// A "slot" here is a SYMBOL property key on a DOM element: a string key on a `<form>` is looked up
// among its controls' names first, and a symbol is not. Why the pack id is in the key, why there are two
// slots per event name, and the 14.6× that chose a slot over a `WeakMap`: ../../README.md § Event
// slots are element properties.
const CACHE = new Map<string, TExoEventSlots>();

export function exoEventSlotsFor(packId: string, event: string): TExoEventSlots {
    // A separator no event name and no pack id contains, so two pairs cannot alias into one
    // cache entry the way `'a' + 'bc'` and `'ab' + 'c'` would.
    const key = packId + '\u0000' + event;
    const cached = CACHE.get(key);
    if (cached !== undefined) return cached;
    // Built whole, in one literal, so every slot record in the process shares one hidden
    // class — these are read on the dispatch path.
    const slots: TExoEventSlots = {
        event,
        handlerKey: Symbol('exoOn$' + packId + '$' + event),
        subjectKey: Symbol('exoSubject$' + packId + '$' + event),
    };
    CACHE.set(key, slots);
    return slots;
}
