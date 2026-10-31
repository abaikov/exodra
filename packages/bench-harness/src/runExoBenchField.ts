import { EXO_BENCH_SINK } from './constants/EXO_BENCH_SINK';
import { exoBenchForceGc } from './exoBenchForceGc';
import { exoBenchLine } from './exoBenchLine';
import { exoBenchRefuse } from './exoBenchRefuse';
import type { TExoBenchField } from './types/TExoBenchField';
import type { TExoBenchInput } from './types/TExoBenchInput';
import type { TExoBenchVariant } from './types/TExoBenchVariant';

type TSpread = {
    min: number;
    p25: number;
    median: number;
    p75: number;
    max: number;
};

function stat(values: readonly number[]): TSpread {
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

function sampleOnce<TStream>(
    variant: TExoBenchVariant<TStream>,
    stream: TStream,
    size: number
): number {
    const started = performance.now();
    const accumulated = variant.drive(stream);
    const elapsed = performance.now() - started;
    EXO_BENCH_SINK.total += accumulated;
    return (elapsed * 1e6) / size;
}

function reportResolution<TStream>(
    field: TExoBenchField<TStream>,
    input: TExoBenchInput<TStream>,
    samples: Record<string, number[]>,
    rows: readonly { name: string; stat: TSpread }[],
    grainMs: number
): void {
    const a = samples[field.nullPair[0]];
    const b = samples[field.nullPair[1]];
    if (a === undefined || b === undefined || a.length !== b.length) {
        exoBenchRefuse(`${input.name}: no null pair in this field — every gap below is UNJUDGED.`);
        return;
    }
    const paired: number[] = [];
    for (let i = 0; i < a.length; i++) paired.push(Math.abs(a[i] - b[i]));
    const bias = Math.abs(median(a) - median(b));
    const scatter = median(paired);
    exoBenchLine(
        `  resolution — null pair ${median(a).toFixed(3)} vs ${median(b).toFixed(3)}: ` +
            `bias ${bias.toFixed(3)}, per-round scatter ${scatter.toFixed(3)} ns/call ` +
            `(clock grain ${grainMs.toFixed(6)} ms)`
    );
    const fastest = rows[0];
    const tied = rows
        .slice(1)
        .filter((row) => row.stat.median - fastest.stat.median <= scatter)
        .map((row) => `${row.name} (+${(row.stat.median - fastest.stat.median).toFixed(3)})`);
    if (tied.length === 0) {
        exoBenchLine(`  every row is separated from ${fastest.name} by more than the scatter.`);
        return;
    }
    exoBenchLine(
        `  UNRESOLVED vs ${fastest.name}: ${tied.join(', ')} — inside this run's scatter, so ` +
            'they are ranked and NOT separated. Do not quote an order among them.'
    );
}

function runInput<TStream>(
    field: TExoBenchField<TStream>,
    input: TExoBenchInput<TStream>,
    rounds: number,
    calls: number,
    grainMs: number,
    forceGc: (() => void) | undefined
): void {
    const stream = input.build(calls);
    const size = input.size(stream);
    const names = field.variants.map((v) => v.name);
    const width = Math.max(12, ...names.map((n) => n.length + 1));
    const samples: Record<string, number[]> = {};
    for (const name of names) samples[name] = [];

    for (let w = 0; w < 10; w++) {
        for (const variant of field.variants) sampleOnce(variant, stream, size);
    }

    let shortest = Number.POSITIVE_INFINITY;
    for (let round = 0; round < rounds; round++) {
        const shift = round % names.length;
        const forward = (round & 1) === 0;
        for (let k = 0; k < names.length; k++) {
            const at = forward
                ? (k + shift) % names.length
                : (shift + names.length - 1 - k) % names.length;
            const variant = field.variants[at];
            if (forceGc !== undefined) forceGc();
            const nsPerCall = sampleOnce(variant, stream, size);
            const regionMs = (nsPerCall * size) / 1e6;
            if (regionMs < shortest) shortest = regionMs;
            samples[variant.name].push(nsPerCall);
        }
    }

    const rows = names
        .map((name) => ({ name, stat: stat(samples[name]) }))
        .sort((a, b) => a.stat.median - b.stat.median);
    const floor =
        field.floorName === null ? undefined : rows.find((r) => r.name === field.floorName);
    const fixed = (x: number): string => x.toFixed(3);

    exoBenchLine('');
    exoBenchLine(`${input.name} [ns per call] — ${input.why}`);
    exoBenchLine(
        ' '.repeat(width) +
            ['min', 'p25', 'median', 'p75', 'max', floor === undefined ? '—' : '×floor']
                .map((h) => h.padStart(8))
                .join(' ')
    );
    for (const row of rows) {
        const ratio = floor === undefined ? '—' : (row.stat.median / floor.stat.median).toFixed(2);
        const star = row.name === rows[0].name ? ' ★' : '';
        exoBenchLine(
            `${row.name.padEnd(width)}${fixed(row.stat.min).padStart(8)} ` +
                `${fixed(row.stat.p25).padStart(8)} ${fixed(row.stat.median).padStart(8)} ` +
                `${fixed(row.stat.p75).padStart(8)} ${fixed(row.stat.max).padStart(8)} ` +
                `${ratio.padStart(8)}${star}`
        );
    }

    if (floor === undefined) {
        exoBenchRefuse(
            `${input.name}: NO NATIVE FLOOR in this field — the table ranks its participants and ` +
                'cannot say what any of them is worth.'
        );
    }

    if (shortest < grainMs * 3) {
        exoBenchRefuse(
            `${input.name}: the shortest timed region was ${fixed(shortest)} ms against a clock ` +
                `grain of ${grainMs.toFixed(6)} ms — UNDER THREE TICKS, so this table ranks the ` +
                `clock. Re-run with more calls per sample: ... -- ${rounds} ${calls * 8}`
        );
    }

    reportResolution(field, input, samples, rows, grainMs);
}
export function runExoBenchField<TStream>(
    field: TExoBenchField<TStream>,
    rounds: number,
    calls: number,
    grainMs: number
): void {
    const forceGc = exoBenchForceGc();
    exoBenchLine('');
    exoBenchLine(
        `${field.title} — ${field.variants.length} variants × ${field.inputs.length} input shapes`
    );
    for (const input of field.inputs) runInput(field, input, rounds, calls, grainMs, forceGc);
}
