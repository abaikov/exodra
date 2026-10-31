// Every name here BUBBLES and delegates correctly; what is refused is the cost of walking to the
// root at pointer rate, and only by default (`{ allowHighFrequency: true }` accepts them).
// See "The two delegated-event refusal sets" in README.md for the admission test, the names
// deliberately excluded, and why this set must never restate one from `EXO_NON_BUBBLING_EVENTS`.
export const EXO_HIGH_FREQUENCY_EVENTS: ReadonlySet<string> = new Set([
    'mousemove',
    'pointermove',
    // Dispatched at the platform's raw sampling rate, ABOVE the frame rate, by design.
    'pointerrawupdate',
    'touchmove',
    'wheel',
    // Non-standard and deprecated, still dispatched by Blink and WebKit, and the same stream.
    'mousewheel',
    // `drag` repeats on the source, `dragover` on the current target; `dragstart`/`dragend`/`drop`
    // fire once and are ordinary delegatable names.
    'drag',
    'dragover',
]);
