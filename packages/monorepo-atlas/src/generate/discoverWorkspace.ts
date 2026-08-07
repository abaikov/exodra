import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { TExoNodeKind, TExoPackageMeta } from '../model/types';

/**
 * Find the packages of a workspace — ANY workspace, not this one.
 *
 * The layout is read from the repository rather than assumed: npm/yarn/bun
 * declare `workspaces` in the root package.json, pnpm uses
 * `pnpm-workspace.yaml`. A single-package repository is a workspace of one.
 * Hard-coding `packages/*` would have made this tool useful in exactly one
 * repository — the one it was written in.
 */
export type TExoDiscoverOptions = {
    /**
     * How a package is classified — this is what colour encodes, and every
     * project draws the line somewhere else. The default is a reasonable guess;
     * a project with its own taxonomy passes its own.
     */
    classify?: (info: TExoPackageInfo) => TExoNodeKind;
};

export type TExoPackageInfo = {
    /** Path relative to the workspace root, e.g. `packages/dom`. */
    dir: string;
    name: string;
    private: boolean;
    manifest: Record<string, unknown>;
};

export function discoverWorkspace(
    root: string,
    options: TExoDiscoverOptions = {}
): TExoPackageMeta[] {
    const classify = options.classify ?? classifyByConvention;
    const found: TExoPackageMeta[] = [];

    for (const dir of packageDirs(root)) {
        const manifestPath = join(root, dir, 'package.json');
        if (!existsSync(manifestPath)) continue;

        let manifest: Record<string, unknown>;
        try {
            manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
        } catch {
            // A malformed manifest is the repository's problem, not a reason to
            // abandon the whole graph.
            continue;
        }

        const name = typeof manifest.name === 'string' ? manifest.name : dir;
        const isPrivate = manifest.private === true;
        const info: TExoPackageInfo = { dir, name, private: isPrivate, manifest };

        found.push({
            dir,
            name,
            published: !isPrivate,
            kind: classify(info),
            // devDependencies count as DECLARED: a build script importing its
            // own bundler is not an undeclared dependency.
            declares: [
                ...names(manifest.dependencies),
                ...names(manifest.peerDependencies),
                ...names(manifest.devDependencies),
            ],
        });
    }

    return found.sort((a, b) => a.name.localeCompare(b.name));
}

const names = (value: unknown): string[] =>
    value && typeof value === 'object' ? Object.keys(value) : [];

/** Workspace globs, from whichever file this repository keeps them in. */
export function workspaceGlobs(root: string): string[] {
    const manifestPath = join(root, 'package.json');
    if (existsSync(manifestPath)) {
        try {
            const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
            const workspaces = Array.isArray(manifest.workspaces)
                ? manifest.workspaces
                : Array.isArray(manifest.workspaces?.packages)
                  ? manifest.workspaces.packages
                  : [];
            if (workspaces.length > 0) return workspaces as string[];
        } catch {
            /* fall through to pnpm / single package */
        }
    }

    const pnpm = join(root, 'pnpm-workspace.yaml');
    if (existsSync(pnpm)) {
        // Deliberately not a YAML parser: the only shape that matters here is a
        // `packages:` list of quoted globs, and taking a YAML dependency for it
        // would be heavier than the feature.
        const globs = readFileSync(pnpm, 'utf8')
            .split('\n')
            .map(line => /^\s*-\s*["']?([^"'#]+?)["']?\s*$/.exec(line)?.[1])
            .filter((glob): glob is string => Boolean(glob));
        if (globs.length > 0) return globs;
    }

    // Not a monorepo: the root itself is the one package.
    return ['.'];
}

/**
 * Expand the globs. Only the shapes workspace globs actually use are supported
 * — `dir/*`, `dir/**`, and a literal path — because that is the whole grammar
 * npm and pnpm accept here.
 */
function packageDirs(root: string): string[] {
    const dirs = new Set<string>();

    for (const glob of workspaceGlobs(root)) {
        const normalised = glob.replace(/\/+$/, '');
        if (normalised === '.') {
            dirs.add('.');
            continue;
        }

        const star = normalised.indexOf('*');
        if (star === -1) {
            dirs.add(normalised);
            continue;
        }

        const base = normalised.slice(0, star).replace(/\/+$/, '');
        const deep = normalised.slice(star).startsWith('**');
        for (const dir of childDirs(root, base, deep)) dirs.add(dir);
    }

    return [...dirs].sort();
}

function childDirs(root: string, base: string, deep: boolean): string[] {
    const absolute = join(root, base);
    if (!existsSync(absolute)) return [];

    const out: string[] = [];
    const walk = (current: string, depth: number): void => {
        for (const entry of readdirSync(current, { withFileTypes: true })) {
            if (!entry.isDirectory() || entry.name === 'node_modules') continue;
            const child = join(current, entry.name);
            out.push(relative(root, child).split(sep).join('/'));
            // `**` means any depth; `*` means exactly one level.
            if (deep && depth < 8 && statSync(child).isDirectory()) {
                walk(child, depth + 1);
            }
        }
    };
    walk(absolute, 0);
    return out;
}

/**
 * The default taxonomy, from signals every manifest carries.
 *
 * Colour can only carry three categories (any two nodes in a graph can end up
 * side by side, which caps a categorical palette at three), so the split is
 * deliberately coarse: what you ship, what builds it, and what merely uses it.
 */
export function classifyByConvention(info: TExoPackageInfo): TExoNodeKind {
    const scripts = info.manifest.scripts as Record<string, string> | undefined;
    const bin = info.manifest.bin;

    // Anything published for consumers is the product.
    if (!info.private) {
        return /plugin|preset|loader|codemod|cli|create-/.test(info.name) || bin
            ? 'tooling'
            : 'runtime';
    }

    // Private packages: a thing that gets served or benchmarked is an app;
    // a private helper that only builds things is tooling.
    if (
        /example|demo|app|site|docs|bench|playground|e2e|test/.test(info.dir) ||
        scripts?.dev !== undefined ||
        scripts?.start !== undefined
    ) {
        return 'app';
    }
    return 'tooling';
}
