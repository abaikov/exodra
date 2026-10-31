// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
    act,
    Component,
    createContext,
    createElement as h,
    createRoot,
    findDOMNode,
    Profiler,
    startTransition,
    Suspense,
    use,
    useActionState,
    useContext,
    useDeferredValue,
    useInsertionEffect,
    useLayoutEffect,
    useOptimistic,
    useState,
    useTransition,
} from '../index';
import { renderToString } from '../server';

function mount(element: unknown): HTMLElement {
    const host = document.createElement('div');
    document.body.appendChild(host);
    createRoot(host).render(element);
    return host;
}

const tick = (ms = 5): Promise<void> => new Promise((done) => setTimeout(done, ms));

describe('synthetic events', () => {
    it('hands a handler nativeEvent, persist and the React checks', async () => {
        const seen: Record<string, unknown> = {};
        function Button() {
            return h('button', {
                onClick: (e: Event & Record<string, unknown>) => {
                    seen.native = (e.nativeEvent as Event).type;
                    seen.persist = typeof e.persist;
                    (e.preventDefault as () => void)();
                    seen.prevented = (e.isDefaultPrevented as () => boolean)();
                    seen.current = (e.currentTarget as Element).tagName;
                    seen.clientX = e.clientX;
                },
            });
        }
        const host = mount(h(Button));
        await act(() =>
            host
                .querySelector('button')!
                .dispatchEvent(
                    new MouseEvent('click', { bubbles: true, cancelable: true, clientX: 7 })
                )
        );
        expect(seen).toEqual({
            native: 'click',
            persist: 'function',
            prevented: true,
            current: 'BUTTON',
            clientX: 7,
        });
    });
});

describe('transitions', () => {
    it('startTransition defers its update past the microtask a plain update commits in', async () => {
        let set!: (n: number) => void;
        function Box() {
            const [n, setN] = useState(0);
            set = setN;
            return h('b', null, n);
        }
        const host = mount(h(Box));
        startTransition(() => set(5));
        await Promise.resolve();
        expect(host.textContent).toBe('0');
        await tick();
        expect(host.textContent).toBe('5');
    });

    it('useTransition reports pending until the deferred update lands', async () => {
        let start!: (run: () => void) => void;
        let set!: (n: number) => void;
        function Box() {
            const [pending, begin] = useTransition();
            const [n, setN] = useState(0);
            start = begin;
            set = setN;
            return h('b', null, `${pending ? 'pending' : 'idle'} ${n}`);
        }
        const host = mount(h(Box));
        start(() => set(3));
        await Promise.resolve();
        await Promise.resolve();
        expect(host.textContent).toBe('pending 0');
        await tick();
        expect(host.textContent).toBe('idle 3');
    });

    it('useDeferredValue shows the old value first, then the new one', async () => {
        let set!: (v: string) => void;
        const seen: string[] = [];
        function Box() {
            const [value, setValue] = useState('a');
            set = setValue;
            const deferred = useDeferredValue(value);
            seen.push(`${value}/${deferred}`);
            return h('b', null, deferred);
        }
        const host = mount(h(Box));
        await act(() => set('b'));
        expect(seen).toContain('b/a');
        await tick();
        await act(() => Promise.resolve());
        expect(host.textContent).toBe('b');
    });
});

describe('effects and hooks React added', () => {
    it('runs insertion effects before layout effects', async () => {
        const log: string[] = [];
        function Box() {
            useLayoutEffect(() => {
                log.push('layout');
            }, []);
            useInsertionEffect(() => {
                log.push('insertion');
            }, []);
            return null;
        }
        await act(() => mount(h(Box)));
        expect(log).toEqual(['insertion', 'layout']);
    });

    it('useOptimistic shows the optimistic value until the base state moves', async () => {
        let add!: (n: number) => void;
        let commit!: (n: number) => void;
        function Box() {
            const [base, setBase] = useState(1);
            const [shown, addOptimistic] = useOptimistic(
                base,
                (state: number, n: number) => state + n
            );
            add = addOptimistic;
            commit = setBase;
            return h('b', null, shown);
        }
        const host = mount(h(Box));
        await act(() => add(10));
        expect(host.textContent).toBe('11');
        await act(() => commit(2));
        expect(host.textContent).toBe('2');
    });

    it('useActionState runs sync and async actions with a pending flag', async () => {
        let dispatch!: (n: number) => void;
        let resolve!: () => void;
        function Box() {
            const [total, run, pending] = useActionState(async (state: number, n: number) => {
                await new Promise<void>((done) => {
                    resolve = done;
                });
                return state + n;
            }, 0);
            dispatch = run;
            return h('b', null, `${total}${pending ? '…' : ''}`);
        }
        const host = mount(h(Box));
        await act(() => dispatch(4));
        expect(host.textContent).toBe('0…');
        await act(async () => {
            resolve();
            await tick();
        });
        expect(host.textContent).toBe('4');
    });

    it('passes getSnapshotBeforeUpdate to componentDidUpdate, and findDOMNode finds the element', async () => {
        const snapshots: unknown[] = [];
        let instance!: Counter;
        class Counter extends Component<Record<string, never>, { n: number }> {
            state = { n: 0 };
            componentDidMount(): void {
                // eslint-disable-next-line @typescript-eslint/no-this-alias
                instance = this;
            }
            getSnapshotBeforeUpdate(): unknown {
                return (findDOMNode(this) as Element).textContent;
            }
            componentDidUpdate(_p: unknown, _s: unknown, snapshot?: unknown): void {
                snapshots.push(snapshot);
            }
            render(): unknown {
                return h('i', null, this.state.n);
            }
        }
        await act(() => mount(h(Counter)));
        await act(() => instance.setState({ n: 1 }));
        expect(snapshots).toEqual(['0']);
        expect((findDOMNode(instance) as Element).tagName).toBe('I');
    });

    it('Profiler renders its children', () => {
        const host = mount(h(Profiler, { id: 'p' }, h('em', null, 'x')));
        expect(host.innerHTML).toBe('<em>x</em>');
    });
});

describe('Suspense keeps shown content when it suspends again', () => {
    it('hides the content instead of unmounting it, so its state survives', async () => {
        let make!: () => void;
        let resolve!: () => void;
        let pending: Promise<void> | null = null;
        let bump!: () => void;
        function Counter() {
            const [n, set] = useState(0);
            bump = () => set((v) => v + 1);
            return h('b', null, n);
        }
        function Gate() {
            const [waiting, setWaiting] = useState(false);
            make = () => {
                pending = new Promise<void>((done) => {
                    resolve = done;
                });
                setWaiting(true);
            };
            if (waiting && pending !== null) use(pending);
            return null;
        }
        let host!: HTMLElement;
        await act(() => {
            host = mount(h(Suspense, { fallback: h('i', null, 'wait') }, h(Counter), h(Gate)));
        });
        await act(() => bump());
        expect(host.innerHTML).toBe('<b>1</b>');
        await act(() => make());
        expect(host.innerHTML).toBe('<i>wait</i><b style="display: none;">1</b>');
        await act(async () => {
            resolve();
            await tick();
        });
        await act(() => Promise.resolve());
        expect(host.innerHTML).toBe('<b style="">1</b>');
    });
});

describe('react-dom/server', () => {
    it('renders hooks, context, classes and props to a string', () => {
        const Theme = createContext('light');
        function Label({ text }: { text: string }) {
            const [n] = useState(3);
            return h(
                'span',
                { className: 'l', 'data-n': n, style: { marginTop: 4 } },
                text,
                ' ',
                useContext(Theme)
            );
        }
        class Box extends Component<{ children?: unknown }> {
            render(): unknown {
                return h('div', { id: 'b' }, this.props.children);
            }
        }
        const html = renderToString(
            h(
                Theme.Provider,
                { value: 'dark' },
                h(
                    Box,
                    null,
                    h(Label, { text: 'a<b' }),
                    h('input', { disabled: true, onClick: () => 0 })
                )
            )
        );
        expect(html).toBe(
            '<div id="b"><span class="l" data-n="3" style="margin-top:4px">a&lt;b dark</span><input disabled=""/></div>'
        );
    });
});
