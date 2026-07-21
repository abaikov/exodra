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

// Merge a base attrs object with directive-produced partials (bind:, autosize,
// …). Buckets are shallow-merged (later wins). The `static` lifecycle hooks
// onExoMount/onExoUnmount are COMPOSED instead of overwritten, so several
// behaviour directives can attach to the same element. The compiler emits this
// only when an element actually has directives, so plain elements pay nothing.
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
