import type { TExoListOp } from './TExoListOp';

export type TExoBindableList<
    TItem = unknown,
    TEvent = TExoListOp<TItem>
> = {
    snapshot(): readonly TItem[];
    subscribeOps(update: (event: TEvent) => void): () => void;
};
