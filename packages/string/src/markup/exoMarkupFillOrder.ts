/** WHICH PORT EACH HOLE TAKES, or `null` when every hole takes the port that was declared for it.
 *
 * `null` is not an absence: it is the answer the straight indexed loop in `createExoMarkupFiller`
 * exists for, and it is what lets a schema written out as data carry no order array at all.
 * `compileExoStrSchema` asks once and hands the same answer to the schema's `order` field and to
 * the filler, so the two cannot disagree about when a markup is in declaration order. */
export function exoMarkupFillOrder(
    order: readonly number[] | undefined,
    ports: number
): readonly number[] | null {
    if (order === undefined) return null;
    for (let i = 0; i < ports; i++) {
        if (order[i] !== i) return order.slice();
    }
    return null;
}
