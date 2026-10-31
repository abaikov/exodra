/**
 * `TTree` is why the brand differs per backend: a @exodra/dom node reaching the server's
 * `bindChildren` appends `[object Object]` and nothing throws. `unknown` is assignable one way only.
 */
declare const EXO_NODE: unique symbol;

export type TExoNode<TTree = unknown> = {
    readonly [EXO_NODE]: TTree;
};
