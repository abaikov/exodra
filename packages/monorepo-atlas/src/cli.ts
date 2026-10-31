import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildArtifacts, serialiseData, type TExoGraphArtifacts } from './generate/buildArtifacts';
import { cruiseWorkspace } from './generate/cruiseWorkspace';
import { discoverWorkspace } from './generate/discoverWorkspace';
import { fileNameFor } from './generate/fileNameFor';
import type { TExoUnresolvedType } from './model/types';

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

export const EXO_HELP = `exo-graph — an embeddable architecture graph for a repository

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
            process.stdout.write(EXO_HELP);
            return 0;
        }
        process.stderr.write(`exo-atlas: ${message}\n\n${EXO_HELP}`);
        return 2;
    }

    const packages = discoverWorkspace(options.root);
    if (packages.length === 0) {
        process.stderr.write(
            `exo-atlas: no packages found in ${options.root}. ` + 'Is this a workspace root?\n'
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
            `${JSON.stringify(
                artifacts.insides.map((inside) => inside.id),
                null,
                2
            )}\n`,
        ],
        ...artifacts.insides.map(
            (inside) =>
                [
                    `insides/${fileNameFor(inside.id)}.json`,
                    `${JSON.stringify(inside.data, null, 2)}\n`,
                ] as [string, string]
        ),
    ];

    // Said BEFORE the result, and on stderr, in both modes: a model with a hole in it is
    // still written and still passes `--check` once it is committed, so the only thing that
    // can tell anybody it happened is this line.
    const holes = unresolvedIn(artifacts);
    if (holes.length > 0) {
        const shown = holes.slice(0, 5).map(describeHole).join('\n');
        const rest = holes.length > 5 ? `      … and ${holes.length - 5} more\n` : '';
        process.stderr.write(
            `exo-atlas: ${holes.length} member type(s) could NOT be resolved. Each one is\n` +
                `  marked «type unresolved» on its box and listed under the model's\n` +
                `  "unresolved" key — the diagram is INCOMPLETE by exactly this much:\n` +
                `${shown}\n${rest}`
        );
    }

    const insidesDir = join(options.out, 'insides');
    const written = new Set(files.map(([name]) => name));
    const leftover = existsSync(insidesDir)
        ? readdirSync(insidesDir)
              .sort()
              .map((name) => `insides/${name}`)
              .filter((name) => name.endsWith('.json') && !written.has(name))
        : [];

    if (options.check) {
        const stale = files
            .filter(([name, content]) => {
                const path = join(options.out, name);
                return !existsSync(path) || readFileSync(path, 'utf8') !== content;
            })
            .map(([name]) => name)
            .concat(leftover);
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
    for (const name of leftover) rmSync(join(options.out, name));

    const { model, layout } = artifacts.data;
    process.stdout.write(
        `exo-atlas: wrote ${options.out}\n` +
            `  ${model.nodes.length} ${model.granularity}s, ${model.edges.length} edges` +
            `, canvas ${layout.width}×${layout.height}\n` +
            '  the data and the stylesheet only: this build ships no picture and no\n' +
            '  browser runtime — see the README.\n'
    );
    return 0;
}

/** A gap in the model, with the diagram it is a gap in. */
type TExoHole = { where: string; hole: TExoUnresolvedType };

/**
 * Every type the extraction gave up on, across the package graph and every package inside.
 *
 * Gathered into ONE number rather than counted per package because the question whoever ran
 * the command has is "did this build lose anything", and a per-package line saying nothing
 * 28 times and something once is a line that gets scrolled past.
 */
function unresolvedIn(artifacts: TExoGraphArtifacts): readonly TExoHole[] {
    const graph = artifacts.data.model.unresolved ?? [];
    return [
        ...graph.map((hole) => ({ where: 'the package graph', hole })),
        ...artifacts.insides.flatMap((inside) =>
            (inside.data.model.unresolved ?? []).map((hole) => ({ where: inside.id, hole }))
        ),
    ];
}

/** One line a reader can act on: which package, which member, and what the checker said. */
function describeHole({ where, hole }: TExoHole): string {
    const name = hole.owner === hole.member ? hole.owner : `${hole.owner}.${hole.member}`;
    return `      ${where} → ${name} — ${hole.reason}`;
}
