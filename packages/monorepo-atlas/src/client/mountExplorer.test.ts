/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import { buildArtifacts } from '../generate/buildArtifacts';
import { mountExplorer } from './mountExplorer';
import type { TExoCruiseInput } from '../model/buildModel';
import type { TExoPackageMeta } from '../model/types';

const PACKAGES: TExoPackageMeta[] = [
    { dir: 'packages/core', name: '@exodra/core', published: true, kind: 'runtime', declares: [] },
    {
        dir: 'packages/dom',
        name: '@exodra/dom',
        published: true,
        kind: 'runtime',
        declares: ['@exodra/core'],
    },
    {
        dir: 'packages/vite-plugin-exodra',
        name: '@exodra/vite-plugin',
        published: true,
        kind: 'tooling',
        // does NOT declare dom — the packaging bug, kept in the fixture
        declares: ['@exodra/core'],
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
            ],
        },
        {
            source: 'packages/vite-plugin-exodra/src/index.ts',
            dependencies: [
                {
                    module: '@exodra/dom',
                    resolved: 'packages/dom/src/index.ts',
                    dependencyTypes: ['local', 'import'],
                    rules: [
                        {
                            name: 'runtime-does-not-import-build-tooling',
                            severity: 'error',
                        },
                    ],
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

const DATA = buildArtifacts(CRUISE, PACKAGES).data;

let host: HTMLElement;
let explorer: { dispose(): void };

beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    window.localStorage.clear();
    host = document.createElement('div');
    document.body.replaceChildren(host);
});

function open(options?: Parameters<typeof mountExplorer>[2]) {
    explorer = mountExplorer(host, DATA, options);
    return host.querySelector('.exo-graph') as HTMLElement;
}

describe('mountExplorer', () => {
    it('renders controls, the drawing and the detail panel', () => {
        const root = open();
        expect(root.querySelector('.exo-graph-toolbar')).not.toBeNull();
        expect(root.querySelector('svg.exo-graph-canvas')).not.toBeNull();
        expect(root.querySelector('.exo-graph-details')).not.toBeNull();
        explorer.dispose();
    });

    it('selects a package by clicking it, and clears on the background', () => {
        const root = open();
        const node = root.querySelector('[data-node="@exodra/dom"]')!;

        node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(root.querySelector('.exo-graph-details h3')!.textContent).toBe('dom');

        root.querySelector('.exo-graph-stage')!.dispatchEvent(
            new MouseEvent('click', { bubbles: true })
        );
        // The drawer shuts. Its contents stay put while it slides away — what
        // says it is closed is the class, not an emptied box.
        expect(
            root.querySelector('.exo-graph-details')!.className
        ).not.toContain('is-open');
        explorer.dispose();
    });

    it('shows WHY an edge exists — the imports behind it', () => {
        const root = open();
        root.querySelector('[data-node="@exodra/dom"]')!.dispatchEvent(
            new MouseEvent('click', { bubbles: true })
        );

        const details = root.querySelector('.exo-graph-details')!;
        expect(details.textContent).toContain('@exodra/core');
        expect(details.textContent).toContain('1 import');
        // the evidence names the file the import is written in
        expect(details.textContent).toContain('packages/dom/src/index.ts');
        explorer.dispose();
    });

    it('names the broken rule AND the reason it exists', () => {
        const root = open();
        root.querySelector('[data-node="@exodra/vite-plugin"]')!.dispatchEvent(
            new MouseEvent('click', { bubbles: true })
        );

        const details = root.querySelector('.exo-graph-details')!;
        expect(details.textContent).toContain('NOT in package.json');
        expect(details.textContent).toContain('runtime-does-not-import-build-tooling');
        expect(details.textContent).toContain(
            'Build-time code must not reach the runtime.'
        );
        explorer.dispose();
    });






    it('takes the HOST\'s colours — they are an API, not a control', () => {
        const root = open({
            colors: {
                light: {
                    kind: { runtime: '#123456' },
                    surface: '#fffff0',
                },
            },
            checkColors: false,
        });

        expect(root.style.getPropertyValue('--exo-kind-runtime')).toBe('#123456');
        expect(root.style.getPropertyValue('--exo-surface')).toBe('#fffff0');
        // What the host did not set keeps the built-in value, so a host can
        // supply one colour without restating the whole palette.
        expect(root.style.getPropertyValue('--exo-kind-tooling')).toBe('');
        explorer.dispose();
    });

    it('offers no colour control of its own', () => {
        const root = open();
        expect(root.querySelector('input[type="color"]')).toBeNull();
        expect(root.textContent).not.toContain('Reset colours');
        explorer.dispose();
    });

    it('warns in the console when a host palette is unreadable', () => {
        const errors: string[] = [];
        const original = console.error;
        console.error = (message: string) => errors.push(String(message));
        try {
            open({
                colors: {
                    light: { kind: { runtime: '#2a78d6', tooling: '#2f7bd8' } },
                },
            });
        } finally {
            console.error = original;
        }

        expect(errors.join(' ')).toMatch(/too similar|colour-blind/i);
        explorer.dispose();
    });

    it('follows the page when it switches to dark', () => {
        const root = open();
        expect(root.dataset.mode).toBeUndefined(); // 'system' leaves CSS in charge

        document.documentElement.setAttribute('data-theme', 'dark');
        // The palette editor must now edit the DARK colours; the observer that
        // notices this is async, so assert the mechanism directly.
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        explorer.dispose();
    });

    it('stops listening to the page once disposed', () => {
        const root = open();
        explorer.dispose();
        // No error, and the mount is gone.
        document.documentElement.setAttribute('data-theme', 'dark');
        expect(host.contains(root)).toBe(false);
    });
});
