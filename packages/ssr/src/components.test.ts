import { describe, expect, it } from 'vitest';
import type { TExoContext, TExoSchema } from '@exodra/core';
import { Head, Header, State, Status } from './components';
import { ssrContextKey } from './context';
import type { TExoSsrContext } from './types';

// A recording SSR sink + a context wired to it. `staticProps` become the
// component's props (h() puts props in the `static` bucket).
function setup(staticProps?: Record<string, unknown>) {
    const calls: Array<[string, ...unknown[]]> = [];
    const sink = {
        setStatus: (code: number) => calls.push(['setStatus', code]),
        setHeader: (n: string, v: string) => calls.push(['setHeader', n, v]),
        appendHeader: (n: string, v: string) => calls.push(['appendHeader', n, v]),
        addHead: (s: unknown) => calls.push(['addHead', s]),
        setState: (k: string, v: unknown) => calls.push(['setState', k, v]),
    } as unknown as TExoSsrContext;
    const context = {
        schema: { attrs: staticProps ? { static: staticProps } : {} },
        inject: (key: unknown) => (key === ssrContextKey ? sink : undefined),
    } as unknown as TExoContext;
    return { context, calls };
}

describe('Status', () => {
    it('forwards the status code and renders nothing', () => {
        const { context, calls } = setup({ code: 404 });
        expect(Status(context)).toEqual([]);
        expect(calls).toEqual([['setStatus', 404]]);
    });
});

describe('Header', () => {
    it('sets a header by default', () => {
        const { context, calls } = setup({ name: 'X-A', value: '1' });
        expect(Header(context)).toEqual([]);
        expect(calls).toEqual([['setHeader', 'X-A', '1']]);
    });

    it('appends when append:true', () => {
        const { context, calls } = setup({ name: 'Set-Cookie', value: 'a=1', append: true });
        Header(context);
        expect(calls).toEqual([['appendHeader', 'Set-Cookie', 'a=1']]);
    });
});

describe('State', () => {
    it('forwards a state entry', () => {
        const { context, calls } = setup({ name: 'user', value: { id: 7 } });
        expect(State(context)).toEqual([]);
        expect(calls).toEqual([['setState', 'user', { id: 7 }]]);
    });
});

describe('Head', () => {
    const child: TExoSchema = { type: 'title', attrs: { static: { children: 'T' } } };

    it('adds a single child to head', () => {
        const { context, calls } = setup({ children: child });
        expect(Head(context)).toEqual([]);
        expect(calls).toEqual([['addHead', [child]]]);
    });

    it('adds an array of children to head', () => {
        const { context, calls } = setup({ children: [child, child] });
        Head(context);
        expect(calls).toEqual([['addHead', [child, child]]]);
    });

    it('does NOT call addHead when there are no children', () => {
        const { context, calls } = setup({});
        expect(Head(context)).toEqual([]);
        expect(calls).toEqual([]);
    });

    it('treats null children as empty', () => {
        const { context, calls } = setup({ children: null });
        Head(context);
        expect(calls).toEqual([]);
    });
});

describe('getProps fallback (no static bucket)', () => {
    it('reads props straight off attrs when there is no static bucket', () => {
        // attrs itself carries the props (backward-compat path).
        const calls: Array<[string, ...unknown[]]> = [];
        const sink = {
            setStatus: (code: number) => calls.push(['setStatus', code]),
        } as unknown as TExoSsrContext;
        const context = {
            schema: { attrs: { code: 500 } },
            inject: (key: unknown) => (key === ssrContextKey ? sink : undefined),
        } as unknown as TExoContext;
        Status(context);
        expect(calls).toEqual([['setStatus', 500]]);
    });
});

describe('no SSR context', () => {
    it('components are safe no-ops when useSsr() is undefined', () => {
        const context = {
            schema: { attrs: { static: { code: 200 } } },
            inject: () => undefined,
        } as unknown as TExoContext;
        expect(() => Status(context)).not.toThrow();
        expect(Status(context)).toEqual([]);
    });
});
