import type { TExoBenchStat } from './TExoBenchStat';

/** One printed line of a result table: a variant's name and its spread. */
export type TExoBenchRow = {
    readonly name: string;
    readonly stat: TExoBenchStat;
};
