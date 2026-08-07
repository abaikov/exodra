import { describe, expect, it } from 'vitest';
import { createContextKey } from '@exodra/core';
import { runWithAmbient } from './ambient';
import { ssrContext } from './ssr-context';

describe('ssrContext', () => {
    it('reads static / bindables / bindableLists via get*', () => {
        const ctx = ssrContext({
            static: { label: 'hi' },
            bindables: { count: 3 },
            bindableLists: { items: [1, 2] },
        });
        expect(ctx.getConstant('label')).toBe('hi');
        expect(ctx.getBindable('count')).toBe(3);
        expect(ctx.getBindableList('items')).toEqual([1, 2]);
    });

    it('returns undefined for missing props (no attrs bucket)', () => {
        const ctx = ssrContext({});
        expect(ctx.getConstant('nope')).toBeUndefined();
        expect(ctx.getBindable('nope')).toBeUndefined();
        expect(ctx.getBindableList('nope')).toBeUndefined();
    });

    it('createNode is identity and onDispose is a no-op', () => {
        const ctx = ssrContext({});
        const schema = { type: 'div', attrs: {} };
        expect(ctx.createNode(schema)).toBe(schema);
        expect(() => ctx.onDispose(() => {})).not.toThrow();
    });

    it('provide() then inject() reads back within the same component scope', () => {
        const key = createContextKey<string>('theme');
        const ctx = ssrContext({});
        ctx.provide(key, 'dark');
        expect(ctx.inject(key)).toBe('dark');
    });

    it('inject() returns the fallback when nothing was provided', () => {
        const key = createContextKey<string>('missing');
        const ctx = ssrContext({});
        expect(ctx.inject(key, 'fallback')).toBe('fallback');
        expect(ctx.inject(key)).toBeUndefined();
    });
});

describe('runWithAmbient', () => {
    it('exposes ambient values to inject() only for the duration of fn', () => {
        const key = createContextKey<string>('status');
        const ctx = ssrContext({});
        // Outside the ambient window: not visible.
        expect(ctx.inject(key, 'none')).toBe('none');

        const ambient = new Map<symbol, unknown>([[key.id, 'ok']]);
        const seen = runWithAmbient(ambient, () => ctx.inject(key));
        expect(seen).toBe('ok');

        // Window closed → ambient restored to null, no longer visible.
        expect(ctx.inject(key, 'none')).toBe('none');
    });

    it('a local provide() shadows the ambient value', () => {
        const key = createContextKey<string>('k');
        const ctx = ssrContext({});
        ctx.provide(key, 'local');
        const ambient = new Map<symbol, unknown>([[key.id, 'ambient']]);
        expect(runWithAmbient(ambient, () => ctx.inject(key))).toBe('local');
    });

    it('restores the previous ambient when nested', () => {
        const key = createContextKey<string>('k');
        const ctx = ssrContext({});
        const outer = new Map<symbol, unknown>([[key.id, 'outer']]);
        const inner = new Map<symbol, unknown>([[key.id, 'inner']]);
        const trace: unknown[] = [];
        runWithAmbient(outer, () => {
            trace.push(ctx.inject(key));
            runWithAmbient(inner, () => trace.push(ctx.inject(key)));
            trace.push(ctx.inject(key)); // outer restored
        });
        expect(trace).toEqual(['outer', 'inner', 'outer']);
    });

    it('returns the value produced by fn', () => {
        expect(runWithAmbient(new Map(), () => 42)).toBe(42);
    });
});
