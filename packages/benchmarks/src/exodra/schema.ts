import { h } from '@exodra/core';
import type { TExoSchema } from '@exodra/core';
import type {
    TExoBindable,
    TExoBindableList,
    TExoListOp,
} from '@exodra/reactivity';

type ExodraConstants = Record<string, unknown> & {
    children?: ExodraSchema | readonly ExodraSchema[];
    textContent?: unknown;
};

type ExodraBindables = Record<string, TExoBindable<unknown, unknown>> & {
    children?: TExoBindable<
        ExodraSchema | readonly ExodraSchema[] | null,
        unknown
    >;
    textContent?: TExoBindable<unknown, unknown>;
};

type ExodraBindableLists = Record<string, TExoBindableList<unknown, unknown>> & {
    children?: TExoBindableList<ExodraSchema, TExoListOp<ExodraSchema>>;
};

export type ExodraAttrs = {
    static?: ExodraConstants;
    bindables?: ExodraBindables;
    bindableLists?: ExodraBindableLists;
};

export type ExodraSchema = TExoSchema;

type HProps = Record<string, unknown> & {
    children?: ExodraSchema | readonly ExodraSchema[] | null;
    textContent?: unknown;
    bindables?: ExodraBindables;
    bindableLists?: ExodraBindableLists;
};

export { h };

export function li(text: string): ExodraSchema {
    return h('li', { static: { textContent: text } });
}
