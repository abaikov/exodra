import type { TExoSchemaProps } from '@exodra/core';

type AnyAttrs = Partial<TExoSchemaProps> | null | undefined;
type Bucket = Record<string, unknown>;

const BUCKETS = [
    'static',
    'bindables',
    'bindableLists',
    'handlers',
    'bindableHandlers',
] as const;

// Compose several attrs-bucket objects into one. Buckets are shallow-merged
// (later wins), so `static.id` from an earlier source and `static.class` from a
// later one coexist, while the same key is overwritten by the last source. The
// `static` lifecycle hooks onExoMount/onExoUnmount are COMPOSED instead of
// overwritten, so several behaviour helpers can attach to the same element.
//
// This is the runtime of the `bind:` directive (the compiler emits
// `mergeAttrs(base, ...directiveCalls)`), and a deliberate OPT-IN merge for
// `props={mergeAttrs(...)}` composition — it is never applied implicitly by the
// compiler, so plain elements pay nothing and the merge strategy stays explicit.
export function mergeAttrs(
    base: AnyAttrs,
    ...partials: AnyAttrs[]
): TExoSchemaProps {
    const out: Record<string, Bucket> = {};
    const mounts: Array<(node: unknown) => void> = [];
    const unmounts: Array<(node: unknown) => void> = [];

    const apply = (attrs: AnyAttrs): void => {
        if (!attrs) return;
        for (const bucket of BUCKETS) {
            const src = (attrs as Record<string, Bucket | undefined>)[bucket];
            if (!src) continue;
            const dest = (out[bucket] ??= {});
            for (const key in src) {
                if (
                    bucket === 'static' &&
                    (key === 'onExoMount' || key === 'onExoUnmount')
                ) {
                    const fn = src[key] as (node: unknown) => void;
                    (key === 'onExoMount' ? mounts : unmounts).push(fn);
                    continue;
                }
                dest[key] = src[key];
            }
        }
    };

    apply(base);
    for (const partial of partials) apply(partial);

    if (mounts.length) {
        (out.static ??= {}).onExoMount = (node: unknown) => {
            for (const fn of mounts) fn(node);
        };
    }
    if (unmounts.length) {
        (out.static ??= {}).onExoUnmount = (node: unknown) => {
            for (const fn of unmounts) fn(node);
        };
    }

    return out as TExoSchemaProps;
}
