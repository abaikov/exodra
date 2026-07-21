// Benchmark: ExoNodeDom runtime build vs a local raw iterative DOM builder.
// Tests: How much overhead the runtime node model adds over direct DOM creation.

import { ExoNodeDom } from '@exodra/dom';
import type { BenchmarkResult } from '../types';
import { finalizeBenchmarkResult } from '../benchmark-utils';
import { h, type ExodraSchema } from '../exodra/schema';

type BuildStrategy = 'runtime' | 'raw-iterative';

export async function benchmarkRuntimeBuildStrategy(
    strategy: BuildStrategy,
    shape: 'wide' | 'balanced' | 'deep',
    iterations: number = 100
): Promise<BenchmarkResult> {
    const schema = createSchema(shape);
    const times: number[] = [];

    for (let i = 0; i < 10; i++) {
        const node = build(strategy, schema);
        cleanup(node);
    }

    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        const node = build(strategy, schema);
        times.push(performance.now() - start);
        cleanup(node);
    }

    return finalizeBenchmarkResult(
        `Runtime Build Strategy (${shape})`,
        strategy === 'runtime' ? 'exodra-runtime' : 'exodra-raw-iterative',
        iterations,
        times,
        { discardFirst: 0 }
    );
}

function build(strategy: BuildStrategy, schema: ExodraSchema): Node {
    if (strategy === 'runtime') {
        const node = new ExoNodeDom(schema);
        if (!node.element) {
            throw new Error('ExoNodeDom did not create an element');
        }

        return node.element;
    }

    return buildIterative(schema);
}

function cleanup(node: Node): void {
    node.textContent;
}

function buildIterative(rootSchema: ExodraSchema): Node {
    const root = createDomNode(rootSchema);
    const stack: Array<{ schema: ExodraSchema; node: Node }> = [
        { schema: rootSchema, node: root },
    ];

    while (stack.length > 0) {
        const current = stack.pop();
        if (!current || current.node.nodeType !== Node.ELEMENT_NODE) {
            continue;
        }

        const children = getConstantChildren(current.schema);
        if (children.length === 0) {
            continue;
        }

        const fragment = document.createDocumentFragment();
        const childEntries: Array<{ schema: ExodraSchema; node: Node }> = [];

        for (const childSchema of children) {
            const childNode = createDomNode(childSchema);
            fragment.appendChild(childNode);
            childEntries.push({ schema: childSchema, node: childNode });
        }

        current.node.appendChild(fragment);

        for (let i = childEntries.length - 1; i >= 0; i--) {
            stack.push(childEntries[i]);
        }
    }

    return root;
}

function createDomNode(schema: ExodraSchema): Node {
    if (schema.type === '#text') {
        return document.createTextNode(
            String(schema.attrs.static?.textContent ?? '')
        );
    }

    const element = document.createElement(String(schema.type));
    const textContent = schema.attrs.static?.textContent;

    if (textContent !== undefined) {
        element.textContent = String(textContent);
    }

    return element;
}

function getConstantChildren(schema: ExodraSchema): readonly ExodraSchema[] {
    const children = schema.attrs.static?.children;
    if (!children) {
        return [];
    }

    return Array.isArray(children) ? children : [children];
}

function createSchema(shape: 'wide' | 'balanced' | 'deep'): ExodraSchema {
    if (shape === 'wide') {
        return h(
            'div',
            {},
            ...Array.from({ length: 2000 }, (_, i) =>
                h('span', { textContent: `item-${i}` })
            )
        );
    }

    if (shape === 'balanced') {
        return createBalancedTree(5, 6, 'node');
    }

    return createDeepTree(900);
}

function createBalancedTree(depth: number, width: number, prefix: string): ExodraSchema {
    if (depth === 0) {
        return h('span', { textContent: prefix });
    }

    return h(
        'div',
        {},
        ...Array.from({ length: width }, (_, i) =>
            createBalancedTree(depth - 1, width, `${prefix}-${i}`)
        )
    );
}

function createDeepTree(depth: number): ExodraSchema {
    let schema = h('span', { textContent: 'leaf' });

    for (let i = 0; i < depth; i++) {
        schema = h('div', {}, schema);
    }

    return schema;
}
