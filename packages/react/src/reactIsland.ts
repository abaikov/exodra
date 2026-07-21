import { h } from '@exodra/core';
import type { TExoSchema } from '@exodra/core';
import { createElement, type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';

/**
 * Minimal structural shape of an Exodra bindable's read side. A real
 * `TExoBindable<T>` from `@exodra/reactivity` satisfies this, so callers can
 * pass one directly without this package depending on `@exodra/reactivity`.
 */
export interface ReadableBindable<T> {
    getValue(): T;
    subscribe(listener: (value: T) => void): () => void;
}

export interface ReactIslandOptions {
    /** Tag name for the host element React mounts into. Default: `'div'`. */
    tag?: string;
}

function isReadableBindable(value: unknown): value is ReadableBindable<unknown> {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as { getValue?: unknown }).getValue === 'function' &&
        typeof (value as { subscribe?: unknown }).subscribe === 'function'
    );
}

/**
 * Render a React component as an island inside an Exodra tree.
 *
 * Exodra owns the host element; React owns everything inside it. The React tree
 * is mounted in the host's `onExoMount` (via `createRoot`) and torn down in
 * `onExoUnmount` (`root.unmount()` + unsubscribe) — so it participates correctly
 * in Exodra's list/keyed lifecycle, including nodes added or removed later.
 *
 * Props are fully typed off the component: pass a plain `P` for a static island,
 * or a `TExoBindable<P>` (anything with `getValue`/`subscribe`) for a reactive
 * one — each emit re-renders the island with fresh props.
 *
 * @example
 * const props = bindable<ChartProps>({ series: [], theme: 'dark' });
 * const schema = reactIsland(Chart, props);   // ✅ props checked against ChartProps
 */
export function reactIsland<P extends object>(
    component: ComponentType<P>,
    props: P | ReadableBindable<P>,
    options: ReactIslandOptions = {}
): TExoSchema {
    let root: Root | null = null;
    let unsubscribe: (() => void) | undefined;

    const reactive = isReadableBindable(props);
    const read = (): P =>
        reactive ? (props as ReadableBindable<P>).getValue() : (props as P);

    return h(options.tag ?? 'div', {
        static: {
            'data-exo-react': '',
            onExoMount: (node: { element: unknown }) => {
                root = createRoot(node.element as Element | DocumentFragment);
                const render = (): void => {
                    root?.render(createElement(component, read()));
                };
                render();
                if (reactive) {
                    unsubscribe = (props as ReadableBindable<P>).subscribe(() =>
                        render()
                    );
                }
            },
            onExoUnmount: () => {
                unsubscribe?.();
                unsubscribe = undefined;
                root?.unmount();
                root = null;
            },
        },
    });
}
