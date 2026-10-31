// REMOVAL CLIMBS; placement and anchoring do not. What a displaced element does to a diff, and what
// this check cannot see: ../../README.md § The foreign door's four refusals.
export function assertInPlaceExoElement(element: Element): never {
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? `exoForeignNode(<${element.tagName.toLowerCase()}>): the mount hook moved this ` +
              'element out of the parent the list put it in. Render INTO the element instead ' +
              'of moving it; if the foreign renderer needs a wrapper, pass the wrapper to ' +
              'exoForeignNode() and let it render inside that.' +
              ' Only removal climbs — every insertion and every anchor in the list addresses this ' +
              'element directly, so the next child inserted beside it would throw a DOMException ' +
              'from inside a diff and leave the list half-applied.'
            : 'EXO0055'
    );
}
