import type { TExoBindable } from './TExoBindable';

export type TExoReactiveAttributeBindables = Record<
    string,
    TExoBindable<unknown, unknown>
>;
