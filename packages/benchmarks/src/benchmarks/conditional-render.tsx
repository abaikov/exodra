// Benchmark: Conditional component rendering
// Tests: {show() && <ExpensiveComponent />}

import type { BenchmarkResult, ReactiveBenchmarkFramework } from '../types';
import { finalizeBenchmarkResult } from '../benchmark-utils';
import type { ExodraSchema } from '../exodra/schema';

export type { BenchmarkResult } from '../types';

export async function benchmarkConditionalRender(
    framework: ReactiveBenchmarkFramework,
    iterations: number = 1000
): Promise<BenchmarkResult> {
    const times: number[] = [];

    if (framework === 'exodra') {
        const { createExoBindable } = await import('@exodra/reactivity');
        const { h } = await import('../exodra/schema');
        const { mountExodra, unmountExodra } = await import('../exodra/mount');

        const expensiveChildren = h(
            'div',
            {},
            ...Array.from({ length: 50 }, (_, i) =>
                h('div', { constants: { textContent: `Item ${i}` } })
            )
        );

        const show = createExoBindable(false);
        const children = createExoBindable<ExodraSchema | readonly ExodraSchema[]>([]);

        show.subscribe(() => {
            children.setValue(show.getValue() ? expensiveChildren : []);
        });

        const container = document.createElement('div');
        document.body.appendChild(container);

        const node = mountExodra(container, {
            type: 'div',
            attrs: {
                bindables: { children },
            },
        });

        for (let i = 0; i < 10; i++) {
            show.setValue(i % 2 === 0);
        }

        show.setValue(true);
        if (!container.textContent?.includes('Item 0')) {
            throw new Error(
                `Exodra conditional render failed! Expected 'Item 0' when show=true, got: ${container.textContent?.substring(0, 100)}`
            );
        }

        show.setValue(false);
        if (container.textContent?.includes('Item 0')) {
            throw new Error(
                `Exodra conditional render failed! Should not have 'Item 0' when show=false`
            );
        }

        console.log('✅ Exodra conditional render verification passed');

        show.setValue(false);

        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            show.setValue(i % 2 === 0);
            times.push(performance.now() - start);

            if (i % 100 === 0 && i > 0) {
                const shouldBeVisible = show.getValue() === true;
                const actualContent = container.textContent || '';
                if (shouldBeVisible && !actualContent.includes('Item 0')) {
                    throw new Error(
                        `Exodra DOM not updated at iteration ${i}! Expected 'Item 0'`
                    );
                }
                if (!shouldBeVisible && actualContent.includes('Item 0')) {
                    throw new Error(
                        `Exodra DOM not updated at iteration ${i}! Should be empty`
                    );
                }
            }
        }

        unmountExodra(container, node);
    } else if (framework === 'solid') {
        // SolidJS benchmark
        const { createSignal, Show } = await import('solid-js');
        const { render } = await import('solid-js/web');

        const ExpensiveComponent = () => {
            return (
                <div>
                    {Array.from({ length: 50 }, (_, i) => (
                        <div key={i}>Item {i}</div>
                    ))}
                </div>
            );
        };

        let setShowFn: ((value: boolean) => void) | null = null;

        const App = () => {
            const [show, setShow] = createSignal(false);
            setShowFn = setShow;

            return (
                <div>
                    <Show when={show()}>
                        <ExpensiveComponent />
                    </Show>
                </div>
            );
        };

        const container = document.createElement('div');
        document.body.appendChild(container);

        const dispose = render(() => <App />, container);

        if (!setShowFn) {
            throw new Error('setShow not initialized');
        }

        // Warm up
        for (let i = 0; i < 10; i++) {
            const start = performance.now();
            setShowFn(i % 2 === 0);
            performance.now() - start;
        }

        // Verify it actually works
        setShowFn(true);
        const hasContentWhenTrue =
            container.textContent?.includes('Item 0') === true;

        if (!hasContentWhenTrue) {
            throw new Error(
                `SolidJS conditional render failed! Expected 'Item 0' in DOM when show=true, got: ${container.textContent?.substring(
                    0,
                    100
                )}`
            );
        }

        setShowFn(false);
        const hasNoContentWhenFalse =
            container.textContent?.includes('Item 0') === false;

        if (!hasNoContentWhenFalse) {
            throw new Error(
                `SolidJS conditional render failed! Should not have 'Item 0' when show=false, got: ${container.textContent?.substring(
                    0,
                    100
                )}`
            );
        }

        console.log('✅ SolidJS conditional render verification passed');

        // Reset for benchmark
        setShowFn(false);

        // Actual benchmark
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            setShowFn(i % 2 === 0);
            const elapsed = performance.now() - start;
            times.push(elapsed);

            // Verify DOM actually changed every 100 iterations
            if (i % 100 === 0 && i > 0) {
                const actualContent = container.textContent || '';
                if (i % 2 === 0 && !actualContent.includes('Item 0')) {
                    throw new Error(
                        `SolidJS DOM not updated at iteration ${i}! Expected 'Item 0', got: ${actualContent.substring(
                            0,
                            50
                        )}`
                    );
                }
                if (i % 2 !== 0 && actualContent.includes('Item 0')) {
                    throw new Error(
                        `SolidJS DOM not updated at iteration ${i}! Should be empty, got: ${actualContent.substring(
                            0,
                            50
                        )}`
                    );
                }
            }
        }

        dispose();
        document.body.removeChild(container);
    } else if (framework === 'svelte') {
        // Svelte benchmark
        const ConditionalRender = (
            await import('./svelte/ConditionalRender.svelte')
        ).default;
        const { tick } = await import('svelte');

        const container = document.createElement('div');
        document.body.appendChild(container);

        const instance = new ConditionalRender({
            target: container,
            props: { show: false },
        });

        if (!instance.toggle) {
            throw new Error('Svelte toggle not initialized');
        }

        // Warm up
        for (let i = 0; i < 10; i++) {
            const start = performance.now();
            instance.toggle();
            performance.now() - start;
        }

        // Verify it actually works
        instance.show = true;
        await tick();
        const hasContentWhenTrue =
            container.textContent?.includes('Item 0') === true;

        if (!hasContentWhenTrue) {
            throw new Error(
                `Svelte conditional render failed! Expected 'Item 0' in DOM when show=true, got: ${container.textContent?.substring(
                    0,
                    100
                )}`
            );
        }

        instance.show = false;
        await tick();
        const hasNoContentWhenFalse =
            container.textContent?.includes('Item 0') === false;

        if (!hasNoContentWhenFalse) {
            throw new Error(
                `Svelte conditional render failed! Should not have 'Item 0' when show=false, got: ${container.textContent?.substring(
                    0,
                    100
                )}`
            );
        }

        console.log('✅ Svelte conditional render verification passed');

        // Reset for benchmark
        instance.show = false;
        await tick();

        // Actual benchmark — include DOM flush for fair end-to-end comparison
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            instance.toggle();
            await tick();
            times.push(performance.now() - start);

            // Verify DOM actually changed every 100 iterations (outside timed region)
            if (i % 100 === 0 && i > 0) {
                const actualContent = container.textContent || '';
                const shouldBeVisible = instance.show;
                if (shouldBeVisible && !actualContent.includes('Item 0')) {
                    throw new Error(
                        `Svelte DOM not updated at iteration ${i}! Expected 'Item 0', got: ${actualContent.substring(
                            0,
                            50
                        )}`
                    );
                }
                if (!shouldBeVisible && actualContent.includes('Item 0')) {
                    throw new Error(
                        `Svelte DOM not updated at iteration ${i}! Should be empty, got: ${actualContent.substring(
                            0,
                            50
                        )}`
                    );
                }
            }
        }

        instance.$destroy();
        document.body.removeChild(container);
    }

    return finalizeBenchmarkResult(
        'Conditional Component Render',
        framework,
        iterations,
        times
    );
}
