import { createExoChildList } from '@exodra/dom';
import { wireExoNode } from '@exodra/core';
import type { TExoMachine, TExoNode } from '@exodra/core';
import type { TExoDomMark } from '@exodra/dom';
import { EXO_REACT_HOST_TEMPLATES } from '../constants/EXO_REACT_HOST_TEMPLATES';
import { EXO_REACT_RENDER } from '../constants/EXO_REACT_RENDER';
import { EXO_REACT_SUSPENSE } from '../constants/EXO_REACT_SUSPENSE';
import { EXO_REACT_SYMBOLS } from '../constants/EXO_REACT_SYMBOLS';
import { Fragment } from '../Fragment';
import { isValidElement } from '../isValidElement';
import { disposeExoReactSlot } from './disposeExoReactSlot';
import { placeExoReactRange } from './placeExoReactRange';
import { renderExoReactClass } from './renderExoReactClass';
import type { TExoReactContext } from '../types/TExoReactContext';
import type { TExoReactElement } from '../types/TExoReactElement';
import type { TExoReactRange } from '../types/TExoReactRange';
import type { TExoReactSlot } from '../types/TExoReactSlot';

type TExoReactTagged = {
    readonly $$typeof?: symbol;
    readonly type?: unknown;
    readonly render?: (props: unknown, ref: unknown) => unknown;
    readonly context?: TExoReactContext<unknown>;
};

function notifyConsumers(slot: TExoReactSlot, value: unknown): void {
    const had = slot.hooks.length > 0;
    const previous = slot.hooks[0];
    slot.hooks[0] = value;
    const consumers = slot.consumers;
    if (!had || consumers === null || Object.is(previous, value)) return;
    const dirty = EXO_REACT_RENDER.dirty;
    for (const consumer of consumers) {
        if (!consumer.alive) {
            consumers.delete(consumer);
            continue;
        }
        if (consumer.dirty) continue;
        consumer.dirty = true;
        dirty.push(consumer);
    }
}

function invoke(type: unknown, slot: TExoReactSlot): unknown {
    const props = slot.props as Record<string, unknown>;
    if (typeof type === 'function') return (type as (props: unknown) => unknown)(props);
    if (type === Fragment) return props.children;
    const tagged = type as TExoReactTagged;
    switch (tagged.$$typeof) {
        case EXO_REACT_SYMBOLS.memo:
            return invoke(tagged.type, slot);
        case EXO_REACT_SYMBOLS.forwardRef:
            return (tagged.render as (props: unknown, ref: unknown) => unknown)(props, slot.ref);
        case EXO_REACT_SYMBOLS.provider:
        case EXO_REACT_SYMBOLS.context:
            notifyConsumers(slot, props.value);
            return props.children;
        case EXO_REACT_SYMBOLS.consumer: {
            const context = tagged.context as TExoReactContext<unknown>;
            let value = context.defaultValue;
            for (let up = slot.parentComponent; up !== null; up = up.parentComponent) {
                if (up.type === context.Provider || up.type === context) {
                    (up.consumers ??= new Set()).add(slot);
                    value = (up.props as { value: unknown }).value;
                    break;
                }
            }
            return (props.children as (value: unknown) => unknown)(value);
        }
    }
    throw new Error(
        `Element type is invalid: expected a string, a function or a compiled host, got ${String(
            type
        )}.`
    );
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as { then?: unknown }).then === 'function'
    );
}

function suspend(slot: TExoReactSlot, promise: PromiseLike<unknown>): void {
    for (let up = slot.parentComponent; up !== null; up = up.parentComponent) {
        if (up.type === EXO_REACT_SUSPENSE.Provider) {
            (up.props as { value: (promise: PromiseLike<unknown>) => void }).value(promise);
            const retry = (): void => {
                if (!slot.alive || slot.dirty) return;
                slot.dirty = true;
                EXO_REACT_RENDER.dirty.push(slot);
            };
            promise.then(retry, retry);
            return;
        }
    }
    throw new Error(
        'A component suspended while rendering, but no <Suspense> above it can show a fallback.'
    );
}

function renderSlot(slot: TExoReactSlot): void {
    const render = EXO_REACT_RENDER;
    slot.dirty = false;
    const outerSlot = render.slot;
    const outerHook = render.hook;
    render.slot = slot;
    render.hook = 0;
    const insertionAt = render.insertionEffects.length;
    const layoutAt = render.layoutEffects.length;
    const passiveAt = render.passiveEffects.length;
    const type = slot.type;
    if (
        typeof type === 'function' &&
        (type as { readonly isReactComponent?: boolean }).isReactComponent === true
    ) {
        try {
            renderExoReactClass(slot, updateRange);
        } finally {
            render.slot = outerSlot;
            render.hook = outerHook;
        }
        return;
    }
    let result: unknown;
    try {
        result = invoke(slot.type, slot);
    } catch (thrown) {
        if (!isThenable(thrown)) throw thrown;
        render.insertionEffects.length = insertionAt;
        render.layoutEffects.length = layoutAt;
        render.passiveEffects.length = passiveAt;
        suspend(slot, thrown);
        result = null;
    } finally {
        render.slot = outerSlot;
        render.hook = outerHook;
    }
    const insertion =
        render.insertionEffects.length > insertionAt
            ? render.insertionEffects.splice(insertionAt)
            : null;
    const layout =
        render.layoutEffects.length > layoutAt ? render.layoutEffects.splice(layoutAt) : null;
    const passive =
        render.passiveEffects.length > passiveAt ? render.passiveEffects.splice(passiveAt) : null;
    updateRange(slot.range as TExoReactRange, result);
    if (insertion !== null) render.insertionEffects.push(...insertion);
    if (layout !== null) render.layoutEffects.push(...layout);
    if (passive !== null) render.passiveEffects.push(...passive);
}

type TExoReactPass = {
    readonly range: TExoReactRange;
    readonly old: readonly TExoReactSlot[];
    readonly id: number;
    byKey: Map<string, TExoReactSlot> | null;
    position: number;
    readonly next: TExoReactSlot[];
    changed: boolean;
};

function isHost(type: unknown): type is TExoMachine<never> {
    return typeof type === 'object' && type !== null && 'declaration' in type;
}

function shallowEqual(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) return true;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
    const left = a as Record<string, unknown>;
    const right = b as Record<string, unknown>;
    let count = 0;
    for (const name in left) {
        if (!Object.prototype.hasOwnProperty.call(left, name)) continue;
        if (!Object.is(left[name], right[name])) return false;
        count++;
    }
    for (const name in right) if (Object.prototype.hasOwnProperty.call(right, name)) count--;
    return count === 0;
}

function claim(pass: TExoReactPass, key: string): TExoReactSlot | undefined {
    const old = pass.old;
    const at = pass.position;
    if (at < old.length && old[at].key === key && old[at].pass !== pass.id) {
        pass.position = at + 1;
        old[at].pass = pass.id;
        return old[at];
    }
    let byKey = pass.byKey;
    if (byKey === null) {
        byKey = pass.byKey = new Map();
        for (let i = 0; i < old.length; i++)
            if (!byKey.has(old[i].key)) byKey.set(old[i].key, old[i]);
    }
    const found = byKey.get(key);
    if (found === undefined || found.pass === pass.id) return undefined;
    found.pass = pass.id;
    return found;
}

function paramsOf(element: TExoReactElement): unknown {
    const values = (element as { values?: readonly unknown[] }).values;
    return values === undefined ? element.props : values;
}

function makeSlot(
    range: TExoReactRange,
    kind: TExoReactSlot['kind'],
    type: unknown,
    key: string,
    element: TExoReactElement | null
): TExoReactSlot {
    const component = range.component;
    return {
        kind,
        type,
        key,
        props: element === null ? null : paramsOf(element),
        ref: element === null ? null : element.ref,
        node: null,
        text: null,
        range: null,
        parentRange: range,
        parentComponent: component,
        depth: component === null ? 1 : component.depth + 1,
        hooks: [],
        consumers: null,
        dirty: false,
        alive: true,
        pass: 0,
    };
}

function createTextSlot(range: TExoReactRange, key: string, value: string): TExoReactSlot {
    const slot = makeSlot(range, 'text', null, key, null);
    const text = document.createTextNode(value);
    slot.text = text;
    const schema = range.owner.schema;
    slot.node = schema.createChild(
        schema,
        text as unknown as Element
    ) as unknown as TExoNode<TExoDomMark>;
    return slot;
}

function mountText(range: TExoReactRange, value: string): void {
    const slot = createTextSlot(range, '.0', value);
    range.slots = [slot];
    range.leafCount = 1;
    range.list.insert(slot.node as TExoNode<TExoDomMark>);
}

function placeText(pass: TExoReactPass, key: string, value: string): void {
    const old = claim(pass, key);
    if (old !== undefined && old.kind === 'text') {
        const text = old.text as Text;
        if (text.data !== value) text.data = value;
        pass.next.push(old);
        return;
    }
    if (old !== undefined) old.pass = 0;
    pass.next.push(createTextSlot(pass.range, key, value));
}

function updatePortal(_pass: TExoReactPass, slot: TExoReactSlot, element: TExoReactElement): void {
    slot.props = element.props;
    const range = slot.range as TExoReactRange;
    updateRange(range, element.props.children);
    placeExoReactRange(range);
}

function updateSlot(pass: TExoReactPass, slot: TExoReactSlot, element: TExoReactElement): void {
    const previous = slot.props;
    if (slot.kind === 'portal') {
        updatePortal(pass, slot, element);
        return;
    }
    if (slot.kind === 'host') {
        const params = paramsOf(element);
        if (previous === params && slot.ref === element.ref) return;
        slot.props = params;
        slot.ref = element.ref;
        wireExoNode(
            slot.node as TExoNode<TExoDomMark>,
            slot.type as TExoMachine<never, unknown, unknown>,
            element
        );
        return;
    }
    slot.props = element.props;
    slot.ref = element.ref;
    if (!slot.dirty) {
        if (previous === element.props) return;
        const type = slot.type as { $$typeof?: symbol; compare?: typeof shallowEqual | null };
        if (type.$$typeof === EXO_REACT_SYMBOLS.memo) {
            const compare = type.compare ?? shallowEqual;
            if (compare(previous, element.props)) return;
        }
    }
    renderSlot(slot);
    if ((slot.range as TExoReactRange).changed) pass.changed = true;
}

function placeElement(pass: TExoReactPass, key: string, element: TExoReactElement): void {
    const readTemplatedElement = EXO_REACT_HOST_TEMPLATES.readTemplatedElement;
    if (readTemplatedElement !== null && typeof element.type === 'string') {
        const component = pass.range.component?.type;
        if (
            (typeof component === 'function' || typeof component === 'object') &&
            component !== null
        ) {
            element = readTemplatedElement(component, element) ?? element;
        }
    }
    const type = element.host ?? element.type;
    const old = claim(pass, key);
    if (
        old !== undefined &&
        old.type === type &&
        (old.kind !== 'portal' ||
            (old.props as { container: unknown }).container === element.props.container)
    ) {
        updateSlot(pass, old, element);
        pass.next.push(old);
        return;
    }
    if (old !== undefined) old.pass = 0;
    const range = pass.range;
    if (type === EXO_REACT_SYMBOLS.portal) {
        const slot = makeSlot(range, 'portal', type, key, element);
        slot.range = {
            list: createExoChildList(element.props.container as Element, [], null, false),
            owner: range.owner,
            component: slot,
            parentSlot: null,
            slots: [],
            leafCount: 0,
            changed: false,
        };
        pass.next.push(slot);
        updatePortal(pass, slot, element);
        return;
    }
    if (isHost(type)) {
        const slot = makeSlot(range, 'host', type, key, element);
        slot.node = range.owner.build(
            type as unknown as Parameters<typeof range.owner.build>[0],
            0,
            element
        );
        pass.next.push(slot);
        return;
    }
    const slot = makeSlot(range, 'component', type, key, element);
    slot.range = {
        list: range.list,
        owner: range.owner,
        component: slot,
        parentSlot: slot,
        slots: [],
        leafCount: 0,
        changed: false,
    };
    pass.next.push(slot);
    renderSlot(slot);
}

function ownKey(child: unknown, index: number): string {
    return isValidElement(child) && child.key !== null ? '$' + child.key : '.' + index;
}

function visit(pass: TExoReactPass, child: unknown, key: string): void {
    if (child === null || child === undefined || typeof child === 'boolean') return;
    const kind = typeof child;
    if (kind === 'string' || kind === 'number' || kind === 'bigint') {
        placeText(pass, key, String(child));
        return;
    }
    if (isValidElement(child)) {
        placeElement(pass, key, child);
        return;
    }
    if (Array.isArray(child)) {
        visitArray(pass, child, key);
        return;
    }
    if (typeof (child as Iterable<unknown>)[Symbol.iterator] === 'function') {
        visitArray(pass, Array.from(child as Iterable<unknown>), key);
        return;
    }
    throw new Error(
        'Objects are not valid as a React child. Render a string, a number, an element or an ' +
            'array of them.'
    );
}

function visitArray(pass: TExoReactPass, children: readonly unknown[], prefix: string): void {
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const own = ownKey(child, i);
        visit(pass, child, prefix === '' ? own : prefix + ':' + own);
    }
}

function updateRange(range: TExoReactRange, value: unknown): void {
    const render = EXO_REACT_RENDER;
    const outer = render.component;
    render.component = range.component;
    const old = range.slots;
    const pass: TExoReactPass = {
        range,
        old,
        id: ++render.passes,
        byKey: null,
        position: 0,
        next: [],
        changed: false,
    };
    try {
        if (Array.isArray(value)) visitArray(pass, value, '');
        else visit(pass, value, ownKey(value, 0));
    } catch (error) {
        for (let i = 0; i < pass.next.length; i++) {
            if (!old.includes(pass.next[i])) disposeExoReactSlot(pass.next[i]);
        }
        throw error;
    } finally {
        render.component = outer;
    }
    const next = pass.next;
    let changed = pass.changed || next.length !== old.length;
    for (let i = 0; i < old.length; i++) {
        if (!changed && next[i] !== old[i]) changed = true;
        if (old[i].pass !== pass.id) disposeExoReactSlot(old[i]);
    }
    range.slots = next;
    if (changed) range.changed = true;
}

export const EXO_REACT_RECONCILER = {
    renderSlot,
    updateRange,
    mountText,
};
