import type { TExoRouteMatch } from '../types';

// A commit hands an unchanged level its PREVIOUS match object when this says equal, which is what
// lets a route boundary compare levels with `===`.
export function sameMatch(a: TExoRouteMatch, b: TExoRouteMatch): boolean {
    if (a.route !== b.route || a.pathname !== b.pathname) {
        return false;
    }

    const before = a.params;
    const now = b.params;
    if (before === now) {
        return true;
    }

    const names = Object.keys(before);
    if (names.length !== Object.keys(now).length) {
        return false;
    }
    for (let i = 0; i < names.length; i++) {
        const name = names[i];
        if (before[name] !== now[name]) {
            return false;
        }
    }
    return true;
}
