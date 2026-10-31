export type TExoKeyedList<TItem> = {
    reconcile(items: readonly TItem[]): void;
};
