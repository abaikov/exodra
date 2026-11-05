export const EXO_REACT_RUNTIME = `import { createContext, createElement, useContext, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ComponentType, ReactElement, ReactNode } from 'react';

export type TExoPortKind = 'attr' | 'text' | 'event' | 'children' | 'ref' | 'html';
export type TExoAttrPort = string & { readonly exoPortKind?: 'attr' };
export type TExoTextPort = string & { readonly exoPortKind?: 'text' };
export type TExoHtmlPort = string & { readonly exoPortKind?: 'html' };
export type TExoChildrenPort = string & { readonly exoPortKind?: 'children' };
export type TExoEventPort<TEvent = Event> = string & { readonly exoPortKind?: 'event'; readonly exoEvent?: TEvent };
export type TExoRefPort<TElement = Element> = string & { readonly exoPortKind?: 'ref'; readonly exoElement?: TElement };
export type TExoAnyPort = string;

export type TExoReactElementPorts = {
    readonly ref: string | null;
    readonly props: readonly (readonly [string, string])[];
};

export type TExoReactView = {
    text(port: string): string | null;
    attr(port: string): unknown;
    flag(port: string): boolean;
    className(port: string): string | undefined;
    style(port: string): Record<string, string> | undefined;
    html(port: string): { __html: string };
    children(port: string): ReactNode[];
    on(port: string): (event: { readonly nativeEvent: Event }) => void;
    element(at: number): (element: Element | null) => void;
};

export type TExoReactSchema<TPorts = unknown> = {
    readonly ports: TPorts;
    readonly kinds: Readonly<Record<string, TExoPortKind>>;
    readonly elements: readonly TExoReactElementPorts[];
    render(view: TExoReactView): ReactElement;
};

export type TExoMachineHandler = {
    readonly port: unknown;
    run(event: unknown, enode?: unknown): void;
};

export type TExoMachineEffect<TWiring = unknown> = {
    readonly at: number;
    start(enode: TWiring): (() => void) | null | undefined | void;
};

export type TExoMachine<TWiring = unknown, TPorts = unknown, TParams = unknown, TState = unknown> = {
    readonly declaration: TExoReactSchema<TPorts>;
    readonly forms: unknown[];
    readonly createInitialState: ((enode: TWiring, params: TParams) => TState) | null;
    wire?(enode: TWiring, params: TParams): void;
    readonly effects: readonly TExoMachineEffect<TWiring>[];
    readonly handlers: readonly TExoMachineHandler[];
    readonly exoState?: TState;
};

type TExoTransitionRun = (enode: TExoReactNode, ...data: never[]) => void;

export type TExoMachineTransitions<TWiring, TData extends Record<string, readonly unknown[]>> = {
    readonly [K in keyof TData]: (enode: TWiring, ...data: TData[K]) => void;
};

export type TExoTransitionOverrides = readonly (((...args: never[]) => void) | undefined)[];

export type TExoTransitionReplacements<TWiring, TMachine extends { readonly transitions: object }> = {
    readonly [K in keyof TMachine['transitions']]?: TMachine['transitions'][K] extends (enode: never, ...data: infer TData) => void
        ? (enode: TWiring, ...data: TData) => void
        : never;
};

type TExoWireRun = (enode: TExoReactNode, params: unknown) => void;

type TExoParamsWire = TExoWireRun & { readonly aroundWire: (wire: TExoWireRun) => TExoParamsWire };

type TExoParamsEffect = {
    readonly key: (params: unknown) => unknown;
    readonly start: (enode: TExoReactNode, params: unknown) => (() => void) | null;
};

export type TExoChildList = {
    readonly size: number;
    at(i: number): TExoReactNode | undefined;
    insert(child: TExoReactNode, i?: number): void;
    attach(child: TExoReactNode, i?: number): void;
    move(from: number, to: number): void;
    remove(i: number): void;
    removeAll(): void;
    detach(i: number): TExoReactNode | undefined;
    detachAll(): readonly TExoReactNode[];
};

export type TExoChildrenReconcilerOptions<TItem> = {
    readonly key?: (item: TItem) => unknown;
    readonly skipFirst?: number;
    readonly skipLast?: number;
};

export type TExoChildrenReconciler<TItem> = (owner: TExoReactNode, port: TExoAnyPort, items: readonly TItem[]) => void;

type TExoShownRun = { keys: unknown[]; items: unknown[] | null };

export type TExoContextToken<TValue> = { readonly exoContextValue?: TValue };

export type TExoReactNode<TState = unknown> = {
    state: TState;
    serviceState: unknown;
    transitionOverrides: TExoTransitionOverrides | null;
    text(port: TExoAnyPort, value: unknown): void;
    attr(port: TExoAnyPort, value: unknown): void;
    unsafeHtml(port: TExoAnyPort, value: unknown): void;
    on<TEvent>(port: TExoEventPort<TEvent>, handler: (event: TEvent, subject?: unknown) => void, subject?: unknown): void;
    portNode<TElement = Element>(port: TExoRefPort<TElement> | TExoAnyPort): TElement;
    portChildList(port: TExoAnyPort): TExoChildList;
    createExoNode<TParams>(machine: TExoMachine<never, unknown, TParams>): TExoReactNode;
    appendChild(port: TExoAnyPort, node: TExoReactNode): void;
    insertChild(port: TExoAnyPort, node: TExoReactNode, at: number): void;
    moveChild(node: TExoReactNode, at: number): void;
    moveChild(node: TExoReactNode, port: TExoAnyPort, at?: number): void;
    removeChild(node: TExoReactNode): void;
    replaceChildren(port: TExoAnyPort): void;
    childAt(port: TExoAnyPort, at: number): TExoReactNode | undefined;
    childCount(port: TExoAnyPort): number;
    wireExoSelf(params?: unknown): void;
    one<TParams>(port: TExoAnyPort, machine: TExoMachine<never, unknown, TParams>, params?: TParams): TExoReactNode;
    list<TParams>(port: TExoAnyPort, machine: TExoMachine<never, unknown, TParams>, rows: readonly TParams[]): TExoReactNode[];
    readState(): TState;
    onTeardown(teardown: () => void): void;
    restartEffect(effect: TExoMachineEffect<never>): void;
    inject<TValue>(token: TExoContextToken<TValue>): TValue | undefined;
    provide<TValue>(token: TExoContextToken<TValue>, value: TValue): void;
    unmount(): void;
};

export type TExoMachineNode = TExoReactNode;
export type TExoDomNode = TExoReactNode;
export type TExoMachineNodeOf<TMachine> = TMachine extends TExoMachine<infer TWiring, infer _TPorts, infer _TParams, infer TState>
    ? TWiring & { state: TState }
    : never;

type TExoNodeInternals = TExoReactNode & {
    key: number;
    machine: TExoMachine;
    parent: TExoNodeInternals | null;
    placedIn: TExoChildListInternals | null;
    laidOut: boolean;
    values: Record<string, unknown>;
    instanceHandlers: Map<string, (event: unknown) => void> | null;
    lists: Map<string, TExoChildListInternals> | null;
    elements: (Element | null)[];
    teardowns: (() => void)[];
    stops: ((() => void) | null | undefined | void)[];
    started: boolean;
    disposed: boolean;
    disposing: boolean;
    provided: Map<unknown, unknown> | null;
    version: number;
    listeners: Set<() => void>;
    view: TExoReactView | null;
    services: object;
    bump(): void;
    dispatch(port: string, event: unknown): void;
    start(): void;
    stop(): void;
    dispose(): void;
};

type TExoChildListInternals = TExoChildList & {
    readonly owner: TExoNodeInternals;
    readonly items: TExoNodeInternals[];
    replace(next: TExoNodeInternals[]): void;
};

export const EXO_UNARMED_STATE: object = Object.freeze({});

const NO_SERVICES = {};
const EXO_REACT_SERVICES = createContext<object>(NO_SERVICES);
const PROTOTYPES = new WeakMap<object, object>();
const HANDLERS = new WeakMap<TExoMachine, Map<unknown, TExoMachineHandler>>();
let nextKey = 0;

export function ExoReactServices(props: { readonly value: object; readonly children?: ReactNode }): ReactElement {
    return createElement(EXO_REACT_SERVICES.Provider, { value: props.value }, props.children);
}

export function exoReactSchema<TPorts>(
    kinds: Readonly<Record<string, TExoPortKind>>,
    elements: readonly TExoReactElementPorts[],
    render: (view: TExoReactView) => ReactElement
): TExoReactSchema<TPorts> {
    const ports: Record<string, string> = {};
    for (const name of Object.keys(kinds)) ports[name] = name;
    return { ports: ports as TPorts, kinds, elements, render };
}

function handlersOf(machine: TExoMachine): Map<unknown, TExoMachineHandler> {
    let found = HANDLERS.get(machine);
    if (found === undefined) {
        found = new Map();
        for (const handler of machine.handlers) found.set(handler.port, handler);
        HANDLERS.set(machine, found);
    }
    return found;
}

function propertyOf(node: TExoNodeInternals, port: string): readonly [number, string] | null {
    const elements = node.machine.declaration.elements;
    for (let at = 0; at < elements.length; at++) {
        for (const [name, property] of elements[at].props) if (name === port) return [at, property];
    }
    return null;
}

function refOf(node: TExoNodeInternals, port: string): number {
    const elements = node.machine.declaration.elements;
    for (let at = 0; at < elements.length; at++) if (elements[at].ref === port) return at;
    return -1;
}

function writeProperty(element: Element, property: string, value: unknown): void {
    const target = element as unknown as Record<string, unknown>;
    if (property === 'value') target.value = value === null || value === undefined ? '' : String(value);
    else target[property] = Boolean(value);
}

function takeOut(child: TExoNodeInternals): void {
    const from = child.placedIn;
    if (from === null) return;
    const at = from.items.indexOf(child);
    if (at !== -1) from.items.splice(at, 1);
    child.placedIn = null;
    from.owner.bump();
}

function createChildList(owner: TExoNodeInternals): TExoChildListInternals {
    const items: TExoNodeInternals[] = [];
    const adopt = (child: TExoReactNode): TExoNodeInternals => {
        const internal = child as TExoNodeInternals;
        takeOut(internal);
        internal.parent = owner;
        internal.placedIn = list;
        return internal;
    };
    const list: TExoChildListInternals = {
        owner,
        items,
        get size() {
            return items.length;
        },
        at: (i) => items[i],
        insert(child, i = items.length) {
            items.splice(i, 0, adopt(child));
            owner.bump();
        },
        attach(child, i = items.length) {
            items.splice(i, 0, adopt(child));
            owner.bump();
        },
        move(from, to) {
            items.splice(to, 0, items.splice(from, 1)[0]);
            owner.bump();
        },
        remove(i) {
            const [child] = items.splice(i, 1);
            if (child !== undefined) {
                child.placedIn = null;
                child.dispose();
            }
            owner.bump();
        },
        removeAll() {
            const all = items.splice(0);
            for (const child of all) {
                child.placedIn = null;
                child.dispose();
            }
            owner.bump();
        },
        detach(i) {
            const [child] = items.splice(i, 1);
            if (child !== undefined) child.placedIn = null;
            owner.bump();
            return child;
        },
        detachAll() {
            const all = items.splice(0);
            for (const child of all) child.placedIn = null;
            owner.bump();
            return all;
        },
        replace(next) {
            const kept = new Set(next);
            for (const child of items) {
                if (kept.has(child)) continue;
                child.placedIn = null;
                child.dispose();
            }
            items.length = 0;
            for (const child of next) {
                if (child.placedIn !== list) takeOut(child);
                child.parent = owner;
                child.placedIn = list;
                items.push(child);
            }
            owner.bump();
        },
    };
    return list;
}

export function reconcileExoOrder<TKey, TItem>(
    kids: TExoChildList,
    shown: TKey[],
    keys: readonly TKey[],
    want: readonly TItem[],
    build: (item: TItem) => TExoReactNode
): TKey[] {
    const kept = new Map<TKey, TExoNodeInternals>();
    for (let i = 0; i < shown.length; i++) {
        const child = kids.at(i) as TExoNodeInternals | undefined;
        if (child !== undefined && !kept.has(shown[i])) kept.set(shown[i], child);
    }
    const next: TExoNodeInternals[] = [];
    for (let i = 0; i < keys.length; i++) {
        const child = kept.get(keys[i]);
        if (child !== undefined) {
            kept.delete(keys[i]);
            next.push(child);
        } else {
            next.push(build(want[i]) as TExoNodeInternals);
        }
    }
    (kids as TExoChildListInternals).replace(next);
    return keys.slice();
}

export function createExoChildrenReconciler<TItem>(
    row: TExoMachine<never, unknown, never> | ((owner: never, item: TItem) => TExoReactNode),
    options?: TExoChildrenReconcilerOptions<TItem>
): TExoChildrenReconciler<TItem> {
    const keyOf = options?.key;
    const skipFirst = options?.skipFirst ?? 0;
    const skipLast = options?.skipLast ?? 0;
    const shownByOwner = new WeakMap<object, Map<string, TExoShownRun>>();
    const build = (owner: TExoReactNode, item: TItem): TExoNodeInternals => {
        if (typeof row === 'function') return row(owner as never, item) as TExoNodeInternals;
        const node = owner.createExoNode(row);
        node.wireExoSelf(item);
        return node as TExoNodeInternals;
    };
    return (owner, port, items) => {
        let byPort = shownByOwner.get(owner);
        if (byPort === undefined) {
            byPort = new Map();
            shownByOwner.set(owner, byPort);
        }
        let run = byPort.get(port);
        if (run === undefined) {
            run = { keys: [], items: null };
            byPort.set(port, run);
        }
        const list = owner.portChildList(port) as TExoChildListInternals;
        const placed = list.items;
        const end = placed.length - skipLast;
        const kept = new Map<unknown, TExoNodeInternals>();
        for (let i = 0; i < run.keys.length; i++) {
            const child = placed[skipFirst + i];
            if (child !== undefined && skipFirst + i < end && !kept.has(run.keys[i])) kept.set(run.keys[i], child);
        }
        const keys: unknown[] = keyOf === undefined ? items.slice() : items.map(keyOf);
        const next: TExoNodeInternals[] = placed.slice(0, skipFirst);
        for (let i = 0; i < keys.length; i++) {
            const child = kept.get(keys[i]);
            if (child !== undefined) {
                kept.delete(keys[i]);
                next.push(child);
            } else {
                next.push(build(owner, items[i]));
            }
        }
        for (let i = Math.max(end, skipFirst); i < placed.length; i++) next.push(placed[i]);
        const before = run.items;
        const beforeKeys = run.keys;
        list.replace(next);
        run.keys = keys;
        if (keyOf === undefined) return;
        if (before !== null) {
            const itemOf = new Map<unknown, unknown>();
            for (let k = 0; k < beforeKeys.length; k++) itemOf.set(beforeKeys[k], before[k]);
            for (let k = 0; k < items.length; k++) {
                const was = itemOf.get(keys[k]);
                if (was !== undefined && was !== items[k]) next[skipFirst + k].wireExoSelf(items[k]);
            }
        }
        run.items = items.slice();
    };
}

function createView(node: TExoNodeInternals): TExoReactView {
    const handlers = new Map<string, (event: { readonly nativeEvent: Event }) => void>();
    const refs = new Map<number, (element: Element | null) => void>();
    return {
        text(port) {
            const value = node.values[port];
            return value === undefined || value === null ? null : String(value);
        },
        attr(port) {
            const value = node.values[port];
            if (value === null || value === undefined || value === false) return undefined;
            return value === true ? '' : value;
        },
        flag(port) {
            const value = node.values[port];
            return !(value === null || value === undefined || value === false);
        },
        className(port) {
            if (!(port in node.values)) return undefined;
            const value = node.values[port];
            return value === null || value === undefined ? '' : String(value);
        },
        style(port) {
            return exoStyleObject(node.values[port]);
        },
        html(port) {
            const value = node.values[port];
            return { __html: value === null || value === undefined ? '' : String(value) };
        },
        children(port) {
            const list = node.lists?.get(port);
            if (list === undefined) return [];
            return list.items.map((child) => createElement(ExoReactView, { key: child.key, node: child }));
        },
        on(port) {
            let handler = handlers.get(port);
            if (handler === undefined) {
                handler = (event) => node.dispatch(port, event.nativeEvent);
                handlers.set(port, handler);
            }
            return handler;
        },
        element(at) {
            let ref = refs.get(at);
            if (ref === undefined) {
                ref = (element) => {
                    node.elements[at] = element;
                    if (element === null) return;
                    for (const [port, property] of node.machine.declaration.elements[at].props) {
                        if (port in node.values) writeProperty(element, property, node.values[port]);
                    }
                };
                refs.set(at, ref);
            }
            return ref;
        },
    };
}

const NODE_METHODS: ThisType<TExoNodeInternals> & Record<string, unknown> = {
    bump() {
        this.version++;
        for (const listener of Array.from(this.listeners)) listener();
    },
    text(port: string, value: unknown) {
        this.values[port] = value;
        this.bump();
    },
    attr(port: string, value: unknown) {
        this.values[port] = value;
        const property = propertyOf(this, port);
        if (property !== null) {
            const element = this.elements[property[0]];
            if (element !== null && element !== undefined) writeProperty(element, property[1], value);
            return;
        }
        this.bump();
    },
    unsafeHtml(port: string, value: unknown) {
        this.values[port] = value;
        this.bump();
    },
    on(port: string, handler: (event: unknown, subject?: unknown) => void, subject?: unknown) {
        (this.instanceHandlers ??= new Map()).set(
            port,
            subject === undefined ? handler : (event: unknown) => handler(event, subject)
        );
    },
    dispatch(port: string, event: unknown) {
        const own = this.instanceHandlers?.get(port);
        if (own !== undefined) {
            own(event);
            return;
        }
        handlersOf(this.machine).get(port)?.run(event, this);
    },
    portNode(port: string) {
        return this.elements[refOf(this, port)] as Element;
    },
    portChildList(port: string) {
        const lists = (this.lists ??= new Map());
        let list = lists.get(port);
        if (list === undefined) {
            list = createChildList(this);
            lists.set(port, list);
        }
        return list;
    },
    createExoNode(machine: TExoMachine) {
        return createNode(machine, this, this.services);
    },
    appendChild(port: string, node: TExoReactNode) {
        this.portChildList(port).insert(node);
    },
    insertChild(port: string, node: TExoReactNode, at: number) {
        this.portChildList(port).insert(node, at);
    },
    moveChild(node: TExoReactNode, second: string | number, at?: number) {
        if (typeof second !== 'number') {
            this.portChildList(second).insert(node, at);
            return;
        }
        const list = (node as TExoNodeInternals).placedIn;
        if (list === null) throw new Error('moveChild: the node is not in a children port; place it with appendChild or insertChild.');
        list.insert(node, second);
    },
    removeChild(node: TExoReactNode) {
        takeOut(node as TExoNodeInternals);
    },
    replaceChildren(port: string) {
        this.portChildList(port).removeAll();
    },
    childAt(port: string, at: number) {
        return this.lists?.get(port)?.items[at];
    },
    childCount(port: string) {
        return this.lists?.get(port)?.items.length ?? 0;
    },
    wireExoSelf(params?: unknown) {
        wireExoNode(this, params);
    },
    one(port: string, machine: TExoMachine, params?: unknown) {
        const child = createNode(machine, this, this.services);
        armNode(child, params);
        this.portChildList(port).insert(child);
        return child;
    },
    list(port: string, machine: TExoMachine, rows: readonly unknown[]) {
        const list = this.portChildList(port);
        return rows.map((row) => {
            const child = createNode(machine, this, this.services);
            armNode(child, row);
            list.insert(child);
            return child;
        });
    },
    readState() {
        return this.state;
    },
    onTeardown(teardown: () => void) {
        this.teardowns.push(teardown);
    },
    restartEffect(effect: TExoMachineEffect<never>) {
        if (!this.started) return;
        const stop = this.stops[effect.at];
        if (typeof stop === 'function') stop();
        this.stops[effect.at] = effect.start(this as never);
    },
    inject(token: unknown) {
        for (let node: TExoNodeInternals | null = this; node !== null; node = node.parent) {
            if (node.provided !== null && node.provided.has(token)) return node.provided.get(token);
        }
        return undefined;
    },
    provide(token: unknown, value: unknown) {
        (this.provided ??= new Map()).set(token, value);
    },
    start() {
        if (this.started || this.disposed || this.state === EXO_UNARMED_STATE) return;
        this.started = true;
        const effects = this.machine.effects;
        for (let i = 0; i < effects.length; i++) this.stops[effects[i].at] = effects[i].start(this as never);
    },
    stop() {
        if (!this.started) return;
        this.started = false;
        const stops = this.stops.splice(0);
        for (const stop of stops) if (typeof stop === 'function') stop();
    },
    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.stop();
        if (this.lists !== null) for (const list of this.lists.values()) for (const child of list.items) child.dispose();
        for (const teardown of this.teardowns.splice(0)) teardown();
    },
    unmount() {
        this.dispose();
    },
};

function prototypeFor(services: object): object {
    let proto = PROTOTYPES.get(services);
    if (proto === undefined) {
        proto = Object.assign(Object.create(services) as object, NODE_METHODS);
        PROTOTYPES.set(services, proto);
    }
    return proto;
}

function createNode(machine: TExoMachine, parent: TExoNodeInternals | null, services: object): TExoNodeInternals {
    const node = Object.create(prototypeFor(services)) as TExoNodeInternals;
    node.key = nextKey++;
    node.machine = machine;
    node.parent = parent;
    node.placedIn = null;
    node.laidOut = false;
    node.services = services;
    node.values = {};
    node.instanceHandlers = null;
    node.lists = null;
    node.elements = [];
    node.teardowns = [];
    node.stops = [];
    node.started = false;
    node.disposed = false;
    node.disposing = false;
    node.provided = null;
    node.version = 0;
    node.listeners = new Set();
    node.view = null;
    node.serviceState = undefined;
    node.transitionOverrides = null;
    node.state = EXO_UNARMED_STATE;
    return node;
}

function armNode(node: TExoNodeInternals, params: unknown): void {
    const machine = node.machine;
    node.serviceState = params;
    node.state = machine.createInitialState === null ? undefined : machine.createInitialState(node as never, params as never);
    machine.wire?.(node as never, params as never);
    if (node.laidOut) node.start();
}

function ExoReactView(props: { readonly node: TExoNodeInternals }): ReactElement {
    const node = props.node;
    useSyncExternalStore(
        (listener) => {
            node.listeners.add(listener);
            return () => node.listeners.delete(listener);
        },
        () => node.version
    );
    useLayoutEffect(() => {
        node.laidOut = true;
        node.start();
    }, [node]);
    node.view ??= createView(node);
    return node.machine.declaration.render(node.view);
}

export function exoReactComponent<TParams>(
    machine: TExoMachine<never, unknown, TParams>
): ComponentType<{ readonly params?: TParams }> {
    function ExoReactRoot(props: { readonly params?: TParams }): ReactElement {
        const services = useContext(EXO_REACT_SERVICES);
        const [node] = useState(() => {
            const root = createNode(machine as TExoMachine, null, services);
            armNode(root, props.params);
            return root;
        });
        const wired = useRef(props.params);
        useLayoutEffect(() => {
            if (wired.current === props.params) return;
            wired.current = props.params;
            wireExoNode(node, props.params);
        }, [node, props.params]);
        useLayoutEffect(() => {
            node.disposing = false;
            return () => {
                node.disposing = true;
                queueMicrotask(() => {
                    if (node.disposing) node.dispose();
                });
            };
        }, [node]);
        return createElement(ExoReactView, { node });
    }
    return ExoReactRoot;
}

export function createExoMachine<TWiring = TExoReactNode, TParams = unknown, TState = unknown, TPorts = unknown>(
    schema: TExoReactSchema<TPorts>,
    options?: { readonly createInitialState?: (enode: TWiring, params: TParams) => TState }
): TExoMachine<TWiring, TPorts, TParams, TState> {
    return {
        declaration: schema,
        forms: [],
        createInitialState: options?.createInitialState ?? null,
        effects: [],
        handlers: [],
    };
}

export function composeExoMachine<A>(base: A): A;
export function composeExoMachine<A, B>(base: A, ab: (a: A) => B): B;
export function composeExoMachine<A, B, C>(base: A, ab: (a: A) => B, bc: (b: B) => C): C;
export function composeExoMachine<A, B, C, D>(
    base: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D
): D;
export function composeExoMachine<A, B, C, D, E>(
    base: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E
): E;
export function composeExoMachine<A, B, C, D, E, F>(
    base: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F
): F;
export function composeExoMachine<A, B, C, D, E, F, G>(
    base: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G
): G;
export function composeExoMachine(base: unknown, ...steps: ((machine: never) => unknown)[]): unknown {
    let machine = base;
    for (const step of steps) machine = step(machine as never);
    return machine;
}

export function withExoWire<TWiring, TPorts, TParams, TState, TMachine extends TExoMachine<TWiring, TPorts, TParams, TState>>(
    machine: TMachine & TExoMachine<TWiring, TPorts, TParams, TState>,
    wire: (enode: TWiring & { state: TState }, params: TParams) => void
): TMachine {
    const aroundWire = (machine.wire as Partial<TExoParamsWire> | undefined)?.aroundWire;
    if (aroundWire !== undefined) return { ...machine, forms: [], wire: aroundWire(wire as unknown as TExoWireRun) } as TMachine;
    if (machine.wire !== undefined) refuseExoSecondWire();
    return { ...machine, forms: [], wire } as TMachine;
}

function refuseExoSecondWire(): never {
    throw new Error('withExoWire: this machine already has a wire; a machine has one wire.');
}

export function withExoHandlers<TWiring, TPorts, TParams, TState, TMachine extends TExoMachine<TWiring, TPorts, TParams, TState>>(
    machine: TMachine & TExoMachine<TWiring, TPorts, TParams, TState>,
    declare: (on: <TEvent>(port: TExoEventPort<TEvent>, handler: (enode: TWiring & { state: TState }, event: TEvent) => void) => void) => void
): TMachine {
    const handlers: TExoMachineHandler[] = machine.handlers.slice();
    declare((port, handler) => {
        for (const known of handlers) {
            if (known.port === port) throw new Error('withExoHandlers: event port ' + String(port) + ' already has a handler on this machine.');
        }
        handlers.push({
            port,
            run: (event: unknown, enode?: unknown) => (handler as (enode: unknown, event: unknown) => void)(enode, event),
        });
    });
    return { ...machine, forms: [], handlers } as TMachine;
}

type TExoEffectStart<TWiring, TState> = (enode: TWiring & { state: TState }) => (() => void) | null | undefined | void;

export function withExoEffects<TWiring, TPorts, TParams, TState, TMachine extends TExoMachine<TWiring, TPorts, TParams, TState>>(
    machine: TMachine & TExoMachine<TWiring, TPorts, TParams, TState>,
    declare: (effect: (start: TExoEffectStart<TWiring, TState>) => TExoMachineEffect<TWiring>) => void
): TMachine;
export function withExoEffects<TWiring, TPorts, TParams, TState, TMachine extends TExoMachine<TWiring, TPorts, TParams, TState>, TNames extends string>(
    machine: TMachine & TExoMachine<TWiring, TPorts, TParams, TState>,
    starts: { readonly [K in TNames]: TExoEffectStart<TWiring, TState> }
): TMachine & { readonly effects: TMachine['effects'] & { readonly [K in TNames]: TExoMachineEffect<TWiring> } };
export function withExoEffects<TWiring>(
    machine: TExoMachine<TWiring>,
    declare: ((effect: (start: TExoEffectStart<TWiring, unknown>) => TExoMachineEffect<TWiring>) => void) | Readonly<Record<string, TExoEffectStart<TWiring, unknown>>>
): TExoMachine<TWiring> {
    const effects: TExoMachineEffect<TWiring>[] = Object.assign([], machine.effects);
    const effectsByName = effects as unknown as Record<string, TExoMachineEffect<TWiring>>;
    const push = (start: TExoEffectStart<TWiring, unknown>): TExoMachineEffect<TWiring> => {
        const handle: TExoMachineEffect<TWiring> = { at: effects.length, start: start as (enode: TWiring) => (() => void) | null };
        effects.push(handle);
        return handle;
    };
    if (typeof declare === 'function') {
        declare(push);
    } else {
        for (const name in declare) {
            if (name in effects) throw new Error("withExoEffects: '" + name + "' is already taken on this machine's effects array.");
            effectsByName[name] = push(declare[name]);
        }
    }
    return { ...machine, forms: [], effects };
}

export function withExoParamsEffects<
    TWiring,
    TPorts,
    TParams,
    TState,
    TMachine extends TExoMachine<TWiring, TPorts, TParams, TState>,
    TNames extends string
>(
    machine: TMachine & TExoMachine<TWiring, TPorts, TParams, TState>,
    effects: {
        readonly [K in TNames]: {
            readonly key: (params: TParams) => unknown;
            readonly start: (enode: TWiring & { state: TState }, params: TParams) => (() => void) | null;
        };
    }
): TMachine & { readonly effects: TMachine['effects'] & { readonly [K in TNames]: TExoMachineEffect<TWiring> } } {
    const declared = effects as unknown as Readonly<Record<string, TExoParamsEffect>>;
    const names = Object.keys(declared);
    const starts: Record<string, (enode: TExoReactNode) => (() => void) | null> = {};
    for (const name of names) {
        const effect = declared[name];
        starts[name] = (enode) => effect.start(enode, enode.serviceState);
    }
    const named = withExoEffects(machine as unknown as TExoMachine<TExoReactNode>, starts) as unknown as TExoMachine<TExoReactNode> & {
        readonly effects: Readonly<Record<string, TExoMachineEffect<TExoReactNode>>>;
    };
    const handles = names.map((name) => named.effects[name]);
    const keys = names.map((name) => declared[name].key);
    return { ...named, wire: createExoParamsWire(machine.wire as TExoWireRun | undefined, keys, handles) } as never;
}

function createExoParamsWire(
    inner: TExoWireRun | undefined,
    keys: readonly ((params: unknown) => unknown)[],
    handles: readonly TExoMachineEffect<TExoReactNode>[]
): TExoParamsWire {
    const wire = function (this: unknown, enode: TExoReactNode, params: unknown): void {
        const previous = enode.serviceState;
        if (inner !== undefined) inner.call(this, enode, params);
        enode.serviceState = params;
        if (!(enode as TExoNodeInternals).started) return;
        for (let i = 0; i < keys.length; i++) {
            if (!Object.is(keys[i](previous), keys[i](params))) enode.restartEffect(handles[i]);
        }
    } as TExoWireRun & { aroundWire?: TExoParamsWire['aroundWire'] };
    wire.aroundWire = (user) => {
        if (inner === undefined) return createExoParamsWire(user, keys, handles);
        const nested = (inner as Partial<TExoParamsWire>).aroundWire;
        if (nested === undefined) refuseExoSecondWire();
        return createExoParamsWire(nested(user), keys, handles);
    };
    return wire as TExoParamsWire;
}

export function withExoTransitions<
    TWiring,
    TPorts,
    TParams,
    TState,
    TData extends Record<string, readonly unknown[]>,
    TMachine extends TExoMachine<TWiring, TPorts, TParams, TState>
>(
    machine: TMachine & TExoMachine<TWiring, TPorts, TParams, TState>,
    transitions: { readonly [K in keyof TData]: (enode: TWiring & { state: TState }, ...data: TData[K]) => void }
): Omit<TMachine, 'overrides'> & {
    readonly transitions: TExoMachineTransitions<TWiring, TData>;
    overrides(
        replacements: TExoTransitionReplacements<TWiring, TMachine & { readonly transitions: TExoMachineTransitions<TWiring, TData> }>
    ): TExoTransitionOverrides;
} {
    const kept = (machine as { readonly transitions?: Record<string, TExoTransitionRun> }).transitions;
    const runs: Record<string, TExoTransitionRun> = kept === undefined ? {} : { ...kept };
    const names = Object.keys(runs);
    for (const name of Object.keys(transitions)) {
        if (name in runs || /^[0-9]+$/.test(name)) {
            throw new Error("withExoTransitions: '" + name + "' is already a transition of this machine, or is an index.");
        }
        const apply = transitions[name] as unknown as TExoTransitionRun;
        const at = names.length;
        names.push(name);
        runs[name] = (enode, ...data) => {
            const alternative = enode.transitionOverrides?.[at] as TExoTransitionRun | undefined;
            (alternative ?? apply)(enode, ...data);
        };
    }
    const overrides = (replacements: Readonly<Record<string, ((...args: never[]) => void) | undefined>>): TExoTransitionOverrides => {
        const table: (((...args: never[]) => void) | undefined)[] = new Array(names.length).fill(undefined);
        for (const name of Object.keys(replacements)) {
            const at = names.indexOf(name);
            if (at === -1) throw new Error("overrides(): '" + name + "' is not a transition of this machine.");
            table[at] = replacements[name];
        }
        return table;
    };
    return { ...machine, forms: [], transitions: Object.freeze(runs), overrides } as never;
}

export function wireExoNode(node: TExoReactNode, params?: unknown): void {
    const internal = node as TExoNodeInternals;
    if (internal.state === EXO_UNARMED_STATE) {
        armNode(internal, params);
        return;
    }
    internal.machine.wire?.(node as never, params as never);
    node.serviceState = params;
}

export function destroyExoNode(node: TExoReactNode): void {
    const internal = node as TExoNodeInternals;
    takeOut(internal);
    internal.dispose();
}

export function swapExoParams(node: TExoReactNode, params: unknown): void {
    node.serviceState = params;
}

export function connectExoNode(node: TExoReactNode): void {
    (node as TExoNodeInternals).start();
}

export function disconnectExoNode(node: TExoReactNode): void {
    (node as TExoNodeInternals).stop();
}

export function exoStyleObject(value: unknown): Record<string, string> | undefined {
    if (value === null || value === undefined || value === false) return undefined;
    if (typeof value === 'object') return value as Record<string, string>;
    const style: Record<string, string> = {};
    for (const declaration of String(value).split(';')) {
        const at = declaration.indexOf(':');
        if (at === -1) continue;
        const name = declaration.slice(0, at).trim();
        if (name === '') continue;
        const key = name.startsWith('--') ? name : name.replace(/-([a-z])/g, (_all, letter: string) => letter.toUpperCase());
        style[key] = declaration.slice(at + 1).trim();
    }
    return style;
}
`;
