/**
 * TWO RULES, AND BOTH FAIL SILENTLY. The returned function MUST NOT BE AN ARROW — an arrow has no
 * `this`, so it reaches neither the exonode nor `next.call(this, …)`. It must reach its siblings
 * THROUGH `this`, never a captured receiver: a merge runs once, before any instance exists.
 */
export type TExoPlugin = {
    readonly [name: string]: (next: never) => unknown;
};
