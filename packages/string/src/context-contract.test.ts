import { describe, expect, it } from 'vitest';
import { createContextKey, h, type TExoContext } from '@exodra/core';
import { ExoNodeString } from './ExoNodeString';
import { ssrContext } from './ssr-context';

/**
 * ONE context contract, TWO copies of the literal that implements it: the runtime
 * walker (`ExoNodeString.createContext`) and the compiled path (`ssrContext`).
 * The copies are a measured perf decision (a shared factory cost +6-8ns per
 * component, and this allocates once per component of every render) — so the
 * thing that keeps them honest is this file.
 *
 * Every case runs against BOTH contexts. A component must not be able to tell
 * which mode it is rendering in.
 */
const key = createContextKey<string>('contract');

// Build the walker's context by rendering a component that captures it.
function walkerContext(attrs: Record<string, unknown>): TExoContext {
    let captured: TExoContext | undefined;
    const Component = (context: TExoContext) => {
        captured = context;
        return [];
    };
    new ExoNodeString(
        h(Component, attrs) as ConstructorParameters<typeof ExoNodeString>[0]
    );
    if (!captured) throw new Error('component never ran');
    return captured as TExoContext;
}

const bindable = { getValue: () => 'bound', onChange: () => () => {} };
const bindableList = { getValue: () => [], onChange: () => () => {} };
const attrs = {
    static: { label: 'hi', count: 0 },
    bindables: { value: bindable },
    bindableLists: { items: bindableList },
};

const modes: Array<[string, () => TExoContext]> = [
    ['walker', () => walkerContext(attrs)],
    ['compiled', () => ssrContext(attrs)],
];

describe.each(modes)('component context (%s)', (_name, build) => {
    it('reads the static bucket via getConstant', () => {
        const ctx = build();
        expect(ctx.getConstant('label')).toBe('hi');
        expect(ctx.getConstant('count')).toBe(0);
        expect(ctx.getConstant('missing')).toBeUndefined();
    });

    it('reads the bindables bucket via getBindable', () => {
        expect(build().getBindable('value')).toBe(bindable);
        expect(build().getBindable('missing')).toBeUndefined();
    });

    it('reads the bindableLists bucket via getBindableList', () => {
        expect(build().getBindableList('items')).toBe(bindableList);
        expect(build().getBindableList('missing')).toBeUndefined();
    });

    it('createNode returns the schema unchanged', () => {
        const ctx = build();
        const node = h('div');
        expect(ctx.createNode(node)).toBe(node);
    });

    it('inject falls back when nothing was provided', () => {
        expect(build().inject(key, 'fallback')).toBe('fallback');
        expect(build().inject(key)).toBeUndefined();
    });

    it('inject sees a value provided on the same context', () => {
        const ctx = build();
        ctx.provide(key, 'provided');
        expect(ctx.inject(key, 'fallback')).toBe('provided');
    });

    it('a provided value wins over the fallback even when falsy', () => {
        const falsyKey = createContextKey<string>('falsy');
        const ctx = build();
        ctx.provide(falsyKey, '');
        expect(ctx.inject(falsyKey, 'fallback')).toBe('');
    });

    it('onDispose is callable and does nothing (rendering is one-shot)', () => {
        expect(() => build().onDispose(() => {})).not.toThrow();
    });

    it('exposes the same method surface', () => {
        const ctx = build();
        for (const method of [
            'createNode',
            'getConstant',
            'getBindable',
            'getBindableList',
            'provide',
            'inject',
            'onDispose',
        ]) {
            expect(typeof (ctx as unknown as Record<string, unknown>)[method]).toBe(
                'function'
            );
        }
        expect(ctx.schema).toBeDefined();
    });
});
