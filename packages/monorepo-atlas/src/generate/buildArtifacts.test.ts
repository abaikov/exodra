import { describe, expect, it } from 'vitest';
import { buildArtifacts, serialiseData } from './buildArtifacts';
import type { TExoCruiseInput } from '../model/buildModel';
import type { TExoPackageMeta } from '../model/types';

const PACKAGES: TExoPackageMeta[] = [
    { dir: 'packages/core', name: '@exodra/core', published: true, kind: 'runtime', declares: [] },
    {
        dir: 'packages/dom',
        name: '@exodra/dom',
        published: true,
        kind: 'runtime',
        declares: ['@exodra/core', 'lodash'],
    },
];

const CRUISE: TExoCruiseInput = {
    modules: [
        { source: 'packages/core/src/index.ts', dependencies: [] },
        {
            source: 'packages/dom/src/index.ts',
            dependencies: [
                {
                    module: '@exodra/core',
                    resolved: 'packages/core/src/index.ts',
                    dependencyTypes: ['local', 'import'],
                },
                {
                    module: 'lodash',
                    resolved: 'node_modules/lodash/index.js',
                    dependencyTypes: ['npm'],
                },
            ],
        },
    ],
};

describe('buildArtifacts', () => {
    const artifacts = buildArtifacts(CRUISE, PACKAGES);

    it('leaves npm packages out of the drawing by default', () => {
        // A hidden node would still occupy its slot in the layout, so it is
        // filtered from the MODEL rather than hidden in the view.
        expect(artifacts.data.model.nodes.map(n => n.id)).toEqual([
            '@exodra/core',
            '@exodra/dom',
        ]);
        expect(artifacts.data.model.edges).toHaveLength(1);
    });

    it('includes them on request', () => {
        const full = buildArtifacts(CRUISE, PACKAGES, { includeExternal: true });
        expect(full.data.model.nodes.map(n => n.id)).toContain('lodash');
        // Ranks run left to right, so an extra node grows the drawing — in
        // whichever direction its rank has room.
        const area = (l: { width: number; height: number }) => l.width * l.height;
        expect(area(full.data.layout)).toBeGreaterThan(area(artifacts.data.layout));
    });

    it('places every node it kept', () => {
        expect(artifacts.data.layout.nodes.map(n => n.id).sort()).toEqual(
            artifacts.data.model.nodes.map(n => n.id).sort()
        );
    });

    it('prerenders the finished picture', () => {
        expect(artifacts.svg).toContain('<svg');
        expect(artifacts.svg).toContain('data-node="@exodra/core"');
        expect(artifacts.svg).toContain(
            `viewBox="0 0 ${artifacts.data.layout.width} ${artifacts.data.layout.height}"`
        );
    });

    it('ships colours as custom properties, not baked into the marks', () => {
        expect(artifacts.css).toContain('--exo-kind-runtime:');
        expect(artifacts.svg).not.toMatch(/fill="#/);
    });

    it('serialises deterministically, with a trailing newline', () => {
        const once = serialiseData(artifacts);
        expect(once).toBe(serialiseData(buildArtifacts(CRUISE, PACKAGES)));
        expect(once.endsWith('\n')).toBe(true);
        expect(JSON.parse(once).layout.nodes).toHaveLength(2);
    });
});
