import type { TExoContextToken } from './TExoContextToken';

/**
 * IMMUTABLE AND SHARED: `outer` is the chain in force where this value was provided, so shadowing
 * is a new cell in front of an untouched chain and restoring is letting go of the cell.
 */
export type TExoContextFrame = {
    readonly key: TExoContextToken<unknown>;
    readonly value: unknown;
    readonly outer: TExoContextFrame | null;
};
