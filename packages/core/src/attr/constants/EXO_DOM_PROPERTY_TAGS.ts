/**
 * THE ONE PLACE a DOM property is written down. Two questions are asked of this table and both are
 * answered FROM it, so they cannot disagree: `exoDomPropertyKind(tag, name)` reads a pair, and
 * `EXO_DOM_PROPERTIES` is the OR down each name's column — "is there any tag whose markup can
 * express this" — for the callers that hold a name and no element.
 *
 *   undefined  an ordinary attribute      true  a property markup CAN express
 *   false      a property NO markup can express — the server prints nothing and hydration repairs it
 *
 * An unlisted tag defaults to `undefined`, so a name on an element nobody listed cannot DIVERGE.
 */
// Maps rather than object literals: the keys are whatever an application passes to `port()`, and
// a keyed load on an object answers something else entirely for `constructor` and `toString`.
export const EXO_DOM_PROPERTY_TAGS: ReadonlyMap<string, ReadonlyMap<string, boolean>> = new Map([
    [
        'value',
        new Map([
            ['input', true],
            ['select', false],
            ['textarea', false],
            ['output', false],
        ]),
    ],
    ['checked', new Map([['input', true]])],
    ['selected', new Map([['option', true]])],
    ['indeterminate', new Map([['input', false]])],
]);
