import { isExoPageMachine } from './isExoPageMachine';
import { loadExoLazyMachine } from './exoLazy';
import type { TExoLazyRouteLoader, TExoPageMachine } from '../types';

// `loadExoLazyMachine` caches the PROMISE; this caches the VALUE, which is the half a synchronous
// render can read.
const RESOLVED = new WeakMap<TExoLazyRouteLoader, TExoPageMachine>();

// The in-flight load per loader, so n outlets asking at once fetch one chunk.
const LOADING = new WeakMap<TExoLazyRouteLoader, Promise<void>>();

// Awaiting this before a server render is what makes a lazy route printable: a render is one
// synchronous call, so a route still holding a `() => import(…)` prints an empty region.
//
// A loader resolving to something that is not a page is refused HERE, where a caller is awaiting
// and can see it, rather than inside a subscriber with no stack pointing at the table.
export function preloadExoPage(loader: TExoLazyRouteLoader): Promise<void> {
    let loading = LOADING.get(loader);

    if (loading === undefined) {
        loading = loadExoLazyMachine(loader)
            .then((component) => {
                if (!isExoPageMachine(component)) {
                    throw new Error(
                        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                            ? 'Exodra router: a lazy route resolved to something that is not a page ' +
                              'component. A page is a machine — the value createExoMachine(…) ' +
                              'returns — and the module this loader imported exports something else ' +
                              "(the previous runtime's h() schema, or a module with no default)."
                            : 'EXO0073'
                    );
                }
                RESOLVED.set(loader, component);
            })
            .catch((error: unknown) => {
                // A failed load is not remembered as a failure: kept, every later call would replay
                // the same rejection and a network blip would blank the page permanently. The
                // `delete` is for CORRECTNESS, not memory — the entry must be gone NOW, while the
                // loader is alive and about to be asked again. It retries nothing by itself.
                LOADING.delete(loader);
                throw error;
            });
        LOADING.set(loader, loading);
    }

    return loading;
}

// Internal: a caller outside this package wanting the component should hold it as a module import.
export function resolvedPage(loader: TExoLazyRouteLoader): TExoPageMachine | undefined {
    return RESOLVED.get(loader);
}
