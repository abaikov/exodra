import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseArgs, run } from '../cli';

const cwd = '/repo';

describe('parseArgs', () => {
    it('writes next to the site by default', () => {
        expect(parseArgs([], cwd)).toMatchObject({
            root: cwd,
            out: '/repo/public/graph',
            check: false,
            includeExternal: false,
            granularity: 'package',
        });
    });

    it('takes an output directory', () => {
        expect(parseArgs(['--out', 'static/graph'], cwd).out).toBe('/repo/static/graph');
    });

    it('defaults the output INSIDE the given root', () => {
        // Otherwise pointing at another repository would write into this one.
        expect(parseArgs(['--root', '/other'], cwd).out).toBe('/other/public/graph');
    });

    it('understands the flags', () => {
        const options = parseArgs(['--check', '--include-external', '--modules'], cwd);
        expect(options).toMatchObject({
            check: true,
            includeExternal: true,
            granularity: 'module',
        });
    });

    it('rejects an unknown option instead of ignoring it', () => {
        expect(() => parseArgs(['--nope'], cwd)).toThrow(/unknown option/);
    });

    it('rejects a flag that swallowed the next flag as its value', () => {
        expect(() => parseArgs(['--out', '--check'], cwd)).toThrow(/needs a value/);
        expect(() => parseArgs(['--out'], cwd)).toThrow(/needs a value/);
    });
});

describe('run', () => {
    /**
     * A repository with ONE package, run from somewhere else entirely.
     *
     * This is the shape every non-monorepo project has, and the case both real
     * bugs hid in: the crawl and the entity extraction resolved their paths
     * against the current working directory, so `--root` pointed one way and the
     * reading happened another. Run from inside this repository it looked fine,
     * which is exactly why it needs a test that runs from outside.
     */
    it('reads the repository it was pointed at, not the one it runs in', async () => {
        const root = mkdtempSync(join(tmpdir(), 'exo-solo-'));
        mkdirSync(join(root, 'src'));
        writeFileSync(
            join(root, 'package.json'),
            JSON.stringify({ name: 'solo-app', version: '1.0.0' })
        );
        writeFileSync(
            join(root, 'src', 'store.ts'),
            '/** Holds everything. */\nexport class Store {\n' +
                '    add(item: string): void { void item; }\n}\n'
        );
        writeFileSync(
            join(root, 'src', 'index.ts'),
            "import { Store } from './store';\n" +
                '/** Boots it. */\n' +
                'export function main(): void { new Store(); }\n'
        );

        const out = join(root, 'out');
        expect(await run(['--root', root, '--out', out], '/elsewhere')).toBe(0);

        // A single package makes a one-box graph; what a reader opens it for is
        // what is INSIDE, so that is the part that must not come out empty.
        const index = JSON.parse(readFileSync(join(out, 'insides', 'index.json'), 'utf8'));
        expect(index).toEqual(['solo-app']);

        const inside = JSON.parse(readFileSync(join(out, 'insides', 'solo-app.json'), 'utf8'));
        const names = inside.model.nodes.map((node: { id: string }) => node.id);
        expect(names).toContain('Store');
        expect(names).toContain('main');
        expect(existsSync(join(out, 'graph.json'))).toBe(true);
    }, 60_000);

    it('writes the insides with paths relative to the root, so a checkout elsewhere verifies', async () => {
        const root = mkdtempSync(join(tmpdir(), 'exo-where-'));
        mkdirSync(join(root, 'src'));
        writeFileSync(
            join(root, 'package.json'),
            JSON.stringify({ name: 'where-app', version: '1.0.0' })
        );
        writeFileSync(join(root, 'src', 'store.ts'), 'export class Store {}\n');
        writeFileSync(
            join(root, 'src', 'index.ts'),
            "import { Store } from './store';\nexport function main() { return new Store(); }\n"
        );

        const out = join(root, 'out');
        expect(await run(['--root', root, '--out', out], '/elsewhere')).toBe(0);

        const text = readFileSync(join(out, 'insides', 'where-app.json'), 'utf8');
        expect(text).not.toContain(root);
        const inside = JSON.parse(text);
        const edge = inside.model.edges.find((e: { id: string }) => e.id === 'main→Store');
        expect(edge.evidence[0]).toMatchObject({ from: 'src/index.ts', to: 'src/store.ts' });
        expect(
            inside.model.nodes.find((n: { id: string }) => n.id === 'main').members[0].full
        ).toBe('(): Store');
    }, 60_000);
});
