export interface BenchmarkResult {
    name: string;
    framework: BenchmarkFramework;
    operations: number;
    totalTime: number;
    avgTime: number;
    medianTime: number;
    minTime: number;
    maxTime: number;
    /**
     * Retained JS heap (bytes) for one instance of the benchmarked structure —
     * the "at what cost" number next to speed. Only populated where measured and
     * when the engine exposes `performance.memory` (Chromium). Undefined otherwise.
     */
    heapUsedBytes?: number;
}

export type BenchmarkFramework =
    | 'exodra'
    | 'exodra-runtime'
    | 'exodra-raw-iterative'
    | 'solid'
    | 'svelte'
    | 'react';

export type ReactiveBenchmarkFramework = 'exodra' | 'solid' | 'svelte';
