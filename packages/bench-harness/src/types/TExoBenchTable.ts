import type { TExoBenchInput } from './TExoBenchInput';
import type { TExoBenchVariant } from './TExoBenchVariant';

export type TExoBenchTable<TShape> = {
    readonly title: string;
    /** The row the ratio column divides by, and the word printed as that column's header. */
    readonly floorName: string;
    readonly floorLabel: string;
    /** The two rows whose true difference is ZERO by construction — the instrument, not a candidate. */
    readonly nullPair: readonly [string, string];
    readonly variants: readonly TExoBenchVariant<TShape>[];
    readonly inputs: readonly TExoBenchInput<TShape>[];
};
