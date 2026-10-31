// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
    act,
    Component,
    createElement as h,
    createPortal,
    createRoot,
    flushSync,
    lazy,
    PureComponent,
    Suspense,
    useState,
} from '../index';

function mount(element: unknown): HTMLElement {
    const host = document.createElement('div');
    document.body.appendChild(host);
    createRoot(host).render(element);
    return host;
}

describe('class components', () => {
    it('renders, sets state and runs the lifecycle in order', async () => {
        const log: string[] = [];
        let counter!: Counter;
        class Counter extends Component<{ step: number }, { n: number }> {
            state = { n: 0 };
            constructor(props: { step: number }) {
                super(props);
                // eslint-disable-next-line @typescript-eslint/no-this-alias
                counter = this;
            }
            componentDidMount(): void {
                log.push('mount ' + this.state.n);
            }
            componentDidUpdate(_props: unknown, state: { n: number }): void {
                log.push('update ' + state.n + '->' + this.state.n);
            }
            componentWillUnmount(): void {
                log.push('unmount');
            }
            render(): unknown {
                return h('b', null, this.state.n);
            }
        }
        let hide!: () => void;
        function Shell() {
            const [shown, set] = useState(true);
            hide = () => set(false);
            return shown ? h(Counter, { step: 1 }) : null;
        }
        const host = mount(h(Shell));
        await act(() => counter.setState((s) => ({ n: s.n + 2 })));
        expect(host.textContent).toBe('2');
        await act(() => hide());
        expect(log).toEqual(['mount 0', 'update 0->2', 'unmount']);
    });

    it('PureComponent skips a render when props and state are shallow-equal', async () => {
        let renders = 0;
        class Leaf extends PureComponent<{ v: number }> {
            render(): unknown {
                renders++;
                return h('i', null, this.props.v);
            }
        }
        let bump!: () => void;
        function Parent() {
            const [n, set] = useState(0);
            bump = () => set((x) => x + 1);
            return h('p', null, n, h(Leaf, { v: 1 }));
        }
        mount(h(Parent));
        await act(() => bump());
        expect(renders).toBe(1);
    });

    it('an error boundary catches a child that throws and renders its fallback', () => {
        const caught: string[] = [];
        class Boundary extends Component<{ children?: unknown }, { failed: boolean }> {
            state = { failed: false };
            static getDerivedStateFromError(): { failed: boolean } {
                return { failed: true };
            }
            componentDidCatch(error: unknown): void {
                caught.push((error as Error).message);
            }
            render(): unknown {
                return this.state.failed ? h('em', null, 'fallback') : this.props.children;
            }
        }
        function Bomb(): unknown {
            throw new Error('boom');
        }
        const host = mount(h(Boundary, null, h('span', null, 'ok'), h(Bomb)));
        expect(host.innerHTML).toBe('<em>fallback</em>');
        expect(caught).toEqual(['boom']);
    });
});

describe('portals, flushSync, lazy', () => {
    it('renders a portal into another container and removes it with its owner', async () => {
        const modal = document.createElement('aside');
        document.body.appendChild(modal);
        let close!: () => void;
        function Page() {
            const [open, set] = useState(true);
            close = () => set(false);
            return h('main', null, 'page', open && createPortal(h('dialog', null, 'hi'), modal));
        }
        const host = mount(h(Page));
        expect(host.innerHTML).toBe('<main>page</main>');
        expect(modal.innerHTML).toBe('<dialog>hi</dialog>');
        await act(() => close());
        expect(modal.innerHTML).toBe('');
    });

    it('flushSync applies an update before it returns', () => {
        let set!: (n: number) => void;
        function Box() {
            const [n, setN] = useState(0);
            set = setN;
            return h('b', null, n);
        }
        const host = mount(h(Box));
        flushSync(() => set(5));
        expect(host.textContent).toBe('5');
    });

    it('lazy shows the Suspense fallback, then the loaded component', async () => {
        let resolve!: (module: { default: (props: { name: string }) => unknown }) => void;
        const Hello = lazy<{ name: string }>(
            () =>
                new Promise((done) => {
                    resolve = done;
                })
        );
        const host = mount(h(Suspense, { fallback: h('i', null, '…') }, h(Hello, { name: 'x' })));
        await act(() => Promise.resolve());
        expect(host.innerHTML).toBe('<i>…</i>');
        await act(async () => {
            resolve({ default: ({ name }) => h('b', null, 'hello ' + name) });
            await new Promise((done) => setTimeout(done, 0));
        });
        await act(() => Promise.resolve());
        expect(host.innerHTML).toBe('<b>hello x</b>');
    });
});
