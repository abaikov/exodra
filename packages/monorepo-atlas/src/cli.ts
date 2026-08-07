import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildArtifacts, serialiseData } from './generate/buildArtifacts';
import { cruiseWorkspace } from './generate/cruiseWorkspace';
import { discoverWorkspace } from './generate/discoverWorkspace';
import { fileNameFor } from './client/mountFromUrl';

/**
 * `exo-graph` — turn a repository into an embeddable architecture graph.
 *
 *   npx exo-graph                     write into ./public/graph
 *   npx exo-graph --out static/graph  …or wherever the site serves files from
 *   npx exo-graph --check             fail if the committed files are stale
 *
 * Everything it needs it works out for itself: the workspace layout comes from
 * package.json (or pnpm-workspace.yaml), the rules from the repository's own
 * dependency-cruiser config if it has one. A project that has neither still gets
 * a graph — it just has no rules to report.
 */
export type TExoCliOptions = {
    root: string;
    out: string;
    check: boolean;
    includeExternal: boolean;
    granularity: 'package' | 'module';
    tsConfig?: string;
};

export function parseArgs(argv: readonly string[], cwd: string): TExoCliOptions {
    const options: TExoCliOptions = {
        root: cwd,
        out: join(cwd, 'public/graph'),
        check: false,
        includeExternal: false,
        granularity: 'package',
    };

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        const value = (): string => {
            const next = argv[i + 1];
            if (next === undefined || next.startsWith('--')) {
                throw new Error(`${arg} needs a value`);
            }
            i += 1;
            return next;
        };

        switch (arg) {
            case '--root':
                options.root = resolve(cwd, value());
                break;
            case '--out':
                options.out = resolve(cwd, value());
                break;
            case '--check':
                options.check = true;
                break;
            case '--include-external':
                options.includeExternal = true;
                break;
            case '--modules':
                options.granularity = 'module';
                break;
            case '--ts-config':
                options.tsConfig = value();
                break;
            case '--help':
            case '-h':
                options.check = false;
                throw new Error('HELP');
            default:
                throw new Error(`unknown option ${arg}`);
        }
    }

    // `--out` defaults relative to the ROOT once that is known.
    if (options.out === join(cwd, 'public/graph') && options.root !== cwd) {
        options.out = join(options.root, 'public/graph');
    }
    return options;
}

export const HELP = `exo-graph — an embeddable architecture graph for a repository

  --root <dir>          repository to read (default: cwd)
  --out <dir>           where to write (default: <root>/public/graph)
  --check               fail if the written files are out of date
  --include-external    include the npm packages the workspace depends on
  --modules             graph modules instead of packages
  --ts-config <file>    tsconfig for module resolution (path aliases)
`;

export async function run(argv: readonly string[], cwd: string): Promise<number> {
    let options: TExoCliOptions;
    try {
        options = parseArgs(argv, cwd);
    } catch (error) {
        const message = (error as Error).message;
        if (message === 'HELP') {
            process.stdout.write(HELP);
            return 0;
        }
        process.stderr.write(`exo-atlas: ${message}\n\n${HELP}`);
        return 2;
    }

    const packages = discoverWorkspace(options.root);
    if (packages.length === 0) {
        process.stderr.write(
            `exo-atlas: no packages found in ${options.root}. ` +
                'Is this a workspace root?\n'
        );
        return 1;
    }

    const cruise = await cruiseWorkspace(options.root, {
        tsConfig: options.tsConfig,
    });
    const artifacts = buildArtifacts(cruise, packages, {
        granularity: options.granularity,
        includeExternal: options.includeExternal,
        root: options.root,
    });

    const files: Array<[string, string]> = [
        ['graph.json', serialiseData(artifacts)],
        ['graph.css', artifacts.css],
        // An index of what can be opened, so the page knows which packages are
        // clickable before fetching anything.
        [
            'insides/index.json',
            `${JSON.stringify(artifacts.insides.map(inside => inside.id), null, 2)}\n`,
        ],
        ...artifacts.insides.map(
            inside =>
                [
                    `insides/${fileNameFor(inside.id)}.json`,
                    `${JSON.stringify(inside.data, null, 2)}\n`,
                ] as [string, string]
        ),
    ];

    if (options.check) {
        const stale = files
            .filter(([name, content]) => {
                const path = join(options.out, name);
                return !existsSync(path) || readFileSync(path, 'utf8') !== content;
            })
            .map(([name]) => name);
        if (stale.length > 0) {
            process.stderr.write(
                `exo-atlas: out of date — ${stale.join(', ')}\n` +
                    'Run exo-graph and commit the result.\n'
            );
            return 1;
        }
        process.stdout.write('exo-atlas: up to date\n');
        return 0;
    }

    mkdirSync(join(options.out, 'insides'), { recursive: true });
    for (const [name, content] of files) {
        writeFileSync(join(options.out, name), content);
    }
    copyRuntime(options.out);

    const { model, layout } = artifacts.data;
    process.stdout.write(
        `exo-atlas: wrote ${options.out}\n` +
            `  ${model.nodes.length} ${model.granularity}s, ${model.edges.length} edges` +
            `, canvas ${layout.width}×${layout.height}\n` +
            `  embed:  <link rel="stylesheet" href="graph.css">\n` +
            `          <div id="exo-graph"></div>\n` +
            `          <script type="module" src="graph.js"></script>\n`
    );
    return 0;
}

/**
 * The browser half, copied next to the data.
 *
 * Shipped prebuilt rather than bundled on demand: the point of this tool is that
 * a project drops three files into whatever serves its static assets, without
 * teaching its bundler about any of this.
 */
function copyRuntime(out: string): void {
    const here = dirname(fileURLToPath(import.meta.url));
    for (const candidate of [join(here, 'graph.js'), join(here, '../dist/graph.js')]) {
        if (existsSync(candidate)) {
            cpSync(candidate, join(out, 'graph.js'));
            return;
        }
    }
    process.stderr.write(
        'exo-atlas: the browser runtime (graph.js) is missing from this install; ' +
            'the data and stylesheet were still written.\n'
    );
}
