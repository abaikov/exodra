import type { TExoPlacedChildren } from './types/TExoPlacedChildren';
import { getExoSequence } from './getExoSequence';

// A REPEATED ITEM IS ONE ROW PER OCCURRENCE: each position claims the next unclaimed one.
function reconcileExoMiddle<TKey, TItem, TNode>(
    kids: TExoPlacedChildren<TNode>,
    shown: readonly TKey[],
    start: number,
    shownEnd: number,
    keys: readonly TKey[],
    want: readonly TItem[],
    wantEnd: number,
    build: (item: TItem) => TNode
): void {
    const shownLength = shownEnd - start;
    const wantLength = wantEnd - start;
    const firstAt = new Map<TKey, number>();
    const nextSame = new Int32Array(shownLength);
    for (let i = shownLength - 1; i >= 0; i--) {
        const item = shown[start + i];
        const head = firstAt.get(item);
        nextSame[i] = head === undefined ? -1 : head;
        firstAt.set(item, i);
    }
    const rank = new Int32Array(shownLength);
    const old: number[] = new Array<number>(wantLength);
    for (let k = 0; k < wantLength; k++) {
        const key = keys[start + k];
        const head = firstAt.get(key);
        if (head === undefined || head < 0) {
            old[k] = 0;
            continue;
        }
        old[k] = head + 1;
        rank[head] = 1;
        firstAt.set(key, nextSame[head]);
    }
    // FIRST, so a recycling node source has them back before a single row asks for one.
    for (let i = shownLength - 1; i >= 0; i--) {
        if (rank[i] === 0) kids.remove(start + i);
    }
    let survivors = 0;
    for (let i = 0; i < shownLength; i++) {
        if (rank[i] !== 0) rank[i] = ++survivors;
    }
    let inOrder = true;
    let last = 0;
    for (let k = 0; k < wantLength; k++) {
        if (old[k] === 0) continue;
        const at = rank[old[k] - 1];
        old[k] = at;
        if (at < last) inOrder = false;
        last = at;
    }
    if (inOrder) {
        for (let k = 0; k < wantLength; k++) {
            if (old[k] === 0) kids.insert(build(want[start + k]), start + k);
        }
        return;
    }
    const built: (TNode | undefined)[] = new Array<TNode | undefined>(wantLength);
    for (let k = 0; k < wantLength; k++) {
        if (old[k] === 0) built[k] = build(want[start + k]);
    }
    const stay = new Uint8Array(wantLength);
    const sequence = getExoSequence(old);
    for (let s = 0; s < sequence.length; s++) {
        if (old[sequence[s]] !== 0) stay[sequence[s]] = 1;
    }
    const order: number[] = new Array<number>(survivors);
    for (let r = 0; r < survivors; r++) order[r] = r + 1;
    // RIGHT TO LEFT, each row placed just before the one after it; `to` is an index AFTER removal.
    let anchor = survivors;
    for (let k = wantLength - 1; k >= 0; k--) {
        const token = old[k];
        if (token === 0) {
            kids.insert(built[k] as TNode, start + anchor);
            order.splice(anchor, 0, -1 - k);
        } else if (stay[k] === 1) {
            let at = anchor - 1;
            while (order[at] !== token) at--;
            anchor = at;
        } else {
            const from = order.indexOf(token);
            const to = from < anchor ? anchor - 1 : anchor;
            kids.move(start + from, start + to);
            order.splice(to, 0, order.splice(from, 1)[0]);
            anchor = to;
        }
    }
}

/** One pass over an order of keys: the identity list hands the items themselves, the keyed list `keyOf(item)`. */
export function reconcileExoOrder<TKey, TItem, TNode>(
    kids: TExoPlacedChildren<TNode>,
    shown: TKey[],
    keys: readonly TKey[],
    want: readonly TItem[],
    build: (item: TItem) => TNode
): TKey[] {
    const wantLength = keys.length;
    if (wantLength === 0) {
        if (shown.length === 0) return shown;
        kids.removeAll();
        return [];
    }
    const shownLength = shown.length;
    let start = 0;
    const common = shownLength < wantLength ? shownLength : wantLength;
    while (start < common && shown[start] === keys[start]) start++;
    let shownEnd = shownLength;
    let wantEnd = wantLength;
    while (shownEnd > start && wantEnd > start && shown[shownEnd - 1] === keys[wantEnd - 1]) {
        shownEnd--;
        wantEnd--;
    }
    if (start === shownEnd) {
        for (let k = start; k < wantEnd; k++) {
            kids.insert(build(want[k]), k);
            shown.splice(k, 0, keys[k]);
        }
        return shown;
    }
    if (start === wantEnd) {
        for (let i = shownEnd - 1; i >= start; i--) kids.remove(i);
        shown.splice(start, shownEnd - start);
        return shown;
    }
    reconcileExoMiddle(kids, shown, start, shownEnd, keys, want, wantEnd, build);
    return keys.slice();
}
