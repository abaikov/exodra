import { cloneElement } from './cloneElement';
import { isValidElement } from './isValidElement';
import type { TExoReactElement } from './types/TExoReactElement';

function collect(children: unknown, prefix: string, out: [unknown, string][]): void {
    if (children === null || children === undefined || typeof children === 'boolean') return;
    if (Array.isArray(children)) {
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const own = isValidElement(child) && child.key !== null ? '$' + child.key : '.' + i;
            collect(child, prefix === '' ? own : prefix + ':' + own, out);
        }
        return;
    }
    out.push([children, prefix === '' ? '.0' : prefix]);
}

function keyed(child: unknown, key: string): unknown {
    if (!isValidElement(child)) return child;
    const element = child as TExoReactElement;
    return element.key === key ? element : cloneElement(element, { key });
}

export const Children = {
    map<TOut>(children: unknown, fn: (child: unknown, index: number) => TOut): TOut[] {
        const items: [unknown, string][] = [];
        collect(children, '', items);
        const out: TOut[] = [];
        for (let i = 0; i < items.length; i++) {
            const mapped = fn(items[i][0], i);
            if (mapped === null || mapped === undefined) continue;
            out.push(keyed(mapped, items[i][1]) as TOut);
        }
        return out;
    },
    forEach(children: unknown, fn: (child: unknown, index: number) => void): void {
        const items: [unknown, string][] = [];
        collect(children, '', items);
        for (let i = 0; i < items.length; i++) fn(items[i][0], i);
    },
    count(children: unknown): number {
        const items: [unknown, string][] = [];
        collect(children, '', items);
        return items.length;
    },
    toArray(children: unknown): unknown[] {
        const items: [unknown, string][] = [];
        collect(children, '', items);
        return items.map(([child, key]) => keyed(child, key));
    },
    only(children: unknown): TExoReactElement {
        if (!isValidElement(children)) {
            throw new Error('Children.only() expected to receive a single element child.');
        }
        return children;
    },
};
