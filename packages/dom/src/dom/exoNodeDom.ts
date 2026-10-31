import type { TExoNode } from '@exodra/core';
import { assertBuiltExoChild } from './asserts/assertBuiltExoChild';
import type { TExoDomChild } from './types/TExoDomChild';

// A checked cast: a child IS a `TExoDomChild` and `TExoNode` is a nominal, empty brand over it.
// It stays a function rather than a widened type because one wire builds children on every
// backend: exposing `unmount` on `TExoNode` would put a browser-only field on a shape the server
// cannot honour, and `block.unmount = NOTHING` would compile there and do nothing.
// It takes a CHILD only — with the `EXO_CHILD` mark gone there is no element→child direction.
export function exoNodeDom(child: TExoNode): TExoDomChild {
    const nodeDom = child as unknown as TExoDomChild | undefined;
    if (nodeDom === undefined) assertBuiltExoChild();
    if (nodeDom.node === undefined) assertBuiltExoChild();
    return nodeDom;
}
