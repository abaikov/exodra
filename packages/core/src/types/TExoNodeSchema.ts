export type TExoNodeSchema<
    TType = unknown,
    TAttrs = unknown
> = {
    type: TType;
    attrs: TAttrs;
    // Optional clone-cache key. A fully-static subtree marked with one is built
    // once; every later occurrence sharing the key is produced by cloning that
    // template instead of rebuilding. Set by the user or the babel plugin.
    cacheKey?: symbol | string;
};
