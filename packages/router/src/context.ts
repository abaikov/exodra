import { createContextKey, type TExoContext } from '@exodra/core';
import type { TExoRouter } from './types';

export const routerContextKey =
    createContextKey<TExoRouter>('exodra.router');

export function useRouter(context: TExoContext): TExoRouter {
    const router = context.inject(routerContextKey);

    if (!router) {
        throw new Error('Exodra router was not provided through context.');
    }

    return router;
}
