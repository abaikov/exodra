import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { TExoNodeKind, TExoPackageMeta } from '../model/types';

/**
 * What the workspace says about itself. Read from the manifests rather than kept
 * as a list here, so a new package appears in the graph the moment it exists.
 */
export function collectPackages(root: string): TExoPackageMeta[] {
    const found: TExoPackageMeta[] = [];

    for (const group of ['packages', 'packages/examples']) {
        const groupPath = join(root, group);
        if (!existsSync(groupPath)) continue;

        for (const entry of readdirSync(groupPath, { withFileTypes: true })) {
            if (!entry.isDirectory() || entry.name === 'examples') continue;
            const dir = group === 'packages' ? entry.name : `examples/${entry.name}`;
            const manifest = join(root, 'packages', dir, 'package.json');
            if (!existsSync(manifest)) continue;

            const json = JSON.parse(readFileSync(manifest, 'utf8')) as {
                name?: string;
                private?: boolean;
                dependencies?: Record<string, string>;
                devDependencies?: Record<string, string>;
                peerDependencies?: Record<string, string>;
            };
            const name = json.name ?? dir;
            const isPrivate = json.private === true;

            found.push({
                dir,
                name,
                published: !isPrivate,
                kind: classify(name, isPrivate, dir),
                // devDependencies count as DECLARED: a build script importing its
                // own bundler is not an undeclared dependency.
                declares: [
                    ...Object.keys(json.dependencies ?? {}),
                    ...Object.keys(json.peerDependencies ?? {}),
                    ...Object.keys(json.devDependencies ?? {}),
                ],
            });
        }
    }

    return found.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * What KIND of thing a package is — the classification colour encodes.
 *
 * Derived from the manifest rather than from a hand-kept list, so it cannot go
 * stale: an app is private and lives with the examples, tooling is a compiler /
 * plugin / scaffold, and whatever is published to npm for consumers is runtime.
 */
export function classify(name: string, isPrivate: boolean, dir: string): TExoNodeKind {
    if (isPrivate && (dir.startsWith('examples/') || dir === 'benchmarks')) {
        return 'app';
    }
    if (/plugin|preset|create-|introspect|profiler|atlas/.test(name)) {
        return 'tooling';
    }
    return isPrivate ? 'app' : 'runtime';
}
