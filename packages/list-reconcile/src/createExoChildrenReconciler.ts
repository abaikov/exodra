import { reconcileExoOrder } from './reconcileExoOrder';
import type { TExoChildrenOwner } from './types/TExoChildrenOwner';
import type { TExoChildrenReconciler } from './types/TExoChildrenReconciler';
import type { TExoChildrenReconcilerOptions } from './types/TExoChildrenReconcilerOptions';
import type { TExoPlacedChildren } from './types/TExoPlacedChildren';

type TExoShownRun = {
    keys: unknown[];
    items: unknown[] | null;
    slice: TExoPlacedChildren<unknown> | null;
};

type TExoWirableNode = { wireExoSelf(params?: unknown): void };

type TExoPortChildListOwner = { portChildList(port: unknown): TExoPlacedChildren<unknown> };

type TExoBuild<TItem> = (owner: TExoChildrenOwner<object, unknown>, item: TItem) => unknown;

function runOf(
    shownByOwner: WeakMap<object, Map<unknown, TExoShownRun>>,
    owner: object,
    port: unknown
): TExoShownRun {
    let byPort = shownByOwner.get(owner);
    if (byPort === undefined) {
        byPort = new Map();
        shownByOwner.set(owner, byPort);
    }
    let run = byPort.get(port);
    if (run === undefined) {
        run = { keys: [], items: null, slice: null };
        byPort.set(port, run);
    }
    return run;
}

function sliceOfExoChildren<TNode>(
    kids: TExoPlacedChildren<TNode>,
    from: number,
    length: () => number
): TExoPlacedChildren<TNode> {
    return {
        get size(): number {
            return length();
        },
        at: (i) => kids.at(from + i),
        insert: (child, i) => kids.insert(child, from + (i === undefined ? length() : i)),
        move: (a, b) => kids.move(from + a, from + b),
        remove: (i) => kids.remove(from + i),
        removeAll: () => {
            for (let i = length() - 1; i >= 0; i--) kids.remove(from + i);
        },
    };
}

export function createExoChildrenReconciler<TItem>(
    row: object | ((owner: never, item: TItem) => unknown),
    options?: TExoChildrenReconcilerOptions<TItem>
): TExoChildrenReconciler<TItem> {
    const keyOf = options?.key;
    const skipFirst = options?.skipFirst ?? 0;
    const skipLast = options?.skipLast ?? 0;
    const sliced = skipFirst !== 0 || skipLast !== 0;
    const build: TExoBuild<TItem> =
        typeof row === 'function'
            ? (row as TExoBuild<TItem>)
            : (owner, item) => {
                  const node = owner.createExoNode(row);
                  (node as TExoWirableNode).wireExoSelf(item);
                  return node;
              };
    const shownByOwner = new WeakMap<object, Map<unknown, TExoShownRun>>();
    let building: TExoChildrenOwner<object, unknown> | null = null;
    const make = (item: TItem): unknown =>
        build(building as TExoChildrenOwner<object, unknown>, item);
    return (owner, port, items) => {
        const host = owner as unknown as TExoChildrenOwner<object, unknown>;
        const run = runOf(shownByOwner, host, port);
        let kids = (host as unknown as TExoPortChildListOwner).portChildList(port);
        if (sliced) {
            let slice = run.slice;
            if (slice === null) {
                const all = kids;
                slice = sliceOfExoChildren(all, skipFirst, () => all.size - skipFirst - skipLast);
                run.slice = slice;
            }
            kids = slice;
        }
        const outer = building;
        building = host;
        try {
            if (keyOf === undefined) {
                run.keys = reconcileExoOrder(kids, run.keys as TItem[], items, items, make);
                return;
            }
            const keys: unknown[] = new Array<unknown>(items.length);
            for (let k = 0; k < items.length; k++) keys[k] = keyOf(items[k]);
            const before = run.items;
            const beforeKeys = run.keys;
            run.keys = reconcileExoOrder(kids, run.keys, keys, items, make);
            if (before !== null && beforeKeys.length > 0) {
                const itemOf = new Map<unknown, unknown>();
                for (let k = 0; k < beforeKeys.length; k++) itemOf.set(beforeKeys[k], before[k]);
                for (let k = 0; k < items.length; k++) {
                    const was = itemOf.get(keys[k]);
                    if (was !== undefined && was !== items[k]) {
                        (kids.at(k) as TExoWirableNode).wireExoSelf(items[k]);
                    }
                }
            }
            run.items = items.slice();
        } finally {
            building = outer;
        }
    };
}
