// Generic class profiler: patch a class's prototype methods to time each call.
// Reversible (returns a restore()), and environment-agnostic — it only uses
// `performance.now()` (falling back to `Date.now()`), so it runs in the browser,
// under jsdom, or in plain Node.

export interface TExoProfileSample {
    className: string;
    method: string;
    durationMs: number;
}
export type TExoProfileCallback = (sample: TExoProfileSample) => void;

export interface TExoProfileOptions {
    // Only profile these methods (default: all own prototype methods).
    methods?: readonly string[];
    // Never profile these methods.
    excludeMethods?: readonly string[];
}

type ProfilableClass = new (...args: never[]) => object;

const now = (): number => {
    const perf = (globalThis as { performance?: { now?: () => number } }).performance;
    return perf && typeof perf.now === 'function' ? perf.now() : Date.now();
};

/**
 * Patch every (selected) prototype method of `ClassToProfile` to report the wall
 * time of each call via `callback`. Returns a `restore()` that puts the original
 * methods back — profiling is fully reversible.
 */
export function profileClass<T extends ProfilableClass>(
    ClassToProfile: T,
    callback: TExoProfileCallback,
    options: TExoProfileOptions = {}
): () => void {
    const className = ClassToProfile.name;
    const proto = ClassToProfile.prototype as Record<string, unknown>;
    const restores: Array<() => void> = [];

    for (const method of Object.getOwnPropertyNames(proto)) {
        if (method === 'constructor') continue;
        if (options.excludeMethods?.includes(method)) continue;
        if (options.methods && !options.methods.includes(method)) continue;

        const descriptor = Object.getOwnPropertyDescriptor(proto, method);
        if (!descriptor || typeof descriptor.value !== 'function') continue;

        const original = descriptor.value as (this: unknown, ...args: unknown[]) => unknown;
        const patched = function (this: unknown, ...args: unknown[]): unknown {
            const start = now();
            try {
                const result = original.apply(this, args);
                if (result instanceof Promise) {
                    return result.finally(() =>
                        callback({ className, method, durationMs: now() - start })
                    );
                }
                callback({ className, method, durationMs: now() - start });
                return result;
            } catch (error) {
                callback({ className, method, durationMs: now() - start });
                throw error;
            }
        };
        Object.defineProperty(patched, 'name', { value: method });
        proto[method] = patched;
        restores.push(() => {
            proto[method] = original;
        });
    }

    return () => {
        for (const restore of restores) restore();
        restores.length = 0;
    };
}
