import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { cruise } from 'dependency-cruiser';
import extractDepcruiseConfig from 'dependency-cruiser/config-utl/extract-depcruise-config';
import type { TExoCruiseInput } from '../model/buildModel';

/**
 * Crawl a repository's imports.
 *
 * Called through dependency-cruiser's API rather than by shelling out to its
 * CLI: a tool people install should not require them to have a second one on
 * their PATH, or to know that this is how the graph is produced at all.
 *
 * A project's OWN configuration is used when it has one — that is where its
 * architecture rules live, and those rules are what turns a picture into a
 * check. Without one the crawl still works; the graph just has no rules to
 * report, which is the honest result for a repository that has not declared any.
 */
export type TExoCruiseOptions = {
    /** Directories to crawl, relative to the root. */
    entries?: readonly string[];
    /** Explicit config path. Otherwise the usual filenames are tried. */
    config?: string;
    /** tsconfig used for module resolution (path aliases live there). */
    tsConfig?: string;
};

const CONFIG_NAMES = [
    '.dependency-cruiser.cjs',
    '.dependency-cruiser.mjs',
    '.dependency-cruiser.js',
    '.dependency-cruiser.json',
];

export async function cruiseWorkspace(
    root: string,
    options: TExoCruiseOptions = {}
): Promise<TExoCruiseInput> {
    const configPath = options.config ?? findConfig(root);
    const config = configPath
        ? ((await extractDepcruiseConfig(configPath)) as {
              options?: Record<string, unknown>;
              forbidden?: unknown;
              allowed?: unknown;
          })
        : {};

    // A config file keeps resolution settings under `options` and the rules at
    // the top level; the API wants the resolution settings flattened and the
    // rules gathered into `ruleSet` — validation reads them from there.
    const hasRules = Boolean(config.forbidden ?? config.allowed);
    const cruiseOptions: Record<string, unknown> = {
        ...config.options,
        outputType: 'json',
        // Crawl from the ROOT that was asked for, not from wherever the command
        // happened to be run. Without this the entry directories resolve against
        // the current working directory, so `--root ../other-project` crawls the
        // wrong repository — or, more often, none at all.
        baseDir: root,
        // Type-only imports are architecture too — and without this a
        // `import type` edge is invisible, which quietly hides whole
        // dependencies. (It is how every edge to a types-only package
        // disappeared from this repository's own graph.)
        tsPreCompilationDeps: true,
        validate: hasRules,
        ...(hasRules ? { ruleSet: { forbidden: config.forbidden, allowed: config.allowed } } : {}),
    };
    if (options.tsConfig) {
        cruiseOptions.tsConfig = { fileName: options.tsConfig };
    }

    const entries = options.entries ?? defaultEntries(root);
    const result = await cruise(entries as string[], cruiseOptions as never, undefined, undefined);

    return (
        typeof result.output === 'string' ? JSON.parse(result.output) : result.output
    ) as TExoCruiseInput;
}

function findConfig(root: string): string | undefined {
    for (const name of CONFIG_NAMES) {
        const path = join(root, name);
        if (existsSync(path)) return path;
    }
    return undefined;
}

/**
 * What to crawl when nobody said. `packages` and `apps` cover the layouts npm
 * and pnpm workspaces actually use; `src` covers a single-package repository.
 */
function defaultEntries(root: string): string[] {
    const candidates = ['packages', 'apps', 'libs', 'src'].filter((dir) =>
        existsSync(join(root, dir))
    );
    return candidates.length > 0 ? candidates : ['.'];
}
