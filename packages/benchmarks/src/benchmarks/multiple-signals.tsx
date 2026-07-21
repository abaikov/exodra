// Benchmark: Multiple signals updates
// Tests: Performance when updating many signals simultaneously

import type { BenchmarkResult, ReactiveBenchmarkFramework } from '../types';
import { finalizeBenchmarkResult } from '../benchmark-utils';

export async function benchmarkMultipleSignals(
    framework: ReactiveBenchmarkFramework,
    iterations: number = 500
): Promise<BenchmarkResult> {
    const times: number[] = [];
    const signalCount = 50; // Number of signals to update

    if (framework === 'exodra') {
        const { createExoBindable } = await import('@exodra/reactivity');
        const { h } = await import('../exodra/schema');
        const { mountExodra, unmountExodra } = await import('../exodra/mount');

        const bindables = Array.from({ length: signalCount }, (_, i) =>
            createExoBindable(i)
        );

        const container = document.createElement('div');
        document.body.appendChild(container);

        const node = mountExodra(container, {
            type: 'div',
            attrs: {
                constants: {
                    children: bindables.map(bindable =>
                        h('span', { bindables: { textContent: bindable } })
                    ),
                },
            },
        });

        for (let i = 0; i < 10; i++) {
            for (let idx = 0; idx < signalCount; idx++) {
                bindables[idx].setValue(i * signalCount + idx);
            }
        }

        for (let idx = 0; idx < signalCount; idx++) {
            bindables[idx].setValue(100 + idx);
        }
        if (!container.textContent?.includes('100')) {
            throw new Error('Exodra multiple signals not rendering!');
        }

        console.log('✅ Exodra multiple signals verification passed');

        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            // Use for loop instead of forEach for better performance
            for (let idx = 0; idx < signalCount; idx++) {
                bindables[idx].setValue(i * signalCount + idx);
            }
            times.push(performance.now() - start);
        }

        unmountExodra(container, node);
    } else if (framework === 'solid') {
        const { createSignal, For } = await import('solid-js');
        const { render } = await import('solid-js/web');

        const setters: Array<((value: number) => void)> = [];

        const App = () => {
            const signalPairs = Array.from({ length: signalCount }, (_, i) => {
                const [value, setValue] = createSignal(i);
                setters.push(setValue);
                return { value, index: i };
            });

            return (
                <div>
                    <For each={signalPairs}>
                        {pair => <span>{pair.value()}</span>}
                    </For>
                </div>
            );
        };

        const container = document.createElement('div');
        document.body.appendChild(container);

        const dispose = render(() => <App />, container);

        if (setters.length !== signalCount) {
            throw new Error('SolidJS signals not initialized');
        }

        // Warm up
        for (let i = 0; i < 10; i++) {
            for (let idx = 0; idx < signalCount; idx++) {
                setters[idx](i * signalCount + idx);
            }
        }

        // Verify it works
        for (let idx = 0; idx < signalCount; idx++) {
            setters[idx](100 + idx);
        }
        await new Promise(resolve => setTimeout(resolve, 10));
        const hasContent = container.textContent?.includes('100') === true;
        if (!hasContent) {
            throw new Error('SolidJS multiple signals not rendering!');
        }

        console.log('✅ SolidJS multiple signals verification passed');

        // Actual benchmark
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            // Update all signals using for loop
            for (let idx = 0; idx < signalCount; idx++) {
                setters[idx](i * signalCount + idx);
            }
            times.push(performance.now() - start);
        }

        dispose();
        document.body.removeChild(container);
    } else if (framework === 'svelte') {
        throw new Error('Svelte multiple signals benchmark not implemented');
    }

    return finalizeBenchmarkResult(
        'Multiple Signals',
        framework,
        iterations,
        times
    );
}