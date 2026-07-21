// @vitest-environment jsdom
//
// React islands are now SSR-capable: the server renders the React component's
// markup into the host, and the client HYDRATES it. This test verifies both the
// server output (real React HTML in the host, no serialized lifecycle) and the
// client hydration (React takes over the server DOM in place). It also covers
// the opt-out (`ssr: false`) client-only mode.
//
// The island detects "server" via `typeof document === 'undefined'`. jsdom
// always defines `document`, so we simulate a Node SSR env by removing it around
// the string render.

import { describe, it, expect, beforeAll } from 'vitest';
import { createElement } from 'react';
import { act } from 'react-dom/test-utils';
import { h } from '@exodra/core';
import { renderToString } from '@exodra/string';
import { hydrate } from '@exodra/dom';
import { reactIsland, type ReactIslandOptions } from './reactIsland';

beforeAll(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
        true;
});

function Label(props: { value: number }) {
    return createElement('span', { className: 'react-val' }, `v=${props.value}`);
}

function tree(opts?: ReactIslandOptions) {
    return h('section', {
        static: {
            class: 'wrap',
            children: [reactIsland(Label, { value: 1 }, opts)],
        },
    });
}

// Build + render to a string with a simulated Node SSR environment (no
// `document`). The tree MUST be built inside here so reactIsland takes the
// server path — building it outside (while `document` exists) would take the
// client path.
function ssrRender(build: () => ReturnType<typeof tree>): string {
    const saved = (globalThis as { document?: unknown }).document;
    delete (globalThis as { document?: unknown }).document;
    try {
        return renderToString(build());
    } finally {
        (globalThis as { document?: unknown }).document = saved;
    }
}

describe('reactIsland — SSR', () => {
    it('server-renders the React component into the host (default)', () => {
        const html = ssrRender(() => tree());
        expect(html).toContain('data-exo-react');
        // real React content is present in the server HTML
        expect(html).toContain('react-val');
        expect(html).toContain('v=1');
        // lifecycle hooks / functions are never serialized
        expect(html).not.toContain('onExoMount');
        expect(html.toLowerCase()).not.toContain('function');
    });

    it('ssr:false → client-only (empty host on the server)', () => {
        const html = ssrRender(() => tree({ ssr: false }));
        expect(html).toContain('data-exo-react');
        expect(html).not.toContain('react-val');
        expect(html).not.toContain('v=1');
    });

    it('client hydrates the server-rendered island in place', () => {
        const html = ssrRender(() => tree());
        const container = document.createElement('div');
        container.innerHTML = html;
        document.body.appendChild(container);
        const root = container.firstElementChild as Element;

        // server content is present before hydration
        expect(container.querySelector('.react-val')?.textContent).toBe('v=1');

        let res: ReturnType<typeof hydrate>;
        act(() => {
            res = hydrate(tree(), root);
        });

        // after hydration React owns the host; content is still there
        expect(container.querySelector('.react-val')?.textContent).toBe('v=1');
        expect(container.querySelectorAll('.react-val').length).toBe(1); // no double-render

        act(() => {
            res!.dispose();
        });
    });
});
