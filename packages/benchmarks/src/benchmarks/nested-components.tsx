// Benchmark: Nested components rendering
// Tests: Performance with deep component trees

import type { BenchmarkResult, ReactiveBenchmarkFramework } from '../types';
import { finalizeBenchmarkResult } from '../benchmark-utils';

export async function benchmarkNestedComponents(
    framework: ReactiveBenchmarkFramework,
    iterations: number = 500
): Promise<BenchmarkResult> {
    const times: number[] = [];

    if (framework === 'exodra') {
        const { createExoBindable } = await import('@exodra/reactivity');
        const { h } = await import('../exodra/schema');
        const { mountExodra, unmountExodra } = await import('../exodra/mount');

        const count = createExoBindable(0);

        const createNestedSchema = (depth: number, maxDepth: number) => {
            if (depth >= maxDepth) {
                return h('div', { bindables: { textContent: count } });
            }
            return h('div', {
                constants: {
                    children: [
                        h('span', { constants: { textContent: `Level ${depth}` } }),
                        createNestedSchema(depth + 1, maxDepth),
                    ],
                }
            });
        };

        const container = document.createElement('div');
        document.body.appendChild(container);

        const node = mountExodra(container, {
            type: 'div',
            attrs: {
                constants: {
                    children: createNestedSchema(0, 10),
                },
            },
        });

        for (let i = 0; i < 10; i++) {
            count.setValue(i);
        }

        count.setValue(42);
        if (!container.textContent?.includes('42')) {
            throw new Error('Exodra nested components not rendering!');
        }

        console.log('✅ Exodra nested components verification passed');

        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            count.setValue(i);
            times.push(performance.now() - start);
        }

        unmountExodra(container, node);
    } else if (framework === 'solid') {
        const { createSignal } = await import('solid-js');
        const { render } = await import('solid-js/web');

        let setCountFn: ((value: number) => void) | null = null;

        // Create nested component structure
        const NestedComponent = (props: {
            depth: number;
            maxDepth: number;
            count: () => number;
        }) => {
            if (props.depth >= props.maxDepth) {
                return <div>{props.count()}</div>;
            }
            return (
                <div>
                    <span>Level {props.depth}</span>
                    <NestedComponent
                        depth={props.depth + 1}
                        maxDepth={props.maxDepth}
                        count={props.count}
                    />
                </div>
            );
        };

        const App = () => {
            const [count, setCount] = createSignal(0);
            setCountFn = setCount;

            return (
                <div>
                    <NestedComponent depth={0} maxDepth={10} count={count} />
                </div>
            );
        };

        const container = document.createElement('div');
        document.body.appendChild(container);

        const dispose = render(() => <App />, container);

        if (!setCountFn) {
            throw new Error('setCount not initialized');
        }

        // Warm up
        for (let i = 0; i < 10; i++) {
            setCountFn(i);
        }

        // Verify it works
        setCountFn(42);
        await new Promise(resolve => setTimeout(resolve, 10));
        if (!container.textContent?.includes('42')) {
            throw new Error('SolidJS nested components not rendering!');
        }

        console.log('✅ SolidJS nested components verification passed');

        // Actual benchmark
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            setCountFn(i);
            times.push(performance.now() - start);
        }

        dispose();
        // Clear container content before removing to ensure DOM is fully cleaned up
        container.innerHTML = '';
        document.body.removeChild(container);
    } else if (framework === 'svelte') {
        throw new Error('Svelte nested components benchmark not implemented');
    }

    return finalizeBenchmarkResult(
        'Nested Components',
        framework,
        iterations,
        times
    );
}
