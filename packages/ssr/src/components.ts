import type { TExoContext, TExoSchema } from '@exodra/core';
import { useSsr } from './context';

type TExoSsrChild = TExoSchema | readonly TExoSchema[] | null | undefined;

type TExoHeadProps = {
    children?: TExoSsrChild;
};

type TExoStatusProps = {
    code: number;
};

type TExoHeaderProps = {
    name: string;
    value: string;
    append?: boolean;
};

type TExoStateProps = {
    name: string;
    value: unknown;
};

export function Head(context: TExoContext): readonly TExoSchema[] {
    const props = getProps<TExoHeadProps>(context);
    const children = normalizeChildren(props.children);

    if (children.length > 0) {
        useSsr(context)?.addHead(children);
    }

    // Return empty array - the Head component should not render anything in body
    return [];
}

export function Status(context: TExoContext): readonly TExoSchema[] {
    const props = getProps<TExoStatusProps>(context);
    useSsr(context)?.setStatus(props.code);
    return [];
}

export function Header(context: TExoContext): readonly TExoSchema[] {
    const props = getProps<TExoHeaderProps>(context);
    const ssr = useSsr(context);

    if (props.append) {
        ssr?.appendHeader(props.name, props.value);
    } else {
        ssr?.setHeader(props.name, props.value);
    }

    return [];
}

export function State(context: TExoContext): readonly TExoSchema[] {
    const props = getProps<TExoStateProps>(context);
    useSsr(context)?.setState(props.name, props.value);
    return [];
}

function getProps<TProps>(context: TExoContext): TProps {
    // With the new h() function, props are in the constants bucket. The
    // context schema's attrs are typed as `unknown`, so narrow structurally.
    const attrs = context.schema.attrs as
        | { static?: unknown }
        | null
        | undefined;

    // If attrs has a constants bucket, return that
    if (attrs?.static) {
        return attrs.static as TProps;
    }

    // Otherwise return attrs directly (for backward compatibility)
    return attrs as unknown as TProps;
}

function normalizeChildren(children: TExoSsrChild): TExoSchema[] {
    if (children === undefined || children === null) {
        return [];
    }

    return Array.isArray(children)
        ? [...(children as readonly TExoSchema[])]
        : [children as TExoSchema];
}
