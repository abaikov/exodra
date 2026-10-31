import { exoBenchLine as line } from './exoBenchLine';
import { exoBenchRefuse as refuse } from './exoBenchRefuse';
import type { TExoBenchInput } from './types/TExoBenchInput';
import type { TExoBenchRunner } from './types/TExoBenchRunner';
import type { TExoBenchTable } from './types/TExoBenchTable';
import type { TExoBenchVariant } from './types/TExoBenchVariant';

// The reporting shape is `packages/core/src/attr/bench/exoPropertyKindBench.ts`'s, which is
// `packages/benchmarks/src/harness.ts`'s: interleaved rounds with the direction alternating, the
// full spread rather than one figure, a NULL PAIR whose true difference is zero so the run can say
// what it CANNOT see, and a refusal printed rather than thrown when a timed region lands near the
// clock's own grain.

type TExoBenchStat = {
    min: number;
    p25: number;
    median: number;
    p75: number;
    max: number;
};

type TExoBenchRow = {
    name: string;
    stat: TExoBenchStat;
    bound: boolean;
};

// Consumed by the drivers and printed at the end, so no accumulator can be optimised away.
let sink = 0;

function stat(values: readonly number[]): TExoBenchStat {
    const sorted = [...values].sort((a, b) => a - b);
    const at = (p: number): number =>
        sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
    return {
        min: sorted[0],
        p25: at(0.25),
        median: at(0.5),
        p75: at(0.75),
        max: sorted[sorted.length - 1],
    };
}

function median(values: readonly number[]): number {
    return stat(values).median;
}

function sampleOnce<TShape>(
    variant: TExoBenchVariant<TShape>,
    shape: TShape,
    calls: number
): number {
    const started = performance.now();
    const accumulated = variant.drive(shape);
    const elapsed = performance.now() - started;
    sink += accumulated;
    return (elapsed * 1e6) / calls;
}

/**
 * WHAT THIS RUN CANNOT SEE. The null pair is the same program declared twice, so its true
 * difference is zero: the BIAS between the medians is free to cancel and is therefore a lower
 * bound, while the per-round scatter — the median of the round-by-round absolute difference — is
 * what the instrument really returns when there is nothing there.
 */
function reportResolution<TShape>(
    table: TExoBenchTable<TShape>,
    input: TExoBenchInput<TShape>,
    samples: Readonly<Record<string, number[] | undefined>>,
    rows: readonly TExoBenchRow[],
    grainMs: number
): void {
    const a = samples[table.nullPair[0]];
    const b = samples[table.nullPair[1]];
    if (a === undefined || b === undefined || a.length !== b.length) {
        refuse(`${input.name}: no null pair in this field — every gap above is UNJUDGED.`);
        return;
    }
    const paired: number[] = [];
    for (let i = 0; i < a.length; i++) paired.push(Math.abs(a[i] - b[i]));
    const bias = Math.abs(median(a) - median(b));
    const scatter = median(paired);
    line(
        `  resolution — null pair ${median(a).toFixed(3)} vs ${median(b).toFixed(3)}: ` +
            `bias ${bias.toFixed(3)}, per-round scatter ${scatter.toFixed(3)} ns/call ` +
            `(clock grain ${grainMs.toFixed(6)} ms)`
    );
    const ranked = rows.filter((row) => !row.bound);
    const fastest = ranked[0];
    if (fastest === undefined) return;
    const tied = ranked
        .slice(1)
        .filter((row) => row.stat.median - fastest.stat.median <= scatter)
        .map((row) => `${row.name} (+${(row.stat.median - fastest.stat.median).toFixed(3)})`);
    if (tied.length === 0) {
        line(`  every row is separated from ${fastest.name} by more than the scatter.`);
        return;
    }
    line(
        `  UNRESOLVED vs ${fastest.name}: ${tied.join(', ')} — inside this run's scatter, so ` +
            'they are ranked and NOT separated. Do not quote an order among them.'
    );
}

function runInput<TShape>(
    table: TExoBenchTable<TShape>,
    input: TExoBenchInput<TShape>,
    rounds: number,
    calls: number,
    grainMs: number,
    forceGc: (() => void) | undefined
): void {
    const shape = input.build(calls);
    const perDrive = input.size(shape);
    const bounds = input.bounds ?? [];
    const variants = table.variants;
    const samples: Record<string, number[]> = {};
    for (const variant of variants) samples[variant.name] = [];

    for (let w = 0; w < 10; w++) {
        for (const variant of variants) sampleOnce(variant, shape, perDrive);
    }

    let shortest = Number.POSITIVE_INFINITY;
    for (let round = 0; round < rounds; round++) {
        const shift = round % variants.length;
        const forward = (round & 1) === 0;
        for (let k = 0; k < variants.length; k++) {
            const at = forward
                ? (k + shift) % variants.length
                : (shift + variants.length - 1 - k) % variants.length;
            const variant = variants[at];
            if (forceGc !== undefined) forceGc();
            const nsPerCall = sampleOnce(variant, shape, perDrive);
            const regionMs = (nsPerCall * perDrive) / 1e6;
            if (regionMs < shortest) shortest = regionMs;
            samples[variant.name].push(nsPerCall);
        }
    }

    const rows: TExoBenchRow[] = variants
        .map((variant) => ({
            name: variant.name,
            stat: stat(samples[variant.name]),
            bound: bounds.indexOf(variant.name) !== -1,
        }))
        .sort((a, b) => a.stat.median - b.stat.median);
    const floor = rows.find((row) => row.name === table.floorName);
    const leader = rows.find((row) => !row.bound);
    const fixed = (x: number): string => x.toFixed(3);

    line('');
    line(`${input.name} [ns per call] — ${input.why}`);
    line(`             min      p25      median   p75      max      ${table.floorLabel.padEnd(8)}`);
    for (const row of rows) {
        const ratio = floor === undefined ? '—' : (row.stat.median / floor.stat.median).toFixed(2);
        const mark = row.bound
            ? ' ‡'
            : leader !== undefined && row.name === leader.name
            ? ' ★'
            : '';
        line(
            `${row.name.padEnd(12)}${fixed(row.stat.min).padStart(8)} ` +
                `${fixed(row.stat.p25).padStart(8)} ${fixed(row.stat.median).padStart(8)} ` +
                `${fixed(row.stat.p75).padStart(8)} ${fixed(row.stat.max).padStart(8)} ` +
                `${ratio.padStart(8)}${mark}`
        );
    }
    if (bounds.length > 0) {
        refuse(
            `  ‡ ${bounds.join(', ')} — ${
                input.boundsWhy ?? 'a different job from the ranked rows'
            }` + '. A bound, never a participant and never a winner.'
        );
    }

    if (shortest < grainMs * 3) {
        refuse(
            `${input.name}: the shortest timed region was ${fixed(shortest)} ms against a clock ` +
                `grain of ${grainMs.toFixed(6)} ms — UNDER THREE TICKS, so this table ranks the ` +
                `clock. Re-run with more calls per sample: ... -- ${rounds} ${calls * 8}`
        );
    }

    reportResolution(table, input, samples, rows, grainMs);
}

export function createExoBenchRunner<TShape>(table: TExoBenchTable<TShape>): TExoBenchRunner {
    return (rounds: number, calls: number, grainMs: number): void => {
        line('');
        line(`── ${table.title}`);
        for (const input of table.inputs) {
            runInput(table, input, rounds, calls, grainMs, (globalThis as { gc?: () => void }).gc);
        }
        line(`  sink ${sink} — printed so no accumulator in a driver can be dropped.`);
    };
}
