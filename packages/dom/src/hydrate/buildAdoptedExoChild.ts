import type { TExoContextFrame } from '@exodra/context';
import { holdExoInstance } from '../dom/holdExoInstance';
import { hydrateExoInstance } from './hydrateExoInstance';
import type { TExoDomMachine } from '../dom/types/TExoDomMachine';
import type { TExoDomChild } from '../dom/types/TExoDomChild';
import type { TExoHydrateSchema } from './types/TExoHydrateSchema';

/**
 * `buildLiveExoChild`'S ADOPTING TWIN — the element is the one the server printed instead of one
 * `acquireNode` hands out, and the wire runs through `hydrateExoInstance` instead of `createExoNode`.
 *
 * IT MUST BE A CHILD AND NOT THE BARE INSTANCE: whatever a reconciler hands `kids.insert` goes
 * through `exoNodeDom`, which refuses anything with no `node`. The
 * lifecycle is the other half of the same fact — a row a child list may later `remove` has to
 * carry the unmount the list will call.
 */
export function buildAdoptedExoChild(
    schema: TExoHydrateSchema,
    root: Element,
    machine: TExoDomMachine,
    index: number,
    context: TExoContextFrame | null = null,
    params?: unknown
): TExoDomChild {
    // `owner.childUnmount` and not a direct import: a hydrate schema is DERIVED from a DOM one, and
    // reading the unmount off it keeps a composition that replaced one from having two.
    const child = schema.createChild(schema, root, schema.domSchema.childUnmount);
    hydrateExoInstance(schema, root, machine, index, child, child, context, params);
    holdExoInstance(child);
    return child;
}
