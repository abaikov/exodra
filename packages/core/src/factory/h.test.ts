import { describe, expect, it } from 'vitest';
import { h } from './h';
import { text } from './text';

describe('schema helpers', () => {
    it('creates schema nodes with static, bindables, and list bindings', () => {
        const bindables = { textContent: { getValue: () => 'hello' } };
        const bindableLists = { children: { getValue: () => [] } };
        const schema = h('div', { 
            static: {
                id: 'app',
                children: text('child')
            },
            bindables, 
            bindableLists 
        });

        expect(schema).toMatchObject({
            type: 'div',
            attrs: {
                static: {
                    id: 'app',
                    children: {
                        type: '#text',
                        attrs: {
                            static: {
                                textContent: 'child',
                            },
                        },
                    },
                },
                bindables,
                bindableLists,
            },
        });
    });

    it('defaults attrs to an empty object', () => {
        expect(h('span')).toEqual({ type: 'span', attrs: {} });
    });

    it('keeps the exact attrs object it was given (no copy)', () => {
        const attrs = { static: { id: 'x' } };
        const schema = h('div', attrs);
        expect(schema.attrs).toBe(attrs); // referential — no defensive clone
    });

    it('omits cacheKey unless provided, and includes it when given', () => {
        expect('cacheKey' in h('div', {})).toBe(false);

        const key = Symbol('row');
        const keyed = h('div', {}, key) as { cacheKey?: symbol | string };
        expect(keyed.cacheKey).toBe(key);

        const strKeyed = h('li', {}, 'tpl') as { cacheKey?: symbol | string };
        expect(strKeyed.cacheKey).toBe('tpl');
    });

    it('carries handlers and bindableHandlers buckets through untouched', () => {
        const onClick = (): void => {};
        const onInput = { getValue: () => onClick };
        const schema = h('button', {
            handlers: { onClick },
            bindableHandlers: { onInput },
        } as never);
        expect(schema.attrs).toMatchObject({
            handlers: { onClick },
            bindableHandlers: { onInput },
        });
    });

    it('supports component (function) types', () => {
        const Comp = (): unknown => h('div', {});
        const schema = h(Comp as never, { static: { title: 'hi' } } as never);
        expect(schema.type).toBe(Comp);
        expect(schema.attrs).toMatchObject({ static: { title: 'hi' } });
    });
});

describe('text', () => {
    it('builds a #text schema with the value in static.textContent', () => {
        expect(text('hello')).toEqual({
            type: '#text',
            attrs: { static: { textContent: 'hello' } },
        });
    });

    it('passes non-string values through unchanged (renderer stringifies)', () => {
        expect(text(42)).toMatchObject({ attrs: { static: { textContent: 42 } } });
        expect(text(null)).toMatchObject({ attrs: { static: { textContent: null } } });
    });
});
