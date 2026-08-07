import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { renderToString } from '@exodra/string';
import {
    buildModel,
    withoutExternal,
    type TExoCruiseInput,
} from '../model/buildModel';
import type { TExoGraphModel, TExoPackageMeta } from '../model/types';
import { layoutModel, type TExoLayoutOptions } from '../layout/layoutModel';
import type { TExoGraphLayout } from '../layout/types';
import { createGraphView } from '../view/graphView';
import { renderGraphCss } from '../view/graphCss';
import { createViewState } from '../view/viewState';
import { extractEntities } from '../model/extractEntities';

/**
 * Everything a page needs, produced at BUILD time.
 *
 * Split from the file writing on purpose: this half is a pure function of the
 * crawl, so it can be tested without a filesystem, and the CLI around it does
 * nothing but run the crawler and write bytes.
 */
export type TExoGraphArtifacts = {
    /** Model + geometry, for the client to attach behaviour to. */
    data: { model: TExoGraphModel; layout: TExoGraphLayout };
    /**
     * What is inside each package — one entry per package, written as separate
     * files and fetched only when a reader opens one. Measured on this
     * repository: all of them together are 82 kB gzipped, against 5 kB for the
     * package graph plus ~4 kB for the one package somebody actually opens.
     */
    insides: Array<{
        id: string;
        data: { model: TExoGraphModel; layout: TExoGraphLayout };
    }>;
    /**
     * The picture as static markup, for a host that renders its page on the
     * server. NOT written by the CLI: the interactive explorer replaces the tree
     * with a different shape (it gains a toolbar, a breadcrumb and a panel), so
     * shipping a file nobody mounts would be dead weight and a claim that is not
     * true. A host that wants a no-JavaScript first paint takes this string and
     * puts it in its own template.
     */
    svg: string;
    /** Theme variables + structural rules. */
    css: string;
};

export type TExoGenerateOptions = {
    granularity?: 'package' | 'module';
    /**
     * Include the npm packages the workspace depends on. Off by default: they
     * are two thirds of the nodes, none of the architecture, and — because a
     * node occupies its place in the layout whether or not it is drawn —
     * including them stretches the canvas from 2163px to 5952px.
     */
    includeExternal?: boolean;
    layout?: TExoLayoutOptions;
    /** CSS scope for the container element. */
    scope?: string;
    /** Extract each package's internals. On by default. */
    withInsides?: boolean;
    /**
     * Where the repository is. Package directories are recorded relative to it,
     * so without it the sources are looked for under whatever directory the
     * command was run from — which is right only by accident.
     */
    root?: string;
};

/**
 * One diagram per package: its classes, functions and types, and how they reach
 * each other.
 *
 * Every package is read, including applications: an app is often the thing
 * somebody most wants to understand, and in a repository with a single package
 * skipping it would leave nothing to open at all.
 *
 * `src` is tried first and the package root second, because plenty of projects
 * keep their code at the top level — and a tool that only understands `src`
 * quietly produces an empty diagram for them.
 */
function extractInsides(
    packages: readonly TExoPackageMeta[],
    root: string
): TExoGraphArtifacts['insides'] {
    const out: TExoGraphArtifacts['insides'] = [];
    for (const meta of packages) {
        const base = join(root, meta.dir);
        const sources = existsSync(join(base, 'src'))
            ? [join(base, 'src', '**', '*.ts'), join(base, 'src', '**', '*.tsx')]
            : [join(base, '*.ts'), join(base, '*.tsx')];
        const model = extractEntities({
            include: sources,
            exclude: [
                '**/*.test.*',
                '**/*.spec.*',
                '**/*.d.ts',
                '**/node_modules/**',
                '**/dist/**',
            ],
        });
        if (model.nodes.length === 0) continue;
        out.push({ id: meta.name, data: { model, layout: layoutModel(model) } });
    }
    return out;
}

export function buildArtifacts(
    cruise: TExoCruiseInput,
    packages: readonly TExoPackageMeta[],
    options: TExoGenerateOptions = {}
): TExoGraphArtifacts {
    const crawled = buildModel(cruise, {
        granularity: options.granularity ?? 'package',
        packages,
    });
    const model = options.includeExternal ? crawled : withoutExternal(crawled);
    const layout = layoutModel(model, options.layout);

    // Rendered with a FRESH default state, which is the same state the client
    // starts from — otherwise the first paint would disagree with the moment
    // the script takes over.
    const svg = renderToString(
        createGraphView(model, layout, createViewState(), { static: true })
    );

    const insides =
        options.withInsides === false
            ? []
            : extractInsides(packages, options.root ?? process.cwd());

    return {
        data: { model, layout },
        insides,
        svg,
        css: renderGraphCss(options.scope),
    };
}

/**
 * Serialise the data for the page. Stable key order and a trailing newline
 * because the file is committed and diffed — a generator that reshuffles its
 * own output produces noise in every review.
 */
export function serialiseData(artifacts: TExoGraphArtifacts): string {
    return `${JSON.stringify(artifacts.data, null, 2)}\n`;
}
