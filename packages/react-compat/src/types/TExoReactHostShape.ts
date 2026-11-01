import type { TExoReactHostShapeKid } from './TExoReactHostShapeKid';

export type TExoReactHostShape = {
    readonly tag: string;
    readonly key: string | null;
    readonly props: readonly string[];
    readonly values: readonly number[];
    readonly statics: readonly unknown[];
    readonly ref: number;
    readonly part: boolean;
    readonly html: boolean;
    readonly kids: readonly TExoReactHostShapeKid[];
};
