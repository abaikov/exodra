import { describe, expect, it, vi } from 'vitest';
import { defineComponent } from './defineComponent';
import { h } from './h';

describe('defineComponent', () => {
    it('returns the SAME function (an identity typing wrapper, no runtime cost)', () => {
        const body = vi.fn(() => h('div', {}));
        const Comp = defineComponent(body as never);
        expect(Comp).toBe(body); // renderer calls it directly
    });

    it('runs the body with the context the renderer passes', () => {
        const Comp = defineComponent<{ static: { title: string } }>(ctx =>
            h('h1', { static: { textContent: ctx.getConstant('title') } })
        );
        // Fake the context the renderer would supply.
        const out = (Comp as (c: unknown) => unknown)({
            getConstant: (name: string) => (name === 'title' ? 'Hello' : undefined),
        });
        expect(out).toMatchObject({
            type: 'h1',
            attrs: { static: { textContent: 'Hello' } },
        });
    });

    it('does not add a real __exoProps property (it is a phantom type only)', () => {
        const Comp = defineComponent(() => h('div', {}));
        expect('__exoProps' in (Comp as object)).toBe(false);
    });
});
