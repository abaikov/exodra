import type { TExoContextReadStream } from './TExoContextReadStream';

/** One candidate LOOKUP, with the loop that drives it and the single-call form the gate asks. */
export type TExoContextReadVariant = {
    readonly name: string;
    readonly drive: (stream: TExoContextReadStream) => number;
    readonly answer: (stream: TExoContextReadStream, i: number) => string | undefined;
};
