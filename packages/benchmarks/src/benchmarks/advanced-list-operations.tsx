// Benchmark: Advanced list operations (remove, move, set, insert)
// Tests: Complex list mutations beyond simple push

import type { BenchmarkResult, ReactiveBenchmarkFramework } from '../types';
import { finalizeBenchmarkResult } from '../benchmark-utils';

export async function benchmarkAdvancedListOperations(
    framework: ReactiveBenchmarkFramework,
    iterations: number = 500
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

        for (let i = 0; i < 100; i++) {
            itemsList.push(li(`item-${i}`));
        }

        for (let i = 0; i < 10; i++) {
            itemsList.remove(0, 1);
            itemsList.insert(0, li(`warmup-${i}`));
            itemsList.set(50, li(`updated-${i}`));
        }

        itemsList.reset([]);
        itemsList.push(li('a'));
        itemsList.push(li('b'));
        itemsList.push(li('c'));
        itemsList.insert(1, li('x'));
        itemsList.set(2, li('y'));
        itemsList.move(0, 3, 1);

        const snapshot = itemsList.snapshot().map(item => item.attrs.constants?.textContent);
        if (snapshot.length !== 4 || !snapshot.includes('x') || !snapshot.includes('y')) {
            throw new Error(`Exodra advanced list operations failed! Snapshot: ${snapshot.join(',')}`);
        }

        console.log('✅ Exodra advanced list operations verification passed');

        itemsList.reset([]);
        for (let i = 0; i < 100; i++) {
            itemsList.push(li(`item-${i}`));
        }

        const newItemSchemas = Array.from({ length: iterations }, (_, i) =>
            li(`new-${i}`)
        );
        const updatedItemSchemas = Array.from({ length: iterations }, (_, i) =>
            li(`updated-${i}`)
        );

        for (let i = 0; i < iterations; i++) {
            const start = performance.now();

            if (itemsList.snapshot().length > 10) {
                itemsList.remove(5, 1);
            }
            itemsList.insert(2, newItemSchemas[i]!);
            if (itemsList.snapshot().length > 5) {
                itemsList.set(4, updatedItemSchemas[i]!);
            }
            if (itemsList.snapshot().length > 10) {
                itemsList.move(0, itemsList.snapshot().length - 1, 1);
            }

            times.push(performance.now() - start);

            if (i % 50 === 0 && i > 0) {
                if ((container.textContent || '').length === 0) {
                    throw new Error(`Exodra DOM not updated at iteration ${i}!`);
                }
            }
        }

        unmountExodra(container, node);
    } else if (framework === 'solid') {
        const { createSignal, For } = await import('solid-js');
        const { render } = await import('solid-js/web');

        let setItemsFn: ((fn: (prev: string[]) => string[]) => void) | null = null;

        const App = () => {
            const [items, setItems] = createSignal<string[]>([], {
                equals: false,
            });
            setItemsFn = setItems;

            return (
                <ul>
                    <For each={items()}>{item => <li>{item}</li>}</For>
                </ul>
            );
        };

        const container = document.createElement('div');
        document.body.appendChild(container);

        const dispose = render(() => <App />, container);

        if (!setItemsFn) {
            throw new Error('setItems not initialized');
        }

        // Initialize
        setItemsFn(() => Array.from({ length: 100 }, (_, i) => `item-${i}`));

        // Warm up
        for (let i = 0; i < 10; i++) {
            setItemsFn(prev => {
                prev.splice(0, 1);
                prev.splice(0, 0, `warmup-${i}`);
                prev[50] = `updated-${i}`;
                return prev;
            });
        }

        // Verify operations
        setItemsFn(() => ['a', 'b', 'c']);
        setItemsFn(prev => {
            prev.splice(1, 0, 'x');
            prev[2] = 'y';
            const moved = prev.splice(0, 1);
            prev.push(...moved);
            return prev;
        });

        const finalItems = (await new Promise(resolve => {
            setItemsFn!(prev => {
                setTimeout(() => resolve([...prev]), 10);
                return prev;
            });
        })) as string[];

        if (finalItems.length !== 4 || !finalItems.includes('x') || !finalItems.includes('y')) {
            throw new Error(`SolidJS advanced list operations failed!`);
        }

        console.log('✅ SolidJS advanced list operations verification passed');

        // Reset for benchmark
        setItemsFn(() => Array.from({ length: 100 }, (_, i) => `item-${i}`));

        // Actual benchmark — one reactive update per list op (matches exodra)
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();

            setItemsFn(prev => {
                if (prev.length > 10) {
                    prev.splice(5, 1);
                }
                return prev;
            });
            setItemsFn(prev => {
                prev.splice(2, 0, `new-${i}`);
                return prev;
            });
            setItemsFn(prev => {
                if (prev.length > 5) {
                    prev[4] = `updated-${i}`;
                }
                return prev;
            });
            setItemsFn(prev => {
                if (prev.length > 10) {
                    const moved = prev.splice(0, 1);
                    prev.push(...moved);
                }
                return prev;
            });

            times.push(performance.now() - start);

            if (i % 50 === 0 && i > 0) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        }

        dispose();
        document.body.removeChild(container);
    } else if (framework === 'svelte') {
        throw new Error('Svelte advanced list operations benchmark not implemented');
    }

    return finalizeBenchmarkResult(
        'Advanced List Operations',
        framework,
        iterations,
        times
    );
}

