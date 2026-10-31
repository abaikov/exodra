// The narrow refusal: an element this door has already given a lifecycle to, found in its own
// `WeakSet`. What it and `assertDetachedExoElement` between them still miss: ../../README.md § The
// foreign door's four refusals.
export function assertUnadoptedExoElement(element: Element): never {
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? `exoForeignNode(<${element.tagName.toLowerCase()}>): this element already carries ` +
              'an Exodra child lifecycle — it was handed to exoForeignNode() before. Keep the ' +
              'child that first call returned and place that one.' +
              ' Making a second one for it would leave the element and the list that holds it ' +
              'pointing at different objects; a child that leaves a list and comes back is ' +
              'moved, not re-adopted.'
            : 'EXO0054'
    );
}
