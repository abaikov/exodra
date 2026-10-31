import type { TExoBenchInput } from './TExoBenchInput';
import type { TExoBenchVariant } from './TExoBenchVariant';

/**
 * A FIELD is one subject's candidates against one set of inputs.
 *
 * `nullPair` names two variants whose true difference is ZERO BY CONSTRUCTION — the same program
 * declared twice with its own state. What the run prints between them is what it cannot see, and a
 * gap smaller than that is reported as unresolved rather than ranked.
 *
 * `floorName` names the NATIVE FLOOR: the straight-line program a hand-written application would
 * contain, answering identically. `null` means this field has none, which the run prints by name —
 * a field without a floor ranks its participants and cannot say what any of them is worth.
 */
export type TExoBenchField<TStream> = {
    readonly title: string;
    readonly variants: readonly TExoBenchVariant<TStream>[];
    readonly inputs: readonly TExoBenchInput<TStream>[];
    readonly nullPair: readonly [string, string];
    readonly floorName: string | null;
};
