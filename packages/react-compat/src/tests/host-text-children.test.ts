// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createElement as h, createRoot } from '../index';

function hostOf(): { container: HTMLElement; render(element: unknown): HTMLElement } {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    return {
        container,
        render(element: unknown): HTMLElement {
            root.render(element);
            return container.firstElementChild as HTMLElement;
        },
    };
}

describe('a host element whose only child is text', () => {
    it('holds exactly one Text node and updates it in place', () => {
        const { render } = hostOf();
        const span = render(h('span', null, 'one'));
        const text = span.firstChild;
        expect(span.childNodes.length).toBe(1);
        expect(text?.nodeType).toBe(3);
        render(h('span', null, 'two'));
        expect(span.firstChild).toBe(text);
        expect(span.textContent).toBe('two');
    });

    it('renders numbers and switches between a number and a string', () => {
        const { render } = hostOf();
        const span = render(h('span', null, 7));
        expect(span.textContent).toBe('7');
        render(h('span', null, '7'));
        expect(span.textContent).toBe('7');
        render(h('span', null, 8));
        expect(span.textContent).toBe('8');
        expect(span.childNodes.length).toBe(1);
    });

    it('goes from the empty string to text and back', () => {
        const { render } = hostOf();
        const span = render(h('span', null, ''));
        expect(span.textContent).toBe('');
        render(h('span', null, 'filled'));
        expect(span.textContent).toBe('filled');
        render(h('span', null, ''));
        expect(span.textContent).toBe('');
    });

    it('replaces text with elements and elements with text', () => {
        const { render } = hostOf();
        const div = render(h('div', null, 'plain'));
        render(h('div', null, h('b', null, 'bold'), h('i', null, 'italic')));
        expect(div.innerHTML).toBe('<b>bold</b><i>italic</i>');
        render(h('div', null, 'plain again'));
        expect(div.innerHTML).toBe('plain again');
        render(h('div', null, h('b', null, 'back')));
        expect(div.innerHTML).toBe('<b>back</b>');
    });

    it('replaces text with nothing', () => {
        const { render } = hostOf();
        const div = render(h('div', null, 'gone soon'));
        render(h('div', null, null));
        expect(div.childNodes.length).toBe(0);
        render(h('div', null, 'here'));
        expect(div.textContent).toBe('here');
    });

    it('moves between text and dangerouslySetInnerHTML', () => {
        const { render } = hostOf();
        const div = render(h('div', null, 'text'));
        render(h('div', { dangerouslySetInnerHTML: { __html: '<em>html</em>' } }));
        expect(div.innerHTML).toBe('<em>html</em>');
        render(h('div', null, 'text again'));
        expect(div.innerHTML).toBe('text again');
    });

    it('keeps a text-only element alongside element siblings in its parent', () => {
        const { render } = hostOf();
        const ul = render(h('ul', null, h('li', { key: 'a' }, 'A'), h('li', { key: 'b' }, 'B')));
        render(h('ul', null, h('li', { key: 'b' }, 'B2'), h('li', { key: 'a' }, 'A2')));
        expect(ul.innerHTML).toBe('<li>B2</li><li>A2</li>');
    });
});
