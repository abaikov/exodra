import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { buildArtifacts, serialiseData } from '../buildArtifacts';
import { EXO_INSIDES_NODE_LIMIT } from '../../constants/EXO_INSIDES_NODE_LIMIT';
import type { TExoCruiseInput } from '../../model/buildModel';
import type { TExoPackageMeta } from '../../model/types';

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
        expect(artifacts.data.model.nodes.map((n) => n.id)).toEqual([
            '@exodra/core',
            '@exodra/dom',
        ]);
        expect(artifacts.data.model.edges).toHaveLength(1);
    });

    it('includes them on request', () => {
        const full = buildArtifacts(CRUISE, PACKAGES, { includeExternal: true });
        expect(full.data.model.nodes.map((n) => n.id)).toContain('lodash');
        // Ranks run left to right, so an extra node grows the drawing — in
        // whichever direction its rank has room.
        const area = (l: { width: number; height: number }) => l.width * l.height;
        expect(area(full.data.layout)).toBeGreaterThan(area(artifacts.data.layout));
    });

    it('places every node it kept', () => {
        expect(artifacts.data.layout.nodes.map((n) => n.id).sort()).toEqual(
            artifacts.data.model.nodes.map((n) => n.id).sort()
        );
    });

    // THE CASE THAT USED TO STAND HERE ASSERTED THE PRERENDERED SVG, and it went with the view:
    // the picture was built by the three-props renderer, which has been deleted. What a
    // schema-core view has to satisfy when it arrives is exactly what that case said — an
    // `<svg>` carrying a `viewBox` of the layout's own size, one `data-node` per model node, and
    // no literal colour anywhere in the marks.

    it('ships colours as custom properties, not baked into the marks', () => {
        expect(artifacts.css).toContain('--exo-kind-runtime:');
        expect(artifacts.css).not.toMatch(/fill="#/);
    });

    it('serialises deterministically, with a trailing newline', () => {
        const once = serialiseData(artifacts);
        expect(once).toBe(serialiseData(buildArtifacts(CRUISE, PACKAGES)));
        expect(once.endsWith('\n')).toBe(true);
        expect(JSON.parse(once).layout.nodes).toHaveLength(2);
    });
});

describe('buildArtifacts — insides', () => {
    const typesFile = (count: number): string =>
        Array.from(
            { length: count },
            (_, i) => `export type TExoT${i} = { readonly v: ${i} };`
        ).join('\n');

    it(`draws a package up to ${EXO_INSIDES_NODE_LIMIT} entities and skips one over it, saying so`, () => {
        const root = mkdtempSync(join(tmpdir(), 'exo-atlas-insides-'));
        for (const [dir, count] of [
            ['packages/small', 3],
            ['packages/huge', EXO_INSIDES_NODE_LIMIT + 1],
        ] as const) {
            mkdirSync(join(root, dir, 'src'), { recursive: true });
            writeFileSync(join(root, dir, 'src', 'index.ts'), typesFile(count));
        }
        const packages: TExoPackageMeta[] = [
            {
                dir: 'packages/small',
                name: 'small',
                published: true,
                kind: 'runtime',
                declares: [],
            },
            { dir: 'packages/huge', name: 'huge', published: true, kind: 'runtime', declares: [] },
        ];
        const said = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        try {
            const ids = buildArtifacts({ modules: [] }, packages, { root }).insides.map(
                (i) => i.id
            );
            expect(ids).toEqual(['small']);
            expect(said.mock.calls.map((c) => String(c[0])).join('')).toContain('huge has 1001');
        } finally {
            said.mockRestore();
            rmSync(root, { recursive: true, force: true });
        }
    });
});
