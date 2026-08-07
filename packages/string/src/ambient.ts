// Request-scoped ambient injections: values every component in ONE render can
// inject() without a threaded scope — used for the SSR side-effect context
// (Status/Head via ssrContextKey in @exodra/ssr). Set only for the synchronous
// duration of a render. This package never names ssrContextKey; it only looks up
// symbols, so there is no dependency cycle.

let ambient: Map<symbol, unknown> | null = null;

export function runWithAmbient<T>(
    values: Map<symbol, unknown>,
    fn: () => T
): T {
    const prev = ambient;
    ambient = values;
    try {
        return fn();
    } finally {
        ambient = prev;
    }
}

/** The ambient value for `key`, or `fallback` when nothing is installed. */
export function readAmbient<TValue>(
    key: symbol,
    fallback?: TValue
): TValue | undefined {
    if (ambient !== null && ambient.has(key)) {
        return ambient.get(key) as TValue;
    }
    return fallback;
}
