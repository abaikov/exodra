// Benchmark: Initial render of large component tree
// Tests: Performance of rendering a large structure from scratch

import type { BenchmarkResult, BenchmarkFramework } from '../types';
import {
    finalizeBenchmarkResult,
    measureRetainedHeap,
} from '../benchmark-utils';

export async function benchmarkInitialRender(
    framework: BenchmarkFramework,
    iterations: number = 50
): Promise<BenchmarkResult> {
    const times: number[] = [];
    let heapUsedBytes: number | undefined;

    if (framework === 'exodra') {
        const { h } = await import('../exodra/schema');
        const { mountExodra, unmountExodra } = await import('../exodra/mount');

        const InnerComponent = (props: { i: number }) =>
            h('div', {
                static: {
                    'data-id': String(props.i),
                    children: [
                        h('span', { static: { textContent: `Item ${props.i}` } }),
                        h('div', {
                            static: {
                                children: Array.from({ length: 3 }, (_, j) =>
                                    h('div', {
                                        static: {
                                            'data-nested': `${props.i}-${j}`,
                                            textContent: `Nested ${props.i}-${j}`,
                                        }
                                    })
                                )
                            }
                        }),
                    ]
                }
            });

        const LargeComponent = () =>
            h('div', {
                static: {
                    'data-test': 'large-component',
                    children: Array.from({ length: 200 }, (_, i) =>
                        InnerComponent({ i })
                    ),
                }
            });

        for (let w = 0; w < 3; w++) {
            const warmupContainer = document.createElement('div');
            document.body.appendChild(warmupContainer);
            const warmupNode = mountExodra(warmupContainer, LargeComponent());
            unmountExodra(warmupContainer, warmupNode);
        }

        const verifyContainer = document.createElement('div');
        document.body.appendChild(verifyContainer);
        const verifyNode = mountExodra(verifyContainer, LargeComponent());
        const hasContent =
            verifyContainer.textContent?.includes('Item 0') === true &&
            verifyContainer.textContent?.includes('Nested 0-0') === true;
        if (!hasContent) {
            unmountExodra(verifyContainer, verifyNode);
            throw new Error(
                `Exodra initial render failed! Expected 'Item 0' and 'Nested 0-0', got: ${verifyContainer.textContent?.substring(0, 100)}`
            );
        }
        unmountExodra(verifyContainer, verifyNode);

        console.log('✅ Exodra initial render verification passed');

        heapUsedBytes = await measureRetainedHeap(() => {
            const c = document.createElement('div');
            document.body.appendChild(c);
            const n = mountExodra(c, LargeComponent());
            return () => {
                unmountExodra(c, n);
                c.remove();
            };
        });

        for (let i = 0; i < iterations; i++) {
            const container = document.createElement('div');
            document.body.appendChild(container);

            const start = performance.now();
            const node = mountExodra(container, LargeComponent());
            const elapsed = performance.now() - start;
            times.push(elapsed);

            if (iterations > 20 && i % 10 === 0) {
                console.log(
                    `Exodra initial render iteration ${i}/${iterations} (${elapsed.toFixed(2)}ms) DOM ready: ${container.textContent?.includes('Item 0')}, nodes: ${container.childNodes.length}`
                );
            }

            if (i % 10 === 0 && i > 0 && !container.textContent?.includes('Item 0')) {
                unmountExodra(container, node);
                throw new Error(
                    `Exodra DOM not rendered at iteration ${i}!`
                );
            }

            unmountExodra(container, node);

            if (i < iterations - 1) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }
    } else if (framework === 'solid') {
        // SolidJS benchmark
        const { render } = await import('solid-js/web');

        // Create a large component tree with many nodes
        // Using 200 divs with 3 nested divs each = ~800 DOM nodes (reasonable for benchmark)
        const LargeComponent = () => {
            return (
                <div data-test="large-component">
                    {Array.from({ length: 200 }, (_, i) => (
                        <div data-id={String(i)}>
                            <span>Item {i}</span>
                            <div>
                                {Array.from({ length: 3 }, (_, j) => (
                                    <div data-nested={`${i}-${j}`}>
                                        Nested {i}-{j}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            );
        };

        // Warm up - render multiple times to ensure JIT compilation, etc.
        for (let w = 0; w < 3; w++) {
            const warmupContainer = document.createElement('div');
            document.body.appendChild(warmupContainer);
            const warmupDispose = render(
                () => <LargeComponent />,
                warmupContainer
            );
            warmupDispose();
            warmupContainer.innerHTML = '';
            document.body.removeChild(warmupContainer);
        }

        // Verify it works
        const verifyContainer = document.createElement('div');
        document.body.appendChild(verifyContainer);
        const verifyDispose = render(() => <LargeComponent />, verifyContainer);
        const hasContent =
            verifyContainer.textContent?.includes('Item 0') === true &&
            verifyContainer.textContent?.includes('Nested 0-0') === true;
        if (!hasContent) {
            verifyDispose();
            verifyContainer.innerHTML = '';
            document.body.removeChild(verifyContainer);
            throw new Error(
                `SolidJS initial render failed! Expected 'Item 0' and 'Nested 0-0', got: ${verifyContainer.textContent?.substring(
                    0,
                    100
                )}`
            );
        }
        verifyDispose();
        verifyContainer.innerHTML = '';
        document.body.removeChild(verifyContainer);

        console.log('✅ SolidJS initial render verification passed');

        heapUsedBytes = await measureRetainedHeap(() => {
            const c = document.createElement('div');
            document.body.appendChild(c);
            const d = render(() => <LargeComponent />, c);
            return () => {
                d();
                c.remove();
            };
        });

        // Actual benchmark
        for (let i = 0; i < iterations; i++) {
            const container = document.createElement('div');
            document.body.appendChild(container);

            const start = performance.now();
            const dispose = render(() => <LargeComponent />, container);
            const elapsed = performance.now() - start;
            times.push(elapsed);

            // Log progress for large iterations with DOM verification
            if (iterations > 20 && i % 10 === 0) {
                const domReady = container.textContent?.includes('Item 0');
                console.log(
                    `SolidJS initial render iteration ${i}/${iterations} (${elapsed.toFixed(
                        2
                    )}ms) DOM ready: ${domReady}, nodes: ${
                        container.childNodes.length
                    }`
                );
            }

            // Verify DOM was actually rendered
            if (i % 10 === 0 && i > 0) {
                if (!container.textContent?.includes('Item 0')) {
                    dispose();
                    container.innerHTML = '';
                    if (container.parentNode) {
                        container.parentNode.removeChild(container);
                    }
                    throw new Error(
                        `SolidJS DOM not rendered at iteration ${i}! Expected 'Item 0', got: ${container.textContent?.substring(
                            0,
                            50
                        )}`
                    );
                }
            }

            dispose();
            container.innerHTML = '';
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }

            // Small pause between iterations to let browser process (10ms)
            if (i < iterations - 1) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }
    } else if (framework === 'svelte') {
        // Svelte benchmark
        const InitialRender = (await import('./svelte/InitialRender.svelte'))
            .default;
        const { tick } = await import('svelte');

        // Warm up - render multiple times to ensure JIT compilation, etc.
        for (let w = 0; w < 3; w++) {
            const warmupContainer = document.createElement('div');
            document.body.appendChild(warmupContainer);
            const warmupInstance = new InitialRender({
                target: warmupContainer,
            });
            await tick(); // Wait for initial render
            warmupInstance.$destroy();
            warmupContainer.innerHTML = '';
            if (warmupContainer.parentNode) {
                warmupContainer.parentNode.removeChild(warmupContainer);
            }
        }

        // Verify it works
        const verifyContainer = document.createElement('div');
        document.body.appendChild(verifyContainer);
        const verifyInstance = new InitialRender({
            target: verifyContainer,
        });
        await tick(); // Wait for initial render
        const hasContent =
            verifyContainer.textContent?.includes('Item 0') === true &&
            verifyContainer.textContent?.includes('Nested 0-0') === true;
        if (!hasContent) {
            verifyInstance.$destroy();
            verifyContainer.innerHTML = '';
            if (verifyContainer.parentNode) {
                verifyContainer.parentNode.removeChild(verifyContainer);
            }
            throw new Error(
                `Svelte initial render failed! Expected 'Item 0' and 'Nested 0-0', got: ${verifyContainer.textContent?.substring(
                    0,
                    100
                )}`
            );
        }
        verifyInstance.$destroy();
        verifyContainer.innerHTML = '';
        if (verifyContainer.parentNode) {
            verifyContainer.parentNode.removeChild(verifyContainer);
        }

        console.log('✅ Svelte initial render verification passed');

        heapUsedBytes = await measureRetainedHeap(async () => {
            const c = document.createElement('div');
            document.body.appendChild(c);
            const inst = new InitialRender({ target: c });
            await tick();
            return () => {
                inst.$destroy();
                c.remove();
            };
        });

        // Actual benchmark
        for (let i = 0; i < iterations; i++) {
            const container = document.createElement('div');
            document.body.appendChild(container);

            const start = performance.now();
            const instance = new InitialRender({
                target: container,
            });
            await tick(); // Wait for initial render to complete
            const elapsed = performance.now() - start;
            times.push(elapsed);

            // Log progress for large iterations with DOM verification
            if (iterations > 20 && i % 10 === 0) {
                const domReady = container.textContent?.includes('Item 0');
                console.log(
                    `Svelte initial render iteration ${i}/${iterations} (${elapsed.toFixed(
                        2
                    )}ms) DOM ready: ${domReady}, nodes: ${
                        container.childNodes.length
                    }`
                );
            }

            // Verify DOM was actually rendered
            if (i % 10 === 0 && i > 0) {
                if (!container.textContent?.includes('Item 0')) {
                    instance.$destroy();
                    container.innerHTML = '';
                    if (container.parentNode) {
                        container.parentNode.removeChild(container);
                    }
                    throw new Error(
                        `Svelte DOM not rendered at iteration ${i}! Expected 'Item 0', got: ${container.textContent?.substring(
                            0,
                            50
                        )}`
                    );
                }
            }

            instance.$destroy();
            container.innerHTML = '';
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }

            // Small pause between iterations to let browser process (10ms)
            if (i < iterations - 1) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }
    } else if (framework === 'react') {
        // React benchmark
        const React = await import('react');
        const ReactDOM = await import('react-dom/client');

        // Create a large component tree with many nodes
        // Using 200 divs with 3 nested divs each = ~800 DOM nodes (reasonable for benchmark)
        const LargeComponent = () => {
            return React.createElement(
                'div',
                { 'data-test': 'large-component' },
                Array.from({ length: 200 }, (_, i) =>
                    React.createElement(
                        'div',
                        { key: i, 'data-id': String(i) },
                        React.createElement('span', null, `Item ${i}`),
                        React.createElement(
                            'div',
                            null,
                            Array.from({ length: 3 }, (_, j) =>
                                React.createElement(
                                    'div',
                                    {
                                        key: j,
                                        'data-nested': `${i}-${j}`,
                                    },
                                    `Nested ${i}-${j}`
                                )
                            )
                        )
                    )
                )
            );
        };

        // Warm up - render multiple times to ensure JIT compilation, etc.
        for (let w = 0; w < 3; w++) {
            const warmupContainer = document.createElement('div');
            document.body.appendChild(warmupContainer);
            const warmupRoot = ReactDOM.createRoot(warmupContainer);
            warmupRoot.render(React.createElement(LargeComponent));
            await new Promise(resolve => setTimeout(resolve, 10));
            warmupRoot.unmount();
            warmupContainer.innerHTML = '';
            if (warmupContainer.parentNode) {
                warmupContainer.parentNode.removeChild(warmupContainer);
            }
        }

        // Verify it works
        const verifyContainer = document.createElement('div');
        document.body.appendChild(verifyContainer);
        const verifyRoot = ReactDOM.createRoot(verifyContainer);
        verifyRoot.render(React.createElement(LargeComponent));
        await new Promise(resolve => setTimeout(resolve, 10));
        const hasContent =
            verifyContainer.textContent?.includes('Item 0') === true &&
            verifyContainer.textContent?.includes('Nested 0-0') === true;
        if (!hasContent) {
            verifyRoot.unmount();
            verifyContainer.innerHTML = '';
            if (verifyContainer.parentNode) {
                verifyContainer.parentNode.removeChild(verifyContainer);
            }
            throw new Error(
                `React initial render failed! Expected 'Item 0' and 'Nested 0-0', got: ${verifyContainer.textContent?.substring(
                    0,
                    100
                )}`
            );
        }
        verifyRoot.unmount();
        verifyContainer.innerHTML = '';
        if (verifyContainer.parentNode) {
            verifyContainer.parentNode.removeChild(verifyContainer);
        }

        console.log('✅ React initial render verification passed');

        heapUsedBytes = await measureRetainedHeap(async () => {
            const c = document.createElement('div');
            document.body.appendChild(c);
            const root = ReactDOM.createRoot(c);
            root.render(React.createElement(LargeComponent));
            await new Promise(resolve => setTimeout(resolve, 10));
            return () => {
                root.unmount();
                c.remove();
            };
        });

        // Actual benchmark
        for (let i = 0; i < iterations; i++) {
            const container = document.createElement('div');
            document.body.appendChild(container);

            const start = performance.now();
            const root = ReactDOM.createRoot(container);
            root.render(React.createElement(LargeComponent));
            // React updates are async, wait for initial render to complete
            await new Promise(resolve => setTimeout(resolve, 1));
            const elapsed = performance.now() - start;
            times.push(elapsed);

            // Log progress for large iterations with DOM verification
            if (iterations > 20 && i % 10 === 0) {
                const domReady = container.textContent?.includes('Item 0');
                console.log(
                    `React initial render iteration ${i}/${iterations} (${elapsed.toFixed(
                        2
                    )}ms) DOM ready: ${domReady}, nodes: ${
                        container.childNodes.length
                    }`
                );
            }

            // Verify DOM was actually rendered
            if (i % 10 === 0 && i > 0) {
                if (!container.textContent?.includes('Item 0')) {
                    root.unmount();
                    container.innerHTML = '';
                    if (container.parentNode) {
                        container.parentNode.removeChild(container);
                    }
                    throw new Error(
                        `React DOM not rendered at iteration ${i}! Expected 'Item 0', got: ${container.textContent?.substring(
                            0,
                            50
                        )}`
                    );
                }
            }

            root.unmount();
            container.innerHTML = '';
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }

            // Small pause between iterations to let browser process (10ms)
            if (i < iterations - 1) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }
    }

    return finalizeBenchmarkResult(
        'Initial Render (Large Tree)',
        framework,
        iterations,
        times,
        { warnIfSuspiciouslyFast: iterations > 10, heapUsedBytes }
    );
}
