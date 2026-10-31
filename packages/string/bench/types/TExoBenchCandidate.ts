/** One row as the CORRECTNESS GATE sees it: a name and the single call the gate compares. */
export type TExoBenchCandidate = {
    readonly name: string;
    readonly answer: (value: string) => string;
};
