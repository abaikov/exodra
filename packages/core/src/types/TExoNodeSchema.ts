export type TExoNodeSchema<
    TType = unknown,
    TAttrs = unknown,
    // The renderer that owns `exoRecord` names its own record shape here, so it
    // reads the slot without casting. Everyone else keeps `unknown`, which is
    // what the slot means to them: not yours to touch.
    TRecord = unknown
> = {
    type: TType;
    attrs: TAttrs;
    // Optional clone-cache key. A fully-static subtree marked with one is built
    // once; every later occurrence sharing the key is produced by cloning that
    // template instead of rebuilding. Set by the user or the babel plugin.
    cacheKey?: symbol | string;
    // Renderer-private bookkeeping slot (the DOM renderer's per-node record).
    // Declared HERE, and written as `undefined` by h(), so the object is built
    // whole: a schema that grows the field later takes a hidden-class transition
    // on every node. Never read or written by user code.
    exoRecord?: TRecord;
};
