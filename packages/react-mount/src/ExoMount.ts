import { createElement, type ReactElement } from 'react';
import { useExoMount } from './useExoMount';
import type { TExoMountProps } from './types';

/**
 * The component form of {@link useExoMount}: a container element that React
 * renders and Exodra fills.
 *
 * ```tsx
 * <ExoMount schema={() => Chart(data)} className="chart" />
 * ```
 *
 * With `html` (from `renderToString`) the markup ships inside the server-rendered
 * page and Exodra hydrates it, so the first paint needs no JavaScript — the shape
 * a static site generator wants.
 */
export function ExoMount(props: TExoMountProps): ReactElement {
    const { schema, html, hydrate, deps, className, id, style } = props;
    const ref = useExoMount<HTMLDivElement>(schema, {
        hydrate: hydrate ?? html !== undefined,
        deps,
    });

    return createElement('div', {
        ref,
        className,
        id,
        style,
        // React owns this element but NOT its contents: everything below is
        // Exodra's, so React is told to render the server markup verbatim and to
        // stop comparing it. Without this, React's hydration would object to the
        // nodes Exodra is about to take over.
        suppressHydrationWarning: true,
        ...(html !== undefined
            ? { dangerouslySetInnerHTML: { __html: html } }
            : {}),
    });
}
