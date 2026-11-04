import { describe, expect, it } from 'vitest';
import * as babel from '@babel/core';
import syntaxJsx from '@babel/plugin-syntax-jsx';
import syntaxTypeScript from '@babel/plugin-syntax-typescript';
import plugin from '../src/index';

function compile(src: string, filename = 'input.jsx'): string {
    const res = babel.transformSync(src, {
        filename,
        babelrc: false,
        configFile: false,
        plugins: [
            filename.endsWith('.tsx')
                ? [syntaxTypeScript, { isTSX: true }]
                : [syntaxJsx, { throwIfNamespace: false }],
            [plugin as unknown as babel.PluginItem, { jsonDeclarations: false }],
        ],
    });
    if (res?.code === undefined || res.code === null) throw new Error('compile produced no code');
    return res.code;
}

const schemaOf = (code: string): string =>
    code.slice(code.indexOf('const _s0'), code.indexOf('const S ='));

describe('a module const string in an attribute is markup', () => {
    it('folds a const string into the same schema a hand-written literal makes', () => {
        const folded = compile(`
            const ZONE = 'border:1px solid red';
            const S = exoJsx(($) => <div style={ZONE}><$.list /></div>);
        `);
        const literal = compile(`
            const ZONE = 'border:1px solid red';
            const S = exoJsx(($) => <div style="border:1px solid red"><$.list /></div>);
        `);
        expect(schemaOf(folded)).toBe(schemaOf(literal));
        expect(folded).toContain('style: "border:1px solid red"');
    });

    it('folds a template made of literals and earlier consts, through a const of a const', () => {
        const out = compile(`
            const A = 'radius:8px';
            const B = \`\${A};gap:4px\`;
            const S = exoJsx(($) => <div style={\`flex:none;\${B}\`} />);
        `);
        expect(out).toContain('style: "flex:none;radius:8px;gap:4px"');
    });

    it('folds an export const and sees through TypeScript wrappers', () => {
        const out = compile(
            `
            export const A = 'a' as const;
            const B = 'b'!;
            const C = ('c' satisfies string);
            const S = exoJsx(($) => <div class={\`\${A} \${B} \${C}\`} />);
        `,
            'input.tsx'
        );
        expect(out).toContain('class: "a b c"');
    });

    it('folds into a declaration inside a function', () => {
        const out = compile(`
            const ZONE = 'z';
            function view() { return exoJsx(($) => <div class={ZONE} />); }
        `);
        expect(out).toContain('class: "z"');
    });
});

describe('what is neither folded nor read from module scope stays refused', () => {
    const refused =
        /style=\{…\} on <div> is an expression.*a let, a local value or a call is neither/;

    it.each([
        ['a let', `let ZONE = 'z'; const S = exoJsx(($) => <div style={ZONE} />);`],
        ['a call', `const tag = (c) => c; const S = exoJsx(($) => <div style={tag('z')} />);`],
        [
            'a const declared after',
            `const S = exoJsx(($) => <div style={ZONE} />); const ZONE = 'z';`,
        ],
        [
            'a const of the same statement',
            `const ZONE = 'z', S = exoJsx(($) => <div style={ZONE} />);`,
        ],
        [
            'a template with a non-const part',
            `let x = 'q'; const S = exoJsx(($) => <div style={\`a\${x}\`} />);`,
        ],
        [
            'a local const shadowing a module one',
            `const ZONE = 'm'; function f() { const ZONE = 'l'; return exoJsx(($) => <div style={ZONE} />); }`,
        ],
        [
            'the declaration parameter shadowing a module one',
            `const ZONE = 'm'; const S = exoJsx((ZONE) => <div style={ZONE} />);`,
        ],
    ])('refuses %s', (_what, source) => {
        expect(() => compile(source)).toThrow(refused);
    });

    it('does not fold a child: a const there is still an expression', () => {
        expect(() =>
            compile(`const ZONE = 'z'; const S = exoJsx(($) => <div>{ZONE}</div>);`)
        ).toThrow(/\{…\} inside <div> is an expression/);
    });
});
