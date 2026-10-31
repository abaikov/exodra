import type { TExoRouteGuard, TExoRouteMatch } from '../types';

// ONE ROUTE, not its branch: the caller walks the chain and collects per entry, so an ancestor's
// `beforeEnter` runs before its child's in the order the chain already holds.
export function collectExoRouteGuards(
    route: TExoRouteMatch['route'],
    type: 'beforeEnter' | 'beforeLeave'
): TExoRouteGuard[] {
    const guards: TExoRouteGuard[] = [];

    if (type === 'beforeEnter' && route.beforeEnter) {
        guards.push(route.beforeEnter);
    }

    if (type === 'beforeLeave' && route.beforeLeave) {
        guards.push(route.beforeLeave);
    }

    return guards;
}
