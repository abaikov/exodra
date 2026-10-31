import { EXO_REACT_RENDER } from '../constants/EXO_REACT_RENDER';
import type { ExoReactComponent } from '../ExoReactComponent';
import type { TExoReactContext } from '../types/TExoReactContext';
import type { TExoReactRange } from '../types/TExoReactRange';
import type { TExoReactSlot } from '../types/TExoReactSlot';

type TExoReactClass = {
    new (props: unknown, context?: unknown): ExoReactComponent<unknown, unknown>;
    readonly contextType?: TExoReactContext<unknown>;
    readonly isPureReactComponent?: boolean;
    getDerivedStateFromProps?(props: unknown, state: unknown): unknown;
    getDerivedStateFromError?(error: unknown): unknown;
};

type TExoReactInstance = ExoReactComponent<unknown, unknown> & {
    shouldComponentUpdate?(props: unknown, state: unknown, context: unknown): boolean;
    componentDidMount?(): void;
    componentDidUpdate?(props: unknown, state: unknown, snapshot?: unknown): void;
    getSnapshotBeforeUpdate?(props: unknown, state: unknown): unknown;
    componentDidCatch?(error: unknown, info: { componentStack: string }): void;
};

function shallowEqual(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) return true;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
    const left = Object.keys(a);
    if (left.length !== Object.keys(b).length) return false;
    for (const name of left) {
        if (
            !Object.is((a as Record<string, unknown>)[name], (b as Record<string, unknown>)[name])
        ) {
            return false;
        }
    }
    return true;
}

function readContext(slot: TExoReactSlot, context: TExoReactContext<unknown> | undefined): unknown {
    if (context === undefined) return undefined;
    for (let up = slot.parentComponent; up !== null; up = up.parentComponent) {
        if (up.type === context.Provider || up.type === context) {
            (up.consumers ??= new Set()).add(slot);
            return (up.props as { value: unknown }).value;
        }
    }
    return context.defaultValue;
}

function merge(state: unknown, partial: unknown): unknown {
    if (partial === null || partial === undefined) return state;
    return { ...(state as object), ...(partial as object) };
}

export function renderExoReactClass(
    slot: TExoReactSlot,
    updateRange: (range: TExoReactRange, value: unknown) => void
): void {
    const type = slot.type as TExoReactClass;
    const props = slot.props;
    const context = readContext(slot, type.contextType);
    let instance = slot.hooks[0] as TExoReactInstance | undefined;
    let previousProps: unknown = null;
    let previousState: unknown = null;
    if (instance === undefined) {
        instance = new type(props, context) as TExoReactInstance;
        instance.exoReact.slot = slot;
        slot.hooks[0] = instance;
        if (type.getDerivedStateFromProps !== undefined) {
            instance.state = merge(
                instance.state,
                type.getDerivedStateFromProps(props, instance.state)
            );
        }
    } else {
        const own = instance.exoReact;
        previousProps = instance.props;
        previousState = instance.state;
        let next = previousState;
        for (const partial of own.pending.splice(0)) {
            next = merge(
                next,
                typeof partial === 'function' ? partial.call(instance, next, props) : partial
            );
        }
        if (type.getDerivedStateFromProps !== undefined) {
            next = merge(next, type.getDerivedStateFromProps(props, next));
        }
        const forced = own.forced;
        own.forced = false;
        const update =
            forced ||
            (instance.shouldComponentUpdate !== undefined
                ? instance.shouldComponentUpdate(props, next, context)
                : type.isPureReactComponent === true
                ? !shallowEqual(previousProps, props) || !shallowEqual(previousState, next)
                : true);
        instance.props = props;
        instance.state = next;
        instance.context = context;
        if (!update) {
            queueCallbacks(instance);
            return;
        }
    }
    const range = slot.range as TExoReactRange;
    const snapshot =
        instance.exoReact.mounted && instance.getSnapshotBeforeUpdate !== undefined
            ? instance.getSnapshotBeforeUpdate(previousProps, previousState)
            : undefined;
    const boundary =
        type.getDerivedStateFromError !== undefined || instance.componentDidCatch !== undefined;
    try {
        updateRange(range, instance.render());
    } catch (error) {
        if (!boundary) throw error;
        if (type.getDerivedStateFromError !== undefined) {
            instance.state = merge(instance.state, type.getDerivedStateFromError(error));
        }
        const caught = instance;
        EXO_REACT_RENDER.layoutEffects.push(() =>
            caught.componentDidCatch?.(error, { componentStack: '' })
        );
        updateRange(range, instance.render());
    }
    const own = instance.exoReact;
    const target = instance;
    if (!own.mounted) {
        own.mounted = true;
        if (target.componentDidMount !== undefined) {
            EXO_REACT_RENDER.layoutEffects.push(() => target.componentDidMount?.());
        }
    } else if (target.componentDidUpdate !== undefined) {
        const props0 = previousProps;
        const state0 = previousState;
        EXO_REACT_RENDER.layoutEffects.push(() =>
            target.componentDidUpdate?.(props0, state0, snapshot)
        );
    }
    queueCallbacks(instance);
}

function queueCallbacks(instance: TExoReactInstance): void {
    const callbacks = instance.exoReact.callbacks;
    if (callbacks.length === 0) return;
    const ready = callbacks.splice(0);
    EXO_REACT_RENDER.layoutEffects.push(() => {
        for (const callback of ready) callback.call(instance);
    });
}
