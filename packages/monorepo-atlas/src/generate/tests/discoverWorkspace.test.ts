import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { classifyByConvention, discoverWorkspace, workspaceGlobs } from '../discoverWorkspace';

function repo(files: Record<string, unknown>): string {
    const root = mkdtempSync(join(tmpdir(), 'exo-ws-'));
    for (const [path, content] of Object.entries(files)) {
        const full = join(root, path);
        mkdirSync(join(full, '..'), { recursive: true });
        writeFileSync(full, JSON.stringify(content, null, 2));
    }
    return root;
}

describe('workspaceGlobs', () => {
    it('reads npm/yarn workspaces', () => {
        const root = repo({ 'package.json': { workspaces: ['packages/*'] } });
        expect(workspaceGlobs(root)).toEqual(['packages/*']);
    });

    it('reads the yarn object form', () => {
        const root = repo({
            'package.json': { workspaces: { packages: ['libs/*'] } },
        });
        expect(workspaceGlobs(root)).toEqual(['libs/*']);
    });

    it('reads pnpm-workspace.yaml when there is no workspaces field', () => {
        const root = repo({ 'package.json': { name: 'root' } });
        writeFileSync(
            join(root, 'pnpm-workspace.yaml'),
            "packages:\n  - 'packages/*'\n  - 'apps/*'\n"
        );
        expect(workspaceGlobs(root)).toEqual(['packages/*', 'apps/*']);
    });

    it('treats a single-package repository as a workspace of one', () => {
        const root = repo({ 'package.json': { name: 'solo' } });
        expect(workspaceGlobs(root)).toEqual(['.']);
    });
});

describe('discoverWorkspace', () => {
    it('finds packages behind a one-level glob', () => {
        const root = repo({
            'package.json': { workspaces: ['packages/*'] },
            'packages/core/package.json': { name: '@acme/core' },
            'packages/ui/package.json': { name: '@acme/ui', private: true },
        });

        expect(discoverWorkspace(root).map((p) => p.name)).toEqual(['@acme/core', '@acme/ui']);
    });

    it('finds nested packages behind a deep glob', () => {
        const root = repo({
            'package.json': { workspaces: ['packages/**'] },
            'packages/group/inner/package.json': { name: '@acme/inner' },
        });
        expect(discoverWorkspace(root).map((p) => p.name)).toContain('@acme/inner');
    });

    it('reports what each package DECLARES, dev dependencies included', () => {
        const root = repo({
            'package.json': { workspaces: ['packages/*'] },
            'packages/a/package.json': {
                name: 'a',
                dependencies: { b: '1' },
                peerDependencies: { c: '1' },
                devDependencies: { tsup: '1' },
            },
        });
        // `declares` is `readonly string[]` and `sort` mutates in place, so the copy is what
        // makes the order assertion possible without the discovery result being rearranged
        // underneath whatever else reads it.
        expect([...discoverWorkspace(root)[0].declares].sort()).toEqual(['b', 'c', 'tsup']);
    });

    it('skips a malformed manifest instead of abandoning the graph', () => {
        const root = repo({
            'package.json': { workspaces: ['packages/*'] },
            'packages/good/package.json': { name: 'good' },
        });
        mkdirSync(join(root, 'packages/broken'), { recursive: true });
        writeFileSync(join(root, 'packages/broken/package.json'), '{ oops');

        expect(discoverWorkspace(root).map((p) => p.name)).toEqual(['good']);
    });

    it("takes a project's own classification", () => {
        const root = repo({
            'package.json': { workspaces: ['packages/*'] },
            'packages/anything/package.json': { name: 'anything' },
        });
        const [pkg] = discoverWorkspace(root, { classify: () => 'app' });
        expect(pkg.kind).toBe('app');
    });
});

describe('classifyByConvention', () => {
    const info = (
        name: string,
        dir: string,
        isPrivate: boolean,
        manifest: Record<string, unknown> = {}
    ) => ({ name, dir, private: isPrivate, manifest });

    it('calls a published library runtime', () => {
        expect(classifyByConvention(info('@acme/core', 'packages/core', false))).toBe('runtime');
    });

    it('calls a published compiler/CLI tooling', () => {
        expect(classifyByConvention(info('babel-plugin-acme', 'packages/plugin', false))).toBe(
            'tooling'
        );
        expect(
            classifyByConvention(info('@acme/x', 'packages/x', false, { bin: './cli.js' }))
        ).toBe('tooling');
    });

    it('calls a private, runnable package an app', () => {
        expect(classifyByConvention(info('demo', 'examples/demo', true))).toBe('app');
        expect(
            classifyByConvention(info('site', 'packages/site', true, { scripts: { dev: 'vite' } }))
        ).toBe('app');
    });

    it('calls a private build helper tooling', () => {
        expect(classifyByConvention(info('scripts', 'packages/scripts', true))).toBe('tooling');
    });
});
