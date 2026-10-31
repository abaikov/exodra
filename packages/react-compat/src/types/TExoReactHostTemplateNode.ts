import type { TExoReactHostTemplateKind } from './TExoReactHostTemplateKind';

export type TExoReactHostTemplateNode = {
    readonly tag: string;
    readonly key: string | null;
    readonly props: readonly string[];
    readonly ref: boolean;
    readonly html: boolean;
    readonly wholeRegion: boolean;
    readonly kinds: readonly TExoReactHostTemplateKind[];
    readonly nested: readonly (TExoReactHostTemplateNode | null)[];
    readonly runEnd: readonly number[];
};
