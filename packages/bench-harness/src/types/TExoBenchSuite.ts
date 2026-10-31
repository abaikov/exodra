import type { TExoBenchRunner } from './TExoBenchRunner';

export type TExoBenchSuite = {
    readonly title: string;
    readonly subtitle: string;
    /** Runs BEFORE anything is timed. `false` stops the run with nothing timed. */
    readonly gate: () => boolean;
    readonly tables: readonly TExoBenchRunner[];
    /** What a win here buys, with call sites by file and line. Printed after the last table. */
    readonly epilogue: () => void;
    readonly defaultRounds: number;
    readonly defaultCalls: number;
};
