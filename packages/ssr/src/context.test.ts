import { describe, expect, it } from 'vitest';
import type { TExoContext } from '@exodra/core';
import { ssrContextKey, useSsr } from './context';
import type { TExoSsrContext } from './types';

// A minimal context whose inject() returns whatever sink we hand it.
function contextWithSsr(sink: TExoSsrContext | undefined): TExoContext {
    return {
        inject: (key: unknown) => (key === ssrContextKey ? sink : undefined),
    } as unknown as TExoContext;
}

describe('ssrContextKey', () => {
    it('is a stable, named context key', () => {
        expect(ssrContextKey.name).toBe('exodra.ssr');
        expect(typeof ssrContextKey.id).toBe('symbol');
    });
});

describe('useSsr', () => {
    it('returns the SSR context injected under ssrContextKey', () => {
        const sink = { setStatus() {} } as unknown as TExoSsrContext;
        expect(useSsr(contextWithSsr(sink))).toBe(sink);
    });

    it('returns undefined when no SSR context is provided', () => {
        expect(useSsr(contextWithSsr(undefined))).toBeUndefined();
    });
});
