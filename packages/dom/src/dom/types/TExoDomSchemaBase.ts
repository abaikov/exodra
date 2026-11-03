import type { TExoEventsApi } from '../../events/types/TExoEventsApi';
import type { TExoDomInstanceRecord } from './TExoDomInstanceRecord';
import type { TExoDomSetter } from './TExoDomSetter';
import type { TExoDomChild } from './TExoDomChild';

/** What `TExoDomInstanceRecord.schema` holds; both `TExoDomSchema` and `TExoHydrateSchema` extend it. A
 * member belongs here only if a body running under BOTH schemas reads it — the six the hydrate pack
 * does not claim declare `this: TExoDomNode`, so the compiler holds them to this list. */
export type TExoDomSchemaBase = {
    readonly setters: readonly TExoDomSetter[];
    readonly writeData: readonly unknown[];
    /** The composition's events pack, resolved at compile: `on` is the one call site that reads
     *  `attach`, and both schemas have an `on`. An event port's `writeData` entry is its datum. */
    readonly events: TExoEventsApi;
    readonly elem: readonly number[];
    readonly ownsElement: readonly number[];
    readonly portNames: readonly (string | null)[];
    /** The composition's record factories, resolved off the SURFACE these records will stand on —
     * a constructor's prototype is fixed when the constructor is made. They are the only seam for
     * putting a slot on every instance, and replacing one without the other makes a THIRD shape. */
    createInstance(schema: TExoDomSchemaBase): TExoDomInstanceRecord;
    createChild(
        schema: TExoDomSchemaBase,
        node: Element | undefined,
        unmount?: (this: TExoDomChild) => void
    ): TExoDomChild;
};
