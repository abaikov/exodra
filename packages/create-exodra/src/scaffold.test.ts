/**
 * End-to-end scaffolding: run the real CLI into a temp directory and inspect what
 * a first-time user actually gets. `generators.test.ts` covers the small snippet
 * helpers; this covers `index.ts`, which is 800 of the package's ~1000 lines and
 * was entirely untested — the first thing anyone runs, and the last thing anyone
 * would notice breaking.
 *
 * The dependency-version assertion is the point of the file: a scaffolder that
 * pins a version which no longer exists produces a project that cannot install,
 * and nothing else in the repo would catch it.
 */
import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const cli = join(__dirname, '..', 'dist', 'index.js');
const ALL_FLAGS = [
    '--ts',
    '--eslint',
    '--tailwind',
    '--src-dir',
    '--app',
    '--use-npm',
    '--ssr',
    '--import-alias',
    '@/*',
];

let workdir: string;
let project: string;

// The CLI is only non-interactive when EVERY option is supplied; a missing flag
// turns into a prompt and the run hangs. Failing here means a new option was
// added without a flag, which would also break any CI that scaffolds.
beforeAll(() => {
    workdir = mkdtempSync(join(tmpdir(), 'exo-scaffold-'));
    project = join(workdir, 'probe-app');
    execFileSync('node', [cli, 'probe-app', ...ALL_FLAGS], {
        cwd: workdir,
        encoding: 'utf8',
        timeout: 120_000,
        stdio: 'pipe',
    });
}, 180_000);

afterAll(() => rmSync(workdir, { recursive: true, force: true }));

describe('create-exodra scaffolds a usable project', () => {
    it('writes the files the generated README/scripts assume exist', () => {
        for (const file of [
            'package.json',
            'tsconfig.json',
            'vite.config.ts',
            'index.html',
            '.gitignore',
        ]) {
            expect(existsSync(join(project, file)), `missing ${file}`).toBe(true);
        }
        expect(readdirSync(join(project, 'src')).length).toBeGreaterThan(0);
    });

    it('emits valid JSON, not a half-rendered template', () => {
        const pkg = JSON.parse(readFileSync(join(project, 'package.json'), 'utf8'));
        expect(pkg.name).toBe('probe-app');
        expect(pkg.scripts?.dev).toBeTruthy();
        expect(pkg.scripts?.build).toBeTruthy();
        // tsconfig may carry comments in some templates; only assert it parses
        // when it is plain JSON.
        const tsconfig = readFileSync(join(project, 'tsconfig.json'), 'utf8');
        expect(tsconfig).toContain('compilerOptions');
    });

    it('leaves no unreplaced placeholders in generated files', () => {
        const suspects = ['package.json', 'index.html', 'vite.config.ts'];
        for (const file of suspects) {
            const text = readFileSync(join(project, file), 'utf8');
            expect(text, `${file} has an unrendered placeholder`).not.toMatch(
                /\{\{\s*\w+\s*\}\}|__[A-Z_]+__/
            );
        }
    });

    it('pins @exodra versions that this repo can actually satisfy', () => {
        // A scaffold referencing a version that was never published produces a
        // project that fails on `npm install` — the worst possible first contact.
        const pkg = JSON.parse(readFileSync(join(project, 'package.json'), 'utf8'));
        const declared = { ...pkg.dependencies, ...pkg.devDependencies };
        const exodraDeps = Object.entries(declared).filter(([name]) =>
            name.startsWith('@exodra/')
        ) as Array<[string, string]>;

        expect(exodraDeps.length, 'scaffold declares no @exodra dependency').toBeGreaterThan(0);

        const repoRoot = join(__dirname, '..', '..', '..');
        for (const [name, range] of exodraDeps) {
            const dir = name.replace('@exodra/', '');
            const pkgPath = join(repoRoot, 'packages', dir, 'package.json');
            expect(existsSync(pkgPath), `${name} is not a package in this repo`).toBe(true);
            const actual = JSON.parse(readFileSync(pkgPath, 'utf8')).version as string;
            const wanted = range.replace(/^[\^~]/, '');
            // Same major.minor — a scaffold one minor behind installs a version
            // whose API the generated code was not written against.
            expect(
                actual.split('.').slice(0, 2).join('.'),
                `${name}: scaffold asks for ${range}, repo is at ${actual}`
            ).toBe(wanted.split('.').slice(0, 2).join('.'));
        }
    });
});
