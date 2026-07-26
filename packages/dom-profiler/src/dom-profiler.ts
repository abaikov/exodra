import { ExoNodeDom } from '@exodra/dom';
import {
    profileClass,
    type TExoProfileOptions,
    type TExoProfileSample,
} from './profile-class';

// Aggregated timing for one profiled method.
export interface TExoDomProfileEntry {
    method: string;
    count: number;
    totalMs: number;
    avgMs: number;
    maxMs: number;
}

export interface TExoDomProfiler {
    // Aggregated report so far, sorted by total time (heaviest first).
    getReport(): TExoDomProfileEntry[];
    // Clear collected samples (keep profiling active).
    reset(): void;
    // Restore `ExoNodeDom`'s original methods and return the final report.
    stop(): TExoDomProfileEntry[];
}

/**
 * Profile the live Exodra DOM renderer (`ExoNodeDom`): patches its methods
 * (`buildTree`, `updateChildren`, `setupBindings`, `applyStatic`, …) to record how
 * long each takes and how often it runs. Works wherever `ExoNodeDom` runs — the
 * browser, jsdom, or Node with a DOM shim — since timing uses `performance.now()`
 * with a `Date.now()` fallback.
 *
 * Patching is global (all `ExoNodeDom` instances are profiled) and reversible —
 * call `stop()` to restore the class and read the final report.
 *
 * ```ts
 * const p = profileDom();
 * mount(app, container);        // exercise the renderer
 * console.table(p.stop());      // per-method count / total / avg / max (ms)
 * ```
 */
export function profileDom(options: TExoProfileOptions = {}): TExoDomProfiler {
    const samples = new Map<string, { count: number; total: number; max: number }>();

    const record = (sample: TExoProfileSample): void => {
        let entry = samples.get(sample.method);
        if (!entry) samples.set(sample.method, (entry = { count: 0, total: 0, max: 0 }));
        entry.count += 1;
        entry.total += sample.durationMs;
        if (sample.durationMs > entry.max) entry.max = sample.durationMs;
    };

    const restore = profileClass(
        ExoNodeDom as unknown as new (...args: never[]) => object,
        record,
        options
    );

    const getReport = (): TExoDomProfileEntry[] =>
        [...samples.entries()]
            .map(([method, e]) => ({
                method,
                count: e.count,
                totalMs: e.total,
                avgMs: e.total / e.count,
                maxMs: e.max,
            }))
            .sort((a, b) => b.totalMs - a.totalMs);

    return {
        getReport,
        reset: () => samples.clear(),
        stop: () => {
            restore();
            return getReport();
        },
    };
}
