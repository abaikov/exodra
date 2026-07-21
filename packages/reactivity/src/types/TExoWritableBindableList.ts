import type { TExoBindableList } from './TExoBindableList';
import type { TExoListOp } from './TExoListOp';

export type TExoWritableBindableList<
    TItem = unknown,
    TEvent = TExoListOp<TItem>
> = TExoBindableList<TItem, TEvent> & {
    insert(index: number, item: TItem): void;
    push(item: TItem): void;
    remove(index: number, count?: number): void;
    move(from: number, to: number, count?: number): void;
    set(index: number, item: TItem): void;
    reset(items: readonly TItem[]): void;
};
