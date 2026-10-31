// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
    act,
    Children,
    cloneElement,
    createContext,
    createElement as h,
    createRoot,
    Fragment,
    memo,
    forwardRef,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useReducer,
    useRef,
    useState,
    useSyncExternalStore,
} from '../index';

function mount(element: unknown): { host: HTMLElement; root: ReturnType<typeof createRoot> } {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    root.render(element);
    return { host, root };
}

describe('host elements and text', () => {
    it('renders a host tree with attributes, styles and text', () => {
        const { host } = mount(
            h(
                'section',
                { className: 'app', id: 'a', style: { marginTop: 4, opacity: 0.5 } },
                h('h1', null, 'Hello ', 'world'),
                h('input', { type: 'text', value: 'x', readOnly: true }),
                h('label', { htmlFor: 'a' }, 7)
            )
        );
        const section = host.firstChild as HTMLElement;
        expect(section.className).toBe('app');
        expect(section.style.marginTop).toBe('4px');
        expect(section.style.opacity).toBe('0.5');
        expect(host.querySelector('h1')?.textContent).toBe('Hello world');
        expect((host.querySelector('input') as HTMLInputElement).value).toBe('x');
        expect(host.querySelector('label')?.getAttribute('for')).toBe('a');
        expect(host.querySelector('label')?.textContent).toBe('7');
    });

    it('renders nothing for null, false and true, and a fragment flat', () => {
        const { host } = mount(h(Fragment, null, null, false, true, h('b', null, 'x'), 'y'));
        expect(host.innerHTML).toBe('<b>x</b>y');
    });
});

describe('state, events and re-render', () => {
    it('re-renders a component on setState and keeps the same DOM nodes', async () => {
        function Counter() {
            const [n, setN] = useState(0);
            return h(
                'div',
                null,
                h('span', null, n),
                h('button', { onClick: () => setN((v) => v + 1) }, '+')
            );
        }
        const { host } = mount(h(Counter));
        const span = host.querySelector('span') as HTMLElement;
        const button = host.querySelector('button') as HTMLButtonElement;
        await act(() => button.click());
        await act(() => button.click());
        expect(span.textContent).toBe('2');
        expect(host.querySelector('span')).toBe(span);
        expect(host.querySelector('button')).toBe(button);
    });

    it('batches several updates into one render', async () => {
        let renders = 0;
        let bump!: () => void;
        function Batch() {
            renders++;
            const [a, setA] = useState(0);
            const [b, setB] = useState(0);
            bump = () => {
                setA(1);
                setB(2);
            };
            return h('p', null, a + b);
        }
        const { host } = mount(h(Batch));
        await act(() => bump());
        expect(renders).toBe(2);
        expect(host.textContent).toBe('3');
    });

    it('useReducer dispatches through the current reducer', async () => {
        let dispatch!: (action: string) => void;
        function Tally() {
            const [state, send] = useReducer(
                (s: number, action: string) => (action === 'inc' ? s + 1 : s - 1),
                10
            );
            dispatch = send;
            return h('i', null, state);
        }
        const { host } = mount(h(Tally));
        await act(() => {
            dispatch('inc');
            dispatch('inc');
            dispatch('dec');
        });
        expect(host.textContent).toBe('11');
    });
});

describe('lists by key', () => {
    it('moves keyed rows instead of rebuilding them', async () => {
        let setItems!: (items: string[]) => void;
        function List() {
            const [items, set] = useState(['a', 'b', 'c']);
            setItems = set;
            return h(
                'ul',
                null,
                items.map((item) => h('li', { key: item }, item))
            );
        }
        const { host } = mount(h(List));
        const before = Array.from(host.querySelectorAll('li'));
        await act(() => setItems(['c', 'a', 'd', 'b']));
        const after = Array.from(host.querySelectorAll('li'));
        expect(after.map((li) => li.textContent)).toEqual(['c', 'a', 'd', 'b']);
        expect(after[0]).toBe(before[2]);
        expect(after[1]).toBe(before[0]);
        expect(after[3]).toBe(before[1]);
        await act(() => setItems([]));
        expect(host.querySelectorAll('li')).toHaveLength(0);
    });

    it('places component rows that render fragments in order', async () => {
        function Pair({ id }: { id: string }) {
            return h(Fragment, null, h('dt', null, id), h('dd', null, id + '!'));
        }
        let setIds!: (ids: string[]) => void;
        function Dl() {
            const [ids, set] = useState(['x', 'y']);
            setIds = set;
            return h(
                'dl',
                null,
                h('dt', null, 'head'),
                ids.map((id) => h(Pair, { key: id, id })),
                h('dd', null, 'tail')
            );
        }
        const { host } = mount(h(Dl));
        expect(host.querySelector('dl')?.textContent).toBe('headxx!yy!tail');
        await act(() => setIds(['y', 'z', 'x']));
        expect(host.querySelector('dl')?.textContent).toBe('headyy!zz!xx!tail');
        await act(() => setIds(['z']));
        expect(host.querySelector('dl')?.textContent).toBe('headzz!tail');
    });

    it('toggles a conditional between siblings', async () => {
        let toggle!: () => void;
        function Panel() {
            const [open, setOpen] = useState(false);
            toggle = () => setOpen((v) => !v);
            return h(
                'div',
                null,
                h('h2', null, 'T'),
                open && h('p', null, 'body'),
                h('footer', null, 'F')
            );
        }
        const { host } = mount(h(Panel));
        expect(host.innerHTML).toBe('<div><h2>T</h2><footer>F</footer></div>');
        await act(() => toggle());
        expect(host.innerHTML).toBe('<div><h2>T</h2><p>body</p><footer>F</footer></div>');
        await act(() => toggle());
        expect(host.innerHTML).toBe('<div><h2>T</h2><footer>F</footer></div>');
    });

    it('a child component updating itself lands in its own place', async () => {
        const setters: ((n: number) => void)[] = [];
        function Cell({ i }: { i: number }) {
            const [n, setN] = useState(1);
            setters[i] = setN;
            return h(
                Fragment,
                null,
                Array.from({ length: n }, (_, k) => h('i', { key: k }, i))
            );
        }
        const { host } = mount(
            h('p', null, h(Cell, { i: 0 }), h(Cell, { i: 1 }), h(Cell, { i: 2 }))
        );
        await act(() => setters[1](3));
        expect(host.textContent).toBe('01112');
        await act(() => setters[0](0));
        expect(host.textContent).toBe('1112');
    });
});

describe('effects, refs, context, memo', () => {
    it('runs layout then passive effects, cleans up on change and on unmount', async () => {
        const log: string[] = [];
        let setDep!: (n: number) => void;
        function Fx() {
            const [dep, set] = useState(0);
            setDep = set;
            useLayoutEffect(() => {
                log.push('layout ' + dep);
                return () => log.push('layout-clean ' + dep);
            }, [dep]);
            useEffect(() => {
                log.push('effect ' + dep);
                return () => log.push('clean ' + dep);
            }, [dep]);
            return h('b', null, dep);
        }
        let root!: ReturnType<typeof createRoot>;
        await act(() => {
            root = mount(h(Fx)).root;
        });
        expect(log).toEqual(['layout 0', 'effect 0']);
        await act(() => setDep(1));
        expect(log.slice(2)).toEqual(['layout-clean 0', 'layout 1', 'clean 0', 'effect 1']);
        await act(() => root.unmount());
        expect(log.slice(6).sort()).toEqual(['clean 1', 'layout-clean 1']);
    });

    it('hands a ref the element after it is placed, and null on removal', async () => {
        const seen: (Element | null)[] = [];
        let attached = false;
        let hide!: () => void;
        function Box() {
            const [shown, set] = useState(true);
            hide = () => set(false);
            const ref = useCallback((el: Element | null) => {
                seen.push(el);
                if (el !== null) attached = el.isConnected;
            }, []);
            return shown ? h('div', { ref, className: 'box' }) : null;
        }
        mount(h(Box));
        expect(seen[0]?.className).toBe('box');
        expect(attached).toBe(true);
        await act(() => hide());
        expect(seen[1]).toBe(null);
    });

    it('useRef and forwardRef reach the element', () => {
        const Input = forwardRef((props: { label: string }, ref: unknown) =>
            h('input', { ref, 'aria-label': props.label })
        );
        let captured!: { current: HTMLInputElement | null };
        function Form() {
            captured = useRef<HTMLInputElement | null>(null);
            return h(Input, { label: 'name', ref: captured });
        }
        mount(h(Form));
        expect(captured.current?.getAttribute('aria-label')).toBe('name');
    });

    it('context reaches consumers, and a provider change re-renders a memoized consumer', async () => {
        const Theme = createContext('light');
        let renders = 0;
        const Badge = memo(function Badge() {
            renders++;
            return h('em', null, useContext(Theme));
        });
        let setTheme!: (theme: string) => void;
        function App() {
            const [theme, set] = useState('dark');
            setTheme = set;
            return h(Theme.Provider, { value: theme }, h('div', null, h(Badge)));
        }
        const { host } = mount(h('main', null, h(App), h(Badge)));
        expect(host.textContent).toBe('darklight');
        await act(() => setTheme('blue'));
        expect(host.textContent).toBe('bluelight');
        expect(renders).toBe(3);
    });

    it('memo skips a re-render when props are shallow-equal', async () => {
        let inner = 0;
        const Leaf = memo(function Leaf({ v }: { v: number }) {
            inner++;
            return h('u', null, v);
        });
        let bump!: () => void;
        function Parent() {
            const [n, setN] = useState(0);
            bump = () => setN((x) => x + 1);
            const v = useMemo(() => 5, []);
            return h('div', null, n, h(Leaf, { v }));
        }
        mount(h(Parent));
        await act(() => bump());
        expect(inner).toBe(1);
    });
});

describe('controlled input and element utilities', () => {
    it('keeps a controlled input at its state when the handler rejects the edit', async () => {
        function Upper() {
            const [value, setValue] = useState('AB');
            return h('input', {
                value,
                onChange: (e: Event) =>
                    setValue((e.target as HTMLInputElement).value.toUpperCase()),
            });
        }
        const { host } = mount(h(Upper));
        const input = host.querySelector('input') as HTMLInputElement;
        input.value = 'abc';
        await act(() => input.dispatchEvent(new Event('input', { bubbles: true })));
        await act(() => Promise.resolve());
        expect(input.value).toBe('ABC');
    });

    it('Children.map and cloneElement work on component elements', () => {
        function Tabs({ children }: { children?: unknown }) {
            return h(
                'nav',
                null,
                Children.map(children, (child, i) =>
                    cloneElement(child as never, { active: i === 1 })
                )
            );
        }
        function Tab({ label, active }: { label: string; active?: boolean }) {
            return h('a', { className: active ? 'on' : 'off' }, label);
        }
        const { host } = mount(h(Tabs, null, h(Tab, { label: 'one' }), h(Tab, { label: 'two' })));
        expect(host.innerHTML).toBe('<nav><a class="off">one</a><a class="on">two</a></nav>');
    });
});

describe('commit order', () => {
    it('attaches refs before layout effects, and runs a child effect before its parent', async () => {
        const log: string[] = [];
        function Child() {
            useLayoutEffect(() => {
                log.push('child layout');
            }, []);
            useEffect(() => {
                log.push('child effect');
            }, []);
            return h('i');
        }
        function Parent() {
            const ref = useRef<HTMLInputElement | null>(null);
            useLayoutEffect(() => {
                log.push('parent layout ' + (ref.current?.tagName ?? 'null'));
            }, []);
            useEffect(() => {
                log.push('parent effect');
            }, []);
            return h('div', null, h('input', { ref }), h(Child));
        }
        await act(() => mount(h(Parent)));
        expect(log).toEqual([
            'child layout',
            'parent layout INPUT',
            'child effect',
            'parent effect',
        ]);
    });

    it('useSyncExternalStore sees a change made before it subscribed', async () => {
        let value = 1;
        const listeners = new Set<() => void>();
        const subscribe = (listener: () => void) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        };
        function Reader() {
            return h(
                'b',
                null,
                useSyncExternalStore(subscribe, () => value)
            );
        }
        function Writer() {
            useLayoutEffect(() => {
                value = 2;
            }, []);
            return null;
        }
        const { host } = mount(h('p', null, h(Reader), h(Writer)));
        await act(() => Promise.resolve());
        expect(host.textContent).toBe('2');
        await act(() => {
            value = 3;
            listeners.forEach((listener) => listener());
        });
        expect(host.textContent).toBe('3');
    });

    it('a memoized consumer shows the new context value in the same commit as the provider', async () => {
        const Theme = createContext('a');
        const seen: string[] = [];
        const Badge = memo(function Badge() {
            return h('em', null, useContext(Theme));
        });
        let setTheme!: (theme: string) => void;
        function App() {
            const [theme, set] = useState('a');
            const box = useRef<HTMLElement | null>(null);
            setTheme = set;
            useLayoutEffect(() => {
                seen.push(box.current?.querySelector('em')?.textContent ?? '');
            });
            return h(Theme.Provider, { value: theme }, h('div', { ref: box }, h(Badge)));
        }
        mount(h(App));
        await act(() => setTheme('b'));
        expect(seen).toEqual(['a', 'b']);
    });

    it('a component that throws does not freeze the others scheduled with it', async () => {
        let fail = false;
        let bumpBroken!: () => void;
        let bumpFine!: () => void;
        function Broken() {
            const [n, set] = useState(0);
            bumpBroken = () => set(n + 1);
            if (fail) throw new Error('boom');
            return h('s', null, n);
        }
        function Fine() {
            const [n, set] = useState(0);
            bumpFine = () => set((v) => v + 1);
            return h('u', null, n);
        }
        const { host } = mount(h('p', null, h(Broken), h(Fine)));
        fail = true;
        await expect(
            act(() => {
                bumpBroken();
                bumpFine();
            })
        ).rejects.toThrow('boom');
        fail = false;
        await act(() => bumpFine());
        expect(host.querySelector('u')?.textContent).toBe('2');
    });
});

describe('passive effects wait for the paint', () => {
    it('runs useEffect after render returns, and act() flushes it', async () => {
        const log: string[] = [];
        function Fx() {
            useEffect(() => {
                log.push('effect');
            }, []);
            useLayoutEffect(() => {
                log.push('layout');
            }, []);
            return null;
        }
        mount(h(Fx));
        expect(log).toEqual(['layout']);
        await new Promise((done) => setTimeout(done, 10));
        expect(log).toEqual(['layout', 'effect']);
    });
});

describe('a region that holds a lone string', () => {
    it('moves between text, an element, text again and nothing, keeping its siblings in place', async () => {
        let show!: (value: unknown) => void;
        function Box() {
            const [value, set] = useState<unknown>('one');
            show = set;
            return h('p', null, h('i', null, 'a'), value, h('b', null, 'z'));
        }
        const { host } = mount(h(Box));
        const p = host.firstChild as HTMLElement;
        expect(p.innerHTML).toBe('<i>a</i>one<b>z</b>');
        await act(() => show(2));
        expect(p.innerHTML).toBe('<i>a</i>2<b>z</b>');
        await act(() => show(h('u', null, 'el')));
        expect(p.innerHTML).toBe('<i>a</i><u>el</u><b>z</b>');
        await act(() => show('back'));
        expect(p.innerHTML).toBe('<i>a</i>back<b>z</b>');
        await act(() => show(null));
        expect(p.innerHTML).toBe('<i>a</i><b>z</b>');
        await act(() => show('again'));
        expect(p.innerHTML).toBe('<i>a</i>again<b>z</b>');
    });
});
