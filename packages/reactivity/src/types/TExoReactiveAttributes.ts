import type { TExoReactiveAttributeBindableLists } from './TExoReactiveAttributeBindableLists';
import type { TExoReactiveAttributeBindables } from './TExoReactiveAttributeBindables';
import type { TExoReactiveAttributeConstants } from './TExoReactiveAttributeConstants';

export type TExoReactiveAttributes<
    TConstants extends TExoReactiveAttributeConstants = TExoReactiveAttributeConstants,
    TBindables extends TExoReactiveAttributeBindables = TExoReactiveAttributeBindables,
    TBindableLists extends TExoReactiveAttributeBindableLists = TExoReactiveAttributeBindableLists
> = {
    static: TConstants;
    bindables: TBindables;
    bindableLists: TBindableLists;
};
