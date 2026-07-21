import type { TExoComponent } from '../types/TExoComponent';
import type { TExoTypedContext } from '../types/TExoTypedContext';
import type { TExoSchema } from '../types/TExoSchema';
import type { TExoComponentProps } from '../types/TExoComponentProps';

/**
 * Define an Exodra component.
 *
 * The optional generic `A` declares the component's JSX props (the typed
 * `static` / `bindable` / `bindableList` / `handlers` buckets it accepts). It
 * does double duty:
 *  - `@exodra/jsx` reads it (via `JSX.LibraryManagedAttributes`) so `<Comp .../>`
 *    is type-checked against `A`;
 *  - the `context` passed to the component body is typed from `A`, so
 *    `ctx.getConstant('title')` / `ctx.getBindable('count')` infer their types
 *    from the declaration instead of returning `unknown`.
 *
 * `A` is a phantom on the returned type (`__exoProps`) — it never exists at
 * runtime. Omit it and the component stays loosely typed (bucket-shaped props,
 * loose context) — backward compatible.
 *
 * @example
 * const Chart = defineComponent<{
 *   static: { title: string };
 *   bindable: { count: TExoBindable<number> };
 * }>((ctx) => {
 *   const title = ctx.getConstant('title'); // string
 *   const count = ctx.getBindable('count'); // TExoBindable<number>
 *   return h('div', { static: { children: text(title) } });
 * });
 */
export function defineComponent<
    A extends TExoComponentProps = TExoComponentProps,
    TSchema extends TExoSchema = TExoSchema,
    TResult extends TExoSchema = TExoSchema
>(
    component: (
        context: TExoTypedContext<A, TSchema>
    ) => TResult | readonly TResult[]
): TExoComponent<TSchema, TResult> & { readonly __exoProps?: A } {
    return component as unknown as TExoComponent<TSchema, TResult> & {
        readonly __exoProps?: A;
    };
}
