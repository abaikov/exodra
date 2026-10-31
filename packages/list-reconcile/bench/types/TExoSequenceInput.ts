/** One `oldOf` shape at one size. Sixteen arrays, cycled, so nothing memoises one of them. */
export type TExoSequenceInput = {
    readonly name: string;
    readonly why: string;
    readonly size: number;
    readonly calls: number;
    readonly arrays: readonly number[][];
};
