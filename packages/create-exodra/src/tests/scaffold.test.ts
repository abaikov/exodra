/**
 * End-to-end scaffolding: run the real CLI into a temp directory and inspect what
 * a first-time user actually gets. `generators.test.ts` covers the small snippet
 * helpers; this covers `index.ts`, which is 850 of the package's ~1150 lines and
 * was entirely untested — the first thing anyone runs, and the last thing anyone
 * would notice breaking.
 *
 * The dependency-version assertion is the point of the file: a scaffolder that
 * pins a version which no longer exists produces a project that cannot install,
 * and nothing else in the repo would catch it.
 *
 * ═══ BOTH SCAFFOLDS, BECAUSE THEY SHARE ALMOST NOTHING ═══
 *
 * `index.ts` has two mutually exclusive halves and `--ssr` picks between them at
 * `createPackageJson` (line 203) and `createProjectFiles` (line 264). This file
 * used to pass `--ssr` and only `--ssr`, so the DEFAULT scaffold — the one a user
 * who types `npx create-exodra my-app` and answers "no" to server rendering gets,
 * and the only one that declares `@exodra/router` and `@exodra/vite-plugin` —
 * was never executed by anything. The tell was already visible in the assertions:
 * the file list demanded `vite.config.ts`, which only the SSR branch writes; the
 * SPA branch writes `vite.config.js`.
 *
 * ═══ A PACKAGE'S DIRECTORY IS NOT ITS NAME, AND ONE PACKAGE PROVES IT ═══
 *
 * The version check used to derive a directory as `name.replace('@exodra/', '')`.
 * That is true of every package the SSR scaffold names and FALSE of the one only
 * the SPA scaffold names: `@exodra/vite-plugin` lives in `packages/vite-plugin-exodra`.
 * So the assertion `${name} is not a package in this repo` was not merely unexercised
 * — it was guaranteed to fail the moment this file covered the default path, on a
 * package that is perfectly present. The mapping below reads the names out of the
 * manifests instead, which is the only thing that cannot drift from them.
 */
import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const cli = join(__dirname, '..', '..', 'dist', 'index.js');
const REPO_ROOT = join(__dirname, '..', '..', '..', '..');

/**
 * The CLI is only non-interactive when EVERY option is supplied; a missing flag
 * turns into a prompt and the run hangs. A timeout here means a new option was
 * added without a flag, which would also break any CI that scaffolds.
 */
/**
 * `--no-git` AND `--no-ssr` ARE BOTH LOAD-BEARING HERE, for different reasons.
 *
 * `--no-ssr`: until it existed there was no way to answer the SSR question from a flag, so the
 * default SPA scaffold prompted and waited — which is why nothing had ever run it unattended.
 *
 * `--no-git`: `initGit` runs `git init`, `git add -A` and `git commit`. A test suite that
 * scaffolds twice ran six git commands on every `npm test`, in a temp directory, silently. The
 * flag turns that off, so what this file exercises is the scaffolder and not version control.
 */
const COMMON_FLAGS = [
    '--ts',
    '--eslint',
    '--tailwind',
    '--src-dir',
    '--app',
    '--use-npm',
    '--no-git',
    '--import-alias',
    '@/*',
];

/** Every `@exodra/*` package in this repo, keyed by the name its manifest declares. */
function packagesByName(): Map<string, { dir: string; version: string }> {
    const found = new Map<string, { dir: string; version: string }>();
    const root = join(REPO_ROOT, 'packages');
    for (const dir of readdirSync(root)) {
        const manifest = join(root, dir, 'package.json');
        if (!existsSync(manifest)) continue;
        const parsed = JSON.parse(readFileSync(manifest, 'utf8')) as {
            name?: string;
            version?: string;
        };
        if (typeof parsed.name !== 'string' || typeof parsed.version !== 'string') continue;
        found.set(parsed.name, { dir, version: parsed.version });
    }
    return found;
}

let workdir: string;

/** One scaffolded project, with the file names that variant is supposed to have written. */
type TVariant = {
    label: string;
    flags: readonly string[];
    /** Files the generated `package.json` scripts and README assume exist. */
    files: readonly string[];
    /** Files scanned for unrendered template placeholders. */
    rendered: readonly string[];
    dir: string;
};

const VARIANTS: TVariant[] = [
    {
        label: 'SPA (the default — no --ssr)',
        // `--no-ssr` EXPLICITLY, and it is the whole reason this variant can exist. Omitting the
        // flag does not mean "no": it leaves `options.ssr` undefined, the scaffolder asks, and the
        // process waits for a keystroke. That is why the default path had never been run
        // unattended by anything.
        flags: [...COMMON_FLAGS, '--no-ssr'],
        files: ['package.json', 'tsconfig.json', 'vite.config.js', 'index.html', '.gitignore'],
        rendered: ['package.json', 'index.html', 'vite.config.js'],
        dir: '',
    },
    {
        label: 'SSR (--ssr)',
        flags: [...COMMON_FLAGS, '--ssr'],
        files: ['package.json', 'tsconfig.json', 'vite.config.ts', 'index.html', '.gitignore'],
        rendered: ['package.json', 'index.html', 'vite.config.ts'],
        dir: '',
    },
];

beforeAll(() => {
    workdir = mkdtempSync(join(tmpdir(), 'exo-scaffold-'));
    for (const variant of VARIANTS) {
        const name = variant.flags.includes('--ssr') ? 'probe-ssr' : 'probe-spa';
        variant.dir = join(workdir, name);
        execFileSync('node', [cli, name, ...variant.flags], {
            cwd: workdir,
            encoding: 'utf8',
            timeout: 120_000,
            stdio: 'pipe',
        });
    }
}, 300_000);

afterAll(() => rmSync(workdir, { recursive: true, force: true }));

describe.each(VARIANTS)('create-exodra scaffolds a usable project — $label', (variant) => {
    it('writes the files the generated README/scripts assume exist', () => {
        for (const file of variant.files) {
            expect(existsSync(join(variant.dir, file)), `missing ${file}`).toBe(true);
        }
        expect(readdirSync(join(variant.dir, 'src')).length).toBeGreaterThan(0);
    });

    it('emits valid JSON, not a half-rendered template', () => {
        const pkg = JSON.parse(readFileSync(join(variant.dir, 'package.json'), 'utf8'));
        expect(pkg.name).toBe(variant.flags.includes('--ssr') ? 'probe-ssr' : 'probe-spa');
        expect(pkg.scripts?.dev).toBeTruthy();
        expect(pkg.scripts?.build).toBeTruthy();
        // tsconfig may carry comments in some templates; only assert it parses
        // when it is plain JSON.
        const tsconfig = readFileSync(join(variant.dir, 'tsconfig.json'), 'utf8');
        expect(tsconfig).toContain('compilerOptions');
    });

    it('leaves no unreplaced placeholders in generated files', () => {
        for (const file of variant.rendered) {
            const text = readFileSync(join(variant.dir, file), 'utf8');
            expect(text, `${file} has an unrendered placeholder`).not.toMatch(
                /\{\{\s*\w+\s*\}\}|__[A-Z_]+__/
            );
        }
    });

    it('every script it declares points at a file it wrote', () => {
        // `"serve": "tsx server/prod-server.ts"` shipped for as long as the SSR
        // scaffold has existed and `server/prod-server.ts` has never been written
        // by anything. A script naming a missing file is a first contact that ends
        // in `ENOENT`, and no assertion about file presence alone can see it,
        // because nothing said which files the scripts were going to name.
        const pkg = JSON.parse(readFileSync(join(variant.dir, 'package.json'), 'utf8')) as {
            scripts?: Record<string, string>;
        };
        const scripts = pkg.scripts ?? {};
        for (const [script, command] of Object.entries(scripts)) {
            // A path INSIDE the project the command names. The `/` is required on purpose:
            // it is what separates `server/prod-server.ts` from an extension list such as
            // `eslint . --ext .ts,.tsx`, which names no file at all.
            const referencedPaths =
                command.match(/(?:\.\/)?[\w.-]+(?:\/[\w.-]+)+\.(?:ts|tsx|js|mjs|cjs)/g) ?? [];
            for (const referenced of referencedPaths) {
                expect(
                    existsSync(join(variant.dir, referenced)),
                    `script "${script}" runs ${referenced}, which the scaffold did not write`
                ).toBe(true);
            }
        }
    });

    it('declares the toolchains whose config files it wrote', () => {
        // `--tailwind` and `--eslint` are handled outside the ssr branch, so the SSR manifest
        // used to omit `tailwindcss` while `postcss.config.js` sat beside it requiring it. This
        // combination is exactly what both variants above are scaffolded with, and nothing
        // asked whether the manifest matched the files.
        const pkg = JSON.parse(readFileSync(join(variant.dir, 'package.json'), 'utf8')) as {
            dependencies?: Record<string, string>;
            devDependencies?: Record<string, string>;
        };
        const declared = { ...pkg.dependencies, ...pkg.devDependencies };

        if (existsSync(join(variant.dir, 'postcss.config.js'))) {
            for (const dep of ['tailwindcss', 'autoprefixer', 'postcss']) {
                expect(
                    declared[dep],
                    `postcss.config.js is present but ${dep} is not a dependency`
                ).toBeTruthy();
            }
        }
        if (existsSync(join(variant.dir, '.eslintrc.json'))) {
            expect(
                declared.eslint,
                '.eslintrc.json is present but eslint is not a dependency'
            ).toBeTruthy();
        }
    });

    it('pins @exodra versions that this repo can actually satisfy', () => {
        // A scaffold referencing a version that was never published produces a
        // project that fails on `npm install` — the worst possible first contact.
        const pkg = JSON.parse(readFileSync(join(variant.dir, 'package.json'), 'utf8'));
        const declared = { ...pkg.dependencies, ...pkg.devDependencies };
        const exodraDeps = Object.entries(declared).filter(([name]) =>
            name.startsWith('@exodra/')
        ) as Array<[string, string]>;

        expect(exodraDeps.length, 'scaffold declares no @exodra dependency').toBeGreaterThan(0);

        const inRepo = packagesByName();
        for (const [name, range] of exodraDeps) {
            const found = inRepo.get(name);
            expect(
                found,
                `${name} is not the "name" of any package in this repo — the scaffold would ` +
                    'install something nobody here publishes'
            ).toBeDefined();
            const wanted = range.replace(/^[\^~]/, '');
            // Same major.minor — a scaffold one minor behind installs a version
            // whose API the generated code was not written against.
            expect(
                found!.version.split('.').slice(0, 2).join('.'),
                `${name}: scaffold asks for ${range}, repo is at ${found!.version} ` +
                    `(packages/${found!.dir})`
            ).toBe(wanted.split('.').slice(0, 2).join('.'));
        }
    });
});

describe('what the scaffolded sources are written in', () => {
    const spa = () => VARIANTS[0].dir;
    const ssr = () => VARIANTS[1].dir;

    it('SPA: pages declare their markup with exoJsx, typed by the schema dialect', () => {
        const page = readFileSync(join(spa(), 'src/pages/index.tsx'), 'utf8');
        expect(page).toContain("import { exoJsx } from '@exodra/jsx';");
        expect(page).toContain('withExoWire(m, c => {');
        expect(page).not.toContain('createInitialState');

        const main = readFileSync(join(spa(), 'src/main.tsx'), 'utf8');
        expect(main).toContain('const App = createExoMachine(appSchema, {');
        expect(main).toContain('createInitialState: (c: TExoDomNode) => {');
        expect(main).toContain(
            "c.build(ExoLink, { to: '/', label: 'Home', currentWhen: 'exact' })"
        );
        expect(main).not.toContain('.createInitialState(');

        const tsconfig = JSON.parse(readFileSync(join(spa(), 'tsconfig.json'), 'utf8')) as {
            compilerOptions: { jsxImportSource?: string };
        };
        expect(tsconfig.compilerOptions.jsxImportSource).toBe('@exodra/jsx/schema');
    });

    it('SSR: renders through renderExoPage and ships the state script after the container', () => {
        const app = readFileSync(join(ssr(), 'src/app.ts'), 'utf8');
        expect(app).toContain(
            'createInitialState: (_c: TExoMachineNode, _params: TAppParams): TAppState => ({ count: 0 })'
        );
        expect(app).not.toContain('.createInitialState(');

        const server = readFileSync(join(ssr(), 'src/entry-server.ts'), 'utf8');
        expect(server).toContain('renderExoPage(App');
        expect(server).toContain('stateScript: page.stateScript');

        const client = readFileSync(join(ssr(), 'src/entry-client.ts'), 'utf8');
        expect(client).toContain('readExoStateScript()');

        const html = readFileSync(join(ssr(), 'index.html'), 'utf8');
        expect(html.indexOf('<!--app-state-->')).toBeGreaterThan(
            html.indexOf('<div id="root"><!--app-html--></div>')
        );
        for (const file of ['server/dev-server.ts', 'server/prod-server.ts']) {
            expect(readFileSync(join(ssr(), file), 'utf8')).toContain(
                ".replace('<!--app-state-->', stateScript)"
            );
        }
    });
});
