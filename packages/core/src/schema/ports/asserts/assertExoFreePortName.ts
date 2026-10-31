import type { TExoAnyPort } from '../types/TExoAnyPort';

// ONE NAME, ONE PORT. The record is what a wiring function reads, so a second `title` is an
// assignment over the first and the losing port is unreachable — still numbered, still compiled,
// filled by nothing, and nothing thrown. The type layer cannot catch it: a key is a key however
// many calls claim it.
// `__proto__` is refused because the record is a plain object literal, so `record.__proto__ = port`
// calls the inherited setter and REPLACES THE PROTOTYPE instead of filing the port — silently.
// `Object.create(null)` and `Object.defineProperty` both avoid that and both push the record into
// dictionary mode, and the record is read once per instance for the life of the process.
// `hasOwnProperty` and not `in`: `in` also sees `Object.prototype`, and `toString`/`valueOf` are
// legal port names that shadow what they inherit.
// Cost per named port, at schema-build time only: one string comparison and one `hasOwnProperty`.
export function assertExoFreePortName(
    named: Record<string, TExoAnyPort>,
    portName: string,
    declaredBy: string
): void {
    // PROSE-STRIPPED, CHECK KEPT — the second shape in the two-baskets note in `createExoSchema`. Both
    // spellings can be assembled from data, so the developer's run is not the run that decides it.
    if (portName === '__proto__') {
        throw new Error(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? `${declaredBy}: "__proto__" cannot be a port name` +
                  ' — assigning it on a plain object replaces the PROTOTYPE of that object ' +
                  'instead of adding a property, so the port would not be in the record at ' +
                  'all, the wire reading it would get whatever the prototype chain has, and ' +
                  'nothing would throw. Give the port any other name.'
                : 'EXO0016'
        );
    }
    if (Object.prototype.hasOwnProperty.call(named, portName)) {
        throw new Error(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? `${declaredBy}: this schema already has a port named "${portName}"` +
                  ' — the record a wiring function reads is one object, so the second ' +
                  'declaration would overwrite the first and the overwritten port would be ' +
                  'unreachable: it keeps its slot on every backend and nothing ever fills it, ' +
                  'with no error anywhere. Names are per SCHEMA, not per element, so two ' +
                  'elements declaring the same thing still need two names.'
                : `EXO0017 "${portName}"`
        );
    }
}
