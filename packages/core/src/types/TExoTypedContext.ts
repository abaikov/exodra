import type { TExoNodeSchema } from './TExoNodeSchema';
import type { TExoContext } from './TExoContext';
import type { TExoComponentProps } from './TExoComponentProps';

// Extract one bucket's declared shape from a component's props type `A`,
// tolerating optional buckets (strip `undefined`) and falling back to an empty
// shape when the bucket is not declared — so keyed getters degrade to the loose
// `<TValue>(name: string)` overload rather than erroring.
type ExoBucketOf<A, K extends keyof TExoComponentProps> = A extends {
    [P in K]?: infer V;
}
    ? NonNullable<V> extends object
        ? NonNullable<V>
        : Record<never, never>
    : Record<never, never>;

/**
 * The context passed to a component defined via `defineComponent<A>`. Same shape
 * as {@link TExoContext}, but `getConstant` / `getBindable` / `getBindableList`
 * are keyed off the declared props `A`, so they infer their return types from
 * the declaration instead of returning `unknown`. Kept SEPARATE from
 * `TExoContext` on purpose: `TExoContext` is embedded in `TExoSchema`, so
 * changing it would ripple through the whole schema type — this enrichment lives
 * only on the `defineComponent` surface.
 *
 * Keys not present in `A` fall through to the loose `<TValue>(name: string)`
 * overload, so untyped access still works.
 */
export type TExoTypedContext<
    A,
    TSchema extends TExoNodeSchema = TExoNodeSchema
> = Omit<
    TExoContext<TSchema>,
    'getConstant' | 'getBindable' | 'getBindableList'
> & {
    getConstant<K extends keyof ExoBucketOf<A, 'static'>>(
        name: K
    ): ExoBucketOf<A, 'static'>[K];
    getConstant<TValue = unknown>(name: string): TValue | undefined;

    getBindable<K extends keyof ExoBucketOf<A, 'bindable'>>(
        name: K
    ): ExoBucketOf<A, 'bindable'>[K];
    getBindable<TValue = unknown>(name: string): TValue | undefined;

    getBindableList<K extends keyof ExoBucketOf<A, 'bindableList'>>(
        name: K
    ): ExoBucketOf<A, 'bindableList'>[K];
    getBindableList<TValue = unknown>(name: string): TValue | undefined;
};
