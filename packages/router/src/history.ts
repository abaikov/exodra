import type {
    TExoBrowserHistoryOptions,
    TExoHistory,
    TExoMemoryHistoryOptions,
} from './types';
import { parsePath } from './path';

export function createMemoryHistory(
    initialPathOrOptions: string | TExoMemoryHistoryOptions = '/'
): TExoHistory {
    const options =
        typeof initialPathOrOptions === 'string'
            ? { initialPath: initialPathOrOptions }
            : initialPathOrOptions;
    const basePath = normalizeBasePath(options.basePath);
    const subscribers = new Set<() => void>();
    let location = parsePath(stripBasePath(options.initialPath ?? '/', basePath));

    return {
        getLocation() {
            // Stable ref — `state` is attached to the location object at push/
            // replace time, so this allocates nothing per call.
            return location;
        },
        createHref(to) {
            return addBasePath(parsePath(to).href, basePath);
        },
        push(to, nextState) {
            location = parsePath(stripBasePath(to, basePath));
            location.state = nextState;
            notify(subscribers);
        },
        replace(to, nextState) {
            location = parsePath(stripBasePath(to, basePath));
            location.state = nextState;
            notify(subscribers);
        },
        onChange(update) {
            subscribers.add(update);
            return () => {
                subscribers.delete(update);
            };
        },
        dispose() {
            subscribers.clear();
        },
    };
}

export function createBrowserHistory(
    options: TExoBrowserHistoryOptions = {}
): TExoHistory {
    const browserWindow = options.window ?? globalThis.window;
    if (!browserWindow) {
        throw new Error('createBrowserHistory requires a browser window.');
    }

    const basePath = normalizeBasePath(options.basePath);
    const subscribers = new Set<() => void>();
    const getCurrentPath = () =>
        stripBasePath(
            `${browserWindow.location.pathname}${browserWindow.location.search}${browserWindow.location.hash}`,
            basePath
        );
    const notifySubscribers = () => notify(subscribers);

    browserWindow.addEventListener('popstate', notifySubscribers);

    return {
        getLocation() {
            // The History API preserves entry state across back/forward, so we
            // read it straight off `window.history.state` (kept in sync by
            // push/replace and restored by the browser on popstate). Mutate the
            // fresh parsePath object rather than spreading a second one.
            const loc = parsePath(getCurrentPath());
            loc.state = browserWindow.history.state;
            return loc;
        },
        createHref(to) {
            return addBasePath(parsePath(to).href, basePath);
        },
        push(to, state) {
            browserWindow.history.pushState(state ?? null, '', addBasePath(to, basePath));
            notifySubscribers();
        },
        replace(to, state) {
            browserWindow.history.replaceState(state ?? null, '', addBasePath(to, basePath));
            notifySubscribers();
        },
        onChange(update) {
            subscribers.add(update);
            return () => {
                subscribers.delete(update);
            };
        },
        dispose() {
            browserWindow.removeEventListener('popstate', notifySubscribers);
            subscribers.clear();
        },
    };
}

function notify(subscribers: Set<() => void>): void {
    subscribers.forEach(update => update());
}

function normalizeBasePath(basePath?: string): string {
    if (!basePath || basePath === '/') {
        return '';
    }

    const normalized = parsePath(basePath).pathname;
    return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

function addBasePath(path: string, basePath: string): string {
    if (!basePath) {
        return path;
    }

    const location = parsePath(path);
    return `${basePath}${location.href === '/' ? '' : location.href}`;
}

function stripBasePath(path: string, basePath: string): string {
    if (!basePath) {
        return path;
    }

    const location = parsePath(path);
    if (location.pathname === basePath) {
        return `/${location.search}${location.hash}`;
    }

    if (location.pathname.startsWith(`${basePath}/`)) {
        return `${location.pathname.slice(basePath.length)}${location.search}${location.hash}`;
    }

    return location.href;
}
