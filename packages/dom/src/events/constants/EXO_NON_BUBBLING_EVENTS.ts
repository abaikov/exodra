// Every name here is one the HTML or DOM specification defines with `bubbles: false`, and that
// flag is the ONLY admission test — the rate an event fires at is never a reason to add one.
// A name whose spec says it bubbles must not be added: `createExoDelegatedEvents` refuses these
// unconditionally and in production, so a false entry costs an application its boot.
// See "The two delegated-event refusal sets" in README.md for the names deliberately absent
// (`cancel`, `slotchange`) and for why a bubbling `CustomEvent` of one of these names is refused.
export const EXO_NON_BUBBLING_EVENTS: ReadonlySet<string> = new Set([
    // The ones with bubbling twins, named in the error.
    'focus',
    'blur',
    'mouseenter',
    'mouseleave',
    'pointerenter',
    'pointerleave',
    'load',
    'unload',
    'abort',
    'error',
    'scroll',
    'scrollend',
    'resize',
    'toggle',
    'beforetoggle',
    'invalid',
    'close',
    'cuechange',
    // HTMLMediaElement — every one of them, dispatched at the element and no further.
    'loadstart',
    'progress',
    'suspend',
    'emptied',
    'stalled',
    'loadedmetadata',
    'loadeddata',
    'canplay',
    'canplaythrough',
    'playing',
    'waiting',
    'seeking',
    'seeked',
    'ended',
    'durationchange',
    'timeupdate',
    'play',
    'pause',
    'ratechange',
    'volumechange',
    'encrypted',
    'waitingforkey',
]);
