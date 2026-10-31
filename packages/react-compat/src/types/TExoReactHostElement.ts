import type { TExoReactElement } from './TExoReactElement';

export type TExoReactHostElement = TExoReactElement & {
    readonly values: readonly unknown[];
    readonly source: TExoReactElement;
};
