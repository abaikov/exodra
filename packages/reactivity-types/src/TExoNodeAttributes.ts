import type { TExoBindable } from './TExoBindable';
import type { TExoBindableList } from './TExoBindableList';

/**
 * The five attribute buckets a renderer sees on a node, with the reactive ones
 * typed. Every renderer reads the SAME buckets with the SAME precedence
 * (`bindableLists` > `bindables` > `static` for children), so the skeleton is
 * declared once here and each renderer only fills in what is genuinely its own.
 *
 * - `TSchema` — the renderer's own node-schema type (children are made of these).
 * - `TStaticExtra` — extra static keys the renderer understands (e.g. the DOM
 *   renderer's `onExoMount`/`onExoUnmount` lifecycle hooks).
 * - `TListEvent` — the event a reactive children list emits (the DOM renderer
 *   consumes `TExoListOp` to reconcile; a one-shot renderer ignores it).
 * - `THandlers` / `TBindableHandlers` — event-handler buckets; a renderer with no
 *   event model (string/SSR) leaves them opaque.
 */
// Declared as an interface, not a type alias: a renderer's schema type and its
// attributes type reference each other (children are schemas), and TypeScript
// only defers that circularity through an interface.
export interface TExoNodeAttributes<
    TSchema,
    TStaticExtra = unknown,
    TListEvent = unknown,
    THandlers = Record<string, unknown>,
    TBindableHandlers = Record<string, unknown>
> {
    static?: Record<string, unknown> &
        TStaticExtra & {
            children?: TSchema | readonly TSchema[];
            textContent?: unknown;
        };
    bindables?: Record<string, TExoBindable<unknown, unknown>> & {
        children?: TExoBindable<TSchema | readonly TSchema[], unknown>;
        textContent?: TExoBindable<unknown, unknown>;
    };
    bindableLists?: Record<string, TExoBindableList<unknown, unknown>> & {
        children?: TExoBindableList<TSchema, TListEvent>;
    };
    handlers?: THandlers;
    bindableHandlers?: TBindableHandlers;
}
