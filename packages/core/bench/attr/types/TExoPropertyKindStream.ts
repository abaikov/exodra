/** One sample's `(tag, attribute)` arguments, in parallel arrays so a driver's loop only loads. */
export type TExoPropertyKindStream = {
    readonly tags: readonly string[];
    readonly attrs: readonly string[];
};
