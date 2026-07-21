import { h } from '@exodra/core';
import type { TExoSchema } from '@exodra/core';
import { createElement, type ComponentType } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';

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
    /**
     * Server-render the island's markup into the initial HTML (default `true`).
     * On the server the React component is rendered to a string and placed in the
     * host; on the client the island HYDRATES it. Set `false` for a client-only
     * island (empty host on the server, `createRoot` on the client).
     */
    ssr?: boolean;
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
 * Render a React component as an island inside an Exodra tree — now
 * SSR-capable.
 *
 * - **Server:** the React component is rendered to HTML and injected into the
 *   host, so the island's content is in the initial payload (SEO/no CLS).
 * - **Client:** if the host already contains server-rendered content the island
 *   HYDRATES it (`hydrateRoot`); otherwise it mounts fresh (`createRoot`).
 *   Exodra's own hydration leaves the React-owned host children untouched.
 *
 * Props are fully typed off the component: pass a plain `P` (static island) or a
 * `TExoBindable<P>` (reactive island — each emit re-renders it).
 */
export function reactIsland<P extends object>(
    component: ComponentType<P>,
    props: P | ReadableBindable<P>,
    options: ReactIslandOptions = {}
): TExoSchema {
    const tag = options.tag ?? 'div';
    const reactive = isReadableBindable(props);
    const read = (): P =>
        reactive ? (props as ReadableBindable<P>).getValue() : (props as P);

    // SERVER: emit the host with the React component's markup inside it.
    if (options.ssr !== false && typeof document === 'undefined') {
        const html = renderToString(createElement(component, read()));
        return h(tag, {
            static: {
                'data-exo-react': '',
                dangerouslySetInnerHTML: { __html: html },
            },
        });
    }

    // CLIENT: mount, or hydrate when the host was server-rendered.
    let root: Root | null = null;
    let unsubscribe: (() => void) | undefined;

    return h(tag, {
        static: {
            'data-exo-react': '',
            onExoMount: (node: { element: unknown }) => {
                const el = node.element as Element;
                const render = (): void => {
                    root?.render(createElement(component, read()));
                };
                if (el.hasChildNodes()) {
                    // server-rendered content present → hydrate it in place
                    root = hydrateRoot(el, createElement(component, read()));
                } else {
                    root = createRoot(el);
                    render();
                }
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
