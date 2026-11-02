export const EXO_REACT_CHILDREN_RUNTIME = `import { createElement } from 'react';
import type { ComponentType, ReactNode } from 'react';

type TExoChildProps = { params: unknown };

export type TExoChild = {
    readonly key: number;
    readonly component: ComponentType<TExoChildProps>;
    params: unknown;
    element: ReactNode;
    list: TExoChildren | null;
};

export type TExoChildren = {
    readonly size: number;
    at(i: number): TExoChild | undefined;
    insert(child: TExoChild, i?: number): void;
    move(from: number, to: number): void;
    remove(i: number): void;
    removeAll(): void;
    replace(children: TExoChild[]): void;
    publish(): void;
};

let nextKey = 0;

export function buildExoChild(
    component: ComponentType<TExoChildProps>,
    params?: unknown
): TExoChild {
    const key = nextKey++;
    return {
        key,
        component,
        params,
        element: createElement(component, { key, params }),
        list: null,
    };
}

export function wireExoChild(child: TExoChild, _component: unknown, params?: unknown): void {
    child.params = params;
    child.element = createElement(child.component, { key: child.key, params });
    if (child.list !== null) child.list.publish();
}

export function createExoChildren(setNodes: (nodes: ReactNode[]) => void): TExoChildren {
    const items: TExoChild[] = [];
    const list: TExoChildren = {
        get size() {
            return items.length;
        },
        at: (i) => items[i],
        insert(child, i = items.length) {
            child.list = list;
            items.splice(i, 0, child);
            list.publish();
        },
        move(from, to) {
            items.splice(to, 0, items.splice(from, 1)[0]);
            list.publish();
        },
        remove(i) {
            items.splice(i, 1);
            list.publish();
        },
        removeAll() {
            items.length = 0;
            list.publish();
        },
        replace(children) {
            items.length = 0;
            for (const child of children) {
                child.list = list;
                items.push(child);
            }
            list.publish();
        },
        publish() {
            setNodes(items.map((child) => child.element));
        },
    };
    return list;
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

export function reconcileExoOrder<TKey, TItem>(
    kids: TExoChildren,
    shown: TKey[],
    keys: readonly TKey[],
    want: readonly TItem[],
    build: (item: TItem) => TExoChild
): TKey[] {
    const kept = new Map<TKey, TExoChild>();
    for (let i = 0; i < shown.length; i++) {
        const child = kids.at(i);
        if (child !== undefined && !kept.has(shown[i])) kept.set(shown[i], child);
    }
    const next: TExoChild[] = [];
    for (let i = 0; i < keys.length; i++) {
        const child = kept.get(keys[i]);
        if (child !== undefined) {
            kept.delete(keys[i]);
            next.push(child);
        } else {
            next.push(build(want[i]));
        }
    }
    kids.replace(next);
    return keys.slice();
}
`;
