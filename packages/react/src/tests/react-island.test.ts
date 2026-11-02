// @vitest-environment jsdom
//
// The React bridge end to end against the REAL schema core — a machine from `createExoTestMachine`,
// `ExoDomBackend`'s `render`/`hydrate`, `ExoStrBackend.render` and react-dom.
//
// WHAT EACH CASE IS FOR. The server case is the `unsafeHtml` hatch doing its job: React's markup
// arrives in the host as MARKUP, not as escaped text. The hydration case is the one that used to
// be impossible to state — the SAME component and the SAME wiring function adopt the server's
// bytes, and React takes them over in place rather than rendering a second copy. The client cases
// are the island's own lifecycle: an effect following a source re-renders it through the handle,
// and the render's disposer takes the React root with it.

import { describe, it, expect, beforeAll } from 'vitest';
import { createElement } from 'react';
import { act } from 'react-dom/test-utils';
import {
    createExoMachine,
    composeExoMachine,
    withExoTransitions,
    withExoEffects,
    createExoSchema,
} from '@exodra/core';
import type { TExoChildrenPort, TExoMachineNode } from '@exodra/core';
import { source } from '@exodra/test-utils';
import type { TExoTestSource } from '@exodra/test-utils';

import { reactIsland, type TExoReactIslandOptions } from '../reactIsland';
import type { TExoReactIsland } from '../types/TExoReactIsland';
import type { TExoReactWiring } from '../types/TExoReactWiring';
import { ExoDomBackend, withExoHydration, withExoCompiler } from '@exodra/dom';
import { ExoStrBackend } from '@exodra/string';

const EXO_BACKEND = withExoHydration(withExoCompiler(new ExoDomBackend()));
const EXO_STR = new ExoStrBackend();

beforeAll(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

type TLabelProps = { value: number };

function Label(props: TLabelProps) {
    return createElement('span', { className: 'react-val' }, `v=${props.value}`);
}

type TIslandState = { readonly island: TExoReactIsland<TLabelProps> };

/**
 * A component whose only content is one island. The host is an ordinary element with a children
 * port that owns everything inside it — which is the shape raw markup may be written into. Handed a
 * source, it follows it: an effect re-renders the island through the handle `reactIsland` returned.
 */
function island(
    props: TLabelProps,
    options?: TExoReactIslandOptions,
    follow?: TExoTestSource<TLabelProps>
) {
    const schema = createExoSchema((b) => {
        let host!: TExoChildrenPort;
        b.el('section', { class: 'wrap' }, (section) => {
            section.el('div', { 'data-exo-react': '' }, (div) => {
                host = div.childrenPort();
            });
        });
        return { host };
    });
    const base = createExoMachine<TExoReactWiring & TExoMachineNode, unknown, TIslandState>(
        schema,
        {
            createInitialState: (c) => ({
                island: reactIsland(c, schema.ports.host, Label, props, options),
            }),
        }
    );
    if (follow === undefined) return base;
    const following = composeExoMachine(
        base,
        (m) =>
            withExoTransitions(m, {
                show: (c) => c.state.island.render(follow.getValue()),
            }),
        (m) =>
            withExoEffects(m, (effect) => {
                effect((c) => follow.onChange(() => show(c)));
            })
    );
    const { show } = following.transitions;
    return following;
}

function freshContainer(): HTMLElement {
    const el = document.createElement('div');
    document.body.appendChild(el);
    return el;
}

describe('reactIsland — the browser', () => {
    it('mounts a static island inside an Exodra instance', () => {
        const container = freshContainer();
        let dispose!: () => void;
        act(() => {
            dispose = EXO_BACKEND.render(island({ value: 1 }), container);
        });

        expect(container.querySelector('section.wrap')).not.toBeNull();
        // React owns the inside of the Exodra-owned host element.
        expect(container.querySelector('.react-val')?.textContent).toBe('v=1');

        act(() => dispose());
    });

    it('re-renders through its handle and is torn down by the render disposer', () => {
        const container = freshContainer();
        const data = source<TLabelProps>({ value: 10 });
        let dispose!: () => void;
        act(() => {
            dispose = EXO_BACKEND.render(island(data.getValue(), undefined, data), container);
        });
        expect(container.querySelector('.react-val')?.textContent).toBe('v=10');

        act(() => data.setValue({ value: 20 }));
        expect(container.querySelector('.react-val')?.textContent).toBe('v=20');

        act(() => dispose());
        expect(container.querySelector('.react-val')).toBeNull();
        expect(data.subscribers()).toBe(0);

        // An emit after teardown must not throw and must not bring the island back.
        act(() => data.setValue({ value: 30 }));
        expect(container.querySelector('.react-val')).toBeNull();
    });

    it('ignores a render through a handle kept past teardown', () => {
        const container = freshContainer();
        let kept!: TExoReactIsland<TLabelProps>;
        const schema = createExoSchema((b) => {
            let host!: TExoChildrenPort;
            b.el('div', { 'data-exo-react': '' }, (div) => {
                host = div.childrenPort();
            });
            return { host };
        });
        const Island = createExoMachine<TExoReactWiring & TExoMachineNode>(schema, {
            createInitialState: (c) => {
                kept = reactIsland(c, schema.ports.host, Label, { value: 1 });
                return null;
            },
        });
        let dispose!: () => void;
        act(() => {
            dispose = EXO_BACKEND.render(Island, container);
        });
        act(() => dispose());

        expect(() => act(() => kept.render({ value: 2 }))).not.toThrow();
        expect(container.querySelector('.react-val')).toBeNull();
    });
});

describe('reactIsland — the server', () => {
    it('writes React markup into the host', () => {
        const html = EXO_STR.render(island({ value: 1 }));
        expect(html).toContain('data-exo-react');
        // MARKUP, not escaped text — the whole point of filling a children port with a string.
        expect(html).toContain('<span class="react-val">');
        expect(html).toContain('v=1');
    });

    it('ssr:false leaves the host empty', () => {
        const html = EXO_STR.render(island({ value: 1 }, { ssr: false }));
        expect(html).toContain('data-exo-react');
        expect(html).not.toContain('react-val');
    });

    it('hydration hands the served markup to React rather than rendering a second copy', () => {
        const component = island({ value: 1 });
        const container = freshContainer();
        container.innerHTML = EXO_STR.render(component);
        expect(container.querySelector('.react-val')?.textContent).toBe('v=1');

        let dispose!: () => void;
        act(() => {
            dispose = EXO_BACKEND.hydrate(component, container);
        });

        expect(container.querySelector('.react-val')?.textContent).toBe('v=1');
        expect(container.querySelectorAll('.react-val').length).toBe(1);
        // WHICH ELEMENT REACT WAS HANDED, and not merely that the markup survived. An adopting
        // schema carries two port->slot tables and the silenced one answers slot 0 — the instance's
        // ROOT — for every children port, so an island resolving through it hands `hydrateRoot` the
        // `<section>`. React then finds a mismatch, falls back to a client render, and DELETES the
        // host `div` while still leaving one `.react-val` behind for the two lines above.
        expect(container.querySelector('[data-exo-react] > .react-val')).not.toBeNull();

        act(() => dispose());
    });
});
