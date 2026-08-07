// The component context for compiled SSR output. The compiled output imports this
// as `_ctx` and calls `Comp(_ctx({ static, bindables }))`, so a component reads
// its props via getConstant / getBindable EXACTLY as it would under the runtime
// walker (ExoNodeString.createContext).
//
// The two are separate copies of the same literal ON PURPOSE — one shared factory
// measured +6-8ns per component, and this runs once per component of every
// render. `context-contract.test.ts` pins their behaviour together instead.
//
// SLICE LIMIT: provide()/inject() use a per-component scope only — cross-component
// context propagation is not threaded yet. The SSR side-effect context
// (Status/Head via ssrContextKey) does reach components, through the ambient.

import {
    injectFromScope,
    type TExoContext,
    type TExoContextKey,
    type TExoNodeSchema,
    type TExoScope,
} from '@exodra/core';
import { readAmbient } from './ambient';

type SsrAttrs = {
    static?: Record<string, unknown>;
    bindables?: Record<string, unknown>;
    bindableLists?: Record<string, unknown>;
};

export function ssrContext(attrs: SsrAttrs): TExoContext {
    const scope: TExoScope = {};
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
            // A provider up the scope chain wins; the request-scoped ambient (the
            // SSR context) is the layer beneath it, the caller's fallback last.
            return injectFromScope(scope, key.id, readAmbient(key.id, fallback));
        },
        onDispose: (): void => {},
    };
    return ctx as unknown as TExoContext;
}
