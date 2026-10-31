// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
    act,
    cloneElement,
    createElement as h,
    createPortal,
    createRoot,
    Suspense,
    use,
    useState,
} from '../index';

function mount(element: unknown): HTMLElement {
    const host = document.createElement('div');
    document.body.appendChild(host);
    createRoot(host).render(element);
    return host;
}

describe('Suspense on a thrown promise', () => {
    it('shows the fallback while use() waits, then the content', async () => {
        let resolve!: (value: string) => void;
        const pending = new Promise<string>((done) => {
            resolve = done;
        });
        function Name() {
            return h('b', null, use(pending));
        }
        let host!: HTMLElement;
        await act(() => {
            host = mount(h(Suspense, { fallback: h('i', null, 'loading') }, h('p', null, h(Name))));
        });
        expect(host.innerHTML).toBe('<i>loading</i>');
        await act(async () => {
            resolve('Ada');
            await pending;
        });
        await act(() => Promise.resolve());
        expect(host.innerHTML).toBe('<p><b>Ada</b></p>');
    });

    it('a suspension with no boundary is an error', () => {
        function Never() {
            return use(new Promise(() => undefined));
        }
        expect(() => mount(h(Never))).toThrow(/no <Suspense> above it/);
    });
});

describe('portals keep React order in a shared container', () => {
    it('appends a later child of the first portal after the second, as React 18 does', async () => {
        const box = document.createElement('div');
        document.body.appendChild(box);
        let setA!: (n: number) => void;
        function A() {
            const [n, set] = useState(1);
            setA = set;
            return createPortal(
                Array.from({ length: n }, (_, i) => h('a', { key: i }, 'a' + i)),
                box
            );
        }
        function B() {
            return createPortal(h('b', null, 'b'), box);
        }
        await act(() => mount(h('main', null, h(A), h(B))));
        await act(() => setA(2));
        expect(box.innerHTML).toBe('<a>a0</a><b>b</b><a>a1</a>');
    });
});

describe('cloneElement keeps working on plain host elements', () => {
    it('clones a tag element with merged props', () => {
        const host = mount(
            cloneElement(h('a', { className: 'x', href: '#' }, 'go'), { className: 'y' })
        );
        expect(host.innerHTML).toBe('<a class="y" href="#">go</a>');
    });
});
