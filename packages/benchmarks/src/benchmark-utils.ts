import type { BenchmarkFramework, BenchmarkResult } from './types';

export const DEFAULT_DISCARD_FIRST = 'tenPercent' as const;

// --- memory ---------------------------------------------------------------
// The "at what cost" side of the story. `performance.memory` is Chromium‑only;
// `globalThis.gc` needs Chromium launched with `--js-flags=--expose-gc` (the
// headless runner does). Without them these degrade to noisier/undefined values.

type PerfMemory = { memory?: { usedJSHeapSize: number } };

export function readHeapBytes(): number | undefined {
    const mem = (performance as unknown as PerfMemory).memory;
    return mem ? mem.usedJSHeapSize : undefined;
}

export function gcIfPossible(): void {
    const gc = (globalThis as { gc?: () => void }).gc;
    if (gc) {
        gc();
        gc();
    }
}

/**
 * Retained JS heap for one mounted instance of a structure: GC, baseline,
 * mount, GC, measure, then clean up. `mount` returns a teardown callback.
 * Returns bytes retained, or undefined if the engine doesn't expose heap size.
 */
export async function measureRetainedHeap(
    mount: () => (() => void) | Promise<() => void>
): Promise<number | undefined> {
    gcIfPossible();
    const before = readHeapBytes();
    const cleanup = await mount();
    gcIfPossible();
    const after = readHeapBytes();
    cleanup();
    if (before === undefined || after === undefined) return undefined;
    return Math.max(0, after - before);
}

export function discardWarmupSamples(
    times: number[],
    discardFirst: number | 'tenPercent' = DEFAULT_DISCARD_FIRST
): number[] {
    const discard =
        discardFirst === 'tenPercent'
            ? Math.min(Math.floor(times.length * 0.1), 100)
            : discardFirst;

    return times.slice(discard);
}

export function summarizeTimes(
    times: number[],
    discardFirst: number | 'tenPercent' = DEFAULT_DISCARD_FIRST
): Pick<
    BenchmarkResult,
    'totalTime' | 'avgTime' | 'minTime' | 'maxTime' | 'medianTime'
> {
    const samples = discardWarmupSamples(times, discardFirst);

    if (samples.length === 0) {
        throw new Error('No benchmark samples left after discarding warmup');
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const totalTime = samples.reduce((sum, time) => sum + time, 0);
    const mid = Math.floor(sorted.length / 2);
    const medianTime =
        sorted.length % 2 === 0
            ? (sorted[mid - 1]! + sorted[mid]!) / 2
            : sorted[mid]!;

    return {
        totalTime,
        avgTime: totalTime / samples.length,
        minTime: sorted[0]!,
        maxTime: sorted[sorted.length - 1]!,
        medianTime,
    };
}

export function measureBatchedOps(
    iterations: number,
    run: () => void
): { totalTime: number; avgTime: number } {
    const start = performance.now();
    run();
    const totalTime = performance.now() - start;

    return {
        totalTime,
        avgTime: totalTime / iterations,
    };
}

export function finalizeBenchmarkResult(
    name: string,
    framework: BenchmarkFramework,
    operations: number,
    times: number[],
    options?: {
        discardFirst?: number | 'tenPercent';
        warnIfSuspiciouslyFast?: boolean;
        heapUsedBytes?: number;
    }
): BenchmarkResult {
    const stats = summarizeTimes(times, options?.discardFirst ?? DEFAULT_DISCARD_FIRST);

    if (stats.avgTime === 0 && stats.totalTime === 0) {
        throw new Error(
            `${framework} benchmark returned all zeros - likely not working!`
        );
    }

    if (
        options?.warnIfSuspiciouslyFast !== false &&
        stats.medianTime < 0.001 &&
        stats.avgTime < 0.001 &&
        operations > 100
    ) {
        console.warn(
            `⚠️  ${framework} results seem suspiciously fast (median: ${stats.medianTime}ms) - verify work is actually happening`
        );
    }

    return {
        name,
        framework,
        operations,
        ...stats,
        heapUsedBytes: options?.heapUsedBytes,
    };
}

export function finalizeBatchedBenchmarkResult(
    name: string,
    framework: BenchmarkFramework,
    operations: number,
    batches: Array<{ totalTime: number; avgTime: number }>
): BenchmarkResult {
    const totalTime = batches.reduce((sum, batch) => sum + batch.totalTime, 0);
    const avgTime = totalTime / operations;
    const batchAvgs = batches.map(batch => batch.avgTime);

    return {
        name,
        framework,
        operations,
        totalTime,
        avgTime,
        minTime: Math.min(...batchAvgs),
        maxTime: Math.max(...batchAvgs),
        medianTime:
            batchAvgs.length === 1
                ? batchAvgs[0]!
                : (batchAvgs[0]! + batchAvgs[1]!) / 2,
    };
}

/** Prefer median, fall back to avg when timer resolution hides sub-ms work. */
export function scoreTime(
    result: Pick<BenchmarkResult, 'medianTime' | 'avgTime'>
): number {
    return result.medianTime > 0 ? result.medianTime : result.avgTime;
}

/** Frameworks included in default benchmark runs. */
export const ACTIVE_REACTIVE_FRAMEWORKS = [
    'exodra',
    'solid',
    'svelte',
] as const;

export const ACTIVE_DOM_FRAMEWORKS = [
    'exodra',
    'solid',
    'svelte',
    'react',
] as const;
