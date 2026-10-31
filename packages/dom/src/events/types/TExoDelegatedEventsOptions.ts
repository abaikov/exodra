// An argument and not a setting: a setting turned on once, far from the call, makes every pack
// built afterwards delegate `pointermove` silently. Spelled out and not positional, because
// `createExoDelegatedEvents(names, true)` is a character nobody queries in review.
// It does NOT unlock `EXO_NON_BUBBLING_EVENTS`: stating an intent there still buys a dead handler.
export type TExoDelegatedEventsOptions = {
    // Accept `EXO_HIGH_FREQUENCY_EVENTS`, knowing the root's listener then walks to the root at the
    // input device's sampling rate rather than when a person acts.
    readonly allowHighFrequency?: boolean;
};
