import { createExoChildList } from '@exodra/dom';
import type { TExoNode } from '@exodra/core';
import type { TExoChildList, TExoDomChild, TExoDomMark, TExoDomRenderNode } from '@exodra/dom';
import { EXO_REACT_VOID_TAGS } from '../constants/EXO_REACT_VOID_TAGS';
import { createExoReactHostState } from './createExoReactHostState';
import { createExoReactSlot } from './createExoReactSlot';
import { disposeExoReactHostState } from './disposeExoReactHostState';
import { exoReactTagMachine } from './exoReactTagMachine';
import type { TExoReactHostShape } from '../types/TExoReactHostShape';
import type { TExoReactHostShapeKid } from '../types/TExoReactHostShapeKid';
import type { TExoReactHostState } from '../types/TExoReactHostState';
import type { TExoReactRange } from '../types/TExoReactRange';
import type { TExoReactSlot } from '../types/TExoReactSlot';

type TExoReactAdoption = {
    readonly values: readonly unknown[];
    readonly regions: readonly TExoReactRange[];
    readonly parts: readonly TExoReactHostState[];
    readonly owner: TExoDomRenderNode;
    readonly component: TExoReactSlot | null;
    region: number;
    part: number;
};

type TExoReactAdopted = {
    readonly state: TExoReactHostState;
    readonly props: Record<string, unknown>;
    readonly ref: unknown;
};

function regionKey(
    key: string,
    kid: TExoReactHostShapeKid & { kind: 'region' },
    at: number,
    value: unknown
): string {
    if (kid.whole) return key;
    if (kid.width === 1) {
        if (Array.isArray(value)) return '.' + at + ':' + key;
        if (key.startsWith('.0') && (key.length === 2 || key[2] === ':'))
            return '.' + at + key.slice(2);
        return key;
    }
    if (key[0] !== '.') return key;
    const end = key.indexOf(':');
    const index = Number(end < 0 ? key.slice(1) : key.slice(1, end));
    return '.' + (at + index) + (end < 0 ? '' : key.slice(end));
}

function relist(range: TExoReactRange, from: TExoChildList, to: TExoChildList): void {
    if (range.list !== from) return;
    range.list = to;
    const slots = range.slots;
    for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (slot.kind === 'component' && slot.range !== null) relist(slot.range, from, to);
    }
}

function wrap(owner: TExoDomRenderNode, node: Node): TExoDomChild {
    const schema = owner.schema;
    return schema.createChild(schema, node as Element);
}

function adoptElement(
    adoption: TExoReactAdoption,
    shape: TExoReactHostShape,
    element: Element
): TExoReactAdopted {
    const values = adoption.values;
    const part = shape.part ? adoption.parts[adoption.part++] : null;
    const props: Record<string, unknown> = {};
    for (let i = 0; i < shape.props.length; i++) {
        const at = shape.values[i];
        props[shape.props[i]] = at < 0 ? shape.statics[i] : values[at];
    }
    const ref = shape.ref < 0 ? null : values[shape.ref];
    const regions: TExoReactRange[] = [];
    const state = createExoReactHostState(element, regions, [], 0);
    state.listeners = part === null ? null : part.listeners;
    state.ref = part === null ? null : part.ref;
    if (EXO_REACT_VOID_TAGS.has(shape.tag)) {
        state.props = props;
        return { state, props, ref };
    }
    const kids = shape.kids;
    const range: TExoReactRange = {
        list: null as unknown as TExoChildList,
        owner: adoption.owner,
        component: adoption.component,
        parentSlot: null,
        slots: [],
        leafCount: 0,
        changed: false,
    };
    regions.push(range);
    const order: TExoDomChild[] = [];
    const moved: { readonly from: TExoChildList; readonly slots: readonly TExoReactSlot[] }[] = [];
    if (kids.length === 1 && kids[0].kind === 'text') {
        const text = kids[0];
        props.children = text.value < 0 ? text.text : values[text.value];
    } else if (!shape.html) {
        let node: Node | null = element.firstChild;
        let at = 0;
        for (let k = 0; k < kids.length; k++) {
            const kid = kids[k];
            if (kid.kind === 'host') {
                const own = node as Element;
                node = own.nextSibling;
                const nested = adoptElement(adoption, kid.shape, own);
                const key = kid.shape.key === null ? '.' + at : '$' + kid.shape.key;
                const slot = createExoReactSlot(
                    range,
                    'host',
                    exoReactTagMachine(kid.shape.tag),
                    key,
                    nested.props,
                    nested.ref
                );
                const child = wrap(adoption.owner, own);
                child.state = nested.state;
                (child.disposers ??= []).push(() => disposeExoReactHostState(nested.state));
                slot.node = child as unknown as TExoNode<TExoDomMark>;
                range.slots.push(slot);
                order.push(child);
                at++;
            } else if (kid.kind === 'text') {
                const own = node as Text;
                node = own.nextSibling;
                const slot = createExoReactSlot(range, 'text', null, '.' + at, null, null);
                const child = wrap(adoption.owner, own);
                slot.text = own;
                slot.node = child as unknown as TExoNode<TExoDomMark>;
                range.slots.push(slot);
                order.push(child);
                at += kid.width;
            } else {
                const region = adoption.regions[adoption.region++];
                const list = region.list;
                for (let i = 0; i < list.size; i++) {
                    order.push(list.at(i) as unknown as TExoDomChild);
                    node = (node as Node).nextSibling;
                }
                const value = values[kid.value];
                const slots = region.slots;
                for (let i = 0; i < slots.length; i++) {
                    const slot = slots[i];
                    slot.key = regionKey(slot.key, kid, at, value);
                    slot.parentRange = range;
                    range.slots.push(slot);
                }
                moved.push({ from: list, slots });
                region.slots = [];
                region.leafCount = 0;
                if (kid.whole) props.children = value;
                at += kid.width;
            }
        }
    }
    const list = createExoChildList(element, order, null, false);
    range.list = list;
    range.leafCount = order.length;
    for (let m = 0; m < moved.length; m++) {
        const slots = moved[m].slots;
        for (let i = 0; i < slots.length; i++) {
            const slot = slots[i];
            if (slot.kind === 'component' && slot.range !== null)
                relist(slot.range, moved[m].from, list);
        }
    }
    state.props = props;
    return { state, props, ref };
}

export function adoptExoReactHostSlot(slot: TExoReactSlot, shape: TExoReactHostShape): void {
    const node = slot.node as unknown as TExoDomRenderNode & TExoDomChild;
    const old = node.state as TExoReactHostState;
    const adoption: TExoReactAdoption = {
        values: slot.props as readonly unknown[],
        regions: old.regions,
        parts: old.parts,
        owner: node,
        component: slot.parentComponent,
        region: 0,
        part: 0,
    };
    const adopted = adoptElement(adoption, shape, old.element);
    old.handlers.fill(null);
    old.ref = null;
    for (let p = 0; p < old.parts.length; p++) old.parts[p].ref = null;
    node.state = adopted.state;
    (node.disposers ??= []).push(() => disposeExoReactHostState(adopted.state));
    slot.type = exoReactTagMachine(shape.tag);
    slot.props = adopted.props;
    slot.ref = adopted.ref;
}
