/**
 * One CANDIDATE, with the loop that drives it. `drive` takes the whole stream as one argument and
 * owns its loop: a shared driver taking the implementation as a parameter would make the call
 * megamorphic for every candidate alike, a tax no real call site pays.
 */
export type TExoBenchVariant<TStream> = {
    readonly name: string;
    readonly drive: (stream: TStream) => number;
};
