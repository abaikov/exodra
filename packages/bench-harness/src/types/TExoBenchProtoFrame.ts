/**
 * The frame the `flat·proto` design uses: one object per provide, its OUTER frame as its prototype,
 * the value stored under the token's own symbol.
 *
 * WHAT IT COSTS THE PUBLIC TYPE, and the reason it is a bench variant and not a proposal: a
 * prototype load needs a key the JS object model can index, and `TExoContextToken`
 * (`packages/context/src/types/TExoContextToken.ts`) carries a `name` that is explicitly
 * "never compared and need not be unique". Adopting this design means every token carries a symbol
 * minted at `exoContextToken()` — a change to a shipped public value, not to a lookup.
 */
export type TExoBenchProtoFrame = {
    [key: symbol]: unknown;
};
