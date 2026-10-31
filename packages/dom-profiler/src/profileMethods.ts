import type { TExoProfileCallback, TExoProfileOptions } from './profileClass';

const now = (): number => {
    const perf = (globalThis as { performance?: { now?: () => number } }).performance;
    return perf && typeof perf.now === 'function' ? perf.now() : Date.now();
};

// Patching a backend writes to the prototype of every exonode on every schema's stack, so each of
// `start` and `restore` invalidates the prototype validity cell and drops every inline cache that
// had resolved through it — a transient the unprofiled program never pays. README: "The observer
// effect".
export function profileMethods(
    target: object,
    label: string,
    callback: TExoProfileCallback,
    options: TExoProfileOptions = {}
): () => void {
    const holder = target as Record<string, unknown>;
    const restores: Array<() => void> = [];

    for (const method of Object.getOwnPropertyNames(holder)) {
        if (method === 'constructor') continue;
        if (options.excludeMethods?.includes(method)) continue;
        if (options.methods && !options.methods.includes(method)) continue;

        const descriptor = Object.getOwnPropertyDescriptor(holder, method);
        if (!descriptor || typeof descriptor.value !== 'function') continue;
        // A getter or a non-writable slot is REFUSED rather than made writable: a patch that has to
        // change a descriptor's shape cannot put the object back exactly as it found it.
        if (descriptor.writable !== true) continue;

        const original = descriptor.value as (this: unknown, ...args: unknown[]) => unknown;
        const patched = function (this: unknown, ...args: unknown[]): unknown {
            const start = now();
            try {
                const result = original.apply(this, args);
                if (result instanceof Promise) {
                    return result.finally(() =>
                        callback({ className: label, method, durationMs: now() - start })
                    );
                }
                callback({ className: label, method, durationMs: now() - start });
                return result;
            } catch (error) {
                callback({ className: label, method, durationMs: now() - start });
                throw error;
            }
        };
        Object.defineProperty(patched, 'name', { value: method });
        holder[method] = patched;
        restores.push(() => {
            holder[method] = original;
        });
    }

    return () => {
        for (const restore of restores) restore();
        restores.length = 0;
    };
}
