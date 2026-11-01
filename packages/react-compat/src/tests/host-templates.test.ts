// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import {
    act,
    createElement as h,
    createRoot,
    enableExoReactHostTemplates,
    useState,
} from '../index';

function mount(element: unknown): { container: HTMLElement; render(next: unknown): void } {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    root.render(element);
    return { container, render: (next) => root.render(next) };
}

beforeAll(() => enableExoReactHostTemplates());

describe('host templates', () => {
    it('renders a nested host tree and updates attributes and text in place', () => {
        function Card({ title, tone }: { title: string; tone: string }): unknown {
            return h(
                'article',
                { className: tone },
                h('h2', null, title),
                h('p', { 'data-tone': tone }, 'body')
            );
        }
        const view = mount(h(Card, { title: 'One', tone: 'a' }));
        expect(view.container.innerHTML).toBe(
            '<article class="a"><h2>One</h2><p data-tone="a">body</p></article>'
        );
        const heading = view.container.querySelector('h2');
        view.render(h(Card, { title: 'Two', tone: 'b' }));
        expect(view.container.innerHTML).toBe(
            '<article class="b"><h2>Two</h2><p data-tone="b">body</p></article>'
        );
        expect(view.container.querySelector('h2')).toBe(heading);
        expect(Object.getOwnPropertySymbols(Card)).toHaveLength(1);
    });

    it('fires handlers on nested elements and sees the latest one', () => {
        const log: string[] = [];
        function Row({ label }: { label: string }): unknown {
            return h('div', null, h('button', { onClick: () => log.push(label) }, 'go'));
        }
        const view = mount(h(Row, { label: 'first' }));
        (view.container.querySelector('button') as HTMLButtonElement).click();
        view.render(h(Row, { label: 'second' }));
        (view.container.querySelector('button') as HTMLButtonElement).click();
        expect(log).toEqual(['first', 'second']);
    });

    it('keeps a conditional child correct as it appears and disappears', () => {
        function Panel({ open }: { open: boolean }): unknown {
            return h('section', null, h('h3', null, 'head'), open && h('div', null, 'details'));
        }
        const view = mount(h(Panel, { open: false }));
        expect(view.container.innerHTML).toBe('<section><h3>head</h3></section>');
        view.render(h(Panel, { open: true }));
        expect(view.container.innerHTML).toBe('<section><h3>head</h3><div>details</div></section>');
        view.render(h(Panel, { open: false }));
        expect(view.container.innerHTML).toBe('<section><h3>head</h3></section>');
    });

    it('reconciles a keyed list inside a template by key', () => {
        function List({ items }: { items: readonly string[] }): unknown {
            return h(
                'div',
                null,
                h('h4', null, 'list'),
                h(
                    'ul',
                    null,
                    items.map((item) => h('li', { key: item }, item))
                )
            );
        }
        const view = mount(h(List, { items: ['a', 'b', 'c'] }));
        const b = view.container.querySelectorAll('li')[1];
        view.render(h(List, { items: ['c', 'b', 'a'] }));
        expect(view.container.querySelector('ul')?.innerHTML).toBe(
            '<li>c</li><li>b</li><li>a</li>'
        );
        expect(view.container.querySelectorAll('li')[1]).toBe(b);
    });

    it('sets refs, styles and controlled values on nested elements', () => {
        const ref: { current: HTMLInputElement | null } = { current: null };
        function Form({ value, color }: { value: string; color: string }): unknown {
            return h(
                'form',
                null,
                h('input', { ref, value, onChange: () => undefined }),
                h('span', { style: { color } }, 'x')
            );
        }
        const view = mount(h(Form, { value: 'v1', color: 'red' }));
        expect(ref.current).toBe(view.container.querySelector('input'));
        expect(ref.current?.value).toBe('v1');
        expect((view.container.querySelector('span') as HTMLElement).style.color).toBe('red');
        view.render(h(Form, { value: 'v2', color: 'blue' }));
        expect(ref.current?.value).toBe('v2');
        expect((view.container.querySelector('span') as HTMLElement).style.color).toBe('blue');
    });

    it('writes svg attributes under their svg names', () => {
        function Icon({ size }: { size: number }): unknown {
            return h(
                'svg',
                { viewBox: `0 0 ${size} ${size}` },
                h('circle', { strokeWidth: 2, r: size / 2 })
            );
        }
        const view = mount(h(Icon, { size: 10 }));
        const svg = view.container.querySelector('svg') as SVGElement;
        expect(svg.getAttribute('viewBox')).toBe('0 0 10 10');
        expect(svg.querySelector('circle')?.getAttribute('stroke-width')).toBe('2');
    });

    it('keeps a nested component and its state inside a template', async () => {
        let bump!: () => void;
        function Counter(): unknown {
            const [n, setN] = useState(0);
            bump = () => setN((v) => v + 1);
            return h('b', null, n);
        }
        function Shell({ title }: { title: string }): unknown {
            return h('div', null, h('i', null, title), h(Counter, null));
        }
        const view = mount(h(Shell, { title: 't1' }));
        await act(async () => bump());
        view.render(h(Shell, { title: 't2' }));
        expect(view.container.innerHTML).toBe('<div><i>t2</i><b>1</b></div>');
    });

    it('keeps a nested component and its state when a sibling is appended to its template', async () => {
        let bump!: () => void;
        function Counter(): unknown {
            const [n, setN] = useState(0);
            bump = () => setN((v) => v + 1);
            return h('b', null, n);
        }
        function Shell({ extra }: { extra: boolean }): unknown {
            return extra
                ? h('div', null, h('i', null, 't'), h(Counter, null), h('u', null, 'x'))
                : h('div', null, h('i', null, 't'), h(Counter, null));
        }
        const view = mount(h(Shell, { extra: false }));
        await act(async () => bump());
        const b = view.container.querySelector('b');
        view.render(h(Shell, { extra: true }));
        expect(view.container.innerHTML).toBe('<div><i>t</i><b>1</b><u>x</u></div>');
        expect(view.container.querySelector('b')).toBe(b);
    });

    it('keeps the DOM nodes, typed text, state and one click handler across shape changes back and forth', async () => {
        let bump!: () => void;
        const clicks: string[] = [];
        function Counter(): unknown {
            const [n, setN] = useState(0);
            bump = () => setN((v) => v + 1);
            return h('b', null, n);
        }
        function Shell({ extra, label }: { extra: boolean; label: string }): unknown {
            const kids = [
                h('input', { key: 'in', defaultValue: 'start' }),
                h('button', { key: 'go', onClick: () => clicks.push(label) }, 'go'),
                h(Counter, { key: 'c' }),
            ];
            return extra
                ? h('div', { className: 'x' }, ...kids, h('u', { key: 'u' }, 'tail'))
                : h('div', { className: 'y', title: label }, ...kids);
        }
        const view = mount(h(Shell, { extra: false, label: 'a' }));
        await act(async () => bump());
        const input = view.container.querySelector('input') as HTMLInputElement;
        const button = view.container.querySelector('button') as HTMLButtonElement;
        input.value = 'typed';
        view.render(h(Shell, { extra: true, label: 'b' }));
        expect(view.container.innerHTML).toBe(
            '<div class="x"><input><button>go</button><b>1</b><u>tail</u></div>'
        );
        expect(view.container.querySelector('input')).toBe(input);
        expect(input.value).toBe('typed');
        button.click();
        expect(clicks).toEqual(['b']);
        view.render(h(Shell, { extra: false, label: 'c' }));
        expect(view.container.innerHTML).toBe(
            '<div class="y" title="c"><input><button>go</button><b>1</b></div>'
        );
        expect(view.container.querySelector('button')).toBe(button);
        button.click();
        expect(clicks).toEqual(['b', 'c']);
        await act(async () => bump());
        expect(view.container.querySelector('b')?.textContent).toBe('2');
    });

    it('keeps an unkeyed component at the same position when its sibling turns from text into an element', async () => {
        let bump!: () => void;
        function Counter(): unknown {
            const [n, setN] = useState(0);
            bump = () => setN((v) => v + 1);
            return h('b', null, n);
        }
        function Row({ rich }: { rich: boolean }): unknown {
            return h(
                'p',
                null,
                h('i', null, 'a'),
                rich ? h('em', null, 'e') : 'plain',
                h(Counter, null)
            );
        }
        const view = mount(h(Row, { rich: false }));
        await act(async () => bump());
        view.render(h(Row, { rich: true }));
        expect(view.container.innerHTML).toBe('<p><i>a</i><em>e</em><b>1</b></p>');
    });

    it('renders two text children of one element and a host beside text', () => {
        function Title({ id }: { id: string }): unknown {
            return h(
                'section',
                null,
                h('h1', null, 'user ', id),
                h('p', null, h('i', null, 'a'), 'b')
            );
        }
        const view = mount(h(Title, { id: '7' }));
        expect(view.container.innerHTML).toBe('<section><h1>user 7</h1><p><i>a</i>b</p></section>');
        view.render(h(Title, { id: '8' }));
        expect(view.container.querySelector('h1')?.textContent).toBe('user 8');
    });

    it('renders inner html on a nested element', () => {
        function Note({ html }: { html: string }): unknown {
            return h('div', null, h('p', { dangerouslySetInnerHTML: { __html: html } }));
        }
        const view = mount(h(Note, { html: '<em>a</em>' }));
        view.render(h(Note, { html: '<em>b</em>' }));
        expect(view.container.innerHTML).toBe('<div><p><em>b</em></p></div>');
    });

    it('templates children with fixed keys and still reorders a same-length keyed list', () => {
        function Card({ title, tags }: { title: string; tags: readonly string[] }): unknown {
            return h(
                'div',
                { className: 'card' },
                h('h3', { key: 'h' }, title),
                h(
                    'div',
                    { key: 't' },
                    tags.map((tag) => h('span', { key: tag }, tag))
                )
            );
        }
        const view = mount(h(Card, { title: 'a', tags: ['x', 'y'] }));
        const y = view.container.querySelectorAll('span')[1];
        view.render(h(Card, { title: 'b', tags: ['y', 'x'] }));
        expect(view.container.innerHTML).toBe(
            '<div class="card"><h3>b</h3><div><span>y</span><span>x</span></div></div>'
        );
        expect(view.container.querySelectorAll('span')[0]).toBe(y);
        view.render(h(Card, { title: 'c', tags: ['y', 'x', 'z'] }));
        expect(view.container.querySelector('.card > div')?.innerHTML).toBe(
            '<span>y</span><span>x</span><span>z</span>'
        );
        expect(Object.getOwnPropertySymbols(Card)).toHaveLength(1);
    });
});
