import { createContextKey, type TExoContext } from '@exodra/core';
import type { TExoSsrContext } from './types';

export const ssrContextKey = createContextKey<TExoSsrContext>('exodra.ssr');

export function useSsr(context: TExoContext): TExoSsrContext | undefined {
    return context.inject(ssrContextKey);
}
