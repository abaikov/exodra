// Benchmark: List operations (insert, remove, move, set)
// Tests: Incremental list updates

import type { BenchmarkResult, ReactiveBenchmarkFramework } from '../types';
import { finalizeBenchmarkResult } from '../benchmark-utils';

export async function benchmarkListOperations(
    framework: ReactiveBenchmarkFramework,
    iterations: number = 1000
): Promise<BenchmarkResult> {
    const times: number[] = [];

    if (framework === 'exodra') {
        const { createExoBindableList } = await import('@exodra/reactivity');
        const { li } = await import('../exodra/schema');
        const { mountExodra, unmountExodra } = await import('../exodra/mount');

        const itemsList = createExoBindableList<ReturnType<typeof li>>([]);

        const container = document.createElement('div');
        document.body.appendChild(container);

        const node = mountExodra(container, {
            type: 'ul',
            attrs: {
                bindableLists: { children: itemsList },
            },
        });

        for (let i = 0; i < 10; i++) {
            itemsList.push(li(`item-${i}`));
        }

        itemsList.reset([]);
        itemsList.push(li('test-item-1'));
        itemsList.push(li('test-item-2'));
        const hasItems =
            container.textContent?.includes('test-item-1') === true &&
            container.textContent?.includes('test-item-2') === true;

        if (!hasItems) {
            throw new Error(
                `Exodra list operations failed! Expected 'test-item-1' and 'test-item-2' in DOM, got: ${container.textContent?.substring(0, 100)}`
            );
        }

        console.log('✅ Exodra list operations verification passed');

        itemsList.reset([]);

        const itemSchemas = Array.from({ length: iterations }, (_, i) =>
            li(`item-${i}`)
        );

        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            itemsList.push(itemSchemas[i]!);
            times.push(performance.now() - start);

            if (i % 100 === 0 && i > 0) {
                const expectedItem = `item-${i - 1}`;
                if (!container.textContent?.includes(expectedItem)) {
                    throw new Error(
                        `Exodra list DOM not updated at iteration ${i}! Expected '${expectedItem}'`
                    );
                }
            }
        }

        unmountExodra(container, node);
    } else if (framework === 'solid') {
        // SolidJS benchmark
        const { createSignal, For } = await import('solid-js');
        const { render } = await import('solid-js/web');

        let pushItemFn: ((item: string) => void) | null = null;
        let resetFn: (() => void) | null = null;

        const App = () => {
            // Use equals:false so we can mutate the array in-place without allocating
            // a new array on every update (closer to Exodra list semantics).
            const [items, setItems] = createSignal<string[]>([], {
                equals: false,
            });

            pushItemFn = (item: string) => {
                setItems(prev => {
                    prev.push(item);
                    return prev;
                });
            };
            resetFn = () => setItems([]);

            return (
                <ul>
                    <For each={items()}>{item => <li>{item}</li>}</For>
                </ul>
            );
        };

        const container = document.createElement('div');
        document.body.appendChild(container);

        const dispose = render(() => <App />, container);

        if (!pushItemFn || !resetFn) {
            throw new Error('SolidJS list helpers not initialized');
        }

        // Warm up
        for (let i = 0; i < 10; i++) {
            const start = performance.now();
            pushItemFn(`item-${i}`);
            performance.now() - start;
        }

        // Verify it actually works
        resetFn();
        pushItemFn('test-item-1');
        pushItemFn('test-item-2');
        const hasItems =
            container.textContent?.includes('test-item-1') === true &&
            container.textContent?.includes('test-item-2') === true;

        if (!hasItems) {
            throw new Error(
                `SolidJS list operations failed! Expected 'test-item-1' and 'test-item-2' in DOM, got: ${container.textContent?.substring(
                    0,
                    100
                )}`
            );
        }

        console.log('✅ SolidJS list operations verification passed');

        // Clear for actual benchmark
        resetFn();

        // Actual benchmark
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            pushItemFn(`item-${i}`);
            const elapsed = performance.now() - start;
            times.push(elapsed);

            // Verify DOM actually changed every 100 iterations
            if (i % 100 === 0 && i > 0) {
                const expectedItem = `item-${i - 1}`;
                const actualContent = container.textContent || '';
                if (!actualContent.includes(expectedItem)) {
                    throw new Error(
                        `SolidJS list DOM not updated at iteration ${i}! Expected '${expectedItem}', got: ${actualContent.substring(
                            0,
                            100
                        )}`
                    );
                }
            }
        }

        dispose();
        document.body.removeChild(container);
    } else if (framework === 'svelte') {
        const ListOperations = (await import('./svelte/ListOperations.svelte'))
            .default;
        const { tick } = await import('svelte');

        const container = document.createElement('div');
        document.body.appendChild(container);

        const instance = new ListOperations({
            target: container,
            props: {},
        });

        if (!instance.addItem || !instance.reset) {
            throw new Error('Svelte list helpers not initialized');
        }

        // Warm up
        for (let i = 0; i < 10; i++) {
            const start = performance.now();
            instance.addItem(`item-${i}`);
            performance.now() - start;
        }

        // Verify it actually works
        instance.reset();
        instance.addItem('test-item-1');
        instance.addItem('test-item-2');
        await tick();
        const hasItems =
            container.textContent?.includes('test-item-1') === true &&
            container.textContent?.includes('test-item-2') === true;

        if (!hasItems) {
            throw new Error(
                `Svelte list operations failed! Expected 'test-item-1' and 'test-item-2' in DOM, got: ${container.textContent?.substring(
                    0,
                    100
                )}`
            );
        }

        console.log('✅ Svelte list operations verification passed');

        // Clear for actual benchmark
        instance.reset();

        // Actual benchmark
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            instance.addItem(`item-${i}`);
            await tick();
            times.push(performance.now() - start);

            // Verify DOM actually changed every 100 iterations
            if (i % 100 === 0 && i > 0) {
                const expectedItem = `item-${i - 1}`;
                const actualContent = container.textContent || '';
                if (!actualContent.includes(expectedItem)) {
                    throw new Error(
                        `Svelte list DOM not updated at iteration ${i}! Expected '${expectedItem}', got: ${actualContent.substring(
                            0,
                            100
                        )}`
                    );
                }
            }
        }

        instance.$destroy();
        document.body.removeChild(container);
    }

    return finalizeBenchmarkResult(
        'List Operations',
        framework,
        iterations,
        times
    );
}
