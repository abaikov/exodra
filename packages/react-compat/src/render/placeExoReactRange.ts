import { reconcileExoOrder } from '@exodra/list-reconcile';
import type { TExoPlacedChildren } from '@exodra/list-reconcile';
import type { TExoNode } from '@exodra/core';
import type { TExoChildList, TExoDomMark } from '@exodra/dom';
import type { TExoReactRange } from '../types/TExoReactRange';
import type { TExoReactSlot } from '../types/TExoReactSlot';

type TExoPlacedNode = TExoNode<TExoDomMark>;

function leafCountOf(slot: TExoReactSlot): number {
    if (slot.kind === 'portal') return 0;
    return slot.kind === 'component' ? (slot.range as TExoReactRange).leafCount : 1;
}

function offsetOf(range: TExoReactRange): number {
    let offset = 0;
    for (let owner = range.parentSlot; owner !== null; owner = owner.parentRange.parentSlot) {
        const siblings = owner.parentRange.slots;
        for (let i = 0; i < siblings.length && siblings[i] !== owner; i++) {
            offset += leafCountOf(siblings[i]);
        }
    }
    return offset;
}

function collectLeaves(range: TExoReactRange, out: TExoPlacedNode[]): void {
    const start = out.length;
    const slots = range.slots;
    for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (slot.kind === 'component') collectLeaves(slot.range as TExoReactRange, out);
        else if (slot.kind !== 'portal') out.push(slot.node as TExoPlacedNode);
    }
    range.leafCount = out.length - start;
    range.changed = false;
}

function rangeChildren(
    list: TExoChildList,
    offset: number,
    count: number
): TExoPlacedChildren<TExoPlacedNode> {
    let size = count;
    return {
        get size(): number {
            return size;
        },
        at: (i) => list.at(offset + i),
        insert(child, i = size) {
            list.insert(child, offset + i);
            size++;
        },
        move(from, to) {
            list.move(offset + from, offset + to);
        },
        remove(i) {
            list.remove(offset + i);
            size--;
        },
        removeAll() {
            if (offset === 0 && size === list.size) list.removeAll();
            else for (let i = size - 1; i >= 0; i--) list.remove(offset + i);
            size = 0;
        },
    };
}

export function placeExoReactRange(range: TExoReactRange): void {
    if (!range.changed) return;
    const offset = offsetOf(range);
    const before = range.leafCount;
    const list = range.list;
    const shown: TExoPlacedNode[] = new Array<TExoPlacedNode>(before);
    for (let i = 0; i < before; i++) shown[i] = list.at(offset + i) as TExoPlacedNode;
    const want: TExoPlacedNode[] = [];
    collectLeaves(range, want);
    reconcileExoOrder(rangeChildren(list, offset, before), shown, want, want, (node) => node);
    const delta = range.leafCount - before;
    if (delta === 0) return;
    for (let owner = range.parentSlot; owner !== null; owner = owner.parentRange.parentSlot) {
        owner.parentRange.leafCount += delta;
    }
}
