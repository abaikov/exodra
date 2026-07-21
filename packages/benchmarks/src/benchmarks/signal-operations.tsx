// Benchmark: Signal read/write operations
// Tests: Basic signal getValue/setValue performance (batched to avoid timer noise)

import type { BenchmarkResult, ReactiveBenchmarkFramework } from '../types';
import {
    finalizeBatchedBenchmarkResult,
    measureBatchedOps,
} from '../benchmark-utils';

export async function benchmarkSignalOperations(
    framework: ReactiveBenchmarkFramework,
    iterations: number = 10000
): Promise<BenchmarkResult> {
    if (framework === 'exodra') {
        const { createExoBindable } = await import('@exodra/reactivity');

        const testBindable = createExoBindable(0);

        for (let i = 0; i < 100; i++) {
            testBindable.setValue(i);
            testBindable.getValue();
        }

        testBindable.setValue(42);
        if (testBindable.getValue() !== 42) {
            throw new Error('Exodra bindable operations failed!');
        }

        console.log('✅ Exodra signal operations verification passed');

        const writeBatch = measureBatchedOps(iterations, () => {
            for (let i = 0; i < iterations; i++) {
                testBindable.setValue(i);
            }
        });

        testBindable.setValue(0);
        const readBatch = measureBatchedOps(iterations, () => {
            for (let i = 0; i < iterations; i++) {
                testBindable.getValue();
            }
        });

        return finalizeBatchedBenchmarkResult(
            'Signal Operations',
            framework,
            iterations * 2,
            [writeBatch, readBatch]
        );
    }

    if (framework === 'solid') {
        const { createSignal } = await import('solid-js');

        const [value, setValue] = createSignal(0);

        for (let i = 0; i < 100; i++) {
            setValue(i);
            value();
        }

        setValue(42);
        if (value() !== 42) {
            throw new Error('SolidJS signal operations failed!');
        }

        console.log('✅ SolidJS signal operations verification passed');

        const writeBatch = measureBatchedOps(iterations, () => {
            for (let i = 0; i < iterations; i++) {
                setValue(i);
            }
        });

        setValue(0);
        const readBatch = measureBatchedOps(iterations, () => {
            for (let i = 0; i < iterations; i++) {
                value();
            }
        });

        return finalizeBatchedBenchmarkResult(
            'Signal Operations',
            framework,
            iterations * 2,
            [writeBatch, readBatch]
        );
    }

    throw new Error('Svelte signal operations benchmark not implemented');
}
