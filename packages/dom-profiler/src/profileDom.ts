import { EXO_DOM_NODE_VOCABULARY } from '@exodra/dom';
import type { TExoDomBackend } from '@exodra/dom';
import type { TExoProfileOptions, TExoProfileSample } from './profileClass';
import { profileMethods } from './profileMethods';

// The pack's keys exclude the six plugin-interface fields, and that exclusion is a correctness
// rule: a schema SPENDS those fields when it compiles, so a wrapper on one would be baked into any
// schema first rendered while profiling was on and would survive `stop()`. README: "Why the list
// is read off the pack".
const EXO_DOM_METHOD_NAMES: readonly string[] = Object.keys(EXO_DOM_NODE_VOCABULARY);

export interface TExoDomProfileEntry {
    method: string;
    count: number;
    totalMs: number;
    avgMs: number;
    maxMs: number;
}

export interface TExoDomProfiler {
    getReport(): TExoDomProfileEntry[];
    reset(): void;
    stop(): TExoDomProfileEntry[];
}

// Measuring the hot path changes it: read the SHAPE of a report, never its absolute numbers.
// Patching rather than a `withExoProfiling()` pack, because a pack can be neither attached to the
// backend that already exists nor un-composed. Both arguments in full: README.
export function profileDom(
    backend: TExoDomBackend,
    options: TExoProfileOptions = {}
): TExoDomProfiler {
    const samples = new Map<string, { count: number; total: number; max: number }>();

    const record = (sample: TExoProfileSample): void => {
        let entry = samples.get(sample.method);
        if (!entry) samples.set(sample.method, (entry = { count: 0, total: 0, max: 0 }));
        entry.count += 1;
        entry.total += sample.durationMs;
        if (sample.durationMs > entry.max) entry.max = sample.durationMs;
    };

    // The caller's `methods` NARROWS the method set rather than replacing it, so no option can
    // reach the six plugin fields.
    const restore = profileMethods(backend, 'TExoDomNode', record, {
        ...options,
        methods:
            options.methods === undefined
                ? EXO_DOM_METHOD_NAMES
                : options.methods.filter((name) => EXO_DOM_METHOD_NAMES.includes(name)),
    });

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
