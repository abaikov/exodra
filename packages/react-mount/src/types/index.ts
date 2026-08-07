import type { TExoSchema } from '@exodra/core';

/**
 * What to mount. A FACTORY is the normal choice: it runs once per mount, so the
 * schema is fresh each time (React StrictMode mounts twice in development, and a
 * client-side route change mounts again). A schema object works too — it is
 * re-usable after dispose — but building it in render would allocate a tree on
 * every React render for nothing.
 */
export type TExoMountSource = TExoSchema | (() => TExoSchema);

export type TExoMountOptions = {
    /**
     * Adopt server-rendered markup already inside the container instead of
     * building the DOM from scratch. Falls back to a fresh mount when there is
     * nothing to adopt — which is what happens on a client-side navigation, and
     * on StrictMode's second pass.
     */
    hydrate?: boolean;
    /**
     * Re-mount when one of these changes, like a `useEffect` dependency array.
     * Defaults to "mount once". The array must keep a stable length between
     * renders, exactly as React requires of any dependency list.
     */
    deps?: readonly unknown[];
};

export type TExoMountProps = TExoMountOptions & {
    /** The Exodra tree to mount into this element. */
    schema: TExoMountSource;
    /**
     * Server-rendered HTML for the subtree (from `renderToString`). Rendered into
     * the container by React on the server AND in the initial client HTML, then
     * adopted by Exodra on mount — so the first paint is the finished UI and
     * hydration only attaches behaviour. Implies `hydrate`.
     */
    html?: string;
    className?: string;
    id?: string;
    style?: Record<string, string | number>;
};
