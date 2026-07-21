/**
 * The JSX-facing prop shape a component accepts: the typed buckets a caller may
 * pass to `<Comp static={{…}} bindable={{…}} … />`. Buckets are SINGULAR here
 * (the JSX authoring form); the babel plugin maps them to the plural runtime
 * buckets (`bindables`, `bindableLists`).
 *
 * Component authors declare a concrete subtype via `defineComponent<A>(…)`, e.g.
 * `{ static: { title: string }; bindable: { count: TExoBindable<number> } }`.
 * This base only constrains the SHAPE (which buckets exist); value types are
 * refined by the author. It intentionally lives in `@exodra/core` and stays
 * dependency-free — precise bindable/list types are supplied by the author from
 * `@exodra/reactivity`.
 */
export interface TExoComponentProps {
    static?: Record<string, unknown>;
    bindable?: Record<string, unknown>;
    bindableList?: Record<string, unknown>;
    handlers?: Record<string, unknown>;
    bindableHandlers?: Record<string, unknown>;
    children?: unknown;
}
