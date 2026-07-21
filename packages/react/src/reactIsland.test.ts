// @vitest-environment jsdom
//
// Proves the React island bridge end-to-end against the REAL @exodra/core +
// @exodra/dom + react-dom: a React component mounts inside an Exodra tree, a
// bound Exodra bindable drives React re-renders, and dispose() tears the React
// root down (no leaks, no resurrection).

import { describe, it, expect, beforeAll } from 'vitest';
import { createElement } from 'react';
import { act } from 'react-dom/test-utils';
import { h } from '@exodra/core';
import { mount } from '@exodra/dom';
import { bindable } from '@exodra/reactivity';
import { reactIsland } from './reactIsland';

beforeAll(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
        true;
});

function Label(props: { value: number }) {
    return createElement('span', { className: 'react-val' }, `v=${props.value}`);
}

function freshContainer(): HTMLElement {
    const el = document.createElement('div');
    document.body.appendChild(el);
    return el;
}

describe('reactIsland', () => {
    it('renders a static React island inside an Exodra tree', () => {
        const container = freshContainer();
        const tree = h('section', {
            static: { class: 'wrap', children: [reactIsland(Label, { value: 1 })] },
        });

        let res!: ReturnType<typeof mount>;
        act(() => {
            res = mount(tree, container);
        });

        expect(container.querySelector('section.wrap')).not.toBeNull();
        // React owns the inside of the Exodra-owned host element
        expect(container.querySelector('.react-val')?.textContent).toBe('v=1');

        act(() => {
            res.dispose();
        });
    });

    it('re-renders on bound-prop change and cleans up on dispose', () => {
        const container = freshContainer();
        const propsB = bindable<{ value: number }>({ value: 10 });
        const tree = h('div', {
            static: { children: [reactIsland(Label, propsB)] },
        });

        let res!: ReturnType<typeof mount>;
        act(() => {
            res = mount(tree, container);
        });
        expect(container.querySelector('.react-val')?.textContent).toBe('v=10');

        act(() => {
            propsB.setValue({ value: 20 });
        });
        expect(container.querySelector('.react-val')?.textContent).toBe('v=20');

        act(() => {
            res.dispose();
        });
        expect(container.querySelector('.react-val')).toBeNull();

        // Updates after dispose must not throw and must not resurrect the island.
        act(() => {
            propsB.setValue({ value: 30 });
        });
        expect(container.querySelector('.react-val')).toBeNull();
    });
});
