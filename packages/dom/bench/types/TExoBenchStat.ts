/** The full spread of one variant's samples. One figure hides a bimodal run; five do not. */
export type TExoBenchStat = {
    readonly min: number;
    readonly p25: number;
    readonly median: number;
    readonly p75: number;
    readonly max: number;
};
