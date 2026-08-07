import type { TExoContext, TExoSchema } from '@exodra/core';
import { useSsr } from './context';
import { normalizeSchemas } from './normalizeSchemas';

type TExoSsrChild = TExoSchema | readonly TExoSchema[] | null | undefined;

// Props are read through the context API (`getConstant`), the same way every
// other component reads them — not by reaching into `schema.attrs.static`.
// Metadata components render nothing: they only write to the SSR context, so
// each returns an empty child list.

/** `<Head>{…}</Head>` — moves its children into the document `<head>`. */
export function Head(context: TExoContext): readonly TExoSchema[] {
    const children = normalizeSchemas(
        context.getConstant<TExoSsrChild>('children')
    );

    if (children.length > 0) {
        useSsr(context)?.addHead(children);
    }

    return [];
}

/** `<Status code={404} />` — sets the response status. */
export function Status(context: TExoContext): readonly TExoSchema[] {
    useSsr(context)?.setStatus(context.getConstant<number>('code') as number);
    return [];
}

/** `<Header name value append? />` — sets (or appends) a response header. */
export function Header(context: TExoContext): readonly TExoSchema[] {
    const name = context.getConstant<string>('name') as string;
    const value = context.getConstant<string>('value') as string;
    const ssr = useSsr(context);

    if (context.getConstant<boolean>('append')) {
        ssr?.appendHeader(name, value);
    } else {
        ssr?.setHeader(name, value);
    }

    return [];
}

/** `<State name value />` — adds an entry to the serialized SSR state. */
export function State(context: TExoContext): readonly TExoSchema[] {
    useSsr(context)?.setState(
        context.getConstant<string>('name') as string,
        context.getConstant('value')
    );
    return [];
}
