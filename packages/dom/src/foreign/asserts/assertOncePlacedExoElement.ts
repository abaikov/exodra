// Refused at the SECOND `mount`, which is the first moment anything can tell. Why the evidence is a
// closure variable and not a field, and why leaving a list and coming back is not refused:
// ../../README.md § The foreign door's four refusals.
export function assertOncePlacedExoElement(element: Element): never {
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? `exoForeignNode(<${element.tagName.toLowerCase()}>): this foreign child is being ` +
              'placed while a list already holds it. Make one foreign node per position.' +
              ' One element cannot be in two places, and both lists would go on holding it: the ' +
              'first one to drop it runs your unmount hook on a widget that is still on screen ' +
              'in the other, and the second drop runs it again. exoForeignNode() is what a ' +
              'caller holds, and holding it in two children ports (or twice in one array) is ' +
              'holding one element twice.'
            : 'EXO0056'
    );
}
