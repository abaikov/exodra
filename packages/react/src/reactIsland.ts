import type { TExoChildrenPort } from '@exodra/core';
import { createElement, type ComponentType } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import type { TExoReactWiring, TExoReactDomWiring } from './types/TExoReactWiring';
import type { TExoReactIsland } from './types/TExoReactIsland';

export type TExoReactIslandOptions = {
    ssr?: boolean;
};

// Asked of the CONNECTOR, never the environment: `typeof document === 'undefined'` is wrong under
// jsdom and in a browser bundle that pre-renders. Must probe every field `hostElement` indexes.
function isExoDomWiring(c: TExoReactWiring): c is TExoReactDomWiring {
    const dom = c as Partial<TExoReactDomWiring>;
    return dom.nodes !== undefined && dom.schema?.elem !== undefined;
}

// `liveElem` FIRST: an adopting schema's `elem` leaves children-port entries at slot 0 — the
// instance ROOT, not the island host — so hydration hands React the wrong element, nothing thrown.
function hostElement(c: TExoReactDomWiring, port: TExoChildrenPort): Element {
    const schema = c.schema;
    return c.nodes[(schema.liveElem ?? schema.elem)[port.index]] as Element;
}

// The port must be its element's ONLY child — the DOM backend writes raw markup only where nothing
// else would be deleted by it.
export function reactIsland<TProps extends object>(
    c: TExoReactWiring,
    port: TExoChildrenPort,
    component: ComponentType<TProps>,
    props: TProps,
    options: TExoReactIslandOptions = {}
): TExoReactIsland<TProps> {
    if (!isExoDomWiring(c)) {
        // `ssr: false` prints an empty host on purpose: emptiness is what the browser below reads
        // as "mount fresh".
        if (options.ssr !== false) {
            c.unsafeHtml(port, renderToString(createElement(component, props)));
        }
        return { render: () => undefined };
    }

    const host = hostElement(c, port);
    // Hydration and a client render run the same wire, so the markup is the only evidence of which.
    const served = host.hasChildNodes();
    let root: Root;
    if (served) {
        root = hydrateRoot(host, createElement(component, props));
    } else {
        root = createRoot(host);
        root.render(createElement(component, props));
    }

    let stopped = false;
    c.onTeardown(() => {
        stopped = true;
        root.unmount();
    });
    return {
        render: (next: TProps): void => {
            if (!stopped) root.render(createElement(component, next));
        },
    };
}
