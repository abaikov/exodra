import { exoBenchRefuse } from './exoBenchRefuse';
import type { TExoBenchArgs } from './types/TExoBenchArgs';

/**
 * `<rounds> <calls-per-sample>`, both optional. Returns `null` after printing the usage, which the
 * caller treats as "print nothing further" — a bench that cannot read its own arguments must not
 * go on and produce a table under a number nobody chose.
 */
export function readExoBenchArgs(rounds: number, calls: number): TExoBenchArgs | null {
    const args = process.argv.slice(2);
    const wantRounds = Number(args[0] ?? String(rounds));
    const wantCalls = Number(args[1] ?? String(calls));
    if (
        !Number.isFinite(wantRounds) ||
        !Number.isFinite(wantCalls) ||
        wantRounds < 2 ||
        wantCalls < 1
    ) {
        exoBenchRefuse(`usage: <rounds:int≥2> <calls-per-sample:int≥1>; got ${args.join(' ')}`);
        return null;
    }
    return { rounds: wantRounds, calls: wantCalls };
}
