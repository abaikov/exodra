// The component context for compiled SSR output — a standalone mirror of
// ExoNodeString.createContext, so a component reads its props via getConstant /
// getBindable EXACTLY as it would under the runtime walker. The compiled output
// imports this as `_ctx` and calls `Comp(_ctx({ static, bindables }))`.
//
// SLICE LIMIT: provide()/inject() use a per-component scope only — cross-component
// context propagation and the SSR side-effect context (Status/Head via
// ssrContextKey) are not threaded yet.

import type { TExoContext, TExoContextKey, TExoNodeSchema } from '@exodra/core';

interface Scope {
    values?: Map<symbol, unknown>;
    parent?: Scope;
}

// Request-scoped ambient injections for compiled SSR: values that every component
// in a render can `inject()` without a threaded scope — used for the SSR
// side-effect context (Status/Head via ssrContextKey). Set only for the (sync)
// duration of one render via runWithAmbient. @exodra/string never names
// ssrContextKey (that lives in @exodra/ssr); it just consults the ambient map by
// key.id, so there is no dependency cycle.
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

type SsrAttrs = {
    static?: Record<string, unknown>;
    bindables?: Record<string, unknown>;
    bindableLists?: Record<string, unknown>;
};

export function ssrContext(attrs: SsrAttrs): TExoContext {
    const scope: Scope = {};
    const ctx = {
        schema: { attrs } as unknown as TExoNodeSchema,
        createNode: <TNodeSchema>(s: TNodeSchema): TNodeSchema => s,
        getConstant: (name: string): unknown => attrs?.static?.[name],
        getBindable: (name: string): unknown => attrs?.bindables?.[name],
        getBindableList: (name: string): unknown => attrs?.bindableLists?.[name],
        provide: (key: TExoContextKey<unknown>, value: unknown): void => {
            (scope.values ??= new Map()).set(key.id, value);
        },
        inject: (key: TExoContextKey<unknown>, fallback?: unknown): unknown => {
            for (let s: Scope | undefined = scope; s; s = s.parent) {
                if (s.values?.has(key.id)) return s.values.get(key.id);
            }
            // Fall back to the request-scoped ambient (e.g. the SSR context).
            if (ambient?.has(key.id)) return ambient.get(key.id);
            return fallback;
        },
        onDispose: (): void => {},
    };
    return ctx as unknown as TExoContext;
}
