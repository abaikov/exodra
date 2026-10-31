import type { TExoBenchProtoToken } from '@exodra/bench-harness';
import type { TExoContextToken } from '../../src/types/TExoContextToken';

/**
 * The OTHER half of the trade. A design that answers a read in one step has to build something to
 * read, and this field prices that: one "call" here is one whole provider chain of `depth` links,
 * built from nothing, which is what a component tree that provides at `depth` levels costs.
 *
 * `sink` is sixteen slots the built chains are parked in, so the last few stay reachable and no
 * allocation can be folded away as dead. The rest become garbage, identically for every candidate.
 */
export type TExoContextPushStream = {
    readonly tokens: readonly TExoContextToken<string>[];
    readonly protoTokens: readonly TExoBenchProtoToken[];
    readonly values: readonly string[];
    readonly depth: number;
    readonly chains: number;
    readonly sink: unknown[];
};
