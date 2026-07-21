import type {
    TExoRouteGuard,
    TExoRouteMatch,
} from './types';

export async function executeGuard(
    guard: TExoRouteGuard,
    to: TExoRouteMatch,
    from?: TExoRouteMatch
): Promise<boolean | string> {
    try {
        const result = await guard(to, from);
        return result;
    } catch (error) {
        console.error('Route guard error:', error);
        return false;
    }
}

export async function executeGuards(
    guards: TExoRouteGuard[],
    to: TExoRouteMatch,
    from?: TExoRouteMatch
): Promise<boolean | string> {
    for (const guard of guards) {
        const result = await executeGuard(guard, to, from);
        if (result !== true) {
            return result;
        }
    }
    return true;
}

export function collectRouteGuards(
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