/** A brand: `unique symbol` keys are unequal, so a node this package made is not assignable where
 * `@exodra/string`'s is — what that stops is an element reaching `TExoStrNode.bindChildren`, whose
 * `html += children[i]` appends `[object Object]` and throws nothing. Hydration shares this brand. */
declare const EXO_DOM_MARK: unique symbol;

export type TExoDomMark = {
    readonly [EXO_DOM_MARK]: true;
};
