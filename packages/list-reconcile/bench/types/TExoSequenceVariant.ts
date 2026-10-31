// One candidate for `getExoSequence`, with the loop that drives it and nothing shared.
export type TExoSequenceVariant = {
    readonly name: string;
    readonly differs: string | null;
    readonly answer: (arr: number[]) => number[];
    readonly drive: (arrays: readonly number[][], calls: number) => number;
};
