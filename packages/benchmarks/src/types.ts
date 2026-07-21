export interface BenchmarkResult {
    name: string;
    framework: BenchmarkFramework;
    operations: number;
    totalTime: number;
    avgTime: number;
    medianTime: number;
    minTime: number;
    maxTime: number;
}

export type BenchmarkFramework =
    | 'exodra'
    | 'exodra-runtime'
    | 'exodra-raw-iterative'
    | 'solid'
    | 'svelte'
    | 'react';

export type ReactiveBenchmarkFramework = 'exodra' | 'solid' | 'svelte';
