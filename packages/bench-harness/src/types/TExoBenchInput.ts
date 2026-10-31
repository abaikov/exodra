/**
 * One INPUT SHAPE. `build` runs untimed and hands back everything every candidate needs, so a
 * driver's loop only loads; `size` is how many calls one `drive` makes, which is what the ns-per-call
 * figure is divided by.
 */
export type TExoBenchInput<TStream> = {
    readonly name: string;
    readonly why: string;
    readonly build: (calls: number) => TStream;
    readonly size: (stream: TStream) => number;
    // Rows doing a DIFFERENT job: timed and printed as bounds, never ranked.
    readonly bounds?: readonly string[];
    readonly boundsWhy?: string;
};
