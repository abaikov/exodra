import { h, type TExoContext, type TExoSchema } from '@exodra/core';
import { bindable } from '@exodra/reactivity';
import { createRouter } from './createRouter';
import { routerContextKey, useRouter } from './context';
import { resolveRouteComponent, isLazyLoader } from './lazy';
import type {
    TExoHistory,
    TExoRoute,
    TExoRouteComponent,
    TExoRouteMatch,
    TExoRouteRenderer,
    TExoRouter,
} from './types';

type TExoRouterChild = TExoSchema | readonly TExoSchema[] | null | undefined;

// Runtime attrs shape as read by these components. Extends the schema's static
// bucket with the `handlers` bucket, which the router relies on but which the
// core `TExoSchema` attrs type does not declare.
type TExoRouterAttrs = TExoSchema['attrs'] & {
    handlers?: Record<string, unknown>;
};

function getAttrs(schema: { attrs: unknown }): TExoRouterAttrs {
    return schema.attrs as TExoRouterAttrs;
}

function readBindableValue(bindable: unknown): unknown {
    if (
        typeof bindable === 'object' &&
        bindable !== null &&
        'getValue' in bindable &&
        typeof (bindable as { getValue: unknown }).getValue === 'function'
    ) {
        return (bindable as { getValue: () => unknown }).getValue();
    }
    return undefined;
}

function readBindableItems(list: unknown): unknown {
    if (
        typeof list === 'object' &&
        list !== null &&
        'getItems' in list &&
        typeof (list as { getItems: unknown }).getItems === 'function'
    ) {
        return (list as { getItems: () => unknown }).getItems();
    }
    return undefined;
}

type TExoRouterProviderProps = {
    router?: TExoRouter;
    routes?: readonly TExoRoute[];
    history?: TExoHistory;
    children?: TExoRouterChild;
};

type TExoOutletProps = {
    as?: string;
    fallback?: TExoRouterChild;
    suspense?: TExoRouterChild;
};

type TExoLinkProps = Record<string, unknown> & {
    to: string;
    replace?: boolean;
    target?: string;
    download?: unknown;
    onClick?: (event: MouseEvent) => void;
    children?: TExoRouterChild;
};

type TExoRouteProps = {
    id?: string;
    path: string;
    component: TExoRouteComponent;
    children?: TExoRouterChild;
};

type TExoRoutesProps = {
    router?: TExoRouter;
    routes?: readonly TExoRoute[];
    history?: TExoHistory;
    as?: string;
    fallback?: TExoRouterChild;
    children?: TExoRouterChild;
};

export function RouterProvider(context: TExoContext): TExoSchema | readonly TExoSchema[] {
    const props = getProps<TExoRouterProviderProps>(context);
    const router =
        props.router ??
        createRouter(props.routes ?? [], {
            history: props.history,
        });

    context.provide(routerContextKey, router);
    context.onDispose(() => {
        router.dispose();
    });

    return normalizeChildren(props.children);
}

export function Outlet(context: TExoContext): TExoSchema {
    const props = getProps<TExoOutletProps>(context);
    const router = useRouter(context);
    const schemaCache = new Map<string, TExoSchema | readonly TExoSchema[]>();
    const children = bindable<TExoSchema | readonly TExoSchema[]>(
        renderMatchSync(router.getMatch(), props.fallback, props.suspense, schemaCache)
    );
    const update = () => {
        children.setValue(renderMatchSync(router.getMatch(), props.fallback, props.suspense, schemaCache));
    };

    context.onDispose(router.match.subscribe(update));
    context.onDispose(router.navigationState.subscribe(update));

    return h(props.as ?? 'div', {
        bindables: {
            children,
        },
    });
}

export function Link(context: TExoContext): TExoSchema {
    const router = useRouter(context);
    const props = getProps<TExoLinkProps>(context);
    const {
        to,
        replace,
        children,
        onClick,
        target,
        download,
        ...anchorProps
    } = props;
    const href = isAbsoluteUrl(to) ? to : router.createHref(to);

    // New engine convention: attributes go to static, handlers go to handlers bucket
    return h('a', {
        static: {
            ...anchorProps,
            href,
            target,
            download,
            children,
        },
        handlers: {
            onClick: (event: Event) => {
                onClick?.(event as MouseEvent);

                if (
                    shouldIgnoreLinkClick(event as MouseEvent, {
                        href,
                        target,
                        download,
                    })
                ) {
                    return;
                }

                event.preventDefault();
                router.navigate(to, { replace });
            },
        },
    });
}

export function Routes(context: TExoContext): TExoSchema {
    const props = getProps<TExoRoutesProps>(context);
    const router =
        props.router ??
        createRouter(props.routes ?? createRoutesFromChildren(props.children), {
            history: props.history,
        });

    context.provide(routerContextKey, router);
    context.onDispose(() => {
        router.dispose();
    });

    return h(Outlet, {
        static: {
            as: props.as,
            fallback: props.fallback,
        }
    });
}

export function Route(_context: TExoContext): readonly TExoSchema[] {
    return [];
}

export function createRoutesFromChildren(
    children: TExoRouterChild
): readonly TExoRoute[] {
    return normalizeChildren(children).map(createRouteFromSchema);
}

function createRouteFromSchema(schema: TExoSchema): TExoRoute {
    if (schema.type !== Route) {
        throw new Error('Routes children must be Route components.');
    }

    // Extract props from bucketed attributes
    const props = {} as TExoRouteProps;
    
    // Check constants bucket
    const constants = getAttrs(schema).static;
    if (constants) {
        Object.assign(props, constants);
    }

    // For backward compatibility, also check direct attributes
    if (schema.attrs && typeof schema.attrs === 'object') {
        for (const [key, value] of Object.entries(schema.attrs)) {
            if (key !== 'static' && key !== 'bindables' && key !== 'bindableLists') {
                (props as Record<string, unknown>)[key] = value;
            }
        }
    }
    
    const children = props.children
        ? createRoutesFromChildren(props.children)
        : undefined;

    return {
        id: props.id,
        path: props.path,
        component: props.component,
        children,
    };
}

function renderMatchSync(
    match: TExoRouteMatch | undefined,
    fallback: TExoRouterChild,
    suspense: TExoRouterChild,
    schemaCache: Map<string, TExoSchema | readonly TExoSchema[]>
): TExoSchema | readonly TExoSchema[] {
    if (!match) {
        return normalizeChildren(fallback);
    }

    const key = getMatchCacheKey(match);
    const cachedSchema = schemaCache.get(key);
    if (cachedSchema) {
        return cachedSchema;
    }

    if (isLazyLoader(match.route.component)) {
        if (suspense) {
            renderMatchAsync(match, fallback, suspense, schemaCache);
            return normalizeChildren(suspense);
        }
    }

    try {
        const schema = renderRouteComponent(match.route.component, match);
        schemaCache.set(key, schema);
        return schema;
    } catch (error) {
        console.error('Failed to render route component:', error);
        return normalizeChildren(fallback);
    }
}

async function renderMatchAsync(
    match: TExoRouteMatch,
    fallback: TExoRouterChild,
    suspense: TExoRouterChild,
    schemaCache: Map<string, TExoSchema | readonly TExoSchema[]>
): Promise<void> {
    const key = getMatchCacheKey(match);
    try {
        const schema = await resolveRouteComponent(match.route.component, match);
        schemaCache.set(key, schema);
    } catch (error) {
        console.error('Failed to load route component:', error);
        schemaCache.set(key, normalizeChildren(fallback));
    }
}

function renderRouteComponent(
    component: TExoRouteComponent,
    match: TExoRouteMatch
): TExoSchema | readonly TExoSchema[] {
    if (typeof component === 'function' && component.length > 0) {
        return (component as TExoRouteRenderer)(match);
    }

    if (typeof component === 'function' && component.length === 0) {
        throw new Error('Lazy component should be resolved before rendering');
    }

    return component as TExoSchema | readonly TExoSchema[];
}

function getMatchCacheKey(match: TExoRouteMatch): string {
    return `${match.route.id ?? match.route.path}:${JSON.stringify(match.params)}`;
}

function normalizeChildren(children: TExoRouterChild): TExoSchema[] {
    if (children === undefined || children === null) {
        return [];
    }

    return Array.isArray(children)
        ? [...(children as readonly TExoSchema[])]
        : [children as TExoSchema];
}

function getProps<TProps extends Record<string, unknown>>(context: TExoContext): TProps {
    const props: Record<string, unknown> = {};
    
    const attrs = getAttrs(context.schema);

    // Collect constants
    const constants = attrs.static;
    if (constants) {
        Object.assign(props, constants);
    }

    // Collect handlers
    const handlers = attrs.handlers;
    if (handlers) {
        Object.assign(props, handlers);
    }

    // Collect bindables (get their current values)
    const bindables = attrs.bindables;
    if (bindables) {
        for (const [key, bindable] of Object.entries(bindables)) {
            props[key] = readBindableValue(bindable);
        }
    }

    // Collect bindable lists (get their current values)
    const bindableLists = attrs.bindableLists;
    if (bindableLists) {
        for (const [key, list] of Object.entries(bindableLists)) {
            props[key] = readBindableItems(list);
        }
    }
    
    // For backward compatibility, also check direct attributes
    if (context.schema.attrs && typeof context.schema.attrs === 'object') {
        for (const [key, value] of Object.entries(context.schema.attrs)) {
            if (key !== 'static' && key !== 'bindables' && key !== 'bindableLists' && key !== 'handlers' && key !== 'bindableHandlers') {
                props[key] = value;
            }
        }
    }
    
    return props as TProps;
}

function shouldIgnoreLinkClick(
    event: MouseEvent,
    props: {
        href: string;
        target?: string;
        download?: unknown;
    }
): boolean {
    return (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.altKey ||
        event.ctrlKey ||
        event.shiftKey ||
        Boolean(props.download) ||
        (Boolean(props.target) && props.target !== '_self') ||
        isExternalUrl(props.href)
    );
}

function isAbsoluteUrl(url: string): boolean {
    return /^[a-z][a-z\d+.-]*:/i.test(url) || url.startsWith('//');
}

function isExternalUrl(url: string): boolean {
    if (!isAbsoluteUrl(url)) {
        return false;
    }

    const browserWindow = globalThis.window;
    if (!browserWindow) {
        return true;
    }

    try {
        return new URL(url, browserWindow.location.href).origin !==
            browserWindow.location.origin;
    } catch {
        return true;
    }
}
