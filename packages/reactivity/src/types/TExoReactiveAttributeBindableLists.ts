import type { TExoBindableList } from './TExoBindableList';

export type TExoReactiveAttributeBindableLists = Record<
    string,
    TExoBindableList<unknown, unknown>
>;
