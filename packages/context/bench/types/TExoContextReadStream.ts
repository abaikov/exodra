import type {
    TExoBenchHolder,
    TExoBenchProtoFrame,
    TExoBenchProtoToken,
} from '@exodra/bench-harness';
import type { TExoContextFrame } from '../../src/types/TExoContextFrame';
import type { TExoContextToken } from '../../src/types/TExoContextToken';

/**
 * SIXTEEN DISTINCT CHAINS OF THE SAME SHAPE, spread over parallel arrays of length `calls`, so the
 * argument at the call under measurement is NOT loop-invariant. One chain read in a loop is a pure
 * call on constants, and hoisting it out is a transformation a compiler is entitled to make — the
 * table would then be measuring an empty loop. Sixteen instances is also what a page has.
 */
export type TExoContextReadStream = {
    readonly chains: readonly TExoContextFrame[];
    readonly twinChains: readonly TExoContextFrame[];
    readonly flats: ReadonlyArray<ReadonlyMap<TExoContextToken<unknown>, unknown>>;
    readonly protoFrames: readonly TExoBenchProtoFrame[];
    readonly holders: readonly TExoBenchHolder[];
    readonly key: TExoContextToken<string>;
    readonly protoKey: TExoBenchProtoToken;
};
