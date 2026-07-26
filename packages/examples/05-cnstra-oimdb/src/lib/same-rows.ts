// Content compare for `@oimdb/exodra`'s `fromOimdb({ equals })`. An oimdb
// `getAll()` / `getManyByPks()` allocates a fresh array every call, so the
// default `Object.is` would report "changed" on every flush and churn the list.
// Entities are immutable (each upsert yields a new ref), so an element-wise
// reference compare is exactly the right equality for a list-of-entities read.
export const sameRows = <T,>(a: readonly T[], b: readonly T[]): boolean =>
    a.length === b.length && a.every((x, i) => x === b[i]);
