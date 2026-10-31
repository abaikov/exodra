import { exoBenchClockGrainMs } from './exoBenchClockGrainMs';
import { exoBenchLine as line } from './exoBenchLine';
import { exoBenchRefuse as refuse } from './exoBenchRefuse';
import type { TExoBenchSuite } from './types/TExoBenchSuite';

export function runExoBench(suite: TExoBenchSuite): void {
    const args = process.argv.slice(2);
    const rounds = Number(args[0] ?? String(suite.defaultRounds));
    const calls = Number(args[1] ?? String(suite.defaultCalls));
    if (!Number.isFinite(rounds) || !Number.isFinite(calls) || rounds < 2 || calls < 1) {
        refuse(`usage: <rounds:int≥2> <calls-per-sample:int≥1>; got ${args.join(' ')}`);
        return;
    }
    const forceGc = (globalThis as { gc?: () => void }).gc;
    const grainMs = exoBenchClockGrainMs();

    line(suite.title);
    line(`  ${suite.subtitle}`);
    line(
        `  ${rounds} rounds × ${calls} calls per sample · interleaved, direction alternating · ` +
            `clock grain ${grainMs.toFixed(6)} ms · GC between samples: ` +
            (forceGc === undefined ? 'NO (run node with --expose-gc to force it)' : 'yes')
    );
    if (!suite.gate()) return;

    for (const table of suite.tables) table(rounds, calls, grainMs);

    suite.epilogue();
}
