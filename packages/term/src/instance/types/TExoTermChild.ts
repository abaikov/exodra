import type { TExoBaseNodeFields } from '@exodra/core';
import type { TExoTermElement } from './TExoTermElement';

// One children port's contents, replaced WHOLESALE on an update.
export type TExoTermRegion = {
    children: TExoTermChild[];
};

// ONE INSTANCE, as everything that HOLDS one sees it. `TExoTermNode` and `exoForeignTermNode` both
// seat these SIX fields first, in this order, so they share the offsets the dispose walk reads.
// `regions` IS INDEXED BY PORT and holds `null` for every port that is not a children port.
export type TExoTermChild = TExoBaseNodeFields & {
    readonly node: TExoTermElement;
    readonly regions: readonly (TExoTermRegion | null)[];
};
