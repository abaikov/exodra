import type { TExoRouteMachine, TExoLazyRouteLoader } from '../types';

const componentCache = new Map<TExoLazyRouteLoader, Promise<TExoRouteMachine>>();

export function isExoLazyLoader(machine: TExoRouteMachine): machine is TExoLazyRouteLoader {
    return typeof machine === 'function' && machine.length === 0;
}

export async function loadExoLazyMachine(loader: TExoLazyRouteLoader): Promise<TExoRouteMachine> {
    if (componentCache.has(loader)) {
        return componentCache.get(loader)!;
    }

    const promise = loader();
    componentCache.set(loader, promise);

    try {
        const component = await promise;
        return component;
    } catch (error) {
        componentCache.delete(loader);
        throw error;
    }
}

// A chain, not one `await`: a loader whose module exports another loader is resolved too.
export async function resolveExoRouteMachine(machine: TExoRouteMachine): Promise<TExoRouteMachine> {
    if (isExoLazyLoader(machine)) {
        return resolveExoRouteMachine(await loadExoLazyMachine(machine));
    }

    return machine;
}

// Warms the cache and NOTHING more — it never inspects what the module exported and stores nothing
// a synchronous render can read, which is the whole difference from `preloadExoPage`. Takes a
// route's `component`, so an entry already holding a page is a no-op rather than an error.
export function fetchExoRouteChunk(machine: TExoRouteMachine): Promise<void> {
    if (isExoLazyLoader(machine)) {
        return loadExoLazyMachine(machine).then(() => void 0);
    }
    return Promise.resolve();
}

export function exoLazy(
    loader: () => Promise<TExoRouteMachine | { default: TExoRouteMachine }>
): TExoLazyRouteLoader {
    return async () => {
        const module = await loader();
        return (module as { default?: TExoRouteMachine }).default || (module as TExoRouteMachine);
    };
}
