// @vitest-environment jsdom
//
// Proves the boundary end-to-end against the REAL react-dom + @exodra/dom:
// React owns the container, Exodra owns everything inside it, and the two hand
// off cleanly on mount, update, StrictMode's double pass, and unmount.

import { beforeAll, describe, expect, it } from 'vitest';
import { createElement, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { h } from '@exodra/core';
import { bindable } from '@exodra/reactivity';
import { renderToString } from '@exodra/string';
import { ExoMount } from './ExoMount';

beforeAll(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
        true;
});

function freshContainer(): HTMLElement {
    const el = document.createElement('div');
    document.body.appendChild(el);
    return el;
}

function render(element: ReturnType<typeof createElement>): {
    host: HTMLElement;
    root: Root;
} {
    const host = freshContainer();
    const root = createRoot(host);
    act(() => {
        root.render(element);
    });
    return { host, root };
}

describe('ExoMount', () => {
    it('renders an Exodra tree inside the React-owned element', () => {
        const { host, root } = render(
            createElement(ExoMount, {
                schema: () => h('p', { static: { textContent: 'from exodra' } }),
                className: 'island',
            })
        );

        expect(host.querySelector('.island')).not.toBeNull();
        expect(host.querySelector('.island > p')?.textContent).toBe('from exodra');

        act(() => root.unmount());
    });

    it('keeps the Exodra subtree reactive after React has rendered', () => {
        const label = bindable('a');
        const { host, root } = render(
            createElement(ExoMount, {
                schema: () => h('p', { bindables: { textContent: label } }),
            })
        );
        expect(host.querySelector('p')?.textContent).toBe('a');

        // No React re-render involved: the update goes straight to the DOM.
        act(() => label.setValue('b'));
        expect(host.querySelector('p')?.textContent).toBe('b');

        act(() => root.unmount());
    });

    it('disposes the Exodra tree when React unmounts (no leaked subscription)', () => {
        const label = bindable('a');
        const { host, root } = render(
            createElement(ExoMount, {
                schema: () => h('p', { bindables: { textContent: label } }),
            })
        );
        const paragraph = host.querySelector('p')!;

        act(() => root.unmount());

        // The detached node must no longer follow the bindable.
        act(() => label.setValue('after-unmount'));
        expect(paragraph.textContent).toBe('a');
        expect(host.querySelector('p')).toBeNull();
    });

    it('mounts exactly once under StrictMode (which runs effects twice)', () => {
        const { host, root } = render(
            createElement(
                StrictMode,
                null,
                createElement(ExoMount, {
                    schema: () => h('p', { static: { textContent: 'once' } }),
                })
            )
        );

        expect(host.querySelectorAll('p')).toHaveLength(1);
        act(() => root.unmount());
    });

    it('does not rebuild when the parent re-renders with a new inline factory', () => {
        const host = freshContainer();
        const root = createRoot(host);
        const element = () =>
            createElement(ExoMount, {
                // A fresh closure every render — the common way to write this.
                schema: () => h('p', { static: { textContent: 'stable' } }),
            });

        act(() => root.render(element()));
        const first = host.querySelector('p');
        act(() => root.render(element()));

        expect(host.querySelector('p')).toBe(first); // same node, not rebuilt
        act(() => root.unmount());
    });

    it('re-mounts when deps change', () => {
        const host = freshContainer();
        const root = createRoot(host);
        const view = (value: string) =>
            createElement(ExoMount, {
                schema: () => h('p', { static: { textContent: value } }),
                deps: [value],
            });

        act(() => root.render(view('one')));
        expect(host.querySelector('p')?.textContent).toBe('one');

        act(() => root.render(view('two')));
        expect(host.querySelectorAll('p')).toHaveLength(1);
        expect(host.querySelector('p')?.textContent).toBe('two');

        act(() => root.unmount());
    });
});

describe('ExoMount with server-rendered html', () => {
    const build = () =>
        h('p', { static: { className: 'ssr', textContent: 'server' } });

    it('adopts the server markup instead of rebuilding it', () => {
        const html = renderToString(build());
        expect(html).toBe('<p class="ssr">server</p>');

        const { host, root } = render(
            createElement(ExoMount, { schema: build, html })
        );

        // The SAME element the server produced is still there — hydration
        // attached to it rather than replacing it.
        const paragraph = host.querySelector('p.ssr');
        expect(paragraph).not.toBeNull();
        expect(host.querySelectorAll('p')).toHaveLength(1);
        expect(paragraph!.textContent).toBe('server');

        act(() => root.unmount());
    });

    it('binds the hydrated markup to its bindables', () => {
        const label = bindable('server');
        const schema = () =>
            h('p', {
                static: { className: 'ssr' },
                bindables: { textContent: label },
            });
        const html = renderToString(schema());

        const { host, root } = render(
            createElement(ExoMount, { schema, html })
        );
        act(() => label.setValue('client'));
        expect(host.querySelector('p.ssr')?.textContent).toBe('client');

        act(() => root.unmount());
    });
});
