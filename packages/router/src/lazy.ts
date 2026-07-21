import type {
    TExoRouteComponent,
    TExoLazyRouteLoader,
    TExoRouteMatch,
} from './types';

const componentCache = new Map<TExoLazyRouteLoader, Promise<TExoRouteComponent>>();

export function isLazyLoader(component: TExoRouteComponent): component is TExoLazyRouteLoader {
    return typeof component === 'function' && component.length === 0;
}

export async function loadLazyComponent(
    loader: TExoLazyRouteLoader
): Promise<TExoRouteComponent> {
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

export async function resolveRouteComponent(
    component: TExoRouteComponent,
    match: TExoRouteMatch
) {
    if (isLazyLoader(component)) {
        const resolved = await loadLazyComponent(component);
        return resolveRouteComponent(resolved, match);
    }

    if (typeof component === 'function') {
        return component(match);
    }

    return component;
}

export function preloadRoute(component: TExoRouteComponent): Promise<void> {
    if (isLazyLoader(component)) {
        return loadLazyComponent(component).then(() => void 0);
    }
    return Promise.resolve();
}

/**
 * Create a lazy-loaded route component
 * @param loader - Function that returns a promise with the component module
 */
export function lazy(
    loader: () => Promise<
        TExoRouteComponent | { default: TExoRouteComponent }
    >
): TExoLazyRouteLoader {
    return async () => {
        const module = await loader();
        return (module as { default?: TExoRouteComponent }).default || (module as TExoRouteComponent);
    };
}