import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildModel, withoutExternal, type TExoCruiseInput } from '../model/buildModel';
import type { TExoGraphModel, TExoPackageMeta } from '../model/types';
import { layoutModel, type TExoLayoutOptions } from '../layout/layoutModel';
import type { TExoGraphLayout } from '../layout/types';
import { renderGraphCss } from '../view/graphCss';
import { extractEntities } from '../model/extractEntities';
import { EXO_INSIDES_NODE_LIMIT } from '../constants/EXO_INSIDES_NODE_LIMIT';

// Everything a page needs, produced at BUILD time. Split from the file writing so this half is a
// pure function of the crawl and can be tested without a filesystem.
export type TExoGraphArtifacts = {
    // Model + geometry, for the client to attach behaviour to.
    data: { model: TExoGraphModel; layout: TExoGraphLayout };
    // One entry per package, written as separate files and fetched only when a reader opens one.
    // Measured on this repository: 82 kB gzipped all together, against 5 kB for the package graph
    // plus ~4 kB for the one package somebody actually opens.
    insides: Array<{
        id: string;
        data: { model: TExoGraphModel; layout: TExoGraphLayout };
    }>;
    // Theme variables + structural rules. A pure string function of the palette, so it carries no
    // dependency on which view renders the marks. README for what a view would have to bring back.
    css: string;
};

export type TExoGenerateOptions = {
    granularity?: 'package' | 'module';
    // Include the npm packages the workspace depends on. Off by default: two thirds of the nodes,
    // none of the architecture, and — a node occupies its layout place whether drawn or not —
    // including them stretches the canvas from 2163px to 5952px.
    includeExternal?: boolean;
    layout?: TExoLayoutOptions;
    // CSS scope for the container element.
    scope?: string;
    // Extract each package's internals. On by default.
    withInsides?: boolean;
    // Package directories are recorded relative to it, so without it the sources are looked for
    // under whatever directory the command was run from.
    root?: string;
};

// One diagram per package. Every package is read, applications included: in a repository with a
// single package, skipping it would leave nothing to open. `src` is tried first and the package
// root second, because a tool that only understands `src` quietly produces an empty diagram.
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
        if (model.nodes.length > EXO_INSIDES_NODE_LIMIT) {
            process.stderr.write(
                `exo-atlas: ${meta.name} has ${model.nodes.length} entities, over ` +
                    `${EXO_INSIDES_NODE_LIMIT}; its insides are not drawn\n`
            );
            continue;
        }
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

    const insides =
        options.withInsides === false
            ? []
            : extractInsides(packages, options.root ?? process.cwd());

    return {
        data: { model, layout },
        insides,
        css: renderGraphCss(options.scope),
    };
}

// Stable key order and a trailing newline because the file is committed and diffed: a generator
// that reshuffles its own output produces noise in every review.
export function serialiseData(artifacts: TExoGraphArtifacts): string {
    return `${JSON.stringify(artifacts.data, null, 2)}\n`;
}
