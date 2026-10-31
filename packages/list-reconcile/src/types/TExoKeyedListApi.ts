import type { TExoKeyedList } from './TExoKeyedList';
import type { TExoPlacedChildren } from './TExoPlacedChildren';

export interface TExoKeyedListApi {
    keyedList<
        TSelf extends { childList(port: TPort): TExoPlacedChildren<unknown> },
        TPort,
        TItem,
        TKey
    >(
        this: TSelf,
        port: TPort,
        keyOf: (item: TItem) => TKey,
        build: (item: TItem, index: number) => TSelf,
        update: (node: TSelf, item: TItem) => void
    ): TExoKeyedList<TItem>;
}
