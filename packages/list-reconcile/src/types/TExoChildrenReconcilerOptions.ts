export type TExoChildrenReconcilerOptions<TItem> = {
    readonly key?: (item: TItem) => unknown;
    readonly skipFirst?: number;
    readonly skipLast?: number;
};
