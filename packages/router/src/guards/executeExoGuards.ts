import type { TExoRouteGuard, TExoRouteGuardResult, TExoRouteMatch } from '../types';

// SHORT-CIRCUITS on the first answer that is not `true`, and returns THAT answer: a string is a
// redirect target, and running the remaining guards would discard it. A guard that throws is
// logged and counted as a refusal. Stays synchronous until a guard returns a promise.
export function executeExoGuards(
    guards: readonly TExoRouteGuard[],
    to: TExoRouteMatch,
    from?: TExoRouteMatch,
    at = 0
): TExoRouteGuardResult {
    for (let i = at; i < guards.length; i++) {
        let result: TExoRouteGuardResult;
        try {
            result = guards[i](to, from);
        } catch (error) {
            console.error('Route guard error:', error);
            return false;
        }
        if (typeof result === 'object' && result !== null) {
            return result.then(
                (settled) =>
                    settled === true ? executeExoGuards(guards, to, from, i + 1) : settled,
                (error: unknown) => {
                    console.error('Route guard error:', error);
                    return false;
                }
            );
        }
        if (result !== true) return result;
    }
    return true;
}
