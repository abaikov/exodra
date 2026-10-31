// THE ONE SHAPE `component.length === 0` CAN ANSWER WRONGLY — a route `component` that is a
// function AND declares a parameter.
//
// `TExoRouteMachine` is a union of one function type and one object type, so `typeof` alone
// already decides between a loader and a page; the arity read can never break a tie inside the
// declared union. What it DOES decide is the treatment of a value the type does not admit but a
// JavaScript caller (or a `// @ts-expect-error`, or a JS route table emitted by a generator) can
// pass: `component: (props) => import('./page')`. With the arity read, that is filed as a PAGE and
// handed to the renderer as a schema. Without it, it would be CALLED as a loader and fail while
// doing the thing it looks like.
//
// NOTHING HERE NEEDS A DOM.
import { describe, expect, it } from 'vitest';
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import { exoLazy, fetchExoRouteChunk, isExoLazyLoader, resolveExoRouteMachine } from '../../index';
import type { TExoRouteMachine, TExoRouteMatch } from '../../types';

const dashboard = createExoMachineBuilder(
    createExoSchema((b) => {
        b.el('p', { class: 'dashboard' });
        return {};
    })
).done();

describe('a route component that is a function', () => {
    // IF THIS FAILS: the router calls the application's own function with no arguments and installs
    // whatever came back — a Promise, or `undefined` — as the page, and the outlet stays blank.
    it('is filed as a PAGE when it declares a parameter, and is never called as a loader', async () => {
        const seenArguments: TExoRouteMatch[] = [];
        // The shape the type does not admit and a JavaScript caller can still write.
        const withAParameter = ((match: TExoRouteMatch) => {
            seenArguments.push(match);
            return Promise.resolve(dashboard);
        }) as unknown as TExoRouteMachine;

        expect(isExoLazyLoader(withAParameter)).toBe(false);

        // Handed straight back, unchanged — the resolver treats it as the page it already is.
        await expect(resolveExoRouteMachine(withAParameter)).resolves.toBe(withAParameter);

        // And the chunk fetch is a no-op for it: nothing is downloaded, nothing is invoked.
        await fetchExoRouteChunk(withAParameter);
        expect(seenArguments).toEqual([]);
    });

    // IF THIS FAILS: a hand-written `component: () => import('./page')` stops being downloaded, and
    // the route renders the loader function itself instead of the page it would have fetched.
    it('is called as a LOADER when it declares no parameter', async () => {
        let called = 0;
        const withNoParameter: TExoRouteMachine = () => {
            called++;
            return Promise.resolve(dashboard);
        };

        expect(isExoLazyLoader(withNoParameter)).toBe(true);
        await expect(resolveExoRouteMachine(withNoParameter)).resolves.toBe(dashboard);
        expect(called).toBe(1);
    });

    // IF THIS FAILS: every `exoLazy(() => import(...))` in every route table stops loading, because
    // the wrapper's own arity no longer reads as a loader.
    it('is recognised through exoLazy, whose wrapper declares no parameter', async () => {
        const loader = exoLazy(() => Promise.resolve({ default: dashboard }));

        expect(isExoLazyLoader(loader)).toBe(true);
        await expect(resolveExoRouteMachine(loader)).resolves.toBe(dashboard);
    });
});
