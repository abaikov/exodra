import { createElement, type ReactElement } from 'react';
import { useExoMount } from './useExoMount';
import type { TExoMountProps } from './types/TExoMountProps';

export function ExoMount<TParams = unknown>(props: TExoMountProps<TParams>): ReactElement {
    const { component, html, hydrate, deps, params, backend, className, id, style } = props;
    const { ref } = useExoMount<HTMLDivElement, TParams>(component, {
        hydrate: hydrate ?? html !== undefined,
        deps,
        params,
        backend,
    });

    return createElement('div', {
        ref,
        className,
        id,
        style,
        // Without this, React's hydration objects to the nodes Exodra is about to take over.
        suppressHydrationWarning: true,
        ...(html !== undefined ? { dangerouslySetInnerHTML: { __html: html } } : {}),
    });
}
