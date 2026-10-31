import type { TExoAttrPort, TExoFillDoors } from '@exodra/core';

// ONE write when a member is chosen: the browser clears the rest of a same-`name` radio group or
// a single `<select>` itself, so a mark the user moved natively needs no stale "from" to undo.
export function writeExoChoice<TValue>(
    c: Pick<TExoFillDoors, 'attr'>,
    ports: readonly TExoAttrPort[],
    values: readonly TValue[],
    chosen: TValue
): void {
    const at = values.indexOf(chosen);
    if (at !== -1) {
        c.attr(ports[at], true);
        return;
    }
    for (let i = 0; i < ports.length; i++) c.attr(ports[i], false);
}
