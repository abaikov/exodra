// Benchmark: Effect performance
// Tests: Reactive effect execution when dependencies change

import type { BenchmarkResult, ReactiveBenchmarkFramework } from '../types';
import { finalizeBenchmarkResult } from '../benchmark-utils';

export async function benchmarkEffectPerformance(
    framework: ReactiveBenchmarkFramework,
    iterations: number = 1000
): Promise<BenchmarkResult> {
    const times: number[] = [];

    if (framework === 'exodra') {
        const { createExoBindable } = await import('@exodra/reactivity');
        const { mountExodra, unmountExodra } = await import('../exodra/mount');

        const count = createExoBindable(0);
        let effectCounter = 0;

        count.subscribe(() => {
            effectCounter++;
            count.getValue();
        });

        const container = document.createElement('div');
        document.body.appendChild(container);

        const node = mountExodra(container, {
            type: 'div',
            attrs: {
                bindables: { textContent: count },
            },
        });

        effectCounter = 0;
        for (let i = 0; i < 10; i++) {
            count.setValue(i);
        }

        const initialCounter = effectCounter;
        count.setValue(100);
        if (effectCounter === initialCounter) {
            throw new Error('Exodra effect not running!');
        }

        console.log('✅ Exodra effect performance verification passed');

        effectCounter = 0;

        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            count.setValue(i);
            times.push(performance.now() - start);
        }

        unmountExodra(container, node);
    } else if (framework === 'solid') {
        const { createSignal, createEffect } = await import('solid-js');
        const { render } = await import('solid-js/web');

        let effectCounter = 0;
        let setCountFn: ((value: number) => void) | null = null;

        const App = () => {
            const [count, setCount] = createSignal(0);
            setCountFn = setCount;

            createEffect(() => {
                effectCounter++;
                count(); // Access signal to create dependency
            });

            return <div>{count()}</div>;
        };

        const container = document.createElement('div');
        document.body.appendChild(container);

        const dispose = render(() => <App />, container);

        if (!setCountFn) {
            throw new Error('setCount not initialized');
        }

        // Warm up
        effectCounter = 0;
        for (let i = 0; i < 10; i++) {
            setCountFn(i);
        }

        // Verify effect runs
        const initialCounter = effectCounter;
        setCountFn(100);
        // Solid effects are batched, wait a bit
        await new Promise(resolve => setTimeout(resolve, 10));
        if (effectCounter === initialCounter) {
            throw new Error('SolidJS effect not running!');
        }

        console.log('✅ SolidJS effect performance verification passed');

        // Reset counter
        effectCounter = 0;

        // Actual benchmark
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            setCountFn(i);
            times.push(performance.now() - start);
        }

        dispose();
        document.body.removeChild(container);
    } else if (framework === 'svelte') {
        // Svelte benchmark - would need a Svelte component
        throw new Error('Svelte effect performance benchmark not implemented');
    }

    return finalizeBenchmarkResult(
        'Effect Performance',
        framework,
        iterations,
        times
    );
}

