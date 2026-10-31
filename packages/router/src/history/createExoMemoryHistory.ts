import type { TExoHistory, TExoMemoryHistoryOptions } from '../types';
import { normalizeExoBasePath } from '../path/normalizeExoBasePath';
import { parseExoPath } from '../path/parseExoPath';
import { resolveExoHref } from '../path/resolveExoHref';
import { stripExoBasePath } from '../path/stripExoBasePath';
import { notifyExoHistory } from './notifyExoHistory';
import { subscribeExoHistory } from './subscribeExoHistory';

export function createExoMemoryHistory(
    initialPathOrOptions: string | TExoMemoryHistoryOptions = '/'
): TExoHistory {
    const options =
        typeof initialPathOrOptions === 'string'
            ? { initialPath: initialPathOrOptions }
            : initialPathOrOptions;
    const basePath = normalizeExoBasePath(options.basePath);
    const subscribers = new Set<() => void>();
    let location = parseExoPath(stripExoBasePath(options.initialPath ?? '/', basePath));

    // `push` and `replace` are the same call only because this history keeps ONE location and no
    // entry stack. Add a stack and they diverge, so the two are written out rather than aliased.
    const commit = (to: string, nextState: unknown): void => {
        location = parseExoPath(stripExoBasePath(to, basePath));
        location.state = nextState;
        notifyExoHistory(subscribers);
    };

    return {
        getLocation() {
            // A stable ref: `state` is attached at push/replace time, so this allocates nothing.
            return location;
        },
        createHref(to) {
            return resolveExoHref(to, basePath);
        },
        // Identical to `replace` for as long as this history has no entry stack — see `commit`.
        push(to, nextState) {
            commit(to, nextState);
        },
        // Identical to `push` for as long as this history has no entry stack — see `commit`.
        replace(to, nextState) {
            commit(to, nextState);
        },
        onChange(update) {
            return subscribeExoHistory(subscribers, update);
        },
        dispose() {
            subscribers.clear();
        },
    };
}
