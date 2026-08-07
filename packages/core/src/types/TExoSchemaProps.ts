/**
 * The props object `h()` takes: the five attribute buckets, nothing else.
 *
 * Children are NOT a top-level key — they live inside a bucket, and the bucket
 * is what picks their semantics: `static.children` (fixed), `bindables.children`
 * (one reactive child) or `bindableLists.children` (a reactive list). Renderers
 * read only those three. A sixth top-level `children` key used to be declared
 * here and was read by nothing — not the renderers, not the JSX compiler, not
 * mergeAttrs — so it and its `TExoChild` types are gone.
 */
export type TExoSchemaProps = {
    static?: Record<string, unknown>;
    bindables?: Record<string, unknown>;
    bindableLists?: Record<string, unknown>;
    handlers?: Record<string, (event: Event) => void>;
    bindableHandlers?: Record<string, unknown>;
};
