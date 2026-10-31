import type { TExoBenchRow } from './types/TExoBenchRow';
import type { TExoBenchStat } from './types/TExoBenchStat';

export function exoBenchLine(text: string): void {
    console.log(`✅ ${text}`);
}

export function exoBenchRefuse(text: string): void {
    console.log(`❌ ${text}`);
}

export function exoBenchStat(values: readonly number[]): TExoBenchStat {
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

export function exoBenchMedian(values: readonly number[]): number {
    return exoBenchStat(values).median;
}

/**
 * The smallest non-zero step this process's `performance.now()` was seen to take. A difference
 * under it is not a result, and a run that lands there says so rather than ranking on it.
 */
export function exoClockGrainMs(): number {
    let grain = Number.POSITIVE_INFINITY;
    for (let i = 0; i < 500; i++) {
        const start = performance.now();
        let next = performance.now();
        let spins = 0;
        while (next === start && spins < 100000) {
            next = performance.now();
            spins++;
        }
        const step = next - start;
        if (step > 0 && step < grain) grain = step;
    }
    return grain === Number.POSITIVE_INFINITY ? 0 : grain;
}

/** A sorted table with a `×floor` column, fastest first. */
export function exoBenchTable(
    rows: readonly TExoBenchRow[],
    floorName: string,
    unit: string
): void {
    const found = rows.find((row) => row.name === floorName);
    // A floor that does NOTHING — the one told the list did not change — divides into nonsense.
    const floor = found !== undefined && found.stat.median > 0 ? found : undefined;
    const fixed = (x: number): string => x.toFixed(3);
    exoBenchLine(`             min      p25      median   p75      max      ×floor   [${unit}]`);
    for (const row of rows) {
        const ratio = floor === undefined ? '—' : (row.stat.median / floor.stat.median).toFixed(2);
        const star = row.name === rows[0].name ? ' ★' : '';
        exoBenchLine(
            `${row.name.padEnd(12)}${fixed(row.stat.min).padStart(8)} ` +
                `${fixed(row.stat.p25).padStart(8)} ${fixed(row.stat.median).padStart(8)} ` +
                `${fixed(row.stat.p75).padStart(8)} ${fixed(row.stat.max).padStart(8)} ` +
                `${ratio.padStart(8)}${star}`
        );
    }
}

/**
 * A REFUSAL PER ROW, not per table: one variant landing under the clock's grain does not make the
 * others unreadable, and a run that refuses the whole table for it hides the rows that were fine.
 */
export function exoBenchGrainRefusal(
    label: string,
    regionsMs: Readonly<Record<string, number>>,
    grainMs: number,
    rerun: string
): void {
    const thin = Object.keys(regionsMs)
        .filter((name) => regionsMs[name] < grainMs * 3)
        .map((name) => `${name} (${regionsMs[name].toFixed(6)} ms)`);
    if (thin.length === 0) return;
    exoBenchRefuse(
        `${label}: UNDER THREE CLOCK TICKS (grain ${grainMs.toFixed(6)} ms) — ${thin.join(
            ', '
        )}. ` + `Those rows rank the clock and not the code. ${rerun}`
    );
}

/**
 * WHAT THIS RUN CANNOT SEE. `a` and `b` are the same program declared twice, so their true
 * difference is zero: the bias between their medians is free to cancel and is a lower bound, while
 * the median of the round-by-round absolute difference is what the instrument returns when there is
 * nothing there. Anything closer to the leader than that is ranked and NOT separated.
 */
export function exoBenchResolution(
    label: string,
    a: readonly number[] | undefined,
    b: readonly number[] | undefined,
    rows: readonly TExoBenchRow[],
    grainMs: number,
    unit: string
): void {
    if (a === undefined || b === undefined || a.length !== b.length || a.length === 0) {
        exoBenchRefuse(`${label}: no null pair in this field — every gap above is UNJUDGED.`);
        return;
    }
    const paired: number[] = [];
    for (let i = 0; i < a.length; i++) paired.push(Math.abs(a[i] - b[i]));
    const bias = Math.abs(exoBenchMedian(a) - exoBenchMedian(b));
    const scatter = exoBenchMedian(paired);
    exoBenchLine(
        `  resolution — null pair ${exoBenchMedian(a).toFixed(3)} vs ` +
            `${exoBenchMedian(b).toFixed(3)}: bias ${bias.toFixed(3)}, per-round scatter ` +
            `${scatter.toFixed(3)} ${unit} (clock grain ${grainMs.toFixed(6)} ms)`
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
