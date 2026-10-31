// The table from element to row, and it is NOT a Map: two property keys on the element itself,
// decided once per strategy per event name. See `exoEventSlotsFor` for why a slot beats a
// `WeakMap` here and why the strategy is part of the name.
export type TExoEventSlots = {
    readonly event: string;
    // The property holding this element's handler for this event.
    readonly handlerKey: symbol;
    // The property holding the subject that handler is given as its second argument.
    readonly subjectKey: symbol;
};
