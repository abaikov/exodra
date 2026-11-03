import type { TExoMachine } from '@exodra/core';
import type { TExoChildList } from '@exodra/dom';
import type {
    TOIMBucketContentSlot,
    TOIMBucketSlotsArrayStore,
    TOIMDisposer,
    TOIMSlot,
} from '@oimdb/core';

export type TExoOimBucketListOptions<TNode, TWiring, TMember extends TOIMSlot> = {
    readonly rows: (c: TNode) => TExoChildList;
    readonly cell: (c: TNode) => number;
    readonly row: TExoMachine<TWiring, unknown, TMember>;
    readonly bucket: (
        c: TNode
    ) => TOIMBucketContentSlot<TOIMBucketSlotsArrayStore<TMember>, TMember>;
    readonly reselectOn?: (c: TNode) => readonly { watch(body: () => void): TOIMDisposer }[];
};
