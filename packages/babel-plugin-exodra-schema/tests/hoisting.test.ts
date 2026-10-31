import { describe, expect, it } from 'vitest';
import * as babel from '@babel/core';
import syntaxJsx from '@babel/plugin-syntax-jsx';
import plugin from '../src/index';

function compile(src: string): string {
    const res = babel.transformSync(src, {
        filename: 'input.jsx',
        babelrc: false,
        configFile: false,
        plugins: [
            [syntaxJsx, { throwIfNamespace: false }],
            [plugin as unknown as babel.PluginItem, {}],
        ],
    });
    if (res?.code === undefined || res.code === null) throw new Error('compile produced no code');
    return res.code;
}

function moduleLines(out: string): string[] {
    return out.split('\n').filter((line) => line !== '' && !/^\s/.test(line));
}

describe('the declaration is hoisted to module scope', () => {
    it('stays at module scope when written there', () => {
        const out = compile(`export const ROW = exoJsx(($) => <li>{$.t}</li>);`);
        expect(moduleLines(out)).toContain('const _s0 = createExoNamedSchema(_b0 => {');
        expect(out).toContain('export const ROW = _s0;');
    });

    it('leaves a function and lands in front of the statement holding it', () => {
        const out = compile(`
            const before = 1;
            function makeRow() {
                return exoJsx(($) => <li>{$.t}</li>);
            }
        `);
        const lines = moduleLines(out);
        expect(lines.indexOf('const before = 1;')).toBeLessThan(
            lines.indexOf('const _s0 = createExoNamedSchema(_b0 => {')
        );
        expect(lines.indexOf('const _s0 = createExoNamedSchema(_b0 => {')).toBeLessThan(
            lines.indexOf('function makeRow() {')
        );
        expect(out).toContain('return _s0;');
    });

    it('numbers two declarations in one file apart', () => {
        const out = compile(`
            const A = exoJsx(($) => <li>{$.a}</li>);
            const B = exoJsx(($) => <li>{$.b}</li>);
        `);
        expect(out).toContain('const _s0 = createExoNamedSchema(');
        expect(out).toContain('const _s1 = createExoNamedSchema(');
        expect(out.match(/^import /gm)).toHaveLength(1);
    });

    it('grows a generated name past one the file already binds', () => {
        const out = compile(`
            const _s0 = 'taken';
            const A = exoJsx(($) => <li>{$.a}</li>);
        `);
        expect(out).toContain('const _s_0 = createExoNamedSchema(');
    });
});
