/**
 * The one reactive primitive in Exodra. Everything reactive — a signal, a derived
 * value, a list, an adapter over an external store — is this pair:
 *
 *  - `getValue()` is the single source of truth. It is a METHOD, not a getter or a
 *    field, so an implementation stays free to compute lazily (a derived maps its
 *    source on read; an adapter can read straight out of an index).
 *  - `onChange(cb)` registers a listener and returns its unsubscribe function. It
 *    does NOT fire on registration — the initial value comes from `getValue()`.
 *
 * The event a listener receives DESCRIBES the change (the new value for a scalar,
 * an op for a list); it is an accelerator, never the source of truth. A consumer
 * that ignores it and simply re-reads `getValue()` must stay correct.
 */
export type TExoBindable<TValue = unknown, TEvent = TValue> = {
    getValue(): TValue;
    onChange(update: (event: TEvent) => void): () => void;
};
