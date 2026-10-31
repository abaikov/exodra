import type { TExoDomSetter } from '../../src/dom/types/TExoDomSetter';

// One way of performing the same write, WITH ITS OWN LOOP. Nothing returns an accumulator: the
// writes land in a document and a document cannot be optimised away.
// `data` is the writer's own datum and is passed at EVERY call, because that is what the hot path
// does — `schema.setters[i](node, value, schema.writeData[i])` — and closing it into an adapter
// would add a frame to the thing being measured.
export type TExoWriteVariant = {
    readonly name: string;
    readonly differs: string | null;
    readonly drive: (
        write: TExoDomSetter,
        data: unknown,
        node: Element,
        values: readonly unknown[],
        calls: number
    ) => void;
};
