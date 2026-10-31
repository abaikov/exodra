import { describe, expect, it } from 'vitest';
import { buildModel, computeLayers, edgeKindOf, type TExoCruiseInput } from '../buildModel';
import type { TExoPackageMeta } from '../types';

const PACKAGES: TExoPackageMeta[] = [
    {
        dir: 'packages/core',
        name: '@exodra/core',
        published: true,
        kind: 'runtime',
        declares: [],
    },
    {
        dir: 'packages/dom',
        name: '@exodra/dom',
        published: true,
        kind: 'runtime',
        // declares core but NOT context — the packaging bug, on purpose
        declares: ['@exodra/core'],
    },
    {
        dir: 'packages/context',
        name: '@exodra/context',
        published: true,
        kind: 'runtime',
        declares: [],
    },
    {
        dir: 'packages/vite-plugin-exodra',
        name: '@exodra/vite-plugin',
        published: true,
        kind: 'tooling',
        declares: ['@exodra/core'],
    },
];

const CRUISE: TExoCruiseInput = {
    modules: [
        {
            source: 'packages/core/src/index.ts',
            dependencies: [],
        },
        {
            source: 'packages/context/src/index.ts',
            dependencies: [],
        },
        {
            source: 'packages/dom/src/ExoNodeDom.ts',
            dependencies: [
                {
                    module: '@exodra/core',
                    resolved: 'packages/core/src/index.ts',
                    dependencyTypes: ['aliased', 'local', 'import'],
                },
                {
                    module: '@exodra/context',
                    resolved: 'packages/context/src/index.ts',
                    dependencyTypes: ['local', 'type-only', 'import'],
                },
                {
                    module: './mount',
                    resolved: 'packages/dom/src/mount.ts',
                    dependencyTypes: ['local', 'import'],
                },
            ],
        },
        {
            source: 'packages/dom/src/mount.ts',
            dependencies: [
                {
                    module: '@exodra/core',
                    resolved: 'packages/core/src/index.ts',
                    dependencyTypes: ['aliased', 'local', 'import'],
                },
            ],
        },
        {
            source: 'packages/vite-plugin-exodra/src/index.ts',
            dependencies: [
                {
                    module: '@exodra/dom',
                    resolved: 'packages/dom/src/index.ts',
                    dependencyTypes: ['local', 'import'],
                    valid: false,
                    rules: [{ name: 'runtime-does-not-import-build-tooling', severity: 'error' }],
                },
                {
                    module: 'vite',
                    resolved: 'node_modules/vite/dist/node/index.js',
                    dependencyTypes: ['npm-peer'],
                },
            ],
        },
    ],
    summary: {
        ruleSetUsed: {
            forbidden: [
                {
                    name: 'runtime-does-not-import-build-tooling',
                    severity: 'error',
                    comment: 'Build-time code must not reach the runtime.',
                },
            ],
        },
    },
};

const model = buildModel(CRUISE, { granularity: 'package', packages: PACKAGES });
const edge = (from: string, to: string) => model.edges.find((e) => e.from === from && e.to === to);

describe('package model', () => {
    it('collapses modules into packages under their published names', () => {
        expect(model.nodes.map((n) => n.id)).toEqual([
            '@exodra/context',
            '@exodra/core',
            '@exodra/dom',
            '@exodra/vite-plugin',
            'vite',
        ]);
        expect(model.nodes.find((n) => n.id === '@exodra/dom')!.moduleCount).toBe(2);
    });

    it('drops imports that stay inside one package', () => {
        // dom/ExoNodeDom → dom/mount must not become a self-edge.
        expect(edge('@exodra/dom', '@exodra/dom')).toBeUndefined();
    });

    it('counts every underlying import as edge weight', () => {
        // Two modules in dom import core.
        expect(edge('@exodra/dom', '@exodra/core')!.weight).toBe(2);
    });

    it('keeps the evidence for an edge', () => {
        const evidence = edge('@exodra/dom', '@exodra/core')!.evidence;
        expect(evidence.map((e) => e.from)).toEqual([
            'packages/dom/src/ExoNodeDom.ts',
            'packages/dom/src/mount.ts',
        ]);
        expect(evidence[0].specifier).toBe('@exodra/core');
    });

    it('separates a type-only edge from a runtime one', () => {
        expect(edge('@exodra/dom', '@exodra/context')!.kinds).toEqual(['type-only']);
        expect(edge('@exodra/dom', '@exodra/core')!.kinds).toEqual(['value']);
    });

    it('flags an edge the importer never declared', () => {
        expect(edge('@exodra/dom', '@exodra/core')!.declared).toBe(true);
        expect(edge('@exodra/dom', '@exodra/context')!.declared).toBe(false);
    });

    it('carries the broken rule AND the reason it exists', () => {
        const violations = edge('@exodra/vite-plugin', '@exodra/dom')!.violations;
        expect(violations).toHaveLength(1);
        expect(violations[0].rule).toBe('runtime-does-not-import-build-tooling');
        expect(violations[0].comment).toBe('Build-time code must not reach the runtime.');
    });

    it('keeps external packages as nodes, named as npm names them', () => {
        expect(model.nodes.find((n) => n.id === 'vite')!.kind).toBe('other');
        expect(model.nodes.find((n) => n.id === 'vite')!.published).toBeUndefined();
    });

    it('ranks nodes by the longest chain below them', () => {
        const layer = (id: string) => model.nodes.find((n) => n.id === id)!.layer;
        expect(layer('@exodra/core')).toBe(0);
        expect(layer('@exodra/context')).toBe(0);
        expect(layer('@exodra/dom')).toBe(1);
        expect(layer('@exodra/vite-plugin')).toBe(2);
    });
});

describe('module model', () => {
    const modules = buildModel(CRUISE, {
        granularity: 'module',
        packages: PACKAGES,
    });

    it('keeps every module and only edges inside the crawl', () => {
        expect(modules.nodes).toHaveLength(5);
        // the `vite` dependency points outside the crawl and is dropped
        expect(modules.edges.some((e) => e.to.includes('node_modules'))).toBe(false);
    });

    it('labels a module by its path inside the package', () => {
        expect(modules.nodes.find((n) => n.id === 'packages/dom/src/ExoNodeDom.ts')!.label).toBe(
            'ExoNodeDom.ts'
        );
    });

    it('inherits the package kind', () => {
        expect(
            modules.nodes.find((n) => n.id === 'packages/vite-plugin-exodra/src/index.ts')!.kind
        ).toBe('tooling');
    });
});

describe('edgeKindOf', () => {
    it('reads runtime survival, not the tag list', () => {
        expect(edgeKindOf(['local', 'import'], false)).toBe('value');
        expect(edgeKindOf(['local', 'type-only', 'import'], false)).toBe('type-only');
        expect(edgeKindOf(['dynamic-import'], false)).toBe('dynamic');
        expect(edgeKindOf(['local', 'import'], true)).toBe('dynamic');
    });
});

describe('computeLayers', () => {
    it('does not hang on a cycle — a cycle is a thing this tool must SHOW', () => {
        const outgoing = new Map([
            ['a', ['b']],
            ['b', ['c']],
            ['c', ['a']],
        ]);
        const layers = computeLayers(['a', 'b', 'c'], outgoing);
        expect(layers.size).toBe(3);
        for (const value of layers.values()) expect(Number.isFinite(value)).toBe(true);
    });

    it('measures the LONGEST chain, not the shortest', () => {
        // a → b → c and a → c: a must be 2, not 1.
        const layers = computeLayers(
            ['a', 'b', 'c'],
            new Map([
                ['a', ['b', 'c']],
                ['b', ['c']],
            ])
        );
        expect(layers.get('c')).toBe(0);
        expect(layers.get('b')).toBe(1);
        expect(layers.get('a')).toBe(2);
    });
});
