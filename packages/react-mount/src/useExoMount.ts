import { useEffect, useRef, type RefObject } from 'react';
import { hydrate, mount } from '@exodra/dom';
import type { TExoSchema } from '@exodra/core';
import type { TExoMountOptions, TExoMountSource } from './types';

const MOUNT_ONCE: readonly unknown[] = [];

/**
 * Own a piece of the DOM inside a React tree and let Exodra render it.
 *
 * Returns a ref to put on the container element. React renders that element and
 * never looks inside it again; Exodra builds, updates and tears down everything
 * below. The two never diff the same nodes, which is what makes the boundary
 * safe rather than a race.
 *
 * ```tsx
 * const ref = useExoMount(() => h('div', { static: { textContent: 'hi' } }));
 * return <div ref={ref} />;
 * ```
 */
export function useExoMount<TElement extends Element = HTMLDivElement>(
    source: TExoMountSource,
    options: TExoMountOptions = {}
): RefObject<TElement | null> {
    const { hydrate: shouldHydrate = false, deps = MOUNT_ONCE } = options;
    const container = useRef<TElement | null>(null);

    // The latest source is read through a ref so that passing a fresh arrow
    // function on every render (the natural way to write this) does not tear the
    // subtree down and rebuild it. Re-mounting is driven by `deps`, deliberately
    // and only.
    const latestSource = useRef(source);
    latestSource.current = source;

    useEffect(() => {
        const element = container.current;
        if (!element) return;

        const current = latestSource.current;
        const schema: TExoSchema =
            typeof current === 'function' ? current() : current;

        // Hydration adopts the ROOT node the server rendered, which is the
        // container's first element child — the container itself belongs to
        // React. With nothing to adopt (client-side navigation, or StrictMode's
        // second pass after the first one disposed the markup) a plain mount
        // produces the same result, so fall back instead of failing.
        const serverRoot = shouldHydrate ? element.firstElementChild : null;
        const result = serverRoot
            ? hydrate(schema, serverRoot)
            : mount(schema, element);

        return () => {
            result.dispose();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    return container;
}
