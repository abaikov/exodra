import type { TExoBrowserHistoryOptions, TExoHistory } from '../types';
import { addExoBasePath } from '../path/addExoBasePath';
import { normalizeExoBasePath } from '../path/normalizeExoBasePath';
import { parseExoPath } from '../path/parseExoPath';
import { resolveExoHref } from '../path/resolveExoHref';
import { stripExoBasePath } from '../path/stripExoBasePath';
import { notifyExoHistory } from './notifyExoHistory';
import { subscribeExoHistory } from './subscribeExoHistory';

export function createExoBrowserHistory(options: TExoBrowserHistoryOptions = {}): TExoHistory {
    const browserWindow = options.window ?? globalThis.window;
    if (!browserWindow) {
        throw new Error(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? 'createExoBrowserHistory requires a browser window.'
                : 'EXO0072'
        );
    }

    const basePath = normalizeExoBasePath(options.basePath);
    const subscribers = new Set<() => void>();
    const getCurrentPath = () =>
        stripExoBasePath(
            `${browserWindow.location.pathname}${browserWindow.location.search}${browserWindow.location.hash}`,
            basePath
        );
    const notifySubscribers = () => notifyExoHistory(subscribers);

    browserWindow.addEventListener('popstate', notifySubscribers);

    return {
        getLocation() {
            // Straight off `window.history.state`, which the browser restores on popstate.
            const loc = parseExoPath(getCurrentPath());
            loc.state = browserWindow.history.state;
            return loc;
        },
        createHref(to) {
            return resolveExoHref(to, basePath);
        },
        push(to, state) {
            browserWindow.history.pushState(state ?? null, '', addExoBasePath(to, basePath));
            notifySubscribers();
        },
        replace(to, state) {
            browserWindow.history.replaceState(state ?? null, '', addExoBasePath(to, basePath));
            notifySubscribers();
        },
        onChange(update) {
            return subscribeExoHistory(subscribers, update);
        },
        dispose() {
            browserWindow.removeEventListener('popstate', notifySubscribers);
            subscribers.clear();
        },
    };
}
